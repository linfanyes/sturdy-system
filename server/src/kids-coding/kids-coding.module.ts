import { Module, UseGuards, Controller, Get, Post, Patch, Delete, Param, Body, Inject, Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { TypeOrmModule } from '@nestjs/typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, DeepPartial } from 'typeorm'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { CrudService } from '../common/crud/base.service'
import { CrudController } from '../common/crud/base.controller'
import { CodingProject } from './kids-coding.entity'
import { CodingChallenge } from './challenge.entity'
import { CodingReview } from './review.entity'
import { CodingBadge } from './badge.entity'
import { CreateCodingProjectDto, UpdateCodingProjectDto } from './dto/kids-coding.dto'
import { CreateChallengeDto, UpdateChallengeDto, CreateReviewDto } from './dto/challenge-review.dto'
import { CurrentParent } from '../parent-auth/current-parent.decorator'
import { MessageService } from '../messages/message.service'
import { MessagesModule } from '../messages/messages.module'

class CodingProjectService extends CrudService<CodingProject> {
  constructor(@InjectRepository(CodingProject) repo: Repository<CodingProject>) {
    super(repo)
  }
}

/** 教师端：少儿编程作品 CRUD（按 teacherId 隔离，@Feature 守卫保证该功能已开启） */
@Roles('teacher')
@Feature('kids-coding')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('kids-coding')
export class CodingProjectController extends CrudController<CodingProject> {
  constructor(s: CodingProjectService) {
    super(s)
  }

  @Post()
  create(@Body() dto: CreateCodingProjectDto, @CurrentTeacher() t: any) {
    return super.create(dto as any, t)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCodingProjectDto, @CurrentTeacher() t: any) {
    return super.update(id, dto as any, t)
  }
}

/** 教师端：任务卡 CRUD + 查看某任务的学生提交 */
@Roles('teacher')
@Feature('kids-coding')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('kids-coding/challenges')
export class CodingChallengeController {
  constructor(
    @InjectRepository(CodingChallenge) private readonly challengeRepo: Repository<CodingChallenge>,
    @InjectRepository(CodingProject) private readonly projectRepo: Repository<CodingProject>,
  ) {}

  /** 教师本人创建的任务卡列表 */
  @Get()
  list(@CurrentTeacher() t: any, @Body() body: { classId?: string | null }) {
    const where: any = { teacherId: t?.id }
    if (body?.classId) where.classId = body.classId
    return this.challengeRepo.find({ where, order: { updatedAt: 'DESC' } })
  }

  @Post()
  create(@Body() dto: CreateChallengeDto, @CurrentTeacher() t: any) {
    const e = this.challengeRepo.create({
      title: dto.title,
      goal: dto.goal ?? null,
      classId: dto.classId ?? null,
      starterBlocks: dto.starterBlocks ?? null,
      criteria: dto.criteria ?? null,
      teacherName: dto.teacherName ?? null,
      teacherId: t?.id,
    } as DeepPartial<CodingChallenge>)
    return this.challengeRepo.save(e)
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentTeacher() t: any) {
    const r = await this.challengeRepo.findOne({ where: { id, teacherId: t?.id } as any })
    if (!r) throw new NotFoundException('任务卡不存在')
    return r
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateChallengeDto, @CurrentTeacher() t: any) {
    const e = await this.challengeRepo.findOne({ where: { id, teacherId: t?.id } as any })
    if (!e) throw new NotFoundException('任务卡不存在')
    if (dto.title !== undefined) e.title = dto.title
    if (dto.goal !== undefined) e.goal = dto.goal
    if (dto.classId !== undefined) e.classId = dto.classId
    if (dto.starterBlocks !== undefined) e.starterBlocks = dto.starterBlocks
    if (dto.criteria !== undefined) e.criteria = dto.criteria
    if (dto.teacherName !== undefined) e.teacherName = dto.teacherName
    return this.challengeRepo.save(e)
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @CurrentTeacher() t: any) {
    const e = await this.challengeRepo.findOne({ where: { id, teacherId: t?.id } as any })
    if (!e) throw new NotFoundException('任务卡不存在')
    await this.challengeRepo.remove(e)
    return { id }
  }

  /** 某任务卡下的学生提交作品（教师批改用） */
  @Get(':id/submissions')
  async submissions(@Param('id') id: string, @CurrentTeacher() t: any) {
    const ch = await this.challengeRepo.findOne({ where: { id, teacherId: t?.id } as any })
    if (!ch) throw new NotFoundException('任务卡不存在')
    const rows = await this.projectRepo.find({
      where: { challengeId: id } as any,
      order: { updatedAt: 'DESC' },
    })
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      studentId: r.studentId,
      submitted: r.submitted,
      submittedAt: r.submittedAt,
      showInGallery: r.showInGallery,
      updatedAt: r.updatedAt,
      blocks: r.blocks,
    }))
  }
}

