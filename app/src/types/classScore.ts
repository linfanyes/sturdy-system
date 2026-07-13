/** 课堂加分/减分 */
export interface ScoreRecord {
  id: string
  classId: string
  studentId: string
  studentName: string
  delta: number // 正数为加分，负数为减分
  reason: string
  createdAt: number
}

/** 小组分数 */
export interface GroupScore {
  id: string
  classId: string
  name: string
  points: number
  color: string
  updatedAt: number
}
