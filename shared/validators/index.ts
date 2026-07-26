/**
 * 跨端共享校验器 - 纯函数、无副作用、无框架依赖
 * 可在 Node.js、浏览器、微信小程序环境通用
 * 使用 tsconfig paths 别名 @gardener/shared/validators 导入
 */

import {
  PHONE_REGEX,
  PHONE_HINT,
  CLASS_NAMING_RULE,
  SUBJECT_VALUES,
  SUBJECT_OPTIONS,
  ROLE_VALUES,
  FEATURE_FLAGS_SET,
  GRADE_OPTIONS,
} from '../constants'

/**
 * 严格手机号校验：必须符合 PHONE_REGEX，**不允许空**
 * @param value 待校验手机号
 * @returns true = 合法
 */
export function isPhone(value: string): boolean {
  if (value == null) return false
  return PHONE_REGEX.test(String(value).trim())
}

/**
 * 宽松手机号校验：允许空/undefined/null，非空则匹配 PHONE_REGEX
 * @param value 待校验手机号（可为空）
 * @returns true = 合法（含空值）
 */
export function isValidPhone(value: string | null | undefined): boolean {
  if (value == null) return true
  const v = String(value).trim()
  if (v === '') return true
  return PHONE_REGEX.test(v)
}

/**
 * 手机号归一化：去除空格/横线，返回纯数字字符串
 * @param value 原始手机号
 * @returns 纯数字手机号
 */
export function normalizePhone(value: string): string {
  if (value == null) return ''
  return String(value).replace(/[\s\-]/g, '')
}

/**
 * 班级名校验：必须符合 "年级+序号+班" 格式
 * 支持年级：
 *   - 小学：一~六年级（如 "五年级1班"）
 *   - 初中：初一~初三（如 "初二3班"）
 *   - 高中：高一~高三（如 "高一5班"）
 * @param name 班级名称
 * @param grade 可选：指定年级时额外校验年级一致性
 * @returns { valid: boolean; error?: string; classNo?: number }
 */
export function validateClassName(
  name: string,
  grade?: string
): { valid: boolean; error?: string; classNo?: number } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: '班级名不能为空' }
  }

  const trimmed = name.trim()
  if (!trimmed) {
    return { valid: false, error: '班级名不能为空' }
  }
  if (!CLASS_NAMING_RULE.pattern.test(trimmed)) {
    return {
      valid: false,
      error: `班级命名格式错误：${CLASS_NAMING_RULE.description}（示例：${CLASS_NAMING_RULE.example}）`,
    }
  }

  // 解析 classNo：支持三种格式
  // 1. 小学：五年级1班 -> grade="五年级", classNo=1
  // 2. 初中：初二3班 -> grade="初二", classNo=3
  // 3. 高中：高一5班 -> grade="高一", classNo=5
  let parsedGrade: string
  let classNo: number

  const primaryMatch = trimmed.match(/^((一|二|三|四|五|六)年级)(\d+)班$/)
  if (primaryMatch) {
    parsedGrade = primaryMatch[1]
    classNo = Number.parseInt(primaryMatch[3], 10)
  } else {
    const middleMatch = trimmed.match(/^(初一|初二|初三)(\d+)班$/)
    if (middleMatch) {
      parsedGrade = middleMatch[1]
      classNo = Number.parseInt(middleMatch[2], 10)
    } else {
      const highMatch = trimmed.match(/^(高一|高二|高三)(\d+)班$/)
      if (!highMatch) {
        return { valid: false, error: '无法解析班级序号' }
      }
      parsedGrade = highMatch[1]
      classNo = Number.parseInt(highMatch[2], 10)
    }
  }

  if (grade && parsedGrade !== grade) {
    return {
      valid: false,
      error: `班级年级（${parsedGrade}）与指定年级（${grade}）不一致`,
    }
  }

  if (classNo <= 0 || classNo > 99) {
    return { valid: false, error: '班级序号应在 1-99 之间' }
  }

  return { valid: true, classNo }
}

/**
 * 由年级+序号生成标准班级名
 * @param grade 年级（如 "五年级"、"初二"、"高一"）
 * @param classNo 序号（1-99），支持数字或数字字符串
 * @returns 标准班级名（如 "五年级1班"、"初二3班"、"高一5班"）
 */
export function generateClassName(grade: string, classNo: number | string): string {
  const gradeStr = String(grade)
  if (!GRADE_OPTIONS.includes(gradeStr)) {
    throw new Error(`非法年级：${gradeStr}，可选：${GRADE_OPTIONS.join('、')}`)
  }
  const classNoStr = String(classNo)
  if (!/^\d+$/.test(classNoStr)) {
    throw new Error('班级序号必须是 1-99 的整数')
  }
  const classNoNum = Number.parseInt(classNoStr, 10)
  if (!Number.isInteger(classNoNum) || classNoNum <= 0 || classNoNum > 99) {
    throw new Error('班级序号必须是 1-99 的整数')
  }
  return `${gradeStr}${classNoNum}班`
}

/**
 * 解析标准班级名，返回 { grade, classNo }
 * 支持三种格式：
 *   - 小学：五年级1班 -> { grade: "五年级", classNo: 1 }
 *   - 初中：初二3班 -> { grade: "初二", classNo: 3 }
 *   - 高中：高一5班 -> { grade: "高一", classNo: 5 }
 * @param className 标准班级名
 * @returns { grade: string; classNo: number } | null
 */
