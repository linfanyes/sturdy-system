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
 * Role 类型权威来源：@gardener/shared/auth（auth/machine.ts）
 */
import type { Role } from '../auth/machine.js'
export type { Role }

export interface RoleOption {
  label: string
  value: Role
  features?: string[]
}

export const ROLE_OPTIONS: RoleOption[] = [
  { label: '超级管理员', value: 'super', features: ['*'] },
  { label: '学校管理员', value: 'school_admin', features: ['school_manage', 'teacher_manage', 'student_manage', 'class_manage', 'data_analysis'] },
  { label: '教师', value: 'teacher', features: ['exams', 'grades', 'homework', 'attendance', 'tools', 'seats', 'games', 'rewards', 'growth', 'behavior', 'reading', 'checkin', 'finance', 'activities', 'duty', 'gallery', 'parents', 'im', 'notices', 'ai', 'schedule', 'worklog', 'observation', 'calendar', 'teachers', 'todos', 'notes', 'demo'] },
  { label: '家长', value: 'parent', features: ['grades', 'homework', 'notices', 'im', 'activities', 'gallery', 'checkin', 'reading'] },
]

/** 角色值数组（便于校验器引用） */
export const ROLE_VALUES: Role[] = ROLE_OPTIONS.map((r) => r.value)

/**
 * 教师职务选项
 * - 基础职务：班主任、教研组长、年级组长、教导主任、副校长、校长
 * - 学科组长：{年级}{学科}组长（如"一年级语文组长"），用于教材知识库编辑权限
 * 学科组长可编辑对应学科+年级的教材内容；"{学科}组长"（无年级）可编辑该学科所有年级。
 */
export const BASE_POSITIONS: string[] = [
  '班主任', '教研组长', '年级组长', '教导主任', '副校长', '校长',
]

/** 生成学科组长职务选项（小学 6 个年级 × 主科） */
function buildSubjectLeaderPositions(): string[] {
  const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级']
  const subjects = ['语文', '数学', '英语', '科学', '道德与法治']
  const list: string[] = []
  // 各年级各学科组长
  for (const g of grades) {
    for (const s of subjects) {
      list.push(`${g}${s}组长`)
    }
  }
  // 各学科总组长（不限年级）
  for (const s of subjects) {
    list.push(`${s}组长`)
  }
  return list
}

export const SUBJECT_LEADER_POSITIONS: string[] = buildSubjectLeaderPositions()

/** 全部职务选项（基础 + 学科组长），供前端下拉使用 */
export const ALL_POSITIONS: string[] = [...BASE_POSITIONS, ...SUBJECT_LEADER_POSITIONS]

/**
 * 解析职务字符串，提取学科和年级（用于教材编辑权限判断）
 * @returns { subject?, grade? } 学科组长职务返回对应学科和年级；否则返回空
 */
export function parseSubjectLeader(position: string): { subject?: string; grade?: string } {
  if (!position) return {}
  // 匹配 "{年级}{学科}组长" 或 "{学科}组长"
  for (const subject of ['语文', '数学', '英语', '科学', '道德与法治', '音乐', '美术', '体育', '信息技术']) {
    if (position === `${subject}组长`) return { subject }
    for (const grade of GRADE_OPTIONS) {
      if (position === `${grade}${subject}组长`) return { subject, grade }
    }
  }
  return {}
}


/**
 * 功能包标识（FEATURE_FLAGS）—— 双端 + 后端的「单一事实来源」。
 * - 以 Web 端 ALL_FEATURES（40 个）为基础，均为 camelCase「包级 key」，不做 games.2048 项级拆分。
 * - 旧 ['games'] 等价于「games 包开启」，迁移零兼容负担。
 * - 学校级 key 值域 = 教师级全集（超管可开关任意包级 key）。
 * 对齐：web-app/src/constants/features.ts、mini-program/src/pages/school-admin/school-admin.vue
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
  // 办公/学科/快捷工具（Web 端既有，统一纳入单一来源）
  'office_tools', 'subject_tools', 'quicktool', 'grade_trend', 'picker_history',
  'reward', 'translate', 'blackboard', 'speech',
]

/** 功能包 key → 中文标签（双端 UI 展示用，保持单一来源） */
export const FEATURE_FLAG_LABELS: Record<string, string> = {
  classes: '班级管理', students: '学生管理',
  exams: '考试管理', grades: '成绩管理', analysis: '考试分析', attendance: '考勤', homework: '作业',
  tools: '课堂工具', seats: '座位表', games: '小游戏',
  rewards: '奖励/积分', growth: '成长记录', behavior: '行为记录', reading: '课外阅读', checkin: '学生打卡',
  finance: '班费', activities: '班级活动', duty: '轮值表', gallery: '班级风采',
  parents: '家长联系', im: '家校沟通', notices: '公告',
  ai: 'AI助手/备课', schedule: '课表',
  worklog: '工作日志', observation: '听课记录', calendar: '教学日历', teachers: '教师通讯录',
  todos: '待办事项', notes: '笔记', demo: '演示模式',
  office_tools: '办公工具', subject_tools: '学科工具', quicktool: '快捷工具', grade_trend: '成绩趋势', picker_history: '点名历史',
  reward: '奖赏', translate: '翻译', blackboard: '黑板报', speech: '演讲稿',
}

/** 特性标识集合（用于快速 O(1) 查找） */
export const FEATURE_FLAGS_SET: Set<string> = new Set(FEATURE_FLAGS)

/** 标准功能包清单（双端 UI 直接复用） */
export const FEATURE_FLAG_LIST: { key: string; label: string }[] = FEATURE_FLAGS.map(
  (k) => ({ key: k, label: FEATURE_FLAG_LABELS[k] || k }),
)
/** 主题配色方案（4 色） */
export interface ColorScheme {
  value: string
  label: string
  color: string
}

export const SCHEMES: ColorScheme[] = [
  { value: 'butter', label: '奶黄', color: '#e6a23c' },
  { value: 'mint', label: '薄荷', color: '#07c160' },
  { value: 'sakura', label: '樱花', color: '#e06c75' },
  { value: 'sky', label: '天蓝', color: '#409eff' },
]

/** 主题色值数组 */
export const SCHEME_VALUES: string[] = SCHEMES.map((s) => s.value)

/**
 * 字体大小选项（3 档）
 * 对齐：mini-program/src/common/store.js::FONT_SIZES
 */
export interface FontSizeOption {
  value: string
  label: string
  scale: number
}

export const FONT_SIZES: FontSizeOption[] = [
  { value: 'sm', label: '小', scale: 0.9 },
  { value: 'md', label: '标准', scale: 1 },
  { value: 'lg', label: '大', scale: 1.15 },
]

