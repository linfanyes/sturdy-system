/**
 * 跨端共享常量 - 单一事实来源
 * 供 Web 端、小程序端、后端服务共同引用
 * 使用 tsconfig paths 别名 @gardener/shared/constants 导入
 */

/**
 * 学科选项（15 门标准学科）
 * 对齐：web-app/src/constants/subjects.ts、mini-program/src/common/subject-schema.js::ALL_SUBJECTS
 */
export interface SubjectOption {
  label: string
  value: string
  icon?: string
  color?: string
  description?: string
}

export const SUBJECT_OPTIONS: SubjectOption[] = [
  { label: '语文', value: '语文', icon: '📜', color: '#e6a23c', description: '诗词/听写/作文/阅读' },
  { label: '数学', value: '数学', icon: '🔢', color: '#3a8ee6', description: '口算/竖式/单位换算' },
  { label: '英语', value: '英语', icon: '🔤', color: '#07c160', description: '单词/听力/口语/语法' },
  { label: '科学', value: '科学', icon: '🔬', color: '#9b59b6', description: '实验设计/知识图解/观察记录' },
  { label: '物理', value: '物理', icon: '⚛️', color: '#34495e', description: '' },
  { label: '化学', value: '化学', icon: '⚗️', color: '#e74c3c', description: '' },
  { label: '生物', value: '生物', icon: '🧬', color: '#27ae60', description: '' },
  { label: '历史', value: '历史', icon: '📜', color: '#8e44ad', description: '' },
  { label: '地理', value: '地理', icon: '🌍', color: '#16a085', description: '' },
  { label: '政治', value: '政治', icon: '⚖️', color: '#c0392b', description: '' },
  { label: '音乐', value: '音乐', icon: '🎵', color: '#e91e63', description: '' },
  { label: '美术', value: '美术', icon: '🎨', color: '#9c27b0', description: '' },
  { label: '体育', value: '体育', icon: '🏃', color: '#ff5722', description: '' },
  { label: '信息技术', value: '信息技术', icon: '💻', color: '#607d8b', description: '' },
  { label: '综合实践', value: '综合实践', icon: '🛠️', color: '#795548', description: '' },
]

/** 学科值数组（便于校验器直接引用） */
export const SUBJECT_VALUES: string[] = SUBJECT_OPTIONS.map((s) => s.value)

/**
 * 手机号正则：中国大陆手机号（1 开头，第二位 3-9，共 11 位）
 * 对齐：web-app/src/utils/validators.ts::PHONE_RE、mini-program/src/common/validators.js::isPhone
 */
export const PHONE_REGEX: RegExp = /^1[3-9]\d{9}$/

/** 手机号校验失败提示语 */
export const PHONE_HINT: string = '请输入11位手机号'

/**
 * 班级命名规则：年级+序号+"班"（如 "五年级1班"、"初二3班"、"高一5班"）
 * 支持格式：
 *   - 小学：一年级~六年级 + 序号 + 班（如 "五年级1班"）
 *   - 初中：初一~初三 + 序号 + 班（如 "初二3班"）
 *   - 高中：高一~高三 + 序号 + 班（如 "高一5班"）
 * 对齐：mini-program/src/common/validators.js::isClassName（如有）、web 端校验逻辑
 */
export const CLASS_NAMING_RULE = {
  /** 正则：(一~六年级|初一~初三|高一~高三) + 序号(1-99) + 班 */
  pattern: /^((一|二|三|四|五|六)年级|初一|初二|初三|高一|高二|高三)([1-9]|[1-9]\d)班$/,
  /** 示例 */
  example: '五年级1班 / 初二3班 / 高一5班',
  /** 说明 */
  description: '班级命名格式：小学"年级+序号+班"（如 五年级1班）、初高中"年级+序号+班"（如 初二3班、高一5班）',
} as const

/**
 * 年级选项（小学一~六年级、初一~初三、高一~高三）
 * 对齐：mini-program/src/common/subject-schema.js::GRADE
 */
export const GRADE_OPTIONS: string[] = [
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '初一', '初二', '初三',
  '高一', '高二', '高三',
]

/**
 * 角色选项（4 种角色）
 * 对齐：web-app/src/types/user.ts::Role、后端 JWT payload.role
 */
export type Role = 'super_admin' | 'school_admin' | 'teacher' | 'parent'

export interface RoleOption {
  label: string
  value: Role
  features?: string[]
}

export const ROLE_OPTIONS: RoleOption[] = [
  { label: '超级管理员', value: 'super_admin', features: ['*'] },
  { label: '学校管理员', value: 'school_admin', features: ['school_manage', 'teacher_manage', 'student_manage', 'class_manage', 'data_analysis'] },
  { label: '教师', value: 'teacher', features: ['exams', 'grades', 'homework', 'attendance', 'tools', 'seats', 'games', 'rewards', 'growth', 'behavior', 'reading', 'checkin', 'finance', 'activities', 'duty', 'gallery', 'parents', 'im', 'notices', 'ai', 'schedule', 'worklog', 'observation', 'calendar', 'teachers', 'todos', 'notes', 'demo'] },
  { label: '家长', value: 'parent', features: ['grades', 'homework', 'notices', 'im', 'activities', 'gallery', 'checkin', 'reading'] },
]

/** 角色值数组（便于校验器引用） */
export const ROLE_VALUES: Role[] = ROLE_OPTIONS.map((r) => r.value)

/**
 * 教师功能权限标识列表（FEATURE_FLAGS）
 * 对齐：web-app/src/constants/features.ts::ALL_FEATURES、mini-program 校管配置
 */
export const FEATURE_FLAGS: string[] = [
  // 班级与学生
  'classes', 'students',
  // 学情与考试
  'exams', 'grades', 'analysis', 'attendance', 'homework',
  // 课堂工具
  'tools', 'seats', 'games',
  // 学生评价
  'rewards', 'growth', 'behavior', 'reading', 'checkin',
  // 班级管理
  'finance', 'activities', 'duty', 'gallery',
  // 家校沟通
  'parents', 'im', 'notices',
  // AI 与备课
  'ai', 'schedule',
  // 教师办公
  'worklog', 'observation', 'calendar', 'teachers',
  // 个人
  'todos', 'notes', 'demo',
]

/** 特性标识集合（用于快速 O(1) 查找） */
export const FEATURE_FLAGS_SET: Set<string> = new Set(FEATURE_FLAGS)