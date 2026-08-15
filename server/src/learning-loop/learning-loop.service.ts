import { Injectable, BadRequestException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StudyPlan, WeakPointExercise } from './learning-loop.entity'
import { Student } from '../students/student.entity'
import { ClassItem } from '../classes/class.entity'
import { MathMistake } from '../math-mistakes/math-mistakes.module'
import { Grade } from '../grades/grade.entity'
import { AiService } from '../ai/ai.service'

function weekLabelOf(d = new Date()): string {
  const date = new Date(d)
  const onejan = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((+date - +onejan) / 86400000 + onejan.getDay() + 1) / 7)
  return `${date.getFullYear()}-W${String(week).padStart(2, '0')}`
}

export interface WeakPoint {
  kp: string
  count: number
  source: 'mistake' | 'grade'
}

@Injectable()
export class LearningLoopService {
  constructor(
    @InjectRepository(StudyPlan) private readonly planRepo: Repository<StudyPlan>,
    @InjectRepository(WeakPointExercise) private readonly exRepo: Repository<WeakPointExercise>,
    @InjectRepository(Student) private readonly stuRepo: Repository<Student>,
    @InjectRepository(ClassItem) private readonly clsRepo: Repository<ClassItem>,
    @InjectRepository(MathMistake) private readonly mistakeRepo: Repository<MathMistake>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    private readonly ai: AiService,
  ) {}

  private async resolveTeacherId(studentId: string): Promise<{ teacherId: string; classId: string; studentName: string }> {
    const stu = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    if (!stu) throw new BadRequestException('学生不存在')
    const cls = await this.clsRepo.findOne({ where: { id: stu.classId } } as any)
    if (!cls) throw new BadRequestException('班级不存在')
    return { teacherId: cls.teacherId, classId: stu.classId, studentName: (stu as any).name }
  }

