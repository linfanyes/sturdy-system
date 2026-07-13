/** 学生成长档案条目 */
export interface GrowthEntry {
  id: string
  studentId: string
  studentName: string
  type: '获奖' | '进步' | '谈话' | '家访' | '特殊事件' | '其他'
  date: string
  title: string
  content: string
  createdAt: number
}

/** 行为观察记录 */
export interface BehaviorRecord {
  id: string
  studentId: string
  studentName: string
  date: string
  behavior: '积极发言' | '认真听讲' | '走神' | '帮助同学' | '违纪' | '其他'
  note: string
  createdAt: number
}
