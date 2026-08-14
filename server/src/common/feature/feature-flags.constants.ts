/**
 * 功能包标识列表（FEATURE_FLAGS）
 *
 * 此文件与 shared/constants/index.ts 保持同步，是服务端本地副本。
 * 原因：云托管 Docker 构建上下文仅为 server/ 目录，无法引用项目根 shared/。
 * 修改时请同时更新 shared/constants/index.ts；CI 会做一致性校验（见 .github/workflows/ci.yml）。
 *
 * @see shared/constants/index.ts
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
  // 办公/学科/快捷工具
  'office_tools', 'subject_tools', 'quicktool', 'grade_trend', 'picker_history',
  // 与 shared 对齐补全（历史债 #9：此前缺失导致双端 key 漂移）
  'reward', 'translate', 'blackboard', 'speech',
]

/**
 * 家长功能包可选 key（班主任可为班级家长配置「家长页面功能」，学校级仍可进一步收窄）。
 * 与 shared/constants/index.ts 的 PARENT_FEATURE_KEYS 保持一致（CI 做一致性校验）。
 */
export const PARENT_FEATURE_KEYS: string[] = [
  'grades', 'analysis', 'homework', 'attendance', 'behavior', 'notices',
  'im', 'activities', 'gallery', 'checkin', 'reading', 'growth', 'schedule', 'rewards', 'duty',
]

/** 功能包 key → 中文标签（服务端本地副本，与 shared/constants/index.ts 保持同步） */
export const FEATURE_LABELS: Record<string, string> = {
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

/** 家长功能包选项（key + 中文标签，双端管理 UI 直接复用） */
export const PARENT_FEATURE_OPTIONS: { key: string; label: string }[] = PARENT_FEATURE_KEYS.map(
  (k) => ({ key: k, label: FEATURE_LABELS[k] || k }),
)
