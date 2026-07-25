/**
 * 通用表单校验工具
 */

/** 中国大陆手机号正则：1 开头，第二位 3-9，共 11 位 */
const PHONE_RE = /^1[3-9]\d{9}$/

/**
 * 校验手机号。
 * 规则：符合中国大陆手机号格式，且允许为空（选填场景）。
 * @param v 待校验值（可为空 / undefined）
 * @returns true = 合法（含空值）
 */
export function isValidPhone(v: string | null | undefined): boolean {
  if (v == null) return true
  const s = String(v).trim()
  if (s === '') return true
  return PHONE_RE.test(s)
}

/** 手机号校验失败提示语 */
export const PHONE_HINT = '请输入有效的手机号（11 位，1 开头）'
