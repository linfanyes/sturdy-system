import { BadRequestException, Injectable } from '@nestjs/common'
import axios from 'axios'
import https from 'node:https'
import * as path from 'path'
import mammoth from 'mammoth'
import { xlsxToCsvText } from '../common/excel.util'
import { isSafeHttpUrl } from '../config/provider-models'
import { ConfigService } from '../config/config.service'
import { AiVisionService } from './ai-vision.service'

// TLS 校验：默认严格校验（防中间人窃取 AI 密钥）；
// 仅当显式设置 AI_TLS_INSECURE=true（如内网自签证书网关）时放宽
const aiTlsInsecure = process.env.AI_TLS_INSECURE === 'true'
export const tlsAgent = new https.Agent({ rejectUnauthorized: !aiTlsInsecure })

// 出站请求不自动跟随重定向，避免 AI 网关返回重定向导致的 SSRF / Authorization 头泄露
axios.defaults.maxRedirects = 0

/**
 * AI 出站地址校验：默认仅允许 HTTPS 公网地址，阻止服务端探测内网/云元数据（SSRF）。
 * 若确实需要内网/自签 AI 网关，可显式设置 AI_ALLOW_PRIVATE_URLS=true 放宽。
 */
export function assertAllowedAiUrl(baseUrl: string): void {
  if (process.env.AI_ALLOW_PRIVATE_URLS === 'true') return
  if (!isSafeHttpUrl(baseUrl)) {
    throw new BadRequestException(
      'AI 接口地址不合法：仅允许 HTTPS 公网地址。内网/自签环境请设置 AI_ALLOW_PRIVATE_URLS=true 后重试。',
    )
  }
}

// 上传文件大小上限（10MB），避免超大文件拖垮进程
export const MAX_FILE_BYTES = 10 * 1024 * 1024

// pdfjs-dist 4.x 为 ESM 模块（main: build/pdf.mjs），用异步 import() 加载
// 用于把扫描版 PDF 光栅化为图片再送多模态模型 OCR
let _pdfjs: any = null
export async function getPdfjs(): Promise<any> {
  if (!_pdfjs) {
    const mod = await import('pdfjs-dist')
    _pdfjs = mod.default || mod
    try {
      _pdfjs.GlobalWorkerOptions.workerSrc = path.join(
        path.dirname(require.resolve('pdfjs-dist/build/pdf.mjs')),
        'pdf.worker.min.mjs',
      )
    } catch {
      /* 某些环境无 worker 文件也能用 fake worker 兜底 */
    }
  }
  return _pdfjs
}

