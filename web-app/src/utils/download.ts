/**
 * 文本下载工具：将 AI 生成的教案、文案、论文等内容下载为本地文件。
 *
 * 支持两种格式：
 * - doc：Word 兼容的 HTML 包裹（.doc 扩展名，双击可用 Word/WPS 打开，保留排版）
 * - txt：纯文本（.txt 扩展名）
 *
 * 默认使用 doc 格式（更适合教案/论文场景），可在调用时指定。
 */

/** 将文件名清理为安全字符（去除非法字符） */
function sanitizeFilename(name: string): string {
  return (name || '未命名').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80)
}

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
    body = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${safeName}</title>
<style>body{font-family:'宋体',SimSun,serif;font-size:12pt;line-height:1.8;white-space:pre-wrap;}h1{font-size:18pt;text-align:center;margin-bottom:16pt;}</style>
</head><body>${escapeHtml(content)}</body></html>`
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

/** HTML 转义（避免内容中的 < > & 破坏 doc 结构） */
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 下载多字段组合内容（如教案含标题/学科/年级/课题 + 正文）。
 * 会拼接为带标题的文档。
 */
export function downloadDoc(fields: Record<string, string>, content: string, filename: string) {
  const header = Object.entries(fields)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}：${v}`)
    .join('\n')
  const full = header ? `${header}\n\n${content}` : content
  downloadText(full, filename, 'doc')
}
