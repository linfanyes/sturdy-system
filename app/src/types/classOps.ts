/** 班费收支记录 */
export interface ClassExpense {
  id: string
  classId: string
  type: '收入' | '支出'
  category: string // 如 "班费收缴"、"文具采购"、"活动经费"
  amount: number
  date: string
  description: string
  handler: string // 经办人
  createdAt: number
}

/** 值日/班干部轮值 */
export interface DutyRoster {
  id: string
  classId: string
  name: string // 轮值表名称
  type: '值日' | '班干部'
  /** 轮值安排: 日期 -> 人员列表 */
  assignments: { date: string; persons: string[] }[]
  createdAt: number
}

/** 班级活动记录 */
export interface ClassActivity {
  id: string
  classId: string
  title: string
  date: string
  description: string
  photos: string[] // 照片 base64 或 URL
  createdAt: number
}
