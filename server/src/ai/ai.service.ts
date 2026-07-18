import { Injectable, BadRequestException } from '@nestjs/common'
import axios from 'axios'
import https from 'node:https'
import { ConfigService } from '../config/config.service'

// 与微信登录同理：AI 接口(baseUrl 多为内网/自签证书地址)在 TLS 拦截环境下也会报
// "self-signed certificate"，这里仅为 AI 调用单独放宽证书校验。
const tlsAgent = new https.Agent({ rejectUnauthorized: false })

@Injectable()
export class AiService {
  constructor(private readonly cfg: ConfigService) {}

  private async buildSettings(teacherId: string) {
    const s = await this.cfg.getAiSettings(teacherId)
    if (!s.apiKey) {
      throw new BadRequestException('未配置 AI 密钥，请到「后端配置」中填写')
    }
    if (!s.baseUrl) {
      throw new BadRequestException('未配置 AI 接口地址')
    }
    return s
  }

  /**
   * 流式对话：密钥与服务端配置均在后端，小程序只传消息。
   * onDelta 每收到一段文本回调一次（用于 SSE 推送给前端）。
   */
  async chatStream(
    teacherId: string,
    body: any,
    onDelta: (text: string) => void,
  ): Promise<void> {
    const s = await this.buildSettings(teacherId)
    const model = body.modelType === 'vision' ? s.visionModel : s.textModel
    const messages = [
      { role: 'system', content: s.systemPrompt || '你是一位耐心、专业的班主任助手' },
      ...(body.messages || []),
    ]
    const resp = await axios.post(
      `${s.baseUrl}/chat/completions`,
      {
        model,
        temperature: body.temperature ?? s.temperature,
        stream: true,
        messages,
      },
      {
        responseType: 'stream',
        headers: {
          Authorization: `Bearer ${s.apiKey}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: tlsAgent,
        timeout: 120000,
      },
    )
    await this.pipeSse(resp.data, onDelta)
  }

  /** 解析 OpenAI 流式响应（SSE） */
  private pipeSse(stream: any, onDelta: (t: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      let buf = ''
      stream.on('data', (chunk: Buffer) => {
        buf += chunk.toString('utf8')
        let idx: number
        while ((idx = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, idx).trim()
          buf = buf.slice(idx + 1)
          if (!line.startsWith('data:')) continue
          const data = line.slice(5).trim()
          if (data === '[DONE]') continue
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) onDelta(delta as string)
          } catch {
            /* 忽略非 JSON 行 */
          }
        }
      })
      stream.on('end', () => resolve())
      stream.on('error', (e: Error) => reject(e))
    })
  }

  /**
   * 同步对话：一次性返回完整文本。
   * 微信小程序 wx.request 不支持 SSE 流式，前端用此接口。
   */
  async chatSync(teacherId: string, body: any): Promise<string> {
    const s = await this.buildSettings(teacherId)
    const model = body.modelType === 'vision' ? s.visionModel : s.textModel
    const messages = [
      { role: 'system', content: s.systemPrompt || '你是一位耐心、专业的班主任助手' },
      ...(body.messages || []),
    ]
    const resp = await axios.post(
      `${s.baseUrl}/chat/completions`,
      {
        model,
        temperature: body.temperature ?? s.temperature,
        stream: false,
        messages,
      },
      {
        headers: {
          Authorization: `Bearer ${s.apiKey}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: tlsAgent,
        timeout: 120000,
      },
    )
    return resp.data?.choices?.[0]?.message?.content || ''
  }

  /** 非流式结构化解析：把非结构化文本交给 AI 解析为 JSON 数组 */
  async parse(
    teacherId: string,
    body: { text: string; instruction?: string },
  ): Promise<any> {
    const s = await this.buildSettings(teacherId)
    const sys =
      (body.instruction ||
        '请把下面的内容解析为 JSON 数组，每个元素是一个对象，只返回 JSON，不要解释。') +
      '\n系统提示词：' +
      (s.systemPrompt || '')
    const resp = await axios.post(
      `${s.baseUrl}/chat/completions`,
      {
        model: s.textModel,
        temperature: 0.2,
        stream: false,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: body.text },
        ],
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${s.apiKey}`,
          'Content-Type': 'application/json',
        },
        httpsAgent: tlsAgent,
        timeout: 120000,
      },
    )
    const content = resp.data?.choices?.[0]?.message?.content || '[]'
    try {
      const parsed = JSON.parse(content)
      return parsed
    } catch {
      const m = content.match(/\[[\s\S]*\]/)
      return m ? JSON.parse(m[0]) : []
    }
  }
}
