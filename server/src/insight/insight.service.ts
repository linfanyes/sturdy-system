import { Injectable, Logger, Inject } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ClassInsight, InsightStudentDelta } from './insight.entity'
import { MoodCheckIn } from '../mood/mood.entity'
import { Grade } from '../grades/grade.entity'
import { ClassItem } from '../classes/class.entity'
import { Student } from '../students/student.entity'
import { MoodService } from '../mood/mood.module'
import { AiService } from '../ai/ai.service'
import { MessageService } from '../messages/message.service'

const SYS_PROMPT_INSIGHT =
  '你是班主任的「班级助教」。下面是一段结构化的班级周度数据（JSON），请用温暖、专业、克制的中文写一段 160 字以内的班级洞察备忘：先一句话总体状态，再点名需要关注的情绪波动学生与学业明显进退步的学生，最后给一句可执行的建议。不要编造数据中没有的信息，不要出现学生真实姓名（用「某同学」代称），语气像资深班主任写给自己看的工作笔记。'

const SYS_PROMPT_BUDDY =
  '你是面向中小学学生的 AI 学习伙伴。请始终用中文、鼓励式、适龄地帮助学生解答课业问题、梳理学习方法、做轻量情绪陪伴。' +
  '遵守：不讨论成人、暴力、政治、医疗诊断；不索要或泄露个人隐私（姓名、学校、电话等）；' +
  '遇到疑似心理危机或自伤内容，温柔地引导其告诉信任的成人或老师，并说明可以拨打心理援助热线 400-161-9995（北京心理危机研究与干预中心）。每次回答不超过 200 字。'

// 简单内容护栏：命中即视为需要温柔转介的危机信号
const CRISIS_KEYWORDS = ['不想活', '活不下去', '自杀', '自残', '自伤', '结束生命', '消失吧']

@Injectable()
export class InsightService {
  private readonly logger = new Logger(InsightService.name)

  constructor(
    @InjectRepository(ClassInsight) private readonly insightRepo: Repository<ClassInsight>,
    @InjectRepository(MoodCheckIn) private readonly moodRepo: Repository<MoodCheckIn>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(ClassItem) private readonly classRepo: Repository<ClassItem>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    @Inject(MoodService) private readonly mood: MoodService,
    @Inject(AiService) private readonly ai: AiService,
    @Inject(MessageService) private readonly msg: MessageService,
  ) {}

  /** 该教师带过的班级（取成绩表去重 classId） */
  async getTeacherClasses(teacherId: string): Promise<string[]> {
    const rows = await this.gradeRepo
      .createQueryBuilder('g')
      .select('g.classId', 'classId')
      .distinct(true)
      .where('g.teacherId = :t', { t: teacherId })
      .getRawMany()
    return rows.map((r) => r.classId).filter(Boolean)
  }