/** 教师端：对学生提交的练习作业写点评（评语 + 星级），按 projectId 幂等 upsert */
@Roles('teacher')
@Feature('kids-coding')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('kids-coding/reviews')
export class CodingReviewController {
  constructor(
    @InjectRepository(CodingReview) private readonly reviewRepo: Repository<CodingReview>,
    @InjectRepository(CodingProject) private readonly projectRepo: Repository<CodingProject>,
  ) {}

  @Post()
  async create(@Body() dto: CreateReviewDto, @CurrentTeacher() t: any) {
    const proj = await this.projectRepo.findOne({ where: { id: dto.projectId } as any })
    if (!proj) throw new NotFoundException('练习作品不存在')
    let review = await this.reviewRepo.findOne({ where: { projectId: dto.projectId } as any })
    if (!review) {
      review = this.reviewRepo.create({
        projectId: dto.projectId,
        challengeId: dto.challengeId ?? proj.challengeId ?? null,
        studentId: dto.studentId ?? proj.studentId ?? null,
        teacherId: t?.id,
        comment: dto.comment ?? null,
        rating: dto.rating ?? null,
        done: true,
      } as DeepPartial<CodingReview>)
    } else {
      if (dto.comment !== undefined) review.comment = dto.comment
      if (dto.rating !== undefined) review.rating = dto.rating
      if (dto.challengeId !== undefined) review.challengeId = dto.challengeId
      review.done = true
    }
    const saved = await this.reviewRepo.save(review)
    return { id: saved.id, comment: saved.comment, rating: saved.rating }
  }

  /** 查看某任务的全部点评（教师批改概览） */
  @Get('challenge/:challengeId')
  async listByChallenge(@Param('challengeId') challengeId: string, @CurrentTeacher() t: any) {
    return this.reviewRepo.find({
      where: { challengeId, teacherId: t?.id } as any,
      order: { updatedAt: 'DESC' },
    })
  }
}

/** 教师端：把学生提交的作品选入/移出「班级作品墙」（教师精选，家长端只读可见） */
@Roles('teacher')
@Feature('kids-coding')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('kids-coding/gallery')
export class CodingGalleryController {
  constructor(
    @InjectRepository(CodingProject) private readonly projectRepo: Repository<CodingProject>,
    @InjectRepository(CodingChallenge) private readonly challengeRepo: Repository<CodingChallenge>,
  ) {}

  /** 选入作品墙：校验该作品对应的任务卡属于本教师 */
  @Post(':projectId')
  async feature(@Param('projectId') projectId: string, @CurrentTeacher() t: any) {
    const proj = await this.projectRepo.findOne({ where: { id: projectId } as any })
    if (!proj) throw new NotFoundException('作品不存在')
    if (proj.challengeId) {
      const ch = await this.challengeRepo.findOne({ where: { id: proj.challengeId, teacherId: t?.id } as any })
      if (!ch) throw new ForbiddenException('无权操作该作品')
    }
    proj.showInGallery = true
    await this.projectRepo.save(proj)
    return { id: proj.id, showInGallery: true }
  }

