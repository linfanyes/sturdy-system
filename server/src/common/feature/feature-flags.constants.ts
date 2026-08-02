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
