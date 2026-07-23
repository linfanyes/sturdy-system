import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AiService } from './ai.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { Grade } from '../grades/grade.entity'
import { Exam } from '../exams/exam.entity'
import { Student } from '../students/student.entity'

@Roles('teacher')
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    @InjectRepository(Grade) private readonly gradeRepo: Repository<Grade>,
    @InjectRepository(Exam) private readonly examRepo: Repository<Exam>,
    @InjectRepository(Student) private readonly studentRepo: Repository<Student>,
  ) {}

  /** 流式对话（SSE）。前端用 wx.request 监听分片 data: {...} */
  @Post('chat')
  @UseGuards(JwtAuthGuard)
  async chat(
    @Body() body: any,
    @CurrentTeacher() t: any,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders?.()
    try {
      await this.ai.chatStream(t.sub, body, (delta: string) => {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`)
      })
    } catch (e: any) {
      const msg = e?.message || '未连接到远端大模型，请在设置中检查AI配置后重试。'
      res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }
    res.write('data: [DONE]\n\n')
    res.end()
  }

  /** 结构化解析（导入学生/成绩时把自由文本转为对象数组） */
  @Post('parse')
  @UseGuards(JwtAuthGuard)
  parse(@Body() body: { text: string; instruction?: string }, @CurrentTeacher() t: any) {
    return this.ai.parse(t.sub, body)
  }

  /** 同步对话（微信小程序用，非流式） */
  @Post('chat-sync')
  @UseGuards(JwtAuthGuard)
  chatSync(@Body() body: any, @CurrentTeacher() t: any) {
    return this.ai.chatSync(t.sub, body).then((content) => ({ content }))
  }

  /** AI 文生图（调用服务商图片生成模型） */
  @Post('gen-image')
  @UseGuards(JwtAuthGuard)
  genImage(@Body() body: any, @CurrentTeacher() t: any) {
    return this.ai.genImage(t.sub, body)
  }

  /** AI 文生视频（调用服务商视频生成模型） */
  @Post('gen-video')
  @UseGuards(JwtAuthGuard)
  genVideo(@Body() body: any, @CurrentTeacher() t: any) {
    return this.ai.genVideo(t.sub, body)
  }

  /** 语音识别 ASR：接收 base64 音频，调用配置的 AI 服务商多模态模型转文字 */
  @Post('asr')
  @UseGuards(JwtAuthGuard)
  asr(@Body() body: { audio: string; format?: string }, @CurrentTeacher() t: any) {
    return this.ai.asr(t.sub, body)
  }

  /** 图片 OCR：接收 base64 图片，调用多模态模型识别文字 */
  @Post('ocr')
  @UseGuards(JwtAuthGuard)
  ocr(@Body() body: { image: string }, @CurrentTeacher() t: any) {
    return this.ai.ocr(t.sub, body)
  }

  /**
   * 文件解析：支持 TXT/PDF/图片 转文本。
   * 前端通过 uni.chooseMessageFile/uni.chooseImage 选择文件后，读 base64 上传。
   * @param body { fileName: string, fileData: string (base64) }
   * @returns { text: string } 解析后的纯文本
   */
  @Post('parse-file')
  @UseGuards(JwtAuthGuard)
  parseFile(@Body() body: { fileName: string; fileData: string }, @CurrentTeacher() t: any) {
    return this.ai.parseFile(t.sub, body)
  }

  /** 全班考试成绩 AI 分析：取考试数据 → 按科目统计 → 大模型生成分析报告 */
  @Post('analyze-exam')
  @UseGuards(JwtAuthGuard)
  async analyzeExam(@Body() b: { examId: string }, @CurrentTeacher() t: any) {
    const exam = await this.examRepo.findOne({ where: { id: b.examId } })
    if (!exam || exam.teacherId !== t.sub) return { content: '考试不存在或无权限' }
    const grades = await this.gradeRepo.find({ where: { classId: exam.classId } })
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
    const content = await this.ai.chatSync(t.sub, { messages: [{ role: 'user', content: prompt }] })
    return { content }
  }

  /** 学生个体学情 AI 诊断：取该生历次成绩 → 趋势 → 诊断建议 */
  @Post('diagnose')
  @UseGuards(JwtAuthGuard)
  async diagnose(@Body() b: { studentId: string }, @CurrentTeacher() t: any) {
    const stu = await this.studentRepo.findOne({ where: { id: b.studentId } })
    if (!stu || stu.teacherId !== t.sub) return { content: '学生不存在或无权限' }
    const grades = await this.gradeRepo.find({ where: { classId: stu.classId } })
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
    const content = await this.ai.chatSync(t.sub, { messages: [{ role: 'user', content: prompt }] })
    return { content }
  }
}
