/**
 * 通用表单校验工具：所有校验函数返回 true/false，便于在页面层链式判断。
 * 配合 toast 提示用法：
 *   if (!isPhone(phone)) return uni.showToast({ title: '手机号格式错误', icon: 'none' })
 * 重新导出共享校验器，保持向后兼容
 */

import {
  isPhone,
  isValidPhone,
  normalizePhone,
  validateClassName,
  generateClassName,
  parseClassName,
  isSubject,
  getSubjectByValue,
  isRole,
  hasFeature,
  isGrade,
  isScore,
  isNonEmpty,
  isStudentNo,
  isAmount,
  isUrl,
  isDateStr,
  clip,
  MAX_LEN,
  PHONE_REGEX,
  PHONE_HINT,
  CLASS_NAMING_RULE,
} from '@gardener/shared/validators'

// 重新导出所有共享校验器（保持向后兼容）
export {
  isPhone,
  isValidPhone,
  normalizePhone,
  validateClassName,
  generateClassName,
  parseClassName,
  isSubject,
  getSubjectByValue,
  isRole,
  hasFeature,
  isGrade,
  isScore,
  isNonEmpty,
  isStudentNo,
  isAmount,
  isUrl,
  isDateStr,
  clip,
  MAX_LEN,
  PHONE_REGEX,
  PHONE_HINT,
  CLASS_NAMING_RULE,
}

/** 邮箱校验：标准格式。 */
export function isEmail(s) {
  if (s == null || s === '') return false
  return /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(String(s))
}

/** 数字范围校验：min/max 均为闭区间；非数字返回 false。 */
export function inRange(num, min, max) {
  const n = Number(num)
  if (Number.isNaN(n)) return false
  if (min != null && n < min) return false
  if (max != null && n > max) return false
  return true
}

/** 整数范围校验（含负数）。 */
export function isInt(num, min, max) {
  const n = Number(num)
  if (!Number.isInteger(n)) return false
  return inRange(n, min, max)
}