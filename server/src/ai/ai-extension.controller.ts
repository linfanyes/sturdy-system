import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { AiService } from './ai.service'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Student } from '../students/student.entity'
import { Grade, GradeScore } from '../grades/grade.entity'

/**
 * AI 能力扩展接口
 * 
 * 提供智能评语生成、学生个性化学习建议、班级学情周报等 AI 增强能力。
 * 所有接口均为 SSE 流式输出，与现有 AI 对话保持一致的调用模式。
 */
@Roles('teacher')
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('ai/extend')
export class AiExtensionController {
  constructor(
    private readonly ai: AiService,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
  ) {}

  /**
   * 智能评语生成
   * 
   * 根据学生表现数据（成绩、行为记录、奖励记录）自动生成个性化评语。
   * 输入：studentId + 评语类型（期末/月度/观察）
   * 输出：流式生成的评语文本
   */
  @Post('comment')
  async generateComment(
    @Body() body: { studentId: string; commentType?: 'monthly' | 'final' | 'observation'; className?: string },
    @CurrentTeacher() t: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const { studentId, commentType = 'monthly', className = '' } = body

    // 获取学生数据作为上下文
    const student = await this.studentRepo.findOne({ where: { id: studentId } })
    if (!student) {
      res.write(`data: ${JSON.stringify({ error: '学生不存在' })}\n\n`)
      res.write('data: [DONE]\n\n')
      return res.end()
    }

    // Grade 实体中成绩以 scores JSON 数组存储，需按班级查询后在应用层过滤该生成绩
    const classGrades = await this.gradeRepo.find({
      where: { classId: student.classId },
      order: { createdAt: 'DESC' },
      take: 20,
    })
    const recentGrades = extractStudentScores(studentId, classGrades, 5)

    const prompt = this.buildCommentPrompt(student.name, commentType, className, recentGrades)

    const keepAliveTimer = setInterval(() => { res.write(': keep-alive\n\n') }, 15000)
    try {
      await this.ai.chatStream('teacher', t.sub, { messages: [{ role: 'user', content: prompt }] }, (delta: string): boolean => {
        return res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      })
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e?.message || '生成失败' })}\n\n`)
    }
    clearInterval(keepAliveTimer)
    res.write('data: [DONE]\n\n')
    res.end()
  }

  /**
   * 学生个性化学习建议
   * 
   * 根据学生历次考试成绩和知识点掌握情况，生成个性化学习建议。
   */
  @Post('learning-suggestion')
  async generateLearningSuggestion(
    @Body() body: { studentId: string },
    @CurrentTeacher() t: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const { studentId } = body
    const student = await this.studentRepo.findOne({ where: { id: studentId } })
    if (!student) {
      res.write(`data: ${JSON.stringify({ error: '学生不存在' })}\n\n`)
      res.write('data: [DONE]\n\n')
      return res.end()
    }

    const classGrades = await this.gradeRepo.find({
      where: { classId: student.classId },
      order: { createdAt: 'DESC' },
      take: 20,
    })
    const grades = extractStudentScores(studentId, classGrades, 10)

    const prompt = `请根据以下学生成绩数据，生成个性化学习建议：
学生姓名：${student.name}
班级：${student.classId || '未知'}
近期成绩：${JSON.stringify(grades.map(g => ({ subject: g.subject, score: g.score, examId: g.examId })))}

