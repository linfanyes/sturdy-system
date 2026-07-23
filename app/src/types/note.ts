export type NoteCategory = '教学反思' | '班会记录' | '学习资料' | '其他'

export interface NoteItem {
  id: string
  title: string
  content: string
  category: NoteCategory
  pinned: boolean
  favorite: boolean
  createdAt: number
  updatedAt: number
}

/** 教师每日待办 */
export interface TodoItem {
  id: string
  title: string
  note: string
  date: string // YYYY-MM-DD
  done: boolean
  doneAt: number
  createdAt: number
}

export interface PickerHistory {
  id: string
  classId: string
  studentId: string
  studentName: string
  createdAt: number
}
