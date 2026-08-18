import { Controller, Post, Body, Res, UseGuards, Req } from '@nestjs/common'
import { Feature } from '../common/decorators/feature.decorator'
import { FeatureGuard } from '../common/feature/feature.guard'
import { Response, Request } from 'express'
import { Throttle } from '@nestjs/throttler'
import { AiService } from './ai.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { Roles } from '../common/decorators/roles.decorator'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'
import { randomUUID } from 'node:crypto'
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

  // P0-5修复：已移除 assertSubjectToolAccess 死代码（已在 Service 层实现）

  /** P0-4修复：生成/提取请求追踪 ID，便于日志关联排查 */
  private getRequestId(req: Request): string {
    return (req.headers['x-request-id'] as string) || randomUUID()
  }

  /** 流式对话（SSE）。前端用 wx.request 监听分片 data: {...} */
  @Post('chat')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  async chat(
    @Body() body: any,
    @CurrentTeacher() t: any,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    const requestId = this.getRequestId(req)
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    // P0-4修复：返回请求 ID，便于前端反馈时附带
    res.setHeader('X-Request-Id', requestId)
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
      res.write(`data: ${JSON.stringify({ error: msg, requestId })}\n\n`)
      res.write('data: [DONE]\n\n')
      clearInterval(keepAliveTimer)
      res.end()
      return
    }
    clearInterval(keepAliveTimer)
    res.write(`data: ${JSON.stringify({ done: true, requestId })}\n\n`)
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
  async chatSync(@Body() body: any, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    const requestId = this.getRequestId(req)
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    // P0-4修复：返回请求 ID
    res.setHeader('X-Request-Id', requestId)
    // P0-5修复：移除死代码，学科工具校验已下沉至 Service 层 assertSubjectToolAccess
    await this.ai.assertSubjectToolAccess(t.role, t.sub, body?.subjectKey)
    const content = await this.ai.chatSync(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
    return { content, requestId }
  }

  /** AI 文生图（调用服务商图片生成模型） */
  @Post('gen-image')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  genImage(@Body() body: any, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    res.setHeader('X-Request-Id', this.getRequestId(req))
    return this.ai.genImage(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /** AI 文生视频（调用服务商视频生成模型） */
  @Post('gen-video')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  genVideo(@Body() body: any, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    res.setHeader('X-Request-Id', this.getRequestId(req))
    return this.ai.genVideo(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /** 语音识别 ASR：接收 base64 音频，调用配置的 AI 服务商多模态模型转文字 */
  @Post('asr')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  asr(@Body() body: { audio: string; format?: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    res.setHeader('X-Request-Id', this.getRequestId(req))
    return this.ai.asr(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /** 图片 OCR：接收 base64 图片，调用多模态模型识别文字 */
  @Post('ocr')
  @Roles('teacher', 'school_admin')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  ocr(@Body() body: { image: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    res.setHeader('X-Request-Id', this.getRequestId(req))
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
  parseFile(@Body() body: { fileName: string; fileData: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    res.setHeader('X-Request-Id', this.getRequestId(req))
    return this.ai.parseFile(t.role === 'school_admin' ? 'school_admin' : 'teacher', t.sub, body)
  }

  /** 全班考试成绩 AI 分析：取考试数据 → 按科目统计 → 大模型生成分析报告
   * A01修复：业务逻辑已移到 AiService.analyzeExam，Controller 仅做 HTTP 适配
   * P0-2修复：添加 @Roles('teacher') 和 FeatureGuard，确保功能包控制生效
   */
  @Post('analyze-exam')
  @Roles('teacher')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  async analyzeExam(@Body() b: { examId: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    res.setHeader('X-Request-Id', this.getRequestId(req))
    return this.ai.analyzeExam(b.examId, t.sub)
  }

  /** 学生个体学情 AI 诊断：取该生历次成绩 → 趋势 → 诊断建议
   * A01修复：业务逻辑已移到 AiService.diagnose，Controller 仅做 HTTP 适配
   * P0-2修复：添加 @Roles('teacher') 和 FeatureGuard，确保功能包控制生效
   */
  @Post('diagnose')
  @Roles('teacher')
  @UseGuards(JwtAuthGuard, FeatureGuard)
  async diagnose(@Body() b: { studentId: string }, @CurrentTeacher() t: any, @Res({ passthrough: true }) res: Response, @Req() req: Request) {
    res.setHeader('X-AI-Timeout', String(AI_TIMEOUT))
    res.setHeader('X-Request-Id', this.getRequestId(req))
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
