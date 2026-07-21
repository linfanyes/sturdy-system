import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { AiService } from './ai.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { CurrentTeacher } from '../common/decorators/current-teacher.decorator'

@Controller('ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

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
      res.write(
        `data: ${JSON.stringify({ error: e?.message || 'AI 调用失败' })}\n\n`,
      )
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
}
