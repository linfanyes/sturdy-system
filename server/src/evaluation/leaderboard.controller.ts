import { Controller, Get, Query, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { ScoreRecord, RewardRecord } from '../engagement/engagement.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'

@Controller('leaderboard')
@Roles('teacher')
@Feature('rewards')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class LeaderboardController {
  constructor(
    @InjectRepository(ScoreRecord) private readonly scoreRepo: Repository<ScoreRecord>,
    @InjectRepository(RewardRecord) private readonly rewardRepo: Repository<RewardRecord>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
  ) {}

  @Get()
  async getLeaderboard(
    @Query('classId') classId: string,
    @CurrentTeacher() t: any,
  ) {
    // S07修复：使用 NestJS 异常而非 throw new Error，返回正确的 HTTP 状态码
    if (!classId) {
      throw new BadRequestException('classId 必填')
    }
    // 校验班级归属
    const cls = await this.classRepo.findOne({ where: { id: classId, teacherId: t.sub } as any })
    if (!cls) {
      throw new ForbiddenException('班级不存在或无权访问')
    }

    // 并行查询加分和减分记录
    const [scores, rewards] = await Promise.all([
      this.scoreRepo.find({ where: { classId } as any }),
      this.rewardRepo.find({ where: { classId } as any }),
    ])

    // 查询班级学生
    const students = await this.studentRepo.find({ where: { classId } as any, take: 500 })
    const studentMap = new Map(students.map((s) => [s.id, s]))

    // 按学生聚合
    const map = new Map<string, { studentId: string; name: string; total: number; count: number }>()
    for (const r of scores) {
      const sid = r.studentId
      if (!sid) continue
      const existing = map.get(sid) || { studentId: sid, name: r.studentName || '', total: 0, count: 0 }
      existing.total += Number(r.delta || 0)
      existing.count += 1
      existing.name = existing.name || r.studentName || (studentMap.get(sid)?.name || '未知')
      map.set(sid, existing)
    }
    for (const r of rewards) {
      const sid = r.studentId
      if (!sid) continue
      const existing = map.get(sid) || { studentId: sid, name: studentMap.get(sid)?.name || '未知', total: 0, count: 0 }
      const delta = r.type === '减分' ? -Number(r.points || 0) : Number(r.points || 0)
      existing.total += delta
      existing.count += 1
      existing.name = existing.name || studentMap.get(sid)?.name || '未知'
      map.set(sid, existing)
    }

    // 排序返回
    const ranked = Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .map((item, index) => ({
        rank: index + 1,
        studentId: item.studentId,
        name: item.name,
        total: item.total,
        count: item.count,
      }))

    return { classId, total: ranked.length, items: ranked }
  }
}
