import { xlsxFirstSheetToRows } from './excel.util'

/**
 * A07修复：文件解析工具函数抽取 ——  Excel/CSV/TXT/JSON 通用解析。
 * 原重复出现在 students.module.ts / grades.module.ts / school-admin.service.ts（共 6+ 处），
 * 现统一收敛到此模块，差异仅在于返回结构和校验逻辑。
 */

export interface ParsedFileResult {
  /** 行数据（二维数组，CSV/TXT/JSON 按行/按记录） */
  rows: string[][]
  /** 原始文本（供 AI 解析使用） */
  text: string
  /** 文件扩展名 */
  ext: string
}

/**
 * 解析上传的文件为行数据 + 文本。
 * - Excel (.xlsx/.xls)：返回每行单元格（二维数组）+ CSV 文本
 * - CSV/TXT：按行解析，按逗号/制表符分割
 * - JSON：解析为对象数组后序列化为文本
 */
export async function parseFileToRows(
  filename: string,
  dataBase64: string,
): Promise<ParsedFileResult> {
  const ext = (filename.split('.').pop() || '').toLowerCase()
  const buf = Buffer.from(dataBase64, 'base64')

  if (ext === 'xlsx' || ext === 'xls') {
    const rows = await xlsxFirstSheetToRows(buf)
    const text = rows.map((r) => r.join(',')).join('\n')
    return { rows, text, ext }
  }

  if (ext === 'json') {
    const text = buf.toString('utf8')
    try {
      const arr = JSON.parse(text)
      const rows = Array.isArray(arr) ? arr.map((item) => Object.values(item as any).map(String)) : []
      return { rows, text, ext }
    } catch {
      return { rows: [], text, ext }
    }
  }

  // CSV / TXT
  const text = buf.toString('utf8')
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/[,\t]/).map((c) => c.trim()))
  return { rows, text, ext }
}
