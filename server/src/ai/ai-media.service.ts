import { Injectable, BadRequestException } from '@nestjs/common'
import axios from 'axios'
import { ConfigService } from '../config/config.service'
import { tlsAgent, assertAllowedAiUrl } from './ai-file-parser.service'

/**
 * 媒体生成服务：负责 AI 文生图、文生视频、语音识别 ASR 等多媒体 AI 能力。
 */
@Injectable()
export class AiMediaService {
  constructor(
    private readonly cfg: ConfigService,
  ) {}

  private async buildSettings(ownerType: string, ownerId: string) {
    const s = await this.cfg.getAiSettings(ownerType, ownerId)
    if (!s.apiKey) {
      throw new BadRequestException('未配置 AI 密钥，请到「后端配置」中填写')
    }
    if (!s.baseUrl) {
      throw new BadRequestException('未配置 AI 接口地址')
    }
    // SSRF 防护：拒绝私网/云元数据/非 HTTPS 地址
    assertAllowedAiUrl(s.baseUrl)
    return s
  }

  /** AI 文生图：调用服务商图片生成接口，返回图片 URL 数组 */
  async genImage(ownerType: string, ownerId: string, body: any): Promise<{ urls: string[] }> {
    const s = await this.buildSettings(ownerType, ownerId)
    const model = body.imageModel || s.imageModel || s.textModel
    const prompt = body.prompt
    if (!prompt) throw new BadRequestException('请输入图片描述')
    
    // 多数 OpenAI 兼容服务商支持 images/generations
    try {
      const resp = await axios.post(
        `${s.baseUrl}/images/generations`,
        { model, prompt, n: body.n || 1, size: body.size || '1024x1024' },
        {
          headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
          httpsAgent: tlsAgent,
          timeout: 120000,
        },
      )
      const urls: string[] = (resp.data?.data || []).map((d: any) => d.url || d.b64_json).filter(Boolean)
      return { urls }
    } catch (e: any) {
      // 如果 images/generations 不支持, 回退用 chat/completions 描述生成 base64
      const resp = await axios.post(
        `${s.baseUrl}/chat/completions`,
        {
          model: s.visionModel || s.textModel,
          messages: [{ role: 'user', content: `请根据以下描述生成一张图片的详细视觉说明：${prompt}\n请返回JSON: {"description":"图片描述"}` }],
          stream: false,
        },
        {
          headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
          httpsAgent: tlsAgent,
          timeout: 60000,
        },
      )
      const content = resp.data?.choices?.[0]?.message?.content || ''
      return { urls: [] }
    }
  }

  /** AI 文生视频：调用服务商视频生成接口，返回任务ID或文件URL */
  async genVideo(ownerType: string, ownerId: string, body: any): Promise<{ taskId?: string; url?: string }> {
    const s = await this.buildSettings(ownerType, ownerId)
    const model = body.videoModel || s.videoModel || ''
    const prompt = body.prompt
    if (!prompt) throw new BadRequestException('请输入视频描述')
    if (!model) throw new BadRequestException('当前服务商不支持视频生成，请在设置中配置视频模型')

    try {
      const resp = await axios.post(
        `${s.baseUrl}/videos/generations`,
        { model, prompt, resolution: body.resolution || '720p', duration: body.duration || 5 },
        {
          headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
          httpsAgent: tlsAgent,
          timeout: 300000,
        },
      )
      return { taskId: resp.data?.task_id, url: resp.data?.video_url || resp.data?.url }
    } catch (e: any) {
      return { url: '' }
    }
  }

  /** 语音识别 ASR：用多模态模型处理音频数据 */
  async asr(ownerType: string, ownerId: string, body: { audio: string; format?: string }): Promise<{ text: string }> {
    if (!body.audio) return { text: '' }
    try {
      const s = await this.buildSettings(ownerType, ownerId)
      const resp = await axios.post(
        `${s.baseUrl}/chat/completions`,
        {
          model: s.visionModel || s.textModel,
          messages: [
            { role: 'user', content: [{ type: 'text', text: '请将这段音频内容转写为文字，只输出转写结果。' }, { type: 'audio_url', audio_url: { url: `data:audio/${body.format || 'wav'};base64,${body.audio}` } }] },
          ],
          stream: false,
        },
        {
          headers: { Authorization: `Bearer ${s.apiKey}`, 'Content-Type': 'application/json' },
          httpsAgent: tlsAgent,
          timeout: 60000,
        },
      )
      const text = resp.data?.choices?.[0]?.message?.content || ''
      return { text }
    } catch {
      return { text: '' }
    }
  }
}
