/**
 * 文档文本提取工具 (浏览器端)
 *
 * 把常见办公文档解析为纯文本, 供 AI 附件系统作为「文本附件」拼进对话消息:
 * - PDF   -> pdfjs-dist (逐页 getTextContent)
 * - DOCX  -> jszip 解压 word/document.xml, 抽取 <w:t> 文本
 * - PPTX  -> jszip 解压 ppt/slides/slideN.xml, 抽取 <a:t> 文本
 * - ODT   -> jszip 解压 content.xml, 抽取 <text:p> 段落
 * - XLSX/XLS -> SheetJS (xlsx) 转 CSV
 *
 * 注意: 扫描版 PDF / 加密文档 / 图片型内容无法提取到文字, 调用方需处理空结果。
 *
 * 性能优化: jszip / xlsx / pdfjs-dist 均为大依赖, 首次用到时才动态加载
 */

// worker URL 只是字符串, 体积可忽略, 保留顶层导入
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// ===== 懒加载缓存 =====
let JSZip: any = null
let XLSX: any = null
let pdfjsLib: any = null
let pdfjsInitialized = false

async function getJSZip() {
  if (!JSZip) {
    const mod = await import('jszip')
    JSZip = mod.default ?? mod
  }
  return JSZip
}

async function getXLSX() {
  if (!XLSX) {
    XLSX = await import('xlsx')
  }
  return XLSX
}

async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist')
  }
  if (!pdfjsInitialized) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker
    pdfjsInitialized = true
  }
  return pdfjsLib
}

/** 判断文件名是否走文档提取 (与 aiAttachment.ts 的 DOC_EXTS 保持一致) */
export function isDocumentExt(name: string): boolean {
  const lower = (name || '').toLowerCase()
  return (
    lower.endsWith('.pdf') ||
    lower.endsWith('.docx') ||
    lower.endsWith('.xlsx') ||
    lower.endsWith('.xls') ||
    lower.endsWith('.pptx') ||
    lower.endsWith('.odt')
  )
}

/** 提取文档文本; 不支持的扩展名向上抛错 */
export async function extractDocumentText(file: File): Promise<string> {
  const name = (file.name || '').toLowerCase()
  const buf = await file.arrayBuffer()
  if (name.endsWith('.pdf')) return extractPdf(buf)
  if (name.endsWith('.docx')) return extractDocx(buf)
  if (name.endsWith('.pptx')) return extractPptx(buf)
  if (name.endsWith('.odt')) return extractOdt(buf)
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return extractSpreadsheet(buf)
  throw new Error(`暂不支持读取「${file.name}」`)
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_: string, h: string) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_: string, d: string) => safeCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, '&')
}

function safeCodePoint(cp: number): string {
  try {
    return String.fromCodePoint(cp)
  } catch {
    return ''
  }
}

/** 规整: 统一换行, 合并多余空行, 去首尾空白 */
function tidy(s: string): string {
  return s
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function extractPdf(buf: ArrayBuffer): Promise<string> {
  const pdfjsLib = await getPdfjs()
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise
  const out: string[] = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const tc = await page.getTextContent()
    const line = tc.items
      .map((it: any) => ('str' in it ? (it.str as string) : ''))
      .join(' ')
    out.push(`[第 ${i} 页]\n${line}`)
  }
  return tidy(out.join('\n\n'))
}

async function extractDocx(buf: ArrayBuffer): Promise<string> {
  const JSZip = await getJSZip()
  const zip = await JSZip.loadAsync(buf)
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) return ''
  let t = xml
    .replace(/<w:br\b[^>]*\/>/g, '\n')
    .replace(/<w:cr\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab\b[^>]*\/>/g, '  ')
  // 抽取文本 run
  t = t.replace(/<w:t[^>]*>(.*?)<\/w:t>/g, (_: string, inner: string) => inner)
  // 清理其余标签
  t = t.replace(/<[^>]+>/g, '')
  return tidy(decodeEntities(t))
}

async function extractPptx(buf: ArrayBuffer): Promise<string> {
  const JSZip = await getJSZip()
  const zip = await JSZip.loadAsync(buf)
  const names = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/i.test(n))
    .sort((a, b) => {
      const na = parseInt((a.match(/\d+/) || ['0'])[0], 10)
      const nb = parseInt((b.match(/\d+/) || ['0'])[0], 10)
      return na - nb
    })
  const out: string[] = []
  for (const n of names) {
    const xml = await zip.file(n)!.async('string')
    let t = xml.replace(/<a:t[^>]*>(.*?)<\/a:t>/g, (_: string, inner: string) => inner + '\n')
    t = t.replace(/<[^>]+>/g, '')
    out.push(`[幻灯片 ${n.match(/\d+/)![0]}]\n${tidy(decodeEntities(t))}`)
  }
  return out.join('\n\n')
}

async function extractOdt(buf: ArrayBuffer): Promise<string> {
  const JSZip = await getJSZip()
  const zip = await JSZip.loadAsync(buf)
  const xml = await zip.file('content.xml')?.async('string')
  if (!xml) return ''
  let t = xml
    .replace(/<text:h\b[^>]*>/g, '\n')
    .replace(/<text:p\b[^>]*>/g, '\n')
    .replace(/<text:span\b[^>]*>(.*?)<\/text:span>/g, (_: string, inner: string) => inner)
  t = t.replace(/<[^>]+>/g, '')
  return tidy(decodeEntities(t))
}

async function extractSpreadsheet(buf: ArrayBuffer): Promise<string> {
  const XLSX = await getXLSX()
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
  const out: string[] = []
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    if (!ws) continue
    const csv = XLSX.utils.sheet_to_csv(ws, { blankrows: false })
    out.push(`[工作表 ${name}]\n${csv}`)
  }
  return out.join('\n\n')
}
