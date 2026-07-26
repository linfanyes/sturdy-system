/**
 * 通用表单校验工具
 * 重新导出共享包校验器，保持向后兼容
 */
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
  PHONE_REGEX,
  PHONE_HINT,
  CLASS_NAMING_RULE,
} from '@gardener/shared/validators'