  @Delete(':projectId')
  async unfeature(@Param('projectId') projectId: string, @CurrentTeacher() t: any) {
    const proj = await this.projectRepo.findOne({ where: { id: projectId } as any })
    if (!proj) throw new NotFoundException('作品不存在')
    if (proj.challengeId) {
      const ch = await this.challengeRepo.findOne({ where: { id: proj.challengeId, teacherId: t?.id } as any })
      if (!ch) throw new ForbiddenException('无权操作该作品')
    }
    proj.showInGallery = false
    await this.projectRepo.save(proj)
    return { id: proj.id, showInGallery: false }
  }
}

/** 家长端：查看本班教师已开放的少儿编程作品（只读画廊）+ 学生自主练习作品的 CRUD + 任务卡 + 点评回看 */
@Roles('parent')
@Feature('kids-coding')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('parent/kids-coding')
export class ParentCodingController {
  constructor(
    @InjectRepository(CodingProject) private readonly repo: Repository<CodingProject>,
    @InjectRepository(CodingChallenge) private readonly challengeRepo: Repository<CodingChallenge>,
    @InjectRepository(CodingReview) private readonly reviewRepo: Repository<CodingReview>,
    @InjectRepository(CodingBadge) private readonly badgeRepo: Repository<CodingBadge>,
    @Inject(MessageService) private readonly msg?: MessageService,
  ) {}

  /** 教师发布到本班的少儿编程作品（只读画廊） */
  @Get()
  async listForParent(@CurrentParent() p: any) {
    const classId = p?.classId
    if (!classId) return []
    const rows = await this.repo.find({
      where: { classId, publishedToParent: true } as any,
      order: { updatedAt: 'DESC' },
    })
    return rows.map((r) => this.projectView(r))
  }