// pdfjs-dist 4.x 使用 Promise.withResolvers（Node 22+ 原生），低版本 Node 缺少该 API，此处兜底兼容
if (typeof (Promise as any).withResolvers !== 'function') {
  ;(Promise as any).withResolvers = function <T>() {
    let resolve!: (value: T | PromiseLike<T>) => void
    let reject!: (reason?: any) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}

/**
 * 文件解析服务：负责多类型文件（Excel/Word/PDF/Markdown/文本）解析为纯文本，
 * 以及 PDF 文本提取、Magic Bytes 校验等能力。
 */
@Injectable()
export class AiFileParserService {
  constructor(
    private readonly cfg: ConfigService,
    private readonly vision: AiVisionService,
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

  /**
   * 按文件头 magic bytes 校验真实类型是否与扩展名一致，防止上传者以改名方式
   * 投递非预期文件（如把恶意负载伪装成 .xlsx）。与扩展名路由解析配合，纵深防御；
   * 同时强制单文件大小上限，避免超大文件拖垮进程。
   */
  assertTypeMatches(ext: string, buf: Buffer): void {
    if (buf.length > MAX_FILE_BYTES) {
      throw new BadRequestException('文件过大（上限 10MB）')
    }
    const textExts = ['md', 'txt', 'text', 'csv', 'json', 'log', 'yml', 'yaml']
    if (textExts.includes(ext)) return
    const head = buf.subarray(0, 8)
    const hex = head.toString('hex')
    const isPdf = buf.subarray(0, 4).toString('latin1') === '%PDF'
    const isZip = hex.startsWith('504b0304') || hex.startsWith('504b0506') || hex.startsWith('504b0708')
    const isOle = hex.startsWith('d0cf11e0')
    const isPng = hex.startsWith('89504e470d0a1a0a')
    const isJpg = hex.startsWith('ffd8ff')
    const isGif = hex.startsWith('47494638')
    const isWebp = hex.startsWith('52494646') && buf.subarray(8, 12).toString('latin1') === 'WEBP'
    const isBmp = hex.startsWith('424d')
    switch (ext) {
      case 'pdf':
        if (!isPdf) throw new BadRequestException('文件类型与扩展名不符（非 PDF）')
        break
      case 'xlsx':
      case 'xls':
        if (!isZip && !isOle) throw new BadRequestException('文件类型与扩展名不符（非 Excel）')
        break
      case 'docx':
        if (!isZip) throw new BadRequestException('文件类型与扩展名不符（非 Word）')
        break
      case 'png':
        if (!isPng) throw new BadRequestException('文件类型与扩展名不符（非 PNG）')
        break
      case 'jpg':
      case 'jpeg':
        if (!isJpg) throw new BadRequestException('文件类型与扩展名不符（非 JPEG）')
        break
      case 'gif':
        if (!isGif) throw new BadRequestException('文件类型与扩展名不符（非 GIF）')
        break
      case 'webp':
        if (!isWebp) throw new BadRequestException('文件类型与扩展名不符（非 WEBP）')
        break
      case 'bmp':
        if (!isBmp) throw new BadRequestException('文件类型与扩展名不符（非 BMP）')
        break
      default:
        break
    }
  }

  /**
   * 把多类型文件（Excel/Word/PDF/Markdown/文本）解析为纯文本，拼成可注入 AI 的提示块。
   * 单个文件文本上限 30000 字，超出截断，避免请求体过大。
   */
  async extractFilesText(
    files: Array<{ name: string; data: string }>,
    s?: any,
  ): Promise<string> {
    const blocks: string[] = []
    for (const f of files) {
      const buf = Buffer.from(f.data || '', 'base64')
      const ext = (f.name.split('.').pop() || '').toLowerCase()
      this.assertTypeMatches(ext, buf)
      let text = ''
      let note = ''
      try {
        if (['md', 'txt', 'text', 'csv', 'json', 'log', 'yml', 'yaml'].includes(ext)) {
          text = buf.toString('utf-8')
        } else if (['xlsx', 'xls'].includes(ext)) {
          text = await this.parseExcel(buf)
        } else if (ext === 'docx') {
          const r = await mammoth.extractRawText({ buffer: buf })
          text = r.value
          if (!text.trim())
            note = '（Word 未提取到文字，若为图片型扫描件请导出 PDF 或截图发送）'
        } else if (ext === 'pdf') {
          text = await this.extractPdfText(buf)
          // 文本极少 → 疑似扫描件，尝试用多模态模型 OCR 识别
          if (text.trim().length < 30 && s?.visionModel && s?.apiKey) {
            try {
              text = await this.vision.ocrPdf(buf, s)
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

  /** 用 pdfjs 直接提取数字版 PDF 文本（替代已弃用的 pdf-parse，避免其携带的脆弱 pdfjs-dist） */
  async extractPdfText(buf: Buffer): Promise<string> {
    const p = await getPdfjs()
    const doc = await p.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise
    const maxPages = Math.min(doc.numPages, 20)
    let out = ''
    for (let i = 1; i <= maxPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const strings = (content.items as any[]).map((it) => ('str' in it ? it.str : '')).join(' ')
      out += (i > 1 ? '\n' : '') + strings
    }
    return out
  }

  /** Excel 工作簿转为「每个工作表一段 CSV」的文本（公开方法，供导入场景复用） */
  async parseExcel(buf: Buffer): Promise<string> {
    return xlsxToCsvText(buf)
  }

  /**
   * 通用文件解析：根据文件后缀自动路由到 TXT/PDF/图片 OCR 解析。
   * 前端传 { fileName, fileData(base64) }，返回解析后的纯文本。
   */
  async parseFile(
    ownerType: string,
    ownerId: string,
    body: { fileName: string; fileData: string },
  ): Promise<{ text: string }> {
    if (!body.fileData) return { text: '' }
    const buf = Buffer.from(body.fileData, 'base64')
    const ext = (body.fileName.split('.').pop() || '').toLowerCase()
    this.assertTypeMatches(ext, buf)

    // TXT / Markdown / 纯文本类
    if (['txt', 'md', 'text', 'csv', 'json', 'log', 'yml', 'yaml'].includes(ext)) {
      return { text: buf.toString('utf-8') }
    }

    // PDF
    if (ext === 'pdf') {
      try {
        let text = await this.extractPdfText(buf)
        // 文本极少 → 疑似扫描件，尝试用多模态 OCR
        if (text.trim().length < 30) {
          const s = await this.buildSettings(ownerType, ownerId)
          if (s?.visionModel && s?.apiKey) {
            try {
              const ocrText = await this.vision.ocrPdf(buf, s)
              if (ocrText && ocrText !== '（OCR 未识别到文字）') {
                text = ocrText
              }
            } catch {
              /* OCR 失败则用原始提取结果 */
            }
          }
        }
        return { text }
      } catch (e: any) {
        throw new BadRequestException(`PDF 解析失败：${e?.message || e}`)
      }
    }

    // 图片类：jpg / jpeg / png / gif / webp / bmp
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      const mimeMap: Record<string, string> = {
        jpg: 'jpeg', jpeg: 'jpeg', png: 'png', gif: 'gif', webp: 'webp', bmp: 'bmp',
      }
      const mime = mimeMap[ext] || 'jpeg'
      const dataUrl = `data:image/${mime};base64,${body.fileData}`
      const s = await this.buildSettings(ownerType, ownerId)
      const text = await this.vision.ocrImage(s, dataUrl)
      return { text: text || '未识别到文字' }
    }

    throw new BadRequestException(`不支持的文件格式：${ext}`)
  }
}
