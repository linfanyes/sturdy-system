/** 奖惩类型：表扬/批评/处分 */
export type RewardType = '表扬' | '批评' | '处分'

/** 奖惩记录：含积分增减 */
export interface RewardRecord {
  id: string
  classId: string
  studentId: string
  type: RewardType
  /** 积分（正数表示加分，负数表示减分） */
  points: number
  /** 原因/事项 */
  reason: string
  date: string
  createdAt: number
}
