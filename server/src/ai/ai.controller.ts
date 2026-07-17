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
}
