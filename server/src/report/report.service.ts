import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Not, IsNull } from 'typeorm'
import { Report } from './report.entity'
import { Grade } from '../grades/grade.entity'
import { MoodCheckIn } from '../mood/mood.entity'
import { HabitCheckin } from '../habit/habit.entity'
import { SafetyReport } from '../safety/safety.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { AiService } from '../ai/ai.service'
import { MessageService } from '../messages/message.service'

interface Metrics {
  studentCount: number
  gradeCount: number
  subjects: number
  moodAlert: number
  habitCheckins: number
  safetyOpen: number
}

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Report) private readonly repo: Repository<Report>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(MoodCheckIn) private readonly moodRepo: Repository<MoodCheckIn>,
    @InjectRepository(HabitCheckin) private readonly habitRepo: Repository<HabitCheckin>,
    @InjectRepository(SafetyReport) private readonly safetyRepo: Repository<SafetyReport>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    private readonly ai: AiService,
    private readonly msg: MessageService,
  ) {}

  private range(type: 'weekly' | 'monthly') {
    const now = new Date()
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    if (type === 'weekly') {
      const dow = now.getDay() || 7
      const monday = new Date(now)
      monday.setDate(now.getDate() - dow + 1)
      const sunday = new Date(monday)
      sunday.setDate(monday.getDate() + 6)
      const y = monday.getFullYear()
      const wk = Math.ceil(((monday.getTime() - new Date(y, 0, 1).getTime()) / 86400000 + 1) / 7)
      return { from: fmt(monday), to: fmt(sunday), label: `${y}-W${wk}` }
    }
    const y = now.getFullYear()
    const m = now.getMonth()
    const first = new Date(y, m, 1)
    const last = new Date(y, m + 1, 0)
    return { from: fmt(first), to: fmt(last), label: `${y}-${String(m + 1).padStart(2, '0')}` }
  }

  private async buildMetrics(classId: string): Promise<Metrics> {
    const [grades, moods, checkins, safety, students] = await Promise.all([
      this.gradeRepo.find({ where: { classId } } as any),
      this.moodRepo.find({ where: { classId: classId as any } } as any),
      this.habitRepo.find({ where: { classId: classId as any } } as any),
      this.safetyRepo.find({ where: { classId: classId as any, status: 'pending' } } as any),
      this.stuRepo.find({ where: { classId } } as any),
    ])
    const moodAlert = moods.filter((m: any) => (m.level ?? 5) <= 2).length
    return {
      studentCount: students.length,
      gradeCount: grades.length,
      subjects: new Set(grades.map((g: any) => g.subject)).size,
      moodAlert,
      habitCheckins: checkins.length,
      safetyOpen: safety.length,
    }
  }

  private async className(classId: string) {
    const c = await this.classRepo.findOne({ where: { id: classId } } as any)
    return c?.name || classId
  }

  /** 生成并保存一份报告（同步生成，手动或定时调用） */
  async generate(teacherId: string, classId: string, type: 'weekly' | 'monthly') {
    const { from, to, label } = this.range(type)
    const metrics = await this.buildMetrics(classId)
    const cn = await this.className(classId)
    const periodName = type === 'weekly' ? '本周' : '本月'
    const prompt =
      `你是班主任助手。以下是本班${periodName}（${label}）的聚合数据，请写一份温暖、具体、可执行的班级报告，` +
      `3–5 段，不用 Markdown 标题，用换行分段，开头一句话点出整体印象：\n` +
      JSON.stringify(metrics, null, 2)
    let content = ''
    let generatedBy: 'ai' | 'template' = 'template'
    try {
      content = await this.ai.chatSync('teacher', teacherId, { messages: [{ role: 'user', content: prompt }] })
      generatedBy = 'ai'
    } catch {
      content = `${cn}${periodName}班级报告已生成。共 ${metrics.studentCount} 名学生，成绩记录 ${metrics.gradeCount} 条、覆盖 ${metrics.subjects} 个学科；习惯打卡 ${metrics.habitCheckins} 次；需关注情绪的学生约 ${metrics.moodAlert} 人；待处理安全事项 ${metrics.safetyOpen} 项。`
    }
    const report = this.repo.create({
      teacherId,
      classId,
      className: cn,
      type,
      periodLabel: label,
      title: `${cn} ${type === 'weekly' ? '周报' : '月报'} ${label}`,
      content,
      metrics: JSON.stringify(metrics),
      generatedBy,
      fromDate: from,
      toDate: to,
    } as any)
    return (await this.repo.save(report)) as unknown as Report
  }

  listByClass(teacherId: string, classId: string, type?: string) {
    const where: any = { teacherId, classId }
    if (type) where.type = type
    return this.repo.find({ where, order: { createdAt: 'DESC' } } as any)
  }

  async latest(teacherId: string, classId: string, type: 'weekly' | 'monthly') {
    const list = await this.repo.find({ where: { teacherId, classId, type } as any, order: { createdAt: 'DESC' } } as any)
    return list[0] || null
  }

  /** 家长端：取当前学生班级的最新报告 */
  async parentLatest(studentId: string, type: 'weekly' | 'monthly') {
    const s = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    if (!s) throw new NotFoundException('学生不存在')
    const list = await this.repo.find({ where: { classId: (s as any).classId, type } as any, order: { createdAt: 'DESC' } } as any)
    return list[0] || null
  }
}