  weekRange(ref = new Date()) {
    const end = new Date(ref)
    const start = new Date(ref)
    start.setDate(end.getDate() - 6)
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    const onejan = new Date(end.getFullYear(), 0, 1)
    const week = Math.ceil((((end.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7)
    return { weekStart: fmt(start), weekEnd: fmt(end), weekLabel: `${end.getFullYear()}-W${week}` }
  }

  private async nameMap(ids: string[]): Promise<Record<string, string>> {
    const clean = [...new Set(ids.filter(Boolean))]
    if (!clean.length) return {}
    const rows = await this.stuRepo.find({ where: clean.map((id) => ({ id })) as any })
    return Object.fromEntries(rows.map((s) => [s.id, s.name]))
  }

  /** 计算单个班级的原始洞察数据（不调用 AI） */
  async computeRaw(teacherId: string, classId: string, weekStart: string, weekEnd: string) {
    const moodDash = await this.mood.dashboard(teacherId, classId, weekStart, weekEnd)
    const grades = await this.gradeRepo.find({ where: { teacherId, classId } as any, order: { date: 'DESC' } })

    const byExam = new Map<string, { date: string; name: string; scores: { studentId: string; score: number }[] }>()
    for (const g of grades) {
      const key = `${g.date}__${g.examName}`
      if (!byExam.has(key)) byExam.set(key, { date: g.date, name: g.examName, scores: [] })
      for (const s of g.scores || []) if (s.score != null) byExam.get(key)!.scores.push({ studentId: s.studentId, score: s.score })
    }
    const exams = [...byExam.values()].sort((a, b) => (a.date < b.date ? -1 : 1))

    let gradeLatestAvg: number | null = null
    let gradePrevAvg: number | null = null
    let gradeDelta: number | null = null
    let gradeImproved: InsightStudentDelta[] = []
    let gradeDeclined: InsightStudentDelta[] = []

    if (exams.length >= 2) {
      const avg = (arr: { score: number }[]) => (arr.length ? Math.round((arr.reduce((s, x) => s + x.score, 0) / arr.length) * 100) / 100 : null)
      const latest = exams[exams.length - 1]
      const prev = exams[exams.length - 2]
      gradeLatestAvg = avg(latest.scores)
      gradePrevAvg = avg(prev.scores)
      gradeDelta = gradeLatestAvg != null && gradePrevAvg != null ? Math.round((gradeLatestAvg - gradePrevAvg) * 100) / 100 : null

      const toMap = (list: { studentId: string; score: number }[]) => {
        const m: Record<string, number[]> = {}
        for (const x of list) (m[x.studentId] = m[x.studentId] || []).push(x.score)
        return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length]))
      }
      const aL = toMap(latest.scores)
      const aP = toMap(prev.scores)
      const deltas: InsightStudentDelta[] = []
      for (const sid of new Set([...Object.keys(aL), ...Object.keys(aP)])) {
        if (aL[sid] != null && aP[sid] != null) deltas.push({ studentId: sid, studentName: null, delta: Math.round((aL[sid] - aP[sid]) * 100) / 100 })
      }
      deltas.sort((a, b) => b.delta - a.delta)
      const names = await this.nameMap(deltas.map((d) => d.studentId))
      gradeImproved = deltas.filter((d) => d.delta > 0).slice(0, 3).map((d) => ({ ...d, studentName: names[d.studentId] || null }))
      gradeDeclined = deltas.filter((d) => d.delta < 0).slice(0, 3).map((d) => ({ ...d, studentName: names[d.studentId] || null }))
    }

    return {
      emotionAvg: moodDash.avgLevel || null,
      lowMoodCount: moodDash.lowStreak?.length || 0,
      lowMoodStudents: (moodDash.lowStreak || []).slice(0, 5).map((s: any) => ({ studentId: s.studentId, studentName: s.studentName || null, delta: s.streak })),
      gradeLatestAvg,
      gradePrevAvg,
      gradeDelta,
      gradeImproved,
      gradeDeclined,
    }
  }

  private templateSummary(d: any, className: string): string {
    const parts: string[] = [`【${className}】本周班级状态：情绪均值 ${(d.emotionAvg ?? 0).toFixed(1)}/5`]
    if (d.lowMoodCount > 0) parts.push(`有 ${d.lowMoodCount} 名学生出现连续低落，建议私聊关怀`)
    if (d.gradeDelta != null) parts.push(`学业均分较上次 ${d.gradeDelta > 0 ? '上升' : '下降'} ${Math.abs(d.gradeDelta)} 分`)
    if (d.gradeImproved?.length) parts.push(`进步明显：${d.gradeImproved.map((x: any) => x.studentName || '某同学').join('、')}`)
    if (d.gradeDeclined?.length) parts.push(`需关注下滑：${d.gradeDeclined.map((x: any) => x.studentName || '某同学').join('、')}`)
    if (parts.length === 1) parts.push('数据平稳，保持关注即可')
    return parts.join('；') + '。'
  }

  /** 计算 + AI 润色 + 落库，返回洞察实体 */
  async buildAndStore(teacherId: string, classId: string): Promise<ClassInsight> {
    const { weekStart: ws, weekEnd: we, weekLabel } = this.weekRange()
    const cls = await this.classRepo.findOne({ where: { id: classId } as any })
    const className = cls?.name || classId
    const raw = await this.computeRaw(teacherId, classId, ws, we)

    let summary = this.templateSummary(raw, className)
    let generatedBy: 'ai' | 'template' = 'template'
    try {
      const aiText = await this.ai.chatSync('teacher', teacherId, {
        messages: [
          { role: 'system', content: SYS_PROMPT_INSIGHT },
          { role: 'user', content: JSON.stringify({ className, ...raw }) },
        ],
        temperature: 0.6,
      })
      if (aiText && aiText.length > 10 && !aiText.includes('未连接')) {
        summary = aiText
        generatedBy = 'ai'
      }
    } catch (e) {
      this.logger.warn('AI 洞察生成失败，使用模板：' + (e as Error).message)
    }

    const entity = this.insightRepo.create({
      teacherId,
      classId,
      className,
      weekLabel,
      weekStart: ws,
      weekEnd: we,
      ...raw,
      summary,
      generatedBy,
    })
    return (await this.insightRepo.save(entity)) as ClassInsight
  }

