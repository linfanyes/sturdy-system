export type Gender = '男' | '女'

export interface ClassItem {
  id: string
  name: string
  grade: string
  classNo: string
  slogan: string
  headTeacher: string
  teachers: string[]
  color: string
  term: string
  subjects: string[]
  createdAt: number
}

export interface Student {
  id: string
  classId: string
  name: string
  gender: Gender
  studentNo: string
  seatNo: number
  seatRow?: number
  seatCol?: number
  parentName: string
  parentPhone: string
  note: string
  tags: string[]
  duty?: string
  comment?: string
  createdAt: number
}