  /** 学情画像：聚合错题知识点 + 成绩薄弱点，输出每生薄弱清单 */
  async getProfile(teacherId: string, classId?: string, studentId?: string) {
    const students = await this.stuRepo.find({ where: { classId, teacherId } } as any)
    if (!students.length) return { classId, students: [] }
    const target = studentId ? students.filter((s) => s.id === studentId) : students
    const nameToId = new Map<string, string>(students.map((s: any) => [s.name, s.id]))

    const [mistakes, grades] = await Promise.all([
      this.mistakeRepo.find({ where: { classId, teacherId } } as any),
      this.gradeRepo.find({ where: { classId, teacherId } } as any),
    ])

    // 错题知识点（按学生聚合）
    const byStudent = new Map<string, Map<string, number>>()
    for (const m of mistakes as any[]) {
      const sid = nameToId.get(m.studentName)
      if (!sid) continue
      if (!byStudent.has(sid)) byStudent.set(sid, new Map())
      const kp = m.knowledgePoint || '未分类'
      byStudent.get(sid)!.set(kp, (byStudent.get(sid)!.get(kp) || 0) + 1)
    }

    // 成绩薄弱学科（学生均分低于班级均分）
    const bySubject: Record<string, number[]> = {}
    for (const g of grades) {
      const scores = (g.scores || []).filter((s: any) => s.score != null).map((s: any) => Number(s.score))
      if (scores.length) bySubject[g.subject] = (bySubject[g.subject] || []).concat(scores)
    }
    const subjectAvg: Record<string, number> = {}
    for (const [sub, arr] of Object.entries(bySubject)) subjectAvg[sub] = arr.reduce((a, b) => a + b, 0) / arr.length

    const list = target.map((s: any) => {
      const kpMap = byStudent.get(s.id) || new Map<string, number>()
      const weak: WeakPoint[] = [...kpMap.entries()]
        .map(([kp, count]) => ({ kp, count, source: 'mistake' as const }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
      // 成绩维度：找出该生低于班级均分的学科，作为补充薄弱点
      for (const g of grades) {
        const entry = (g.scores || []).find((e: any) => e.studentId === s.id && e.score != null)
        if (entry && subjectAvg[g.subject] && Number(entry.score) < subjectAvg[g.subject] - 5) {
          weak.push({ kp: `${g.subject}（均分偏低）`, count: 1, source: 'grade' as const })
        }
      }
      return { studentId: s.id, studentName: s.name, weakPoints: weak }
    })
    return { classId, students: list }
  }

  /** AI 生成薄弱点同类题练习 */
  async generateExercise(teacherId: string, studentId: string, knowledgePoint: string) {
    if (!knowledgePoint) throw new BadRequestException('缺少知识点')
    const stu = await this.stuRepo.findOne({ where: { id: studentId } } as any)
    const prompt =
      `你是中小学辅导老师。请就知识点「${knowledgePoint}」出一道与该学生错题同类型的练习题（难度相当、表述清晰），` +
      `并给出参考答案与简要解析。\n请严格按以下格式输出：\n【题目】<题目内容>\n【答案】<参考答案>\n【解析】<简要解题步骤>`
    let text = ''
    try {
      text = await this.ai.chatSync('teacher', teacherId, { messages: [{ role: 'user', content: prompt }] })
    } catch {
      text = `【题目】关于「${knowledgePoint}」的练习暂未生成，请稍后再试。\n【答案】—\n【解析】—`
    }
    const q = text.match(/【题目】([\s\S]*?)(?:\n【答案】|$)/)?.[1]?.trim() || text
    const a = text.match(/【答案】([\s\S]*?)(?:\n【解析】|$)/)?.[1]?.trim() || ''
    const ex = this.exRepo.create({
      teacherId,
      studentId,
      studentName: stu?.name || null,
      classId: stu?.classId || null,
      knowledgePoint,
      question: q,
      answer: a || null,
      done: false,
      attempts: 0,
    } as any)
    return this.exRepo.save(ex as any)
  }

  /** 学习计划：保存（按学生+周 upsert） */
  async savePlan(teacherId: string, dto: any) {
    if (!dto?.studentId) throw new BadRequestException('缺少 studentId')
    const stu = await this.stuRepo.findOne({ where: { id: dto.studentId } } as any)
    const weekLabel = dto.weekLabel || weekLabelOf()
    const existing = await this.planRepo.findOne({ where: { teacherId, studentId: dto.studentId, weekLabel } } as any)
    const data: any = {
      teacherId,
      studentId: dto.studentId,
      studentName: stu?.name || dto.studentName || null,
      classId: stu?.classId || dto.classId || null,
      weekLabel,
      knowledgePoints: dto.knowledgePoints || [],
      progress: Number(dto.progress) || 0,
      note: dto.note || null,
    }
    if (existing) {
      Object.assign(existing, data)
      return this.planRepo.save(existing as any)
    }
    return this.planRepo.save(this.planRepo.create(data) as any)
  }

  /** 学习计划：查询（学生+周） */
  async getPlan(teacherId: string, studentId: string, weekLabel?: string) {
    const where: any = { teacherId, studentId }
    if (weekLabel) where.weekLabel = weekLabel
    const plans = await this.planRepo.find({ where, order: { weekLabel: 'DESC' } } as any)
    return plans[0] || null
  }

  /** 练习列表（学生） */
  async listExercises(teacherId: string, studentId: string) {
    return this.exRepo.find({ where: { teacherId, studentId } as any, order: { createdAt: 'DESC' } } as any)
  }

  /** 标记练习已完成 */
  async markDone(teacherId: string, id: string) {
    const ex = await this.exRepo.findOne({ where: { id, teacherId } } as any)
    if (!ex) throw new BadRequestException('练习不存在')
    ex.done = true
    ex.attempts = (ex.attempts || 0) + 1
    return this.exRepo.save(ex as any)
  }

  /** 家长端：当前学生学习计划 + 练习 */
  async parentPlan(studentId: string) {
    const { teacherId } = await this.resolveTeacherId(studentId)
    const plan = await this.getPlan(teacherId, studentId)
    const exercises = await this.listExercises(teacherId, studentId)
    return { plan, exercises }
  }

  /** 家长端：生成练习 */
  async parentGenerate(studentId: string, knowledgePoint: string) {
    const { teacherId } = await this.resolveTeacherId(studentId)
    return this.generateExercise(teacherId, studentId, knowledgePoint)
  }

  /** 家长端：标记练习已完成（内部按学生解析 teacherId） */
  async parentMarkDone(studentId: string, id: string) {
    const { teacherId } = await this.resolveTeacherId(studentId)
    return this.markDone(teacherId, id)
  }
}
