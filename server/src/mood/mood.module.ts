import {
  Module, UseGuards, Controller, Get, Post, Patch, Param, Body, Query,
  Inject, Injectable, NotFoundException, ForbiddenException,
} from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { MoodCheckIn, TreeHole } from './mood.entity'
import { CreateMoodCheckInDto, CreateTreeHoleDto, ReplyTreeHoleDto } from './mood.dto'

/** 服务端本地今日 YYYY-MM-DD */
function todayStr(): string {
  const d = new Date()
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

/** 高危关键词（命中即升级人工） */
const HIGH_RISK = ['不想活', '活不下去', '自杀', '跳楼', '结束生命', '消失吧', '伤害自己', '没意义活', '解脱']
/** 偏低关键词 */
const LOW_RISK = ['难过', '孤单', '没人', '烦', '压力', '哭', '失眠', '讨厌', '害怕', '焦虑', '委屈']

@Injectable()
export class MoodService {
  constructor(
    @InjectRepository(MoodCheckIn) private readonly moodRepo: Repository<MoodCheckIn>,
    @InjectRepository(TreeHole) private readonly treeRepo: Repository<TreeHole>,
  ) {}

  /** 提交/更新当日心情（同一学生同日 upsert） */
  async upsertCheckIn(dto: CreateMoodCheckInDto) {
    const date = dto.date || todayStr()
    const existing = await this.moodRepo.findOne({
      where: { studentId: dto.studentId, date } as any,
    })
    if (existing) {
      existing.level = dto.level
      existing.emoji = dto.emoji ?? existing.emoji
      existing.note = dto.note ?? existing.note
      existing.studentName = dto.studentName ?? existing.studentName
      existing.classId = dto.classId ?? existing.classId
      existing.teacherId = existing.teacherId // 保持租户键不变
      return this.moodRepo.save(existing)
    }
    const e = this.moodRepo.create({
      studentId: dto.studentId,
      studentName: dto.studentName ?? null,
      classId: dto.classId ?? null,
      level: dto.level,
      emoji: dto.emoji ?? null,
      note: dto.note ?? null,
      date,
      teacherId: null, // 由调用方按归属教师写入
    } as any)
    return this.moodRepo.save(e)
  }

  /** 教师视角：列出本班打卡（按日期/班级过滤） */
  listByTeacher(teacherId: string, classId?: string, dateFrom?: string, dateTo?: string) {
    const where: any = { teacherId }
    if (classId) where.classId = classId
    if (dateFrom || dateTo) {
      // TypeORM between 需手动拼；简单用 >= <=
    }
    const qb = this.moodRepo.createQueryBuilder('m').where('m.teacherId = :t', { t: teacherId })
    if (classId) qb.andWhere('m.classId = :c', { c: classId })
    if (dateFrom) qb.andWhere('m.date >= :df', { df: dateFrom })
    if (dateTo) qb.andWhere('m.date <= :dt', { dt: dateTo })
    qb.orderBy('m.date', 'DESC').addOrderBy('m.studentId', 'ASC')
    return qb.getMany()
  }

  /** 班级情绪看板聚合 */
  async dashboard(teacherId: string, classId?: string, dateFrom?: string, dateTo?: string) {
    const rows = await this.listByTeacher(teacherId, classId, dateFrom, dateTo)
    const total = rows.length
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of rows) dist[r.level] = (dist[r.level] || 0) + 1

    // 按日序列（去重日期，统计每日平均等级）
    const byDay: Record<string, { sum: number; n: number }> = {}
    for (const r of rows) {
      byDay[r.date] = byDay[r.date] || { sum: 0, n: 0 }
      byDay[r.date].sum += r.level
      byDay[r.date].n += 1
    }
    const trend = Object.keys(byDay).sort().map((d) => ({
      date: d,
      avg: Math.round((byDay[d].sum / byDay[d].n) * 100) / 100,
      count: byDay[d].n,
    }))

    // 连续低落（level<=2）学生：取每位学生最新若干天，从最新往前数连续低点
    const byStudent: Record<string, MoodCheckIn[]> = {}
    for (const r of rows) (byStudent[r.studentId] = byStudent[r.studentId] || []).push(r)
    const lowStreak: any[] = []
    for (const sid of Object.keys(byStudent)) {
      const list = byStudent[sid].sort((a, b) => (a.date < b.date ? 1 : -1))
      let streak = 0
      for (const r of list) {
        if (r.level <= 2) streak++
        else break
      }
      if (streak >= 2) {
        lowStreak.push({
          studentId: sid,
          studentName: list[0].studentName,
          classId: list[0].classId,
          streak,
          latestNote: list[0].note,
          latestDate: list[0].date,
        })
      }
    }
    lowStreak.sort((a, b) => b.streak - a.streak)

    // 树洞概览
    const treeWhere: any = { teacherId }
    if (classId) treeWhere.classId = classId
    const trees = await this.treeRepo.find({ where: treeWhere, order: { createdAt: 'DESC' } })
    const treePending = trees.filter((t) => t.status === 'pending').length
    const treeHigh = trees.filter((t) => t.riskLevel === 'high').length

    return {
      total,
      distribution: dist,
      avgLevel: total ? Math.round((rows.reduce((s, r) => s + r.level, 0) / total) * 100) / 100 : 0,
      trend,
      lowStreak,
      treePending,
      treeHigh,
      treeTotal: trees.length,
    }
  }

  /** 学生本人近期打卡 */
  listMine(studentId: string, limit = 30) {
    return this.moodRepo.find({
      where: { studentId } as any,
      order: { date: 'DESC' },
      take: limit,
    })
  }

  /** 提交树洞（匿名），自动做风险分级与初步共情回复 */
  async submitTreeHole(studentId: string | null, classId: string | null, content: string, teacherId: string) {
    const risk = this.assess(content)
    const e = this.treeRepo.create({
      studentId,
      classId,
      content,
      status: risk === 'high' ? 'escalated' : 'pending',
      riskLevel: risk,
      aiReply: this.empathy(content, risk),
      staffReply: null,
      teacherId,
    } as any)
    return this.treeRepo.save(e)
  }

  listTreeHoles(teacherId: string, classId?: string, status?: string) {
    const where: any = { teacherId }
    if (classId) where.classId = classId
    if (status) where.status = status
    return this.treeRepo.find({ where, order: { createdAt: 'DESC' } })
  }

  getTreeHole(id: string, teacherId: string) {
    return this.treeRepo.findOne({ where: { id, teacherId } as any })
  }

  async replyTreeHole(id: string, teacherId: string, dto: ReplyTreeHoleDto) {
    const e = await this.treeRepo.findOne({ where: { id, teacherId } as any })
    if (!e) throw new NotFoundException('树洞不存在')
    e.staffReply = dto.staffReply
    if (dto.riskLevel) e.riskLevel = dto.riskLevel
    e.status = dto.status || (dto.riskLevel === 'high' ? 'escalated' : 'responded')
    return this.treeRepo.save(e)
  }

  /** 关键词风险分级 */
  private assess(content: string): 'none' | 'low' | 'high' {
    if (HIGH_RISK.some((k) => content.includes(k))) return 'high'
    if (LOW_RISK.some((k) => content.includes(k))) return 'low'
    return 'none'
  }

  /** 初步共情回复（后续可替换为 AI 生成） */
  private empathy(content: string, risk: 'none' | 'low' | 'high'): string {
    if (risk === 'high') {
      return '看到你这么说，我很担心你。你很重要，也值得被好好对待。请尽快联系信任的成人、班主任或心理老师，或拨打心理援助热线（如 12356）。我会把这份倾诉交给老师，让你不再是一个人面对。'
    }
    if (risk === 'low') {
      return '谢谢你愿意说出来。情绪有起伏很正常，难过的时候不必硬撑。如果愿意，可以找信任的人聊聊，或者做点让自己放松的小事。'
    }
    return '谢谢你愿意分享。无论开心还是烦恼，被看见本身就有意义。愿今天对你温柔一点。'
  }
}

