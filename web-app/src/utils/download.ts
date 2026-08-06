/**
 * 文本下载工具：将 AI 生成的教案、文案、论文等内容下载为本地文件。
 *
 * 支持两种格式：
 * - doc：Word 兼容的 HTML 包裹（.doc 扩展名，双击可用 Word/WPS 打开，保留排版）
 * - txt：纯文本（.txt 扩展名）
 *
 * 默认使用 doc 格式（更适合教案/论文场景），可在调用时指定。
 *
 * 【复用改造】文件名清理、HTML 包膜、header 拼接已从本文件抽出为
 * shared/utils/export-data.ts；本文件仅保留 Web 平台 I/O（Blob + URL.createObjectURL）。
 * 这样小程序端（mini-program/src/common/exporter.js）可共用同一份内容生成逻辑。
 */

import {
  sanitizeFilename,
  escapeHtml,
  buildWordHtml,
  composeDocContent,
} from '@gardener/shared/utils/export-data'

/**
 * 下载文本内容到本地。
 * @param content  文本内容
 * @param filename 文件名（不含扩展名）
 * @param format   'doc' | 'txt'，默认 'doc'
 */
export function downloadText(content: string, filename: string, format: 'doc' | 'txt' = 'doc') {
  if (!content) return
  const safeName = sanitizeFilename(filename)
  const ext = format === 'txt' ? 'txt' : 'doc'
  const mime = format === 'txt' ? 'text/plain;charset=utf-8' : 'application/msword'
  let body: string
  if (format === 'txt') {
    body = content
  } else {
    // Word 兼容的 HTML：保留换行与排版，中文用宋体
    body = buildWordHtml({ title: safeName, body: content })
  }
  const blob = new Blob([body], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${safeName}.${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * 下载多字段组合内容（如教案含标题/学科/年级/课题 + 正文）。
 * 会拼接为带标题的文档。
 */
export function downloadDoc(fields: Record<string, string>, content: string, filename: string) {
  const full = composeDocContent(fields, content)
  downloadText(full, filename, 'doc')
}
