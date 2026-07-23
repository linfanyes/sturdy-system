// 通用 Excel / TXT 导入导出工具
// xlsx 体积较大 (~400KB), 改为首次用到时动态加载, 减少首屏体积
import { downloadBlob } from './download'

let XLSX: typeof import('xlsx') | null = null

async function getXLSX(): Promise<typeof import('xlsx')> {
  if (!XLSX) {
    XLSX = await import('xlsx')
  }
  return XLSX
}

export type FormatType = 'txt' | 'xlsx'

// ============ TXT ============
function readTXT(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'utf-8')
  })
}

export function downloadTXT(filename: string, content: string) {
  // 加 BOM 防止 Excel 打开后中文乱码
  const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' })
  triggerDownload(blob, filename)
}

// ============ Excel ============
async function readExcelFile(file: File): Promise<import('xlsx').WorkBook> {
  const XLSX = await getXLSX()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        resolve(wb)
      } catch (e) {
        reject(e)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}

export async function downloadExcel(filename: string, sheetName: string, rows: any[][]) {
  const XLSX = await getXLSX()
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(rows)
  // 简单的列宽
  const colWidths = rows[0]?.map((_, i) => {
    const maxLen = Math.max(
      ...rows.map((r) => String(r[i] ?? '').length),
      String(rows[0]?.[i] ?? '').length,
    )
    return { wch: Math.min(Math.max(maxLen + 2, 8), 24) }
  })
  if (colWidths) ws['!cols'] = colWidths
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 30))
  XLSX.writeFile(wb, filename)
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ============ 通用读取 ============
/**
 * 将用户上传的文件解析为二维数组（首行视为表头）
 * 支持 .txt .xlsx .xls .csv
 */
export async function parseTableFile(file: File): Promise<{
  headers: string[]
  rows: string[][]
}> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const XLSX = await getXLSX()
    const wb = await readExcelFile(file)
    const firstSheet = wb.SheetNames[0]
    if (!firstSheet) return { headers: [], rows: [] }
    const sheet = wb.Sheets[firstSheet]
    // defval 保留空字符串以便按列对齐
    const aoa = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1,
      defval: '',
      blankrows: false,
      raw: false,
    })
    if (!aoa.length) return { headers: [], rows: [] }
    const headers = (aoa[0] || []).map((h) => String(h).trim())
    const rows = aoa.slice(1).map((r) =>
      (r || []).map((c) => String(c ?? '').trim()),
    )
    return { headers, rows }
  }
  // TXT / CSV
  const text = await readTXT(file)
  const raw = text.replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length)
  if (!lines.length) return { headers: [], rows: [] }
  // 智能判断分隔符：Tab / 中文逗号 / 英文逗号 / 多个空格
  const first = lines[0]
  let sep: RegExp | string
  if (first.includes('\t')) sep = '\t'
  else if (first.includes('，')) sep = '，'
  else if (first.includes(',')) sep = ','
  else if (/\s{2,}/.test(first)) sep = /\s{2,}/
  else sep = /\s+/

  const split = (line: string) =>
    (typeof sep === 'string' ? line.split(sep) : line.split(sep))
      .map((s) => s.trim())
      .filter((s) => s.length)

  const headers = split(lines[0])
  const rows = lines.slice(1).map((l) => {
    const cells = split(l)
    // 不足补空，多余保留
    return cells
  })
  return { headers, rows }
}

/**
 * 把用户粘到 textarea 的文本解析为二维数组
 */
export function parsePastedText(text: string): {
  headers: string[]
  rows: string[][]
} {
  const raw = text.replace(/^\uFEFF/, '')
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length)
  if (!lines.length) return { headers: [], rows: [] }
  const first = lines[0]
  let sep: RegExp | string = /\s+/
  if (first.includes('\t')) sep = '\t'
  else if (first.includes('，')) sep = '，'
  else if (first.includes(',')) sep = ','

  const split = (line: string) =>
    (typeof sep === 'string' ? line.split(sep) : line.split(sep))
      .map((s) => s.trim())
      .filter((s) => s.length)

  const headers = split(lines[0])
  const rows = lines.slice(1).map(split)
  return { headers, rows }
}

// ============ 辅助 ============
export function detectFormatFromFile(file: File): FormatType {
  const n = file.name.toLowerCase()
  if (n.endsWith('.xlsx') || n.endsWith('.xls')) return 'xlsx'
  return 'txt'
}

export function isExcelFile(file: File): boolean {
  return detectFormatFromFile(file) === 'xlsx'
}