export function parseClassName(className: string): { grade: string; classNo: number } | null {
  if (!className || typeof className !== 'string') return null
  const trimmed = className.trim()

  // 尝试小学格式：五年级1班
  let match = trimmed.match(/^((一|二|三|四|五|六)年级)(\d+)班$/)
  if (match) {
    const grade = match[1]
    const classNo = Number.parseInt(match[3], 10)
    if (GRADE_OPTIONS.includes(grade) && classNo > 0 && classNo <= 99) {
      return { grade, classNo }
    }
    return null
  }

  // 尝试初中格式：初二3班
  match = trimmed.match(/^(初一|初二|初三)(\d+)班$/)
  if (match) {
    const grade = match[1]
    const classNo = Number.parseInt(match[2], 10)
    if (GRADE_OPTIONS.includes(grade) && classNo > 0 && classNo <= 99) {
      return { grade, classNo }
    }
    return null
  }

  // 尝试高中格式：高一5班
  match = trimmed.match(/^(高一|高二|高三)(\d+)班$/)
  if (match) {
    const grade = match[1]
    const classNo = Number.parseInt(match[2], 10)
    if (GRADE_OPTIONS.includes(grade) && classNo > 0 && classNo <= 99) {
      return { grade, classNo }
    }
    return null
  }

  return null
}

/**
 * 校验学科是否在 SUBJECT_OPTIONS 中
 * @param subject 学科名称
 * @returns true = 合法学科
 */
export function isSubject(subject: string): boolean {
  if (!subject || typeof subject !== 'string') return false
  return SUBJECT_VALUES.includes(subject.trim())
}

/**
 * 反查学科对象（通过 value 找 SubjectOption）
 * @param value 学科值
 * @returns SubjectOption | undefined
 */
export function getSubjectByValue(value: string): import('../constants').SubjectOption | undefined {
  if (!value || typeof value !== 'string') return undefined
  return SUBJECT_OPTIONS.find((s) => s.value === value.trim())
}

/**
 * 校验角色是否合法（4 种角色之一）
 * @param role 角色字符串
 * @returns true = 合法角色
 */
export function isRole(role: string): boolean {
  if (!role || typeof role !== 'string') return false
  return ROLE_VALUES.includes(role.trim() as import('../constants').Role)
}

/**
 * 权限特性检查：判断 features 数组是否包含指定 feature
 * - 空数组 = 全放行（返回 true）
 * - 非空数组 = 必须包含 feature 才放行
 * @param features 用户拥有的特性数组
 * @param feature 待检查的特性
 * @returns true = 有权限
 */
export function hasFeature(features: string[], feature: string): boolean {
  if (!Array.isArray(features) || features.length === 0) return true // 空数组 = 全放行
  return features.includes(feature)
}

/**
 * 校验年级是否合法
 * @param grade 年级字符串
 * @returns true = 合法年级
 */
export function isGrade(grade: string): boolean {
  if (!grade || typeof grade !== 'string') return false
  return GRADE_OPTIONS.includes(grade.trim())
}

/**
 * 校验分数范围（默认 0-100，可自定义 max）
 * @param score 分数
 * @param max 最大分值，默认 100
 * @returns true = 合法分数
 */
export function isScore(score: number | string, max = 100): boolean {
  const n = Number(score)
  if (Number.isNaN(n)) return false
  return n >= 0 && n <= max
}

/**
 * 校验非空字符串（trim 后判断）
 * @param value 待校验值
 * @returns true = 非空
 */
export function isNonEmpty(value: string | null | undefined): boolean {
  return value != null && String(value).trim() !== ''
}

/**
 * 校验学号格式：字母数字组合，2-32 位
 * @param studentNo 学号
 * @returns true = 合法（允许空，视为可选字段）
 */
export function isStudentNo(studentNo: string | null | undefined): boolean {
  if (studentNo == null || studentNo === '') return true // 可选字段
  return /^[A-Za-z0-9]{2,32}$/.test(String(studentNo).trim())
}

/**
 * 校验金额：最多两位小数的正数
 * @param amount 金额
 * @returns true = 合法
 */
export function isAmount(amount: number | string): boolean {
  const n = Number(amount)
  if (Number.isNaN(n) || n <= 0) return false
  return /^\d+(\.\d{1,2})?$/.test(String(amount).trim())
}

/**
 * URL 格式校验（允许空值）
 * @param url URL 字符串
 * @returns true = 合法或空
 */
export function isUrl(url: string | null | undefined): boolean {
  if (url == null || url === '') return true
  try {
    const u = new URL(String(url).trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * 日期字符串校验：YYYY-MM-DD 格式（允许空值）
 * @param dateStr 日期字符串
 * @returns true = 合法或空
 */
export function isDateStr(dateStr: string | null | undefined): boolean {
  if (dateStr == null || dateStr === '') return true
  return /^\d{4}-\d{2}-\d{2}$/.test(String(dateStr).trim())
}

/**
 * 字符串长度截断
 * @param str 字符串
 * @param max 最大长度
 * @returns 截断后字符串
 */
export function clip(str: string | null | undefined, max: number): string {
  if (str == null) return ''
  const v = String(str)
  return v.length > max ? v.slice(0, max) : v
}

/** 常见字段最大长度参考（与后端 entity 定义对齐） */
export const MAX_LEN = {
  NAME: 50,
  TITLE: 100,
  PHONE: 11,
  STUDENT_NO: 32,
  EMAIL: 100,
  URL: 500,
  TAG: 20,
  REMARK: 200,
  SCHOOL: 60,
  SUBJECT: 30,
  PASSWORD: 64,
} as const

// 重新导出常量供外部直接从 validators 导入
export { PHONE_REGEX, PHONE_HINT, CLASS_NAMING_RULE, SUBJECT_VALUES, ROLE_VALUES, FEATURE_FLAGS_SET, GRADE_OPTIONS } from '../constants'
export type { SubjectOption, RoleOption, Role } from '../constants'