/** 教师端：心情与树洞管理 + 班级情绪看板 */
@Roles('teacher')
@UseGuards(JwtAuthGuard)
@Controller('mood')
export class TeacherMoodController {
  constructor(@Inject() private readonly svc: MoodService) {}

  @Get()
  list(@CurrentTeacher() t: any, @Query('classId') classId?: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.svc.listByTeacher(t?.id, classId, dateFrom, dateTo)
  }

  @Get('dashboard')
  dashboard(@CurrentTeacher() t: any, @Query('classId') classId?: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.svc.dashboard(t?.id, classId, dateFrom, dateTo)
  }

  @Get('tree-holes')
  treeHoles(@CurrentTeacher() t: any, @Query('classId') classId?: string, @Query('status') status?: string) {
    return this.svc.listTreeHoles(t?.id, classId, status)
  }

  @Get('tree-holes/:id')
  oneTree(@Param('id') id: string, @CurrentTeacher() t: any) {
    return this.svc.getTreeHole(id, t?.id)
  }

  @Patch('tree-holes/:id')
  reply(@Param('id') id: string, @CurrentTeacher() t: any, @Body() dto: ReplyTreeHoleDto) {
    return this.svc.replyTreeHole(id, t?.id, dto)
  }
}

/** 家长/学生端：提交心情与树洞（匿名） */
@Roles('parent')
@UseGuards(JwtAuthGuard)
@Controller('parent/mood')
export class ParentMoodController {
  constructor(@Inject() private readonly svc: MoodService) {}

