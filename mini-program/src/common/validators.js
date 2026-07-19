/**
 * 通用表单校验工具：所有校验函数返回 true/false，便于在页面层链式判断。
 * 配合 toast 提示用法：
 *   if (!isPhone(phone)) return uni.showToast({ title: '手机号格式错误', icon: 'none' })
 */

/** 简单手机号校验：11 位数字、1 开头、第二位 3-9。宽松允许中间空格/横线。 */
export function isPhone(s) {
  if (s == null) return false
  const v = String(s).replace(/[\s\-]/g, '')
  return /^1[3-9]\d{9}$/.test(v)
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

/** 分数校验：默认 0-100，可传 max 支持 150 分制等场景。 */
export function isScore(num, max = 100) {
  return inRange(num, 0, max)
}

/** 非空字符串（trim 后判断）。 */
export function isNonEmpty(s) {
  return s != null && String(s).trim() !== ''
}

/** 学号格式：字母数字组合，2-32 位（兼容各种学校编码）。 */
export function isStudentNo(s) {
  if (s == null || s === '') return true // 学号可选
  return /^[A-Za-z0-9]{2,32}$/.test(String(s).trim())
}

/** 金额校验：最多两位小数的正数；0 不允许（业务上 0 金额无意义）。 */
export function isAmount(num) {
  const n = Number(num)
  if (Number.isNaN(n) || n <= 0) return false
  return /^\d+(\.\d{1,2})?$/.test(String(num).trim())
}
