import { Injectable, BadRequestException } from '@nestjs/common'
import axios from 'axios'
import { createCanvas } from '@napi-rs/canvas'
import { ConfigService } from '../config/config.service'
import { tlsAgent, getPdfjs } from './ai-file-parser.service'
import { buildAiSettings } from './ai-settings.util'

/**
 * 视觉识别服务：负责图片 OCR、PDF OCR（扫描件光栅化后多模态识别）、
 * 公开的图片识别方法等视觉 AI 能力。
 */
@Injectable()
export class AiVisionService {
  constructor(
    private readonly cfg: ConfigService,
  ) {}

  // A06修复：委托给共享工具函数
  private buildSettings(ownerType: string, ownerId: string) {
    return buildAiSettings(this.cfg, ownerType, ownerId)
  }

  /** 对外封装：传入图片 data URL，自动鉴权后调用多模态模型做 OCR 文字识别 */
  async recognizeImage(ownerType: string, ownerId: string, dataUrl: string): Promise<string> {
    const s = await this.buildSettings(ownerType, ownerId)
    return this.ocrImage(s, dataUrl)
  }

  /**
   * 调用多模态模型识别单张图片中的文字（公开方法，供课程表等导入场景复用）
   * @param imageBase64 图片 base64（不含 data: 前缀），由调用方拼好 data URL
   */
  async ocrImage(s: any, dataUrl: string): Promise<string> {
    const resp = await axios.post(
      `${s.baseUrl}/chat/completions`,
      {
        model: s.visionModel,
        temperature: 0,
        stream: false,
        messages: [
          {
            role: 'system',
            content:
              '你是 OCR 文字识别助手。请识别图片中的所有文字，保持原有段落与排版顺序，直接输出识别到的纯文本，不要添加任何解释或前缀。',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '请识别这张图片里的所有文字：' },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
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

  /** 把扫描版 PDF 逐页光栅化为 PNG，送多模态模型做 OCR 文字识别 */
  async ocrPdf(buf: Buffer, s: any): Promise<string> {
    const p = await getPdfjs()
    const doc = await p.getDocument({ data: new Uint8Array(buf) }).promise
    const maxPages = Math.min(doc.numPages, 3) // 最多识别前 3 页，控制耗时
    let out = ''
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = createCanvas(viewport.width, viewport.height)
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport, canvas, isEvalSupported: false }).promise
      const png = canvas.toBuffer('image/png')
      const dataUrl = 'data:image/png;base64,' + png.toString('base64')
      const pageText = await this.ocrImage(s, dataUrl)
      out += (i > 1 ? '\n' : '') + `[第${i}页]\n` + pageText
    }
    return out || '（OCR 未识别到文字）'
  }

  /** 图片 OCR：用多模态模型识别图片中的文字 */
  async ocr(ownerType: string, ownerId: string, body: { image: string }): Promise<{ text: string }> {
    if (!body.image) return { text: '' }
    try {
      const s = await this.buildSettings(ownerType, ownerId)
      const resp = await axios.post(
        `${s.baseUrl}/chat/completions`,
        {
          model: s.visionModel || s.textModel,
          messages: [
            { role: 'user', content: [{ type: 'text', text: '请识别这张图片中的所有文字，按原文顺序输出，不要解释。如果图片中没有清晰文字，请返回「未识别到文字」。' }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.image}` } }] },
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
