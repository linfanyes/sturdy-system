export interface User {
  id: string
  name: string
  subject: string
  subjects: string[]
  term: string
  school: string
  avatar: string
  motto: string
  createdAt: number
}

export type Theme = 'light' | 'dark'
