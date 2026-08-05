import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Response } from 'express'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Throttle } from '@nestjs/throttler'
import { AiService } from './ai.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { Student } from '../students/student.entity'
import { BusinessException } from '../common/exceptions/business.exception'

// AI 调用超时配置：环境变量 AI_TIMEOUT（默认 120000ms = 120s）
const AI_TIMEOUT = Number(process.env.AI_TIMEOUT) || 120000
// 非流式 AI 调用强制超时（60s），超时后返回友好错误，避免请求挂起
const NON_STREAMING_TIMEOUT = 60000

@Roles('teacher')
// AI 为高价接口（调用外部大模型 + 解析上传文件），单独限流为 10 次/分钟/IP，严于全局 60/min
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {}

  /** 非流式 AI 调用超时包装：用 Promise.race 实现 60s 强制超时，超时抛 BusinessException */
  private withAiTimeout<T>(promise: Promise<T>): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new BusinessException('AI_TIMEOUT', 'AI 响应超时，请稍后重试或简化输入内容')),
          NON_STREAMING_TIMEOUT,
        ),
      ),
    ]) as Promise<T>
  }

  /** 流式对话（SSE）。前端用 wx.request 监听分片 data: {...} */
  @Post('chat')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard)
  async chat(
    @Body() body: any,
    @CurrentTeacher() t: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    res.flushHeaders?.()
    // SSE keep-alive：每 15s 发送注释行，让客户端知道连接仍然存活
    const keepAliveTimer = setInterval(() => {
      res.write(': keep-alive\n\n')
    }, 15000)
    try {
      await this.ai.chatStream(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body, (delta: string) => {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      })
    } catch (e: any) {
      const msg = e?.message || '未连接到远端大模型，请在设置中检查AI配置后重试。'
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
      res.write('data: [DONE]\n\n')
      clearInterval(keepAliveTimer)
      res.end()
      return
    }
    clearInterval(keepAliveTimer)
    res.write('data: [DONE]\n\n')
    res.end()
  }

  /** 结构化解析（导入学生/成绩时把自由文本转为对象数组） */
  @Post('parse')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard)
  parse(@Body() body: { text: string; instruction?: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.withAiTimeout(this.ai.parse(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body))
  }

  /** 同步对话（微信小程序用，非流式） */
  @Post('chat-sync')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard)
  async chatSync(@Body() body: any, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    const content = await this.withAiTimeout(this.ai.chatSync(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body))
    return { content }
  }

  /** AI 文生图（调用服务商图片生成模型） */
  @Post('gen-image')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard)
  genImage(@Body() body: any, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.withAiTimeout(this.ai.genImage(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body))
  }

  /** AI 文生视频（调用服务商视频生成模型） */
  @Post('gen-video')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard)
  genVideo(@Body() body: any, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.withAiTimeout(this.ai.genVideo(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body))
  }

  /** 语音识别 ASR：接收 base64 音频，调用配置的 AI 服务商多模态模型转文字 */
  @Post('asr')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard)
  asr(@Body() body: { audio: string; format?: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.withAiTimeout(this.ai.asr(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body))
  }

  /** 图片 OCR：接收 base64 图片，调用多模态模型识别文字 */
  @Post('ocr')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard)
  ocr(@Body() body: { image: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.withAiTimeout(this.ai.ocr(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body))
  }

  /**
   * 文件解析：支持 TXT/PDF/图片 转文本。
   * 前端通过 uni.chooseMessageFile/uni.chooseImage 选择文件后，读 base64 上传。
   * @param body { fileName: string, fileData: string (base64) }
   * @returns { text: string } 解析后的纯文本
   */
  @Post('parse-file')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard)
  parseFile(@Body() body: { fileName: string; fileData: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.withAiTimeout(this.ai.parseFile(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body))
  }

  /** 全班考试成绩 AI 分析：取考试数据 → 按科目统计 → 大模型生成分析报告 */
  @Post('analyze-exam')
  @UseGuards(JwtAuthGuard)
  async analyzeExam(@Body() b: { examId: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    const exam = await this.examRepo.findOne({ where: { id: b.examId } })
    if (!exam || exam.teacherId !== t.sub) return { content: '考试不存在或无权限' }
    const grades = await this.gradeRepo.find({ where: { classId: exam.classId }, take: 500 })
    const byExam = grades.filter(g => g.examId === exam.id || g.examName === exam.name)
    const lines: string[] = [
      `考试：${exam.name}（${exam.date}，${exam.term}）`,
      `科目：${(exam.subjects || []).join('、')}`,
      `班级人数：用于分析的学生来自该班考试记录`,
    ]
    for (const g of byExam) {
      const scores = (g.scores || []).filter(s => s.score != null).map(s => s.score!)
      if (!scores.length) continue
      const total = scores.reduce((a, b) => a + b, 0)
      const avg = (total / scores.length).toFixed(1)
      const max = Math.max(...scores)
      const min = Math.min(...scores)
      const passCount = scores.filter(v => v >= 60).length
      lines.push(
        `${g.subject}：均${avg} / 最高${max} / 最低${min} / 及格${passCount}/${scores.length}人`,
      )
    }
    const prompt = `你是资深教务分析师。请根据以下班级考试成绩数据，生成一份分析报告：
1) 总体评价
2) 各学科亮点与薄弱点
3) 改进建议（具体、可操作）
\n${lines.join('\n')}`
    const content = await this.withAiTimeout(this.ai.chatSync('teacher', t.sub, { messages: [{ role: 'user', content: prompt }] }))
    return { content }
  }

  /** 学生个体学情 AI 诊断：取该生历次成绩 → 趋势 → 诊断建议 */
  @Post('diagnose')
  @UseGuards(JwtAuthGuard)
  async diagnose(@Body() b: { studentId: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    const stu = await this.studentRepo.findOne({ where: { id: b.studentId } })
    if (!stu || stu.teacherId !== t.sub) return { content: '学生不存在或无权限' }
    const grades = await this.gradeRepo.find({ where: { classId: stu.classId }, take: 500 })
    const lines: string[] = [`学生：${stu.name}（${stu.gender}）`, `班级：${stu.classId}`]
    for (const g of grades) {
      const entry = (g.scores || []).find(s => s.studentId === b.studentId)
      if (!entry || entry.score == null) continue
      lines.push(`${g.examName || '测验'} ${g.subject}：${entry.score}分（${g.date}）`)
    }
    if (lines.length <= 2) return { content: '该生暂无成绩数据，无法生成诊断报告。' }
    const prompt = `你是资深教育诊断师。请根据以下学生成绩记录，生成一份学情诊断报告：
1) 学业趋势（上升/稳定/下滑）
2) 优势学科与薄弱学科
3) 针对性提升建议（具体、可操练）
\n${lines.join('\n')}`
    const content = await this.withAiTimeout(this.ai.chatSync('teacher', t.sub, { messages: [{ role: 'user', content: prompt }] }))
    return { content }
  }
}