  /** 提交当日心情（自动归属到家长 JWT 的 studentId / classId / 所属教师） */
  @Post('checkin')
  async checkin(@Body() dto: CreateMoodCheckInDto, @CurrentParent() p: any) {
    const studentId = dto.studentId || p?.studentId
    if (!studentId) throw new ForbiddenException('未关联学生，无法打卡')
    const teacherId = p?.teacherId || p?.sub
    return this.svc.upsertCheckIn({
      ...dto,
      studentId,
      studentName: dto.studentName ?? p?.studentName ?? null,
      classId: dto.classId ?? p?.classId ?? null,
    }).then((e: any) => {
      // 写入租户键（归属教师）
      if (teacherId && !e.teacherId) {
        e.teacherId = teacherId
        return (this.svc as any).moodRepo.save(e)
      }
      return e
    })
  }

  @Get('mine')
  mine(@CurrentParent() p: any) {
    const studentId = p?.studentId
    if (!studentId) return []
    return this.svc.listMine(studentId)
  }

  /** 匿名树洞提交 */
  @Post('tree-hole')
  async treeHole(@Body() dto: CreateTreeHoleDto, @CurrentParent() p: any) {
    const teacherId = p?.teacherId || p?.sub
    if (!teacherId) throw new ForbiddenException('无法定位班级教师')
    return this.svc.submitTreeHole(
      dto.studentId ?? p?.studentId ?? null,
      dto.classId ?? p?.classId ?? null,
      dto.content,
      teacherId,
    )
  }

  @Get('tree-holes/mine')
  mineTrees(@CurrentParent() p: any) {
    // 家长端仅看自己提交的内容（按 studentId）
    const studentId = p?.studentId
    if (!studentId) return []
    return (this.svc as any).treeRepo.find({ where: { studentId } as any, order: { createdAt: 'DESC' } })
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([MoodCheckIn, TreeHole])],
  controllers: [TeacherMoodController, ParentMoodController],
  providers: [MoodService],
  exports: [MoodService],
})
export class MoodModule {}
