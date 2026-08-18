import { Injectable, BadRequestException } from '@nestjs/common'
import axios from 'axios'
import { ConfigService } from '../config/config.service'
import { tlsAgent } from './ai-file-parser.service'
import { buildAiSettings } from './ai-settings.util'
import { BusinessException } from '../common/exceptions/business.exception'

/**
 * 媒体生成服务：负责 AI 文生图、文生视频、语音识别 ASR 等多媒体 AI 能力。
 */
@Injectable()
export class AiMediaService {
  constructor(
    private readonly cfg: ConfigService,
  ) {}

  // A06修复：委托给共享工具函数
  private buildSettings(ownerType: string, ownerId: string) {
    return buildAiSettings(this.cfg, ownerType, ownerId)
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
      // P1-6 修复：失败时抛出 BusinessException，让全局异常过滤器返回结构化错误
      throw new BusinessException(
        'AI_IMAGE_GENERATION_FAILED',
        '图片生成失败，请检查 AI 服务配置或稍后重试',
      )
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
      // P1-6 修复：失败时抛出 BusinessException，让全局异常过滤器返回结构化错误
      throw new BusinessException(
        'AI_VIDEO_GENERATION_FAILED',
        '视频生成失败，请检查 AI 服务配置或稍后重试',
      )
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
      // P1-6 修复：失败时抛出 BusinessException，让全局异常过滤器返回结构化错误
      throw new BusinessException(
        'AI_ASR_FAILED',
        '语音识别失败，请检查 AI 服务配置或稍后重试',
      )
    }
  }
}
