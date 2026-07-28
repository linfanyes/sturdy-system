// 通用安全工具函数

/**
 * 安全解析 JSON 字符串。
 * 后端返回脏数据/非 JSON 时返回 fallback，避免页面因 JSON.parse 抛错而崩溃。
 * @param {*} v 输入（可能为字符串、对象或 null）
 * @param {*} fallback 解析失败或为空时的兜底值
 */
export function safeParse(v, fallback = null) {
  if (v == null) return fallback
  if (typeof v !== 'string') return v
  try {
    return JSON.parse(v)
  } catch (e) {
    return fallback
  }
}
