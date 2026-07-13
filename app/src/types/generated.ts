/** 优选试卷: 本地保存的生成记录 */
export interface GeneratedPaper {
  id: string
  title: string
  /** 年级, 如 三年级 */
  grade: string
  /** 学科 */
  subject: string
  /** 生成时的提示/参数摘要 (用于历史回看) */
  prompt: string
  /** 试卷正文 (Markdown) */
  content: string
  createdAt: number
}

/** 优质教案: 本地保存的生成记录 */
export interface GeneratedLessonPlan {
  id: string
  title: string
  /** 主题, 如 春 / 光合作用 */
  topic: string
  /** 学科 */
  subject: string
  /** 年级 */
  grade: string
  /** 生成时的提示/参数摘要 */
  prompt: string
  /** 教案正文 (Markdown) */
  content: string
  createdAt: number
}
