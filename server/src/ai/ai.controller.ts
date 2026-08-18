import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Response } from 'express'
import { Throttle } from '@nestjs/throttler'
import { AiService } from './ai.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
// AI 调用超时配置：环境变量 AI_TIMEOUT（默认 120000ms = 120s）
const AI_TIMEOUT = Number(process.env.AI_TIMEOUT) || 120000

@Roles('teacher')
// AI 为高价接口（调用外部大模型 + 解析上传文件），单独限流为 10 次/分钟/IP，严于全局 60/min
@Throttle({ default: { limit: 10, ttl: 60000 } })
@Feature('ai')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
  ) {}

  // P1-5修复：移除重复的 withAiTimeout — Service 层已有 axios 120s 超时 + 友好降级

  /**
   * 学科工具访问校验（P1）：委托 AiService.assertSubjectToolAccess（A01：逻辑已下沉至 Service 层）。
   */
  private async assertSubjectToolAccess(role: string, teacherId: string, subjectKey?: string): Promise<void> {
    return this.ai.assertSubjectToolAccess(role, teacherId, subjectKey)
  }

  /** 流式对话（SSE）。前端用 wx.request 监听分片 data: {...} */
  @Post('chat')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
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
      await this.ai.chatStream(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body, (delta: string): boolean => {
        return res.write(`data: ${JSON.stringify({ delta })}\n\n`)
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
  @UseGuards(JwtAuthGuard, FeatureGuard)
  parse(@Body() body: { text: string; instruction?: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.ai.parse(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /** 同步对话（微信小程序用，非流式） */
  @Post('chat-sync')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  async chatSync(@Body() body: any, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    // P1：学科工具二次校验，防止前端绕过 UI 越权调用其他学科 AI 工具
    await this.assertSubjectToolAccess(t.role, t.sub, body?.subjectKey)
    const content = await this.ai.chatSync(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
    return { content }
  }

  /** AI 文生图（调用服务商图片生成模型） */
  @Post('gen-image')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  genImage(@Body() body: any, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.ai.genImage(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /** AI 文生视频（调用服务商视频生成模型） */
  @Post('gen-video')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  genVideo(@Body() body: any, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.ai.genVideo(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /** 语音识别 ASR：接收 base64 音频，调用配置的 AI 服务商多模态模型转文字 */
  @Post('asr')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  asr(@Body() body: { audio: string; format?: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.ai.asr(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /** 图片 OCR：接收 base64 图片，调用多模态模型识别文字 */
  @Post('ocr')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  ocr(@Body() body: { image: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.ai.ocr(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /**
   * 文件解析：支持 TXT/PDF/图片 转文本。
   * 前端通过 uni.chooseMessageFile/uni.chooseImage 选择文件后，读 base64 上传。
   * @param body { fileName: string, fileData: string (base64) }
   * @returns { text: string } 解析后的纯文本
   */
  @Post('parse-file')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  parseFile(@Body() body: { fileName: string; fileData: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.ai.parseFile(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /** 全班考试成绩 AI 分析：取考试数据 → 按科目统计 → 大模型生成分析报告
   * A01修复：业务逻辑已移到 AiService.analyzeExam，Controller 仅做 HTTP 适配
   * P0-2修复：添加 @Roles('teacher') 和 FeatureGuard，确保功能包控制生效
   */
  @Post('analyze-exam')
  @Roles('teacher')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  async analyzeExam(@Body() b: { examId: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.ai.analyzeExam(b.examId, t.sub)
  }

  /** 学生个体学情 AI 诊断：取该生历次成绩 → 趋势 → 诊断建议
   * A01修复：业务逻辑已移到 AiService.diagnose，Controller 仅做 HTTP 适配
   * P0-2修复：添加 @Roles('teacher') 和 FeatureGuard，确保功能包控制生效
   */
  @Post('diagnose')
  @Roles('teacher')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  async diagnose(@Body() b: { studentId: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    return this.ai.diagnose(b.studentId, t.sub)
  }

  /** 通用 AI 生成：写作/范文/作文/试卷题等场景复用（写作工具） */
  @Post('generate')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard)
  generate(@Body() body: { prompt: string; type?: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    const messages = [{ role: 'user', content: body.prompt }]
    return this.ai.chatSync(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, { messages })
  }
}