  /** 本班教师发布的任务卡（学生练习目标） */
  @Get('challenges')
  async listChallenges(@CurrentParent() p: any) {
    const classId = p?.classId
    if (!classId) return []
    const rows = await this.challengeRepo.find({
      where: { classId } as any,
      order: { updatedAt: 'DESC' },
    })
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      goal: r.goal,
      starterBlocks: r.starterBlocks,
      teacherName: r.teacherName,
      updatedAt: r.updatedAt,
    }))
  }

  /** 单个任务卡详情 */
  @Get('challenges/:id')
  async getChallenge(@Param('id') id: string, @CurrentParent() p: any) {
    const classId = p?.classId
    const r = await this.challengeRepo.findOne({ where: { id, classId } as any })
    if (!r) throw new NotFoundException('任务卡不存在或未开放')
    return { id: r.id, title: r.title, goal: r.goal, starterBlocks: r.starterBlocks, teacherName: r.teacherName }
  }

  /** 学生自主练习作品列表（仅本人可见，按 studentId 隔离） */
  @Get('mine')
  async listMine(@CurrentParent() p: any) {
    const studentId = p?.studentId
    if (!studentId) return []
    const rows = await this.repo.find({
      where: { studentId } as any,
      order: { updatedAt: 'DESC' },
    })
    return rows.map((r) => this.projectView(r))
  }

  /** 新建练习作品（归属当前学生，默认不发布、与教师作品隔离） */
  @Post()
  async createMine(@Body() dto: CreateCodingProjectDto, @CurrentParent() p: any) {
    const studentId = p?.studentId
    if (!studentId) throw new ForbiddenException('未关联学生，无法保存练习')
    const e = this.repo.create({
      title: dto.title || '未命名练习',
      description: dto.description ?? null,
      blocks: dto.blocks ?? null,
      studentId,
      teacherId: null,
      classId: null,
      publishedToParent: false,
      teacherName: null,
      challengeId: dto.challengeId ?? null,
      submitted: dto.submitted ?? false,
      submittedAt: dto.submitted ? new Date() : null,
    } as DeepPartial<CodingProject>)
    const saved = await this.repo.save(e)
    return { id: saved.id }
  }

  /** 更新本人练习作品 */
  @Patch(':id')
  async updateMine(@Param('id') id: string, @Body() dto: UpdateCodingProjectDto, @CurrentParent() p: any) {
    const studentId = p?.studentId
    const e = await this.repo.findOne({ where: { id } as any })
    if (!e || e.studentId !== studentId) throw new NotFoundException('练习作品不存在')
    if (dto.title !== undefined) e.title = dto.title
    if (dto.description !== undefined) e.description = dto.description
    if (dto.blocks !== undefined) e.blocks = dto.blocks
    if (dto.challengeId !== undefined) e.challengeId = dto.challengeId
    if (dto.submitted !== undefined) {
      e.submitted = dto.submitted
      e.submittedAt = dto.submitted ? new Date() : e.submittedAt
    }
    await this.repo.save(e)
    return { id: e.id }
  }

  /** 提交草稿作为作业 */
  @Post('mine/:id/submit')
  async submitMine(@Param('id') id: string, @CurrentParent() p: any) {
    const studentId = p?.studentId
    const e = await this.repo.findOne({ where: { id } as any })
    if (!e || e.studentId !== studentId) throw new NotFoundException('练习作品不存在')
    e.submitted = true
    e.submittedAt = new Date()
    await this.repo.save(e)
    return { id: e.id, submitted: true }
  }

  /** 删除本人练习作品 */
  @Delete(':id')
  async removeMine(@Param('id') id: string, @CurrentParent() p: any) {
    const studentId = p?.studentId
    const e = await this.repo.findOne({ where: { id } as any })
    if (!e || e.studentId !== studentId) throw new NotFoundException('练习作品不存在')
    await this.repo.remove(e)
    return { id }
  }

  /** 教师发布作品的单个查看（只读） */
  @Get(':id')
  async getOne(@Param('id') id: string, @CurrentParent() p: any) {
    const classId = p?.classId
    const r = await this.repo.findOne({ where: { id, classId, publishedToParent: true } as any })
    if (!r) throw new NotFoundException('作品不存在或未开放')
    return this.projectView(r)
  }

  /** 回看某练习作品的教师点评 */
  @Get('mine/:id/review')
  async getReview(@Param('id') id: string, @CurrentParent() p: any) {
    const studentId = p?.studentId
    const proj = await this.repo.findOne({ where: { id } as any })
    if (!proj || proj.studentId !== studentId) throw new NotFoundException('练习作品不存在')
    const review = await this.reviewRepo.findOne({ where: { projectId: id } as any })
    if (!review) return null
    return { id: review.id, comment: review.comment, rating: review.rating, createdAt: review.createdAt }
  }

  /** 班级作品墙：本班被教师精选的学生作品（只读，同伴学习） */
  @Get('gallery')
  async classGallery(@CurrentParent() p: any) {
    const classId = p?.classId
    if (!classId) return []
    const chs = await this.challengeRepo.find({ where: { classId } as any })
    const chIds = chs.map((c) => c.id)
    if (!chIds.length) return []
    const rows = await this.repo.find({ where: { challengeId: chIds as any, showInGallery: true } as any, order: { updatedAt: 'DESC' } })
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      studentId: r.studentId,
      challengeId: r.challengeId,
      blocks: r.blocks,
      updatedAt: r.updatedAt,
    }))
  }

  /** 家长学习周报：汇总本周（近 7 天）学生的学习概况 */
  @Get('weekly-report')
  async weeklyReport(@CurrentParent() p: any) {
    if (!p?.studentId) return null
    return buildWeeklyReport(this.repo, this.challengeRepo, this.reviewRepo, p.studentId, p.classId)
  }

  /** 将本周学习周报推送给当前家长（站内信）。家长可主动触发，定时任务亦可调用。 */
  @Post('weekly-report/push')
  async pushWeeklyReport(@CurrentParent() p: any) {
    const studentId = p?.studentId
    if (!studentId) return { pushed: false, reason: '未关联学生' }
    const rep = await buildWeeklyReport(this.repo, this.challengeRepo, this.reviewRepo, studentId, p.classId)
    if (!rep || rep.practiceTotal === 0) return { pushed: false, reason: '本周暂无练习记录' }
    await this.msg?.send('system', 'system', {
      recipientId: studentId,
      recipientRole: 'parent',
      title: '少儿编程本周学习周报',
      content: buildWeeklyReportText(rep),
      type: 'coding_weekly',
    })
    return { pushed: true, report: rep }
  }

  /** 成就徽章：按规则计算并落库，返回全部徽章（含是否已获得） */
  @Get('badges')
  async getBadges(@CurrentParent() p: any) {
    const studentId = p?.studentId
    if (!studentId) return []
    const myProjects = await this.repo.find({ where: { studentId } as any })
    const submitted = myProjects.filter((x) => x.submitted).length
    const reviews = await this.reviewRepo.find({ where: { studentId } as any })
    const fiveStar = reviews.some((r) => r.rating === 5)
    const earned = new Set<string>()
    if (myProjects.length >= 1) earned.add('first_practice')
    if (submitted >= 1) earned.add('first_submit')
    if (myProjects.length >= 5) earned.add('five_practices')
    if (fiveStar) earned.add('star_5')
    if (submitted >= 3) earned.add('challenge_master')
    // 落库新获得的徽章（幂等 upsert）
    for (const type of earned) {
      const exist = await this.badgeRepo.findOne({ where: { studentId, type } as any })
      if (!exist) {
        const b = this.badgeRepo.create({ studentId, type, teacherId: null, earnedAt: new Date() } as DeepPartial<CodingBadge>)
        await this.badgeRepo.save(b)
      }
    }
    const all = await this.badgeRepo.find({ where: { studentId } as any })
    const got = new Set(all.map((b) => b.type))
    const RULES: { type: string; label: string; icon: string }[] = [
      { type: 'first_practice', label: '初次练习', icon: '🌱' },
      { type: 'first_submit', label: '提交作业', icon: '📤' },
      { type: 'five_practices', label: '练习达人(5份)', icon: '🎓' },
      { type: 'star_5', label: '五星好评', icon: '⭐' },
      { type: 'challenge_master', label: '挑战高手(3次提交)', icon: '🏅' },
    ]
    return RULES.map((r) => ({ ...r, earned: got.has(r.type) }))
  }

  /** 家长端仅暴露必要字段，避免泄露教师私有信息 */
  private projectView(r: CodingProject) {
    return {
      id: r.id,
      title: r.title,
      description: r.description,
      blocks: r.blocks,
      teacherName: r.teacherName,
      challengeId: r.challengeId,
      submitted: r.submitted,
      submittedAt: r.submittedAt,
      updatedAt: r.updatedAt,
    }
  }
}

