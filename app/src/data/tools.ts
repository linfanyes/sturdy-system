/**
 * 课堂神器（工作台快捷工具）统一数据源
 *
 * Dashboard「课堂神器」区块从本列表中选择 5 个展示，
 * 用户可在「管理」弹窗中自定义；默认取前 5 个常用工具。
 * 每个工具字段与 Dashboard 模板消费字段保持一致：
 *   name  显示名称
 *   icon  emoji 图标
 *   color 主题色（sakura / mint / sky2 / butter），用于背景底色
 *   route 跳转的路由 name
 */
export interface DashboardTool {
  name: string
  icon: string
  color: 'sakura' | 'mint' | 'sky2' | 'butter'
  route: string
}

/** 全部可选工具池（工作台从中挑选 5 个） */
export const ALL_TOOLS: DashboardTool[] = [
  { name: '随机点名', icon: '🎯', color: 'sakura', route: 'tool-picker' },
  { name: '倒计时', icon: '⏱️', color: 'mint', route: 'tool-timer' },
  { name: '评语生成', icon: '✍️', color: 'sky2', route: 'tool-comment' },
  { name: '口算生成', icon: '➕', color: 'butter', route: 'tool-math' },
  { name: '翻译', icon: '🌐', color: 'sky2', route: 'tool-translate' },
  { name: '课堂计算器', icon: '🧮', color: 'mint', route: 'tool-calc' },
  { name: '奖惩记录', icon: '🏅', color: 'sakura', route: 'tool-reward' },
  { name: '课表排版', icon: '🗓️', color: 'sky2', route: 'tool-schedule' },
  { name: '随机分组', icon: '👥', color: 'butter', route: 'tool-grouper' },
  { name: '小游戏', icon: '🎮', color: 'sakura', route: 'games' },
  { name: '我的课表', icon: '📅', color: 'mint', route: 'schedule' },
  { name: '座位表', icon: '💺', color: 'sky2', route: 'tool-seat' },
  { name: '课堂加减分', icon: '🏅', color: 'sakura', route: 'tool-score' },
  { name: '通知模板', icon: '📋', color: 'mint', route: 'tool-notice-tpl' },
  { name: '文案模板库', icon: '📑', color: 'butter', route: 'tool-plan-tpl' },
  { name: '教育论文', icon: '📝', color: 'sky2', route: 'tool-paper' },
]

/** 默认展示的 5 个常用工具（取列表前 5 个的路由） */
export const DEFAULT_TOOLS: string[] = ALL_TOOLS.slice(0, 5).map((t) => t.route)

/** 工作台最多可自定义的课堂神器数量 */
export const MAX_DASHBOARD_TOOLS = 5
