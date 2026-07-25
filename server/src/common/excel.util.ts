import ExcelJS from 'exceljs'

/**
 * Excel 解析工具（迁移自 xlsx@0.18.5 → exceljs）。
 *
 * 背景：原 xlsx 依赖存在 CVE-2023-30533（原型污染）与 CVE-2024-22363（ReDoS），
 * 其修复版本仅通过 SheetJS 官方 CDN 发布（本部署环境网络不可达），故改用 npm 官方源的
 * exceljs（无同类漏洞）。本模块提供与原 `XLSX.utils.sheet_to_json(ws,{header:1,defval:''})`
 * 及 `sheet_to_csv` 等价的能力，统一列宽，便于平滑替换。
 */

function cellToString(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    const o = v as any
    if (Array.isArray(o.richText)) return o.richText.map((t: any) => t?.text || '').join('')
    if (o.text != null) return String(o.text)
    if (o.result != null) return String(o.result)
    if (o.formula != null) return String(o.formula)
    return ''
  }
  return String(v)
}

async function loadWorkbook(buf: Buffer): Promise<ExcelJS.Workbook> {
  try {
    const wb = new ExcelJS.Workbook()
    // exceljs 的类型期望旧版非泛型 Buffer，而 Node 22 的 Buffer 为 Buffer<ArrayBufferLike>，
    // 此处做一次跨库类型桥接（运行时不改变语义）
    await wb.xlsx.load(buf as any)
    return wb
  } catch (e: any) {
    // 文件损坏或非 .xlsx（如旧版 .xls / OLE 格式）无法被 exceljs 解析
    throw new Error(
      'Excel 解析失败：文件可能损坏，或为非 .xlsx 格式（旧版 .xls 请另存为 .xlsx 后上传）。',
    )
  }
}

/** 将首个工作表解析为 string[][]（等价 sheet_to_json(header:1, defval:''），统一列宽 */
export async function xlsxFirstSheetToRows(buf: Buffer): Promise<string[][]> {
  const wb = await loadWorkbook(buf)
  const ws = wb.worksheets[0]
  if (!ws) return []
  return sheetToRows(ws)
}

/** 将所有工作表转为「每个工作表一段 CSV」的文本（等价原 parseExcel 输出） */
export async function xlsxToCsvText(buf: Buffer): Promise<string> {
  const wb = await loadWorkbook(buf)
  const parts: string[] = []
  for (const ws of wb.worksheets) {
    const rows = sheetToRows(ws)
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n')
    parts.push(`—— 工作表「${ws.name}」——\n${csv}`)
  }
  return parts.join('\n\n')
}

function sheetToRows(ws: ExcelJS.Worksheet): string[][] {
  const rowCount = ws.rowCount || 0
  let maxN = 0
  const raw: string[][] = []
  for (let r = 1; r <= rowCount; r++) {
    const vals = (ws.getRow(r).values as unknown[]) || []
    const n = vals.length - 1 // exceljs 行值为 1-indexed
    if (n > maxN) maxN = n
    raw.push(vals.slice(1).map(cellToString))
  }
  for (const row of raw) {
    while (row.length < maxN) row.push('')
  }
  return raw
}

function csvCell(s: string): string {
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}
