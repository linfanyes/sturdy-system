/**
 * 功能权限 key 列表（与小程序 school-admin.vue allFeatures 对齐）。
 * 校管在 Web 端可为每位教师配置可见的功能模块。
 */
export const ALL_FEATURES: { key: string; label: string }[] = [
  // 班级与学生
  { key: 'classes', label: '班级管理' }, { key: 'students', label: '学生管理' },
  // 学情与考试
  { key: 'exams', label: '考试管理' }, { key: 'grades', label: '成绩管理' }, { key: 'analysis', label: '考试分析' },
  { key: 'attendance', label: '考勤' }, { key: 'homework', label: '作业' },
  // 课堂工具
  { key: 'tools', label: '课堂工具' }, { key: 'seats', label: '座位表' }, { key: 'games', label: '小游戏' },
  // 学生评价
  { key: 'rewards', label: '奖励/积分' }, { key: 'growth', label: '成长记录' }, { key: 'behavior', label: '行为记录' },
  { key: 'reading', label: '课外阅读' }, { key: 'checkin', label: '学生打卡' },
  // 班级管理
  { key: 'finance', label: '班费' }, { key: 'activities', label: '班级活动' }, { key: 'duty', label: '轮值表' },
  { key: 'gallery', label: '班级风采' },
  // 家校沟通
  { key: 'parents', label: '家长联系' }, { key: 'im', label: '家校沟通' }, { key: 'notices', label: '公告' },
  // AI 与备课
  { key: 'ai', label: 'AI助手/备课' }, { key: 'schedule', label: '课表' },
  // 教师办公
  { key: 'worklog', label: '工作日志' }, { key: 'observation', label: '听课记录' }, { key: 'calendar', label: '教学日历' },
  { key: 'teachers', label: '教师通讯录' },
  // 个人
  { key: 'todos', label: '待办事项' }, { key: 'notes', label: '笔记' }, { key: 'demo', label: '演示模式' },
]
