/** 听课记录 */
export interface LessonObservation {
  id: string
  teacherName: string
  classId: string
  className: string
  subject: string
  topic: string
  date: string
  strengths: string
  suggestions: string
  overallRating: '优秀' | '良好' | '一般' | '待改进'
  createdAt: number
}

/** 工作日志 */
export interface WorkLog {
  id: string
  date: string
  content: string
  classCount: number // 上课节数
  homeworkCount: number // 作业批改数
  note: string
  createdAt: number
}

/** 教案模板 */
export interface LessonPlanTemplate {
  id: string
  title: string
  subject: string
  lessonType: '新授课' | '复习课' | '练习课' | '讲评课' | '其他'
  grade: string
  content: string
  isFavorite: boolean
  createdAt: number
}
