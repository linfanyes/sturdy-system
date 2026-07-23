export interface User {
  id: string
  name: string
  subject: string
  subjects: string[] // 任教学科 (复数, 用于多科选择)
  term: string // 当前任教学期, 如 '2026春季学期'
  /** 所在学校名称 */
  school: string
  avatar: string // emoji
  motto: string
  phone?: string
  email?: string
  createdAt: number
}

export type Theme = 'light' | 'dark'
