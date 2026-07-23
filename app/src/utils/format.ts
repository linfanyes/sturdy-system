// 分数统一显示工具
/** 学生分数显示：保留一位小数；缺考 / 空值 / 非数字返回 '-' */
export function fmtScore(v: number | null | undefined | ''): string {
  if (v === null || v === undefined || v === '') return '-'
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  return n.toFixed(1)
}
