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
  FEATURE_FLAGS,
  FEATURE_FLAGS_SET,
  GRADE_OPTIONS,
} from '../constants'
// P3-12修复：添加 SubjectOption 类型导入（用于 getSubjectByValue 返回类型）
import type { SubjectOption } from '../constants'

/**
 * 严格手机号校验：必须符合 PHONE_REGEX，**不允许空**
 * @param value 待校验手机号（可接受 null/undefined，此时返回 false）
 * @returns true = 合法
 */
export function isPhone(value: string | null | undefined): boolean {
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
    parsedGrade = primaryMatch[1]!
    classNo = Number.parseInt(primaryMatch[3]!, 10)
  } else {
    const middleMatch = trimmed.match(/^(初一|初二|初三)(\d+)班$/)
    if (middleMatch) {
      parsedGrade = middleMatch[1]!
      classNo = Number.parseInt(middleMatch[2]!, 10)
    } else {
      const highMatch = trimmed.match(/^(高一|高二|高三)(\d+)班$/)
      if (!highMatch) {
        return { valid: false, error: '无法解析班级序号' }
      }
      parsedGrade = highMatch[1]!
      classNo = Number.parseInt(highMatch[2]!, 10)
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
 * @param opts.lenient 宽松模式：true 时非法输入返回 ''（不抛异常），用于表单中间态
 * @returns 标准班级名（如 "五年级1班"、"初二3班"、"高一5班"）；宽松模式下非法输入返回 ''
 */
export function generateClassName(grade: string, classNo: number | string, opts?: { lenient?: boolean }): string {
  const gradeStr = String(grade)
  if (!GRADE_OPTIONS.includes(gradeStr)) {
    if (opts?.lenient) return ''
    throw new Error(`非法年级：${gradeStr}，可选：${GRADE_OPTIONS.join('、')}`)
  }
  const classNoStr = String(classNo)
  const classNoNum = Number.parseInt(classNoStr, 10)
  if (!/^\d+$/.test(classNoStr) || !Number.isInteger(classNoNum) || classNoNum <= 0 || classNoNum > 99) {
    if (opts?.lenient) return ''
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
    const grade = match[1]!
    const classNo = Number.parseInt(match[3]!, 10)
    if (GRADE_OPTIONS.includes(grade) && classNo > 0 && classNo <= 99) {
      return { grade, classNo }
    }
    return null
  }

  // 尝试初中格式：初二3班
  match = trimmed.match(/^(初一|初二|初三)(\d+)班$/)
  if (match) {
    const grade = match[1]!
    const classNo = Number.parseInt(match[2]!, 10)
    if (GRADE_OPTIONS.includes(grade) && classNo > 0 && classNo <= 99) {
      return { grade, classNo }
    }
    return null
  }

  // 尝试高中格式：高一5班
  match = trimmed.match(/^(高一|高二|高三)(\d+)班$/)
  if (match) {
    const grade = match[1]!
    const classNo = Number.parseInt(match[2]!, 10)
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
// P3-12修复：内联 import 类型改为文件顶部 import（见顶部 SUBJECT_OPTIONS 导入）
export function getSubjectByValue(value: string): SubjectOption | undefined {
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
 * - fail-closed：features 缺失 / 非数组 / 空数组 一律拒绝（不猜测、不放行）
 * - 非空数组 = 必须包含 feature 才放行
 * @param features 用户拥有的特性数组
 * @param feature 待检查的特性
 * @returns true = 有权限
 */
export function hasFeature(features: string[], feature: string): boolean {
  if (!Array.isArray(features) || features.length === 0) return false // fail-closed：空数组 = 拒绝
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
 * 邮箱校验：标准格式。
 * @param s 邮箱字符串
 * @returns true = 合法
 */
export function isEmail(s: string | null | undefined): boolean {
  if (s == null || s === '') return false
  return /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/.test(String(s))
}

/**
 * 数字范围校验：min/max 均为闭区间；非数字返回 false。
 * @param num 待校验值
 * @param min 最小值（含），可选
 * @param max 最大值（含），可选
 * @returns true = 在范围内
 */
export function inRange(num: number | string, min: number | null, max: number | null): boolean {
  const n = Number(num)
  if (Number.isNaN(n)) return false
  if (min != null && n < min) return false
  if (max != null && n > max) return false
  return true
}

/**
 * 整数范围校验（含负数）。
 * @param num 待校验值
 * @param min 最小值（含），可选
 * @param max 最大值（含），可选
 * @returns true = 合法整数且在范围内
 */
export function isInt(num: number | string, min: number | null = null, max: number | null = null): boolean {
  const n = Number(num)
  if (!Number.isInteger(n)) return false
  return inRange(n, min, max)
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

/* ==================== 功能包（Feature Flags）解析 ====================
 * effective = 学校级 ∩ 教师级；某一级为 null / [] 时视为「该级全集」，不对结果做收窄。
 * 统一收口在 shared：Web 端、小程序端、后端均可复用，消除三份实现漂移。
 * 对齐语义：web-app（后端 effectiveFeatures 直出）、mini-program/src/common/feature.js。
 */

/**
 * 归一化某一级的功能清单：null / 非数组 / 空数组 → 全集（FEATURE_FLAGS）。
 * @param flags 某一级配置（学校级或教师级）
 * @returns 归一化后的 key 列表
 */
export function normalizeLevel(flags: string[] | null | undefined): string[] {
  if (!Array.isArray(flags) || flags.length === 0) return [...FEATURE_FLAGS]
  return flags.filter((k) => FEATURE_FLAGS.includes(k))
}

/**
 * 计算实际可用功能包：effective = 学校级 ∩ 教师级。
 * @param schoolFlags 学校级 featureFlags
 * @param teacherFeatures 教师级 features
 * @returns 实际可用的 key 列表（保持 FEATURE_FLAGS 原始顺序）
 */
export function computeEffective(
  schoolFlags: string[] | null | undefined,
  teacherFeatures: string[] | null | undefined,
): string[] {
  const schoolSet = new Set(normalizeLevel(schoolFlags))
  const teacherSet = new Set(normalizeLevel(teacherFeatures))
  return FEATURE_FLAGS.filter((k) => schoolSet.has(k) && teacherSet.has(k))
}

/**
 * 判断某 key 是否被「学校级」关闭（教师即使勾选也不可用）。
 * @param key 功能包 key
 * @param schoolFlags 学校级 featureFlags
 * @returns true = 被学校级关闭
 */
export function isBlockedBySchool(key: string, schoolFlags: string[] | null | undefined): boolean {
  if (!Array.isArray(schoolFlags) || schoolFlags.length === 0) return false
  return !schoolFlags.includes(key)
}