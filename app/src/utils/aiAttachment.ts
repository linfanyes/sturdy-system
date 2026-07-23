/**
 * AI 附件工具
 *
 * 支持:
 * - 文本类附件 (.txt .md .csv .json .tsv 等): 读取文本内容, 在 AI 提问时拼到消息正文
 * - 图片类附件 (.png .jpg .jpeg .gif .webp .bmp): 转 base64, 通过 OpenAI 兼容 multimodal
 *   格式 (image_url) 发送给 AI, 让 AI 识别图片内容
 *
 * 设计目标:
 * 1. 文本附件的内容会被保存到 localStorage, 方便 AI 在后续对话中继续引用
 * 2. 图片附件的 base64 不存 localStorage (避免体积爆炸), 只在用户当前输入框临时保留
 * 3. 单文件大小限制避免占用过多内存 / 超出模型上下文
 */

import { extractDocumentText } from './document'
import type { AIChatContentPart } from './aiCall'

export type AIAttachmentKind = 'text' | 'image' | 'doc' | 'unsupported'

export interface AIAttachment {
  /** 唯一 id (前端生成, 用于在 UI 列表中删除) */
  id: string
  /** 文件名 (含扩展名) */
  name: string
  /** 类别: text / image / doc(已解析的办公文档) / unsupported */
  kind: AIAttachmentKind
  /** MIME, 如 'text/plain' / 'image/png' */
  mime: string
  /** 文件字节数 */
  size: number
  /** 文本内容 (仅 kind=text 时使用, 已序列化) */
  text?: string
  /** 图片 base64 dataURL (仅 kind=image 时使用, 不持久化) */
  dataUrl?: string
}

/** 文本类附件允许的扩展名 (其他扩展名一律按 image 兜底识别) */
const TEXT_EXTS = [
  '.txt', '.md', '.markdown', '.csv', '.tsv', '.json', '.xml', '.html', '.htm',
  '.yml', '.yaml', '.ini', '.log', '.sql', '.js', '.ts', '.vue', '.css', '.scss',
  '.java', '.py', '.c', '.cpp', '.h', '.go', '.rs', '.sh', '.bat',
  '.tex', '.rst', '.adoc',
]

/** 图片类附件允许的扩展名 */
const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp']

/** 可解析的办公文档扩展名: 使用 document.ts 提取为纯文本后, 作为文本附件拼进 AI 消息 */
const DOC_EXTS = ['.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.odt']

/** 无法自动读取的二进制 / 媒体 / 压缩类扩展名
 *  这些文件若当作纯文本读取会产生乱码, 直接发给 AI 反而让 AI "看不懂"。
 *  一律归类为 unsupported, 由 readFile 给出明确提示, 不发送乱码。
 *  (PDF/Word/Excel/PPT/ODT 已支持解析, 见 DOC_EXTS) */
const UNSUPPORTED_EXTS = [
  // 旧版二进制办公格式 (非 zip 容器, 暂无解析库)
  '.doc', '.ppt', '.rtf', '.ods', '.odp', '.pages', '.numbers', '.key',
  // 压缩 / 二进制
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2',
  // 音视频
  '.mp3', '.mp4', '.wav', '.avi', '.mov', '.mkv', '.flv', '.webm',
  // 其它二进制
  '.exe', '.dll', '.bin', '.apk', '.iso', '.db', '.sqlite',
]

/** 单文件最大字节 (文本 1MB, 图片 4MB, 文档 8MB) */
export const MAX_TEXT_SIZE = 1 * 1024 * 1024
export const MAX_IMAGE_SIZE = 4 * 1024 * 1024
export const MAX_DOC_SIZE = 8 * 1024 * 1024
/** 文档提取后的文本最多字符数 (避免超出模型上下文) */
export const MAX_DOC_TEXT = 80_000

