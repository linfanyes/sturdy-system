import { Injectable, BadRequestException } from '@nestjs/common'
import axios from 'axios'
import https from 'node:https'
import * as path from 'path'
import XLSX from 'xlsx'
import mammoth from 'mammoth'
import { createCanvas } from '@napi-rs/canvas'
import pdfParse = require('pdf-parse/lib/pdf-parse.js')
import { ConfigService } from '../config/config.service'

// pdfjs 用 legacy 构建（Node 友好），用于把扫描版 PDF 光栅化为图片再送多模态模型 OCR
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfjs = require('pdfjs-dist/legacy/build/pdf.js')
try {
  pdfjs.GlobalWorkerOptions.workerSrc = path.join(
    path.dirname(require.resolve('pdfjs-dist/legacy/build/pdf.js')),
    'pdf.worker.js',
  )
} catch {
  /* 某些环境无 worker 文件也能用 fake worker 兜底 */
}

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
   * 按场景自动选择模型：
   * 1) 前端显式指定 modelType='vision' → 多模态模型；
   * 2) 否则检测消息体是否含图片（OpenAI 视觉格式 content[].type==='image_url'）→ 含则用多模态模型；
   * 3) 其余一律文本模型。
   * 这样前端无需关心模型名，系统根据内容自动切换。
   */
  private resolveModel(body: any, s: any): string {
    if (body?.modelType === 'vision') return s.visionModel
    const msgs: any[] = body?.messages || []
    const hasImage = msgs.some(
      (m) =>
        Array.isArray(m?.content) &&
        m.content.some((c: any) => c && c.type === 'image_url'),
    )
    return hasImage ? s.visionModel : s.textModel
  }

  /**
   * 把多类型文件（Excel/Word/PDF/Markdown/文本）解析为纯文本，拼成可注入 AI 的提示块。
   * 单个文件文本上限 30000 字，超出截断，避免请求体过大。
   */
  private async extractFilesText(
    files: Array<{ name: string; data: string }>,
    s?: any,
  ): Promise<string> {
    const blocks: string[] = []
    for (const f of files) {
      const buf = Buffer.from(f.data || '', 'base64')
      const ext = (f.name.split('.').pop() || '').toLowerCase()
      let text = ''
      let note = ''
      try {
        if (['md', 'txt', 'text', 'csv', 'json', 'log', 'yml', 'yaml'].includes(ext)) {
          text = buf.toString('utf-8')
        } else if (['xlsx', 'xls'].includes(ext)) {
          text = this.parseExcel(buf)
        } else if (ext === 'docx') {
          const r = await mammoth.extractRawText({ buffer: buf })
          text = r.value
          if (!text.trim())
            note = '（Word 未提取到文字，若为图片型扫描件请导出 PDF 或截图发送）'
        } else if (ext === 'pdf') {
          const r = await pdfParse(buf)
          text = r.text
          // 文本极少 → 疑似扫描件，尝试用多模态模型 OCR 识别
          if (text.trim().length < 30 && s?.visionModel && s?.apiKey) {
            try {
              text = await this.ocrPdf(buf, s)
            } catch (e: any) {
              note = `（PDF 疑似扫描件，OCR 失败：${e?.message || e}）`
            }
          }
        } else {
          // 未知类型，尽力按文本读取
          text = buf.toString('utf-8')
        }
      } catch (e: any) {
        text = `[文件「${f.name}」解析失败：${e?.message || e}]`
      }
      if (note) text = (text ? text + '\n' : '') + note
      const MAX = 30000
      if (text.length > MAX) {
        text = text.slice(0, MAX) + `\n…（内容过长已截断，原文约 ${text.length} 字）`
      }
      blocks.push(`【文件：${f.name}】\n${text}`)
    }
    return blocks.join('\n\n')
  }

  /** 把扫描版 PDF 逐页光栅化为 PNG，送多模态模型做 OCR 文字识别 */
  private async ocrPdf(buf: Buffer, s: any): Promise<string> {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise
    const maxPages = Math.min(doc.numPages, 3) // 最多识别前 3 页，控制耗时
    let out = ''
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i)
      const viewport = page.getViewport({ scale: 2 })
      const canvas = createCanvas(viewport.width, viewport.height)
      const ctx = canvas.getContext('2d')
      await page.render({ canvasContext: ctx, viewport, canvas }).promise
      const png = canvas.toBuffer('image/png')
      const dataUrl = 'data:image/png;base64,' + png.toString('base64')
      const pageText = await this.ocrImage(s, dataUrl)
      out += (i > 1 ? '\n' : '') + `[第${i}页]\n` + pageText
    }
    return out || '（OCR 未识别到文字）'
  }

  /** 调用多模态模型识别单张图片中的文字 */
  private async ocrImage(s: any, dataUrl: string): Promise<string> {
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

  /** Excel 工作簿转为「每个工作表一段 CSV」的文本 */
  private parseExcel(buf: Buffer): string {
    const wb = XLSX.read(buf, { type: 'buffer' })
    const sheets = wb.SheetNames.map((name) => {
      const ws = wb.Sheets[name]
      const csv = XLSX.utils.sheet_to_csv(ws)
      return `—— 工作表「${name}」——\n${csv}`
    })
    return sheets.join('\n\n')
  }

  /**
   * 组装发给模型的消息：
   * 1) 系统提示 + 历史消息；
   * 2) 若本次携带 files，把解析后的文本作为一条 text 部分追加到最后一条用户消息（没有则新建一条）。
   * 图片以 OpenAI 视觉格式（image_url）原样保留，模型选择逻辑不变。
   */
  private async buildMessages(body: any, s: any): Promise<any[]> {
    const messages: any[] = [
      { role: 'system', content: s.systemPrompt || '你是一位耐心、专业的班主任助手' },
      ...(body.messages || []),
    ]
    if (body?.files?.length) {
      const fileText = await this.extractFilesText(body.files, s)
      const last = messages[messages.length - 1]
      if (last && last.role === 'user') {
        if (typeof last.content === 'string') {
          last.content = [
            { type: 'text', text: last.content },
            { type: 'text', text: fileText },
          ]
        } else if (Array.isArray(last.content)) {
          last.content.push({ type: 'text', text: fileText })
        } else {
          last.content = fileText
        }
      } else {
        messages.push({ role: 'user', content: [{ type: 'text', text: fileText }] })
      }
    }
    return messages
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
    const model = this.resolveModel(body, s)
    const messages = await this.buildMessages(body, s)
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
    const model = this.resolveModel(body, s)
    const messages = await this.buildMessages(body, s)
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