  /** 推送某班级的洞察给班主任（消息中心） */
  async pushToTeacher(teacherId: string, insight: ClassInsight) {
    await this.msg.send('system', 'system', {
      recipientId: teacherId,
      recipientRole: 'teacher',
      title: `【班级洞察】${insight.className} 本周`,
      content: insight.summary,
      type: 'class_insight',
    })
  }

  /** 取教师各班级最新一条洞察 */
  async getLatestForTeacher(teacherId: string): Promise<ClassInsight[]> {
    const classes = await this.getTeacherClasses(teacherId)
    const res: ClassInsight[] = []
    for (const cid of classes) {
      const one = await this.insightRepo.findOne({ where: { teacherId, classId: cid } as any, order: { createdAt: 'DESC' } })
      if (one) res.push(one)
    }
    return res
  }

  /** 学生 AI 学习伙伴（家长端调用，带内容安全护栏） */
  async studyBuddy(ownerId: string, messages: { role: string; content: string }[], studentName?: string) {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    const text = lastUser?.content || ''
    const crisis = CRISIS_KEYWORDS.some((k) => text.includes(k))
    if (crisis) {
      return {
        crisis: true,
        reply:
          '听到你这么说我很担心你。你很重要，请一定要告诉身边信任的大人、老师或拨打心理援助热线 400-161-9995，会有专业的人陪你。我在这里，但你值得被真实地照顾到。',
      }
    }
    try {
      const reply = await this.ai.chatSync('parent', ownerId, {
        messages: [{ role: 'system', content: SYS_PROMPT_BUDDY + (studentName ? ` 当前对话的孩子叫${studentName}。` : '') }, ...messages],
        temperature: 0.5,
      })
      return { crisis: false, reply: reply || '我好像没连上，稍后再来问我吧～' }
    } catch (e) {
      return { crisis: false, reply: '我暂时连不上，稍后再来问我吧～' }
    }
  }

  /** 教师事务自动化：基于本班真实数据一键生成班级文案（家长会发言稿/致家长信/学期总结/班级寄语） */
  async generateClassDoc(teacherId: string, classId: string, type: 'letter' | 'speech' | 'summary' | 'blessing') {
    const cls = await this.classRepo.findOne({ where: { id: classId } as any })
    const className = cls?.name || classId
    const studentCount = await this.stuRepo.count({ where: { classId } as any })
    const { weekStart: ws, weekEnd: we } = this.weekRange()
    const raw = await this.computeRaw(teacherId, classId, ws, we)

    const prompts: Record<string, string> = {
      letter:
        '你是班主任的文书助手。请基于下面的班级周度数据，写一封 350 字左右的《致家长的一封信》：语气真诚、专业、温暖，感谢家长配合，客观介绍班级近况（情绪、学业进退步），对需关注的方面给建设性建议，避免点名具体学生。',
      speech:
        '你是班主任的文书助手。请基于下面的班级周度数据，写一篇 400 字左右的家长会发言稿开场：自信、有条理、有温度，先问候家长，再概述班级整体状态与亮点，引出后续交流。避免点名具体学生。',
      summary:
        '你是班主任的文书助手。请基于下面的班级周度数据，写一段 300 字左右的学期/阶段总结：先总评班级状态，再谈学业与情绪两方面，最后给出下阶段班级建设目标。避免点名具体学生。',
      blessing:
        '你是班主任的文书助手。请基于下面的班级周度数据，写一段 120 字左右的班级寄语，鼓励全班、温暖向上，可提及「一起进步」等意象。避免点名具体学生。',
    }

    let content = '生成失败，请稍后重试。'
    try {
      const text = await this.ai.chatSync('teacher', teacherId, {
        messages: [
          { role: 'system', content: prompts[type] || prompts.letter },
          { role: 'user', content: JSON.stringify({ className, studentCount, ...raw }) },
        ],
        temperature: 0.7,
      })
      if (text && text.length > 10 && !text.includes('未连接')) content = text
    } catch (e) {
      this.logger.warn('班级文案生成失败：' + (e as Error).message)
    }
    return { type, className, studentCount, content }
  }
}