/** 简单 uid (8 位) */
function uid(): string {
  return 'att-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

/** 根据文件名判断附件类别 */
export function detectKind(name: string, mime?: string): AIAttachmentKind {
  const lower = (name || '').toLowerCase()
  // 1. 明确的图片
  if (mime?.startsWith('image/')) return 'image'
  if (IMAGE_EXTS.some((e) => lower.endsWith(e))) return 'image'
  // 2. 明确的文本
  if (mime?.startsWith('text/')) return 'text'
  if (TEXT_EXTS.some((e) => lower.endsWith(e))) return 'text'
  // 2.5 可解析的办公文档 (PDF/Word/Excel/PPT/ODT)
  if (DOC_EXTS.some((e) => lower.endsWith(e))) return 'doc'
  // 3. 已知的二进制/媒体/压缩类 -> 不支持自动读取 (避免发送乱码)
  if (UNSUPPORTED_EXTS.some((e) => lower.endsWith(e))) return 'unsupported'
  // 4. 兜底: 未知扩展名, 若 MIME 能判定则采用, 否则按 unsupported 处理
  //    (宁可提醒用户, 也不把未知二进制当文本发出去)
  if (mime?.startsWith('image/')) return 'image'
  if (mime?.startsWith('text/')) return 'text'
  return 'unsupported'
}

/** 友好大小 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(2) + ' MB'
}

/** 从 File 读取为 AIAttachment (不会自动存 localStorage) */
export async function readFile(file: File): Promise<AIAttachment> {
  const kind = detectKind(file.name, file.type)
  const base: AIAttachment = {
    id: uid(),
    name: file.name,
    kind,
    mime:
      file.type ||
      (kind === 'image'
        ? 'image/*'
        : kind === 'doc'
          ? 'application/document'
          : kind === 'text'
            ? 'text/plain'
            : 'application/octet-stream'),
    size: file.size,
  }
  if (kind === 'unsupported') {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    throw new Error(
      `暂不支持读取「${file.name}」(.${ext || '未知'} 格式) —— AI 无法识别此类文件内容。请将其另存为 .txt / .md / .csv，或把内容直接粘贴到输入框再发送。`,
    )
  }
  if (kind === 'doc') {
    if (file.size > MAX_DOC_SIZE) {
      throw new Error(
        `文档「${file.name}」超过 ${formatSize(MAX_DOC_SIZE)} 限制, 请精简后再上传`,
      )
    }
    const raw = await extractDocumentText(file)
    if (!raw.trim()) {
      throw new Error(
        `未能从「${file.name}」提取到文字内容。可能是扫描版 PDF、加密文档或图片型内容, 请改用 .txt，或把内容直接粘贴到输入框再发送。`,
      )
    }
    base.text =
      raw.length > MAX_DOC_TEXT
        ? raw.slice(0, MAX_DOC_TEXT) +
          `\n\n[内容已截断, 原文约 ${raw.length} 字, 仅读取前 ${MAX_DOC_TEXT} 字]`
        : raw
    return base
  }
  if (kind === 'text') {
    if (file.size > MAX_TEXT_SIZE) {
      throw new Error(`文本文件「${file.name}」超过 ${formatSize(MAX_TEXT_SIZE)} 限制, 请精简后再上传`)
    }
    base.text = await file.text()
  } else {
    if (file.size > MAX_IMAGE_SIZE) {
      throw new Error(`图片「${file.name}」超过 ${formatSize(MAX_IMAGE_SIZE)} 限制, 请压缩后再上传`)
    }
    base.dataUrl = await fileToDataUrl(file)
  }
  return base
}

/** 图片自动压缩的最大边长 (px)，平衡识别率与内存占用 */
export const IMAGE_MAX_SIDE = 1024

/** File -> dataURL (base64)，大图片自动压缩到最大边长内 */
async function fileToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
  return compressImage(dataUrl, IMAGE_MAX_SIDE)
}

/** 将 dataURL 图片压缩到指定最大边长以内，返回压缩后的 dataURL */
export function compressImage(dataUrl: string, maxSide: number): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const { width, height } = img
      if (width <= maxSide && height <= maxSide) {
        resolve(dataUrl)
        return
      }
      const scale = Math.min(maxSide / width, maxSide / height)
      const w = Math.round(width * scale)
      const h = Math.round(height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, w, h)
      try {
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/**
 * 把用户文本与附件内容合并为单条 user 消息
 * - 文本附件: 追加为 "--- 附件 xxx ---\n{内容}\n---"
 * - 图片附件: 必须用 multimodal 格式, 返回结构化 content 数组 (type=image_url)
 *
 * @returns
 *   - 无图片附件: 合并后的字符串
 *   - 有图片附件: OpenAI 兼容 multimodal content 数组
 */
export function buildUserContent(
  text: string,
  attachments: AIAttachment[],
): string | AIChatContentPart[] {
  const textAtts = attachments.filter(
    (a) => (a.kind === 'text' || a.kind === 'doc') && a.text,
  )
  const imageAtts = attachments.filter((a) => a.kind === 'image' && a.dataUrl)

  // 没有图片附件 -> 纯文本 (OpenAI 兼容)
  if (imageAtts.length === 0) {
    if (textAtts.length === 0) return text
    const parts: string[] = [text]
    for (const a of textAtts) {
      parts.push(`\n\n--- 附件: ${a.name} (${a.mime}, ${formatSize(a.size)}) ---\n${a.text}\n---`)
    }
    return parts.join('')
  }

  // 有图片附件 -> 走 multimodal
  const parts: AIChatContentPart[] = []
  if (text.trim()) parts.push({ type: 'text', text })
  if (textAtts.length) {
    const intro = textAtts
      .map((a) => `附件「${a.name}」(共 ${formatSize(a.size)}):\n${a.text}`)
      .join('\n\n')
    parts.push({ type: 'text', text: '\n\n' + intro })
  }
  for (const a of imageAtts) {
    parts.push({ type: 'image_url', image_url: { url: a.dataUrl! } })
  }
  return parts
}
