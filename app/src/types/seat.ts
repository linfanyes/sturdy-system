/** 座位表 */
export interface SeatLayout {
  id: string
  classId: string
  name: string // 布局名称，如 "默认座位"
  rows: number
  cols: number
  /** 二维数组: seats[row][col] = studentId | null */
  seats: (string | null)[][]
  /** 是否为当前启用的座位表（同班级只能一个 active） */
  active?: boolean
  createdAt: number
}
