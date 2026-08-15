import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { FiveEduRecord, FiveEduDimension } from './five-edu.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { Grade } from '../grades/grade.entity'
import { Checkin } from '../checkin/checkin.module'
import { ReadingLog } from '../reading-log/reading-log.module'
import { ScoreRecord, RewardRecord } from '../engagement/engagement.entity'
import { AwardRecord } from '../award/award.entity'
import { MoodCheckIn } from '../mood/mood.entity'
import { CodingBadge } from '../kids-coding/badge.entity'
import { CodingReview } from '../kids-coding/review.entity'
import { AiService } from '../ai/ai.service'

const DIMENSIONS: FiveEduDimension[] = ['moral', 'intellectual', 'physical', 'aesthetic', 'labour']

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))

function weekLabelOf(d = new Date()): string {
  const date = new Date(d)
  const onejan = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((+date - +onejan) / 86400000 + onejan.getDay() + 1) / 7)
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
}

@Injectable()
export class FiveEduService {
  constructor(
    @InjectRepository(FiveEduRecord) private readonly repo: Repository<FiveEduRecord>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly clsRepo: Repository<ClassItem>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Checkin) private readonly checkinRepo: Repository<Checkin>,
    @InjectRepository(ReadingLog) private readonly readingRepo: Repository<ReadingLog>,
    @InjectRepository(ScoreRecord) private readonly scoreRepo: Repository<ScoreRecord>,
    @InjectRepository(RewardRecord) private readonly rewardRepo: Repository<RewardRecord>,
    @InjectRepository(AwardRecord) private readonly awardRepo: Repository<AwardRecord>,
    @InjectRepository(MoodCheckIn) private readonly moodRepo: Repository<MoodCheckIn>,
    @InjectRepository(CodingBadge) private readonly badgeRepo: Repository<CodingBadge>,
    @InjectRepository(CodingReview) private readonly reviewRepo: Repository<CodingReview>,
    private readonly ai: AiService,
  ) {}

  /** 家长端：解析当前学生所属班级的 teacherId（数据隔离需要） */
  private async resolveTeacherId(studentId: string): Promise<{ teacherId: string; classId: string; studentName: string }> {
    const stu = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    if (!stu) throw new BadRequestException('学生不存在')
    const cls = await this.clsRepo.findOne({ where: { id: stu.classId } } as any)
    if (!cls) throw new BadRequestException('班级不存在')
    return { teacherId: cls.teacherId, classId: stu.classId, studentName: (stu as any).name }
  }

  /** 单学生五维分值聚合（0–100，用于雷达图，反映相对成长而非绝对排名） */
  private aggregateOne(
    sid: string,
    bulk: { grades: Grade[]; checkins: Checkin[]; readings: ReadingLog[]; scores: ScoreRecord[]; rewards: RewardRecord[]; awards: AwardRecord[]; moods: MoodCheckIn[]; badges: CodingBadge[]; reviews: CodingReview[]; fedu: FiveEduRecord[] },
  ): Record<FiveEduDimension, number> {
    // 智：成绩均分（按 100 分制裁剪）
    const gradeScores = bulk.grades.flatMap((g) => (g.scores || []).filter((s) => s.studentId === sid && s.score != null).map((s) => Number(s.score!)))
    const intellectual = gradeScores.length ? clamp(gradeScores.reduce((a, b) => a + b, 0) / gradeScores.length) : 0

    // 体：体育打卡天数（每次约 +5 分）
    const sport = bulk.checkins.filter((c) => c.studentId === sid && c.type === 'sport')
    const physical = clamp(sport.length * 5)

    // 美：阅读时长（600 分钟=100）+ 编程点评星级（1–5→*20）
    const readMin = bulk.readings.filter((r) => r.studentId === sid).reduce((a, r) => a + (r.minutes || 0), 0)
    const readingScore = clamp(readMin / 6)
    const rev = bulk.reviews.filter((rv) => rv.studentId === sid && rv.rating != null)
    const reviewScore = rev.length ? clamp((rev.reduce((a, r) => a + (r.rating || 0), 0) / rev.length) * 20) : 0
    const aesthetic = clamp(readingScore * 0.6 + reviewScore * 0.4)

    // 德：正向加减分 + 行为打卡 + 奖项
    const delta = bulk.scores.filter((s) => s.studentId === sid).reduce((a, s) => a + (s.delta || 0), 0)
    const conductScore = clamp(Math.max(0, delta) * 2)
    const behavior = bulk.checkins.filter((c) => c.studentId === sid && c.type === 'behavior').length
    const behaviorScore = clamp(behavior * 5)
    const myAwards = bulk.awards.filter((a) => (a as any).tags?.includes?.(sid)) // 奖项为教师维度，按 tag 含 studentId 兜底
    const awardScore = clamp(myAwards.length * 12)
    const moral = clamp(conductScore * 0.4 + behaviorScore * 0.4 + awardScore * 0.2)

    // 劳：编程徽章 + 家务打卡（home 类型过程性评价）
    const badges = bulk.badges.filter((b) => b.studentId === sid).length
    const badgeScore = clamp(badges * 15)
    const home = bulk.fedu.filter((f) => f.studentId === sid && f.evalType === 'home').length
    const homeScore = clamp(home * 20)
    const labour = clamp(badgeScore * 0.6 + homeScore * 0.4)

    return { moral, intellectual, physical, aesthetic, labour }
  }

  /** 班级 / 单学生 五育档案 */
  async getProfile(teacherId: string, classId?: string, studentId?: string) {
    const students = await this.stuRepo.find({ where: { classId, teacherId } } as any)
    if (!students.length) return { classId, students: [], summary: '', generatedBy: 'template' as const }

    const target = studentId ? students.filter((s) => s.id === studentId) : students

    // 一次性拉取全班相关多源数据，内存聚合
    const [grades, checkins, readings, scores, rewards, awards, moods, badges, reviews, fedu] = await Promise.all([
      this.gradeRepo.find({ where: { classId, teacherId } } as any),
      this.checkinRepo.find({ where: { classId, teacherId } } as any),
      this.readingRepo.find({ where: { classId, teacherId } } as any),
      this.scoreRepo.find({ where: { classId, teacherId } } as any),
      this.rewardRepo.find({ where: { classId, teacherId } } as any),
      this.awardRepo.find({ where: { teacherId } } as any),
      this.moodRepo.find({ where: { classId, teacherId } } as any),
      this.badgeRepo.find({ where: { teacherId } } as any),
      this.reviewRepo.find({ where: { teacherId } } as any),
      this.repo.find({ where: { classId, teacherId } } as any),
    ])
    const bulk = { grades, checkins, readings, scores, rewards, awards, moods, badges, reviews, fedu }

    const list = target.map((s: any) => {
      const radar = this.aggregateOne(s.id, bulk)
      const avg = Math.round(DIMENSIONS.reduce((a, d) => a + radar[d], 0) / DIMENSIONS.length)
      return { studentId: s.id, studentName: s.name, radar, avg }
    })
    list.sort((a, b) => b.avg - a.avg)

    // 班级总览时生成 AI 点评（单学生查询不调用 AI，避免开销）
    let summary = ''
    let generatedBy: 'ai' | 'template' = 'template'
    if (!studentId && list.length) {
      const top = list.slice(0, 3).map((l) => `${l.studentName}(综合${l.avg})`).join('、')
      const dimAvg = {} as Record<FiveEduDimension, number>
      DIMENSIONS.forEach((d) => {
        const vals = list.map((l) => l.radar[d])
        dimAvg[d] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      })
      const prompt =
        `你是班主任助手。以下是我班学生「五育综合素质」雷达平均得分（0–100）：\n` +
        `德育${dimAvg.moral} 智育${dimAvg.intellectual} 体育${dimAvg.physical} 美育${dimAvg.aesthetic} 劳育${dimAvg.labour}。\n` +
        `综合靠前：${top}。请用 2–3 句温暖、具体的话总结班级五育发展亮点与可关注方向，不要使用 Markdown 标题。`
      try {
        summary = await this.ai.chatSync('teacher', teacherId, { messages: [{ role: 'user', content: prompt }] })
        generatedBy = 'ai'
      } catch {
        summary = `本班五育发展较均衡，综合表现靠前：${top || '暂无'}。可继续关注体育与劳动实践的参与广度。`
      }
    }

    return { classId, students: list, summary, generatedBy }
  }

  /** 保存一条过程性评价 / 家务打卡记录 */
  async saveRecord(teacherId: string, dto: any) {
    if (!dto?.studentId) throw new BadRequestException('缺少 studentId')
    if (!dto?.dimension || !DIMENSIONS.includes(dto.dimension)) throw new BadRequestException('维度不合法')
    const stu = await this.stuRepo.findOne({ where: { id: dto.studentId } } as any)
    const rec = this.repo.create({
      teacherId,
      studentId: dto.studentId,
      studentName: stu?.name || dto.studentName || null,
      classId: stu?.classId || dto.classId || null,
      dimension: dto.dimension,
      evalType: dto.evalType || 'teacher',
      score: Number(dto.score) || 0,
      content: dto.content || null,
      evaluatorName: dto.evaluatorName || '',
      date: dto.date || new Date().toISOString().slice(0, 10),
    } as any)
    return this.repo.save(rec as any)
  }

  /** 查询过程性评价记录（按学生） */
  async listRecords(teacherId: string, studentId?: string) {
    const where: any = { teacherId }
    if (studentId) where.studentId = studentId
    return this.repo.find({ where, order: { date: 'DESC' } } as any)
  }

  /** 家长端：当前绑定学生的五育档案 */
  async parentProfile(studentId: string) {
    const { teacherId, classId } = await this.resolveTeacherId(studentId)
    const profile = await this.getProfile(teacherId, classId, studentId)
    const records = await this.repo.find({ where: { teacherId, studentId } as any, order: { date: 'DESC' } } as any)
    return { ...profile, records }
  }
}
