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

/** 知识点: 本地保存的 AI 生成课本知识点记录 */
export interface GeneratedKnowledge {
  id: string
  title: string
  /** 年级, 如 三年级 */
  grade: string
  /** 学科 */
  subject: string
  /** 教材版本, 如 人教版 / 北师大版 */
  textbook: string
  /** 学期, 如 2026春季学期 */
  term: string
  /** 生成时的提示/参数摘要 */
  prompt: string
  /** 知识点正文 (Markdown) */
  content: string
  createdAt: number
}

/** 试卷查询: 联网检索到的往年试卷参考 (AI 整理, 纯本地保存) */
export interface PaperQueryDoc {
  id: string
  keyword: string
  title: string
  /** 来源, 如 学科网 / 百度文库 */
  source: string
  /** 年份 */
  year: string
  /** 摘要 */
  abstract: string
  /** 可下载的整理版 Markdown */
  content: string
  createdAt: number
}