请分析：
1. 该生优势学科和薄弱学科
2. 各学科知识点掌握情况
3. 针对性学习建议和方法推荐`

    const keepAliveTimer = setInterval(() => { res.write(': keep-alive\n\n') }, 15000)
    try {
      await this.ai.chatStream('teacher', t.sub, { messages: [{ role: 'user', content: prompt }] }, (delta: string): boolean => {
        return res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      })
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e?.message || '生成失败' })}\n\n`)
    }
    clearInterval(keepAliveTimer)
    res.write('data: [DONE]\n\n')
    res.end()
  }

  /**
   * 家长沟通话术建议
   * 
   * 根据学生近期表现，生成与家长沟通的建议话术。
   */
  @Post('parent-communication')
  async generateParentCommunication(
    @Body() body: { studentId: string; topic?: string },
    @CurrentTeacher() t: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const { studentId, topic = '' } = body
    const student = await this.studentRepo.findOne({ where: { id: studentId } })
    if (!student) {
      res.write(`data: ${JSON.stringify({ error: '学生不存在' })}\n\n`)
      res.write('data: [DONE]\n\n')
      return res.end()
    }

    const classGrades = await this.gradeRepo.find({
      where: { classId: student.classId },
      order: { createdAt: 'DESC' },
      take: 20,
    })
    const grades = extractStudentScores(studentId, classGrades, 5)

    const prompt = `请根据以下学生情况，生成与家长沟通的建议话术：
学生姓名：${student.name}
${topic ? `沟通主题：${topic}` : ''}
近期成绩：${JSON.stringify(grades.map(g => ({ subject: g.subject, score: g.score })))}

请生成：
1. 开场白（肯定学生优点）
2. 需要沟通的具体问题
3. 建议家长配合的事项
4. 结束语（积极鼓励）`

    const keepAliveTimer = setInterval(() => { res.write(': keep-alive\n\n') }, 15000)
    try {
      await this.ai.chatStream('teacher', t.sub, { messages: [{ role: 'user', content: prompt }] }, (delta: string): boolean => {
        return res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      })
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e?.message || '生成失败' })}\n\n`)
    }
    clearInterval(keepAliveTimer)
    res.write('data: [DONE]\n\n')
    res.end()
  }

  /**
   * 期末总结生成
   * 
   * 生成教师个人工作总结（班主任工作总结/学科教学总结）。
   */
  @Post('summary')
  async generateSummary(
    @Body() body: { type?: 'class' | 'subject' | 'personal'; semesterName?: string },
    @CurrentTeacher() t: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()

    const { type = 'class', semesterName = '' } = body

    const prompt = `请帮我撰写一份${type === 'class' ? '班主任工作总结' : type === 'subject' ? '学科教学总结' : '个人工作总结'}${semesterName ? `（${semesterName}）` : ''}。

要求：
1. 结构完整（工作回顾、主要成绩、存在问题、改进措施）
2. 内容详实、具体
3. 语言规范、专业
4. 字数 800-1500 字`

    const keepAliveTimer = setInterval(() => { res.write(': keep-alive\n\n') }, 15000)
    try {
      await this.ai.chatStream('teacher', t.sub, { messages: [{ role: 'user', content: prompt }] }, (delta: string): boolean => {
        return res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      })
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ error: e?.message || '生成失败' })}\n\n`)
    }
    clearInterval(keepAliveTimer)
    res.write('data: [DONE]\n\n')
    res.end()
  }

  private buildCommentPrompt(name: string, type: string, className: string, grades: StudentScoreView[]): string {
    const typeLabel = type === 'final' ? '期末评语' : type === 'monthly' ? '月度评语' : '观察记录'
    return `请为以下学生撰写一份${typeLabel}：
学生姓名：${name}
班级：${className}
近期成绩：${JSON.stringify(grades.map(g => ({ subject: g.subject, score: g.score })))}

要求：
1. 评语客观、具体，体现学生特点
2. 先肯定优点，再提出改进建议
3. 语言亲切、富有激励性
4. 字数 100-200 字`
}

}
/** 学生成绩视图（从 Grade.scores JSON 中提取） */
interface StudentScoreView {
  subject: string
  examName: string
  examId: string
  date: string
  score: number | null
}

/**
 * 从 Grade 实体的 scores JSON 数组中提取指定学生的成绩
 * Grade 实体以 scores: GradeScore[] 存储全班成绩，需按 studentId 过滤
 */
function extractStudentScores(
  studentId: string,
  grades: Grade[],
  limit: number,
): StudentScoreView[] {
  const result: StudentScoreView[] = []
  for (const g of grades) {
    if (!Array.isArray(g.scores)) continue
    const match = g.scores.find((s: GradeScore) => s.studentId === studentId)
    if (match && match.score != null) {
      result.push({
        subject: g.subject,
        examName: g.examName,
        examId: g.examId,
        date: g.date,
        score: match.score,
      })
    }
    if (result.length >= limit) break
  }
  return result
}