/** 周报生成（与家长端/超管端推送解耦，便于复用） */
async function buildWeeklyReport(
  repo: Repository<CodingProject>,
  challengeRepo: Repository<CodingChallenge>,
  reviewRepo: Repository<CodingReview>,
  studentId: string,
  classId?: string | null,
) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000)
  const myProjects = await repo.find({ where: { studentId } as any })
  const recent = myProjects.filter((x) => (x.updatedAt?.getTime?.() ?? 0) >= since.getTime())
  const submitted = myProjects.filter((x) => x.submitted)
  const reviews = await reviewRepo.find({ where: { studentId } as any })
  const recentReviews = reviews.filter((x) => (x.createdAt?.getTime?.() ?? 0) >= since.getTime())
  const totalBlocks = myProjects.reduce((s, x) => s + (Array.isArray(x.blocks) ? x.blocks.length : 0), 0)
  const challenges = classId ? await challengeRepo.find({ where: { classId } as any }) : []
  const rated = reviews.filter((r) => r.rating != null)
  const avgRating = rated.length
    ? Math.round((rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length) * 10) / 10
    : null
  return {
    studentId,
    weekStart: since.toISOString(),
    challengesAvailable: challenges.length,
    practiceTotal: myProjects.length,
    practiceRecent: recent.length,
    submittedTotal: submitted.length,
    reviewsTotal: reviews.length,
    reviewsRecent: recentReviews.length,
    avgRating,
    totalBlocks,
    lastActivity: myProjects.length
      ? myProjects.slice().sort((a, b) => (b.updatedAt?.getTime?.() ?? 0) - (a.updatedAt?.getTime?.() ?? 0))[0].updatedAt
      : null,
  }
}

