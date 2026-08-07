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
  isEmail,
  inRange,
  isInt,
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
  isEmail,
  inRange,
  isInt,
}