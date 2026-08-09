/**
 * shared/utils/score —— 跨端通用成绩统计 / 分布归一化纯函数
 *
 * 这些逻辑在 mini-program/src/pages/teaching/grades.vue 与 exam-detail.vue 中
 * 存在内联重复实现，现收敛到共享模块。纯函数，无平台依赖。
 */

/**
 * 成绩数组 → 统计摘要（均分/最高/最低/及格率/优秀率）
 * - 及格线 = fullScore * 0.6；优秀线 = fullScore * 0.85
 * - 均分保留 1 位小数；无有效成绩时返回空摘要（avg/max/min 为 '-'）
 * @param scores 原始成绩（可为 number 或含 .score 字段的对象）
 * @param fullScore 满分，默认 100
 */
export function computeExamStats(
  scores: Array<number | { score?: number | null }> | undefined | null,
  fullScore: number = 100,
): {
  avg: string
  max: number | '-'
  min: number | '-'
  passRate: number
  excellentRate: number
} {
  const empty: { avg: string; max: number | '-'; min: number | '-'; passRate: number; excellentRate: number } = {
    avg: '-',
    max: '-',
    min: '-',
    passRate: 0,
    excellentRate: 0,
  }
  if (!Array.isArray(scores)) return empty
  const all = scores.filter((x) => {
    const v = typeof x === 'object' && x ? x.score : (x as number)
    return v != null
  })
  const sc = all.map((x) => Number(typeof x === 'object' && x ? (x as { score?: number }).score : x))
  if (!sc.length) return empty
  sc.sort((a, b) => a - b)
  const avg = (sc.reduce((a, b) => a + b, 0) / sc.length).toFixed(1)
  const max = sc[sc.length - 1]!
  const min = sc[0]!
  const fs = Number(fullScore) || 100
  const pass = sc.filter((s) => s >= fs * 0.6).length
  const excellent = sc.filter((s) => s >= fs * 0.85).length
  return {
    avg,
    max,
    min,
    passRate: Math.round((pass / sc.length) * 100),
    excellentRate: Math.round((excellent / sc.length) * 100),
  }
}

/** 解析 "0-10" / "0~10" 这类区间的低位，非区间返回 null */
function parseLo(label: string): number | null {
  const m = String(label).match(/^\s*(\d+)\s*[-~]/)
  if (!m || m[1] == null) return null
  return parseInt(m[1], 10)
}

/**
 * 分数分布归一化：兼容对象 {"0-10":0} 与数组 [{label,count}]
 * 返回 [{ label, value, lo, idx }]，区间标签按低位排序，其余保留原序。
 */
export function normalizeDistribution(dist: unknown): Array<{ label: string; value: number; lo: number | null; idx: number }> {
  if (!dist) return []
  let arr: Array<{ label: string; value: number; lo: number | null; idx: number }> = []
  if (Array.isArray(dist)) {
    arr = dist.map((d, i) => {
      const o = d && typeof d === 'object' ? d : { count: d }
      const label = o.label || o.range || o.name || o.key || String(i + 1)
      const value = Number(o.count != null ? o.count : o.value != null ? o.value : 0) || 0
      return { label, value, lo: parseLo(label), idx: i }
    })
  } else if (typeof dist === 'object') {
    arr = Object.entries(dist as Record<string, unknown>).map(([k, v], i) => ({
      label: k,
      value: Number(v) || 0,
      lo: parseLo(k),
      idx: i,
    }))
  }
  if (arr.length && arr.every((x) => x.lo !== null)) {
    arr.sort((a, b) => (a.lo as number) - (b.lo as number))
  }
  return arr
}

/**
 * 学科数组归一化：兼容字符串数组 ["数学"] 与对象数组 [{subject:"数学"}]
 * @param arr 可能是字符串数组或对象数组
 */
export function toSubjectNames(arr: unknown): string[] {
  if (!Array.isArray(arr)) return []
  return arr
    .map((x) => (typeof x === 'string' ? x : (x && (x as { subject?: string; name?: string }).subject) || (x && (x as { name?: string }).name) || ''))
    .filter(Boolean)
}