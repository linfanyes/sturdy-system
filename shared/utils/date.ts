/**
 * shared/utils/date —— 跨端通用日期时间格式化
 *
 * 纯函数，无平台依赖，可在 Web / 小程序 / 后端共用。
 */

/**
 * 相对时间格式化：刚刚 / X分钟前 / X小时前 / X天前 / X周前
 */
export function formatRelativeTime(ts: string | number | Date): string {
  const dt = new Date(ts)
  if (isNaN(dt.getTime())) return ''
  const diff = Date.now() - dt.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < week) return `${Math.floor(diff / day)}天前`
  return `${Math.floor(diff / week)}周前`
}

/**
 * 日期时间格式化：YYYY-MM-DD HH:mm
 * - 空值 / 无效日期返回 '-'
 */
export function formatDateTime(ts: string | number | Date | null | undefined): string {
  if (!ts) return '-'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

/**
 * 纯日期格式化：YYYY-MM-DD（不含时间）
 * - 用于日历格子 / 纯日期 key 匹配等场景
 * - 空值 / 无效日期返回 '-'
 */
export function formatDate(ts: string | number | Date | null | undefined): string {
  if (!ts) return '-'
  const d = new Date(ts)
  if (isNaN(d.getTime())) return String(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * ISO 时间简化：把 "2026-08-07T10:15:10.123Z" 变为 "2026-08-07 10:15:10"
 * 用于审计日志等后端返回的标准 ISO 字符串。
 */
export function formatISOTime(ts: string | null | undefined): string {
  if (!ts) return '-'
  return ts.replace('T', ' ').replace(/\.\d+Z?$/, '').slice(0, 19)
}

/**
 * 毫秒转分秒显示：如 125000 → "2分5秒"
 */
export function formatMsToMinSec(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return m > 0 ? `${m}分${s}秒` : `${s}秒`
}