function buildWeeklyReportText(rep: any): string {
  const parts = [
    '【少儿编程 · 本周学习周报】',
    `练习作品：${rep.practiceTotal} 份（本周新增 ${rep.practiceRecent} 份）`,
    `已提交作业：${rep.submittedTotal} 份`,
    `累计积木块：${rep.totalBlocks} 块`,
    `收到点评：${rep.reviewsTotal} 次${rep.avgRating != null ? `，平均 ${rep.avgRating} 星` : ''}`,
    `可用任务卡：${rep.challengesAvailable} 个`,
  ]
  if (rep.lastActivity) parts.push(`最近活跃：${new Date(rep.lastActivity).toLocaleString('zh-CN')}`)
  return parts.join('\n')
}

/** 批量推送服务：供超管接口与定时任务复用，避免逻辑重复 */
@Injectable()
export class KidsCodingBatchService {
  private readonly logger = new Logger(KidsCodingBatchService.name)

  constructor(
    @InjectRepository(CodingProject) private readonly repo: Repository<CodingProject>,
    @InjectRepository(CodingReview) private readonly reviewRepo: Repository<CodingReview>,
    @InjectRepository(CodingChallenge) private readonly challengeRepo: Repository<CodingChallenge>,
    @Inject(MessageService) private readonly msg: MessageService,
  ) {}

  /** 扫描所有有练习活动的学生，向其家长推送本周学习周报；返回扫描/推送/跳过统计 */
  async pushAllWeeklyReports(): Promise<{ scanned: number; pushed: number; skipped: number }> {
    const rows = await this.repo
      .createQueryBuilder('p')
      .select('p.studentId', 'studentId')
      .addSelect('p.classId', 'classId')
      .distinct(true)
      .where('p.studentId IS NOT NULL')
      .getRawMany()
    let pushed = 0
    let skipped = 0
    for (const r of rows) {
      const rep = await buildWeeklyReport(this.repo, this.challengeRepo, this.reviewRepo, r.studentId, r.classId)
      if (!rep || rep.practiceTotal === 0) {
        skipped++
        continue
      }
      await this.msg.send('system', 'system', {
        recipientId: r.studentId,
        recipientRole: 'parent',
        title: '少儿编程本周学习周报',
        content: buildWeeklyReportText(rep),
        type: 'coding_weekly',
      })
      pushed++
    }
    return { scanned: rows.length, pushed, skipped }
  }

  /** 定时任务：每周一 08:00 自动推送全校少儿编程周报（供运维免外部 crontab） */
  @Cron('0 8 * * 1', { name: 'kids-coding-weekly-push' })
  async handleWeeklyCron() {
    this.logger.log('[cron] 少儿编程周报自动推送开始')
    try {
      const res = await this.pushAllWeeklyReports()
      this.logger.log(`[cron] 少儿编程周报自动推送完成：${JSON.stringify(res)}`)
    } catch (e) {
      this.logger.error('[cron] 少儿编程周报自动推送失败：' + (e as Error).message)
    }
  }
}

/** 超管端：批量推送本周学习周报给所有有练习活动的学生家长（供管理员手动触发） */
@Roles('super')
@Feature('kids-coding')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('admin/kids-coding')
export class KidsCodingAdminController {
  constructor(private readonly batch: KidsCodingBatchService) {}

  @Post('weekly-report/push-all')
  pushAllWeeklyReports() {
    return this.batch.pushAllWeeklyReports()
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([CodingProject, CodingChallenge, CodingReview, CodingBadge]),
    MessagesModule,
  ],
  providers: [CodingProjectService, KidsCodingBatchService],
  controllers: [CodingProjectController, CodingChallengeController, CodingReviewController, CodingGalleryController, ParentCodingController, KidsCodingAdminController],
  exports: [KidsCodingAdminController],
})
export class KidsCodingModule {}
