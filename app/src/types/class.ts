export type Gender = '男' | '女'

export interface ClassItem {
  id: string
  name: string // 例：三年级二班
  grade: string // 例：三年级
  classNo: string // 班号：1、2、3…
  slogan: string
  headTeacher: string // 班主任姓名（从通讯录选择）
  teachers: string[] // 任课老师名单（从通讯录选择，多选）
  color: string
  term: string // 本学期, 如 '2026春季学期'
  subjects: string[] // 本学期涉及学科 (空数组表示不限制)
  createdAt: number
}

export interface Student {
  id: string
  classId: string
  name: string
  gender: Gender
  studentNo: string
  seatNo: number
  /** 座位行（座位编排后写入） */
  seatRow?: number
  /** 座位列（座位编排后写入） */
  seatCol?: number
  parentName: string
  parentPhone: string
  note: string
  tags: string[]
  /** AI 生成的期末/阶段性评语 (鼓励赞扬向), 可选 */
  comment?: string
  createdAt: number
}
