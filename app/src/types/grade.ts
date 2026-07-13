export interface GradeScore {
  studentId: string
  score: number | null // null 表示缺考
}

export interface Grade {
  id: string
  classId: string
  subject: string
  examName: string
  /** 关联考试计划 id (可选; 缺省时按 classId+subject+examName+date 推断) */
  examId?: string
  date: string
  scores: GradeScore[]
  createdAt: number
}

/** 考试计划：本学期某次考试安排（不存成绩，仅作计划与跳转） */
export interface Exam {
  id: string
  /** 学期名称，如 2025-2026-1、2026 春 */
  term: string
  /** 考试名称，如 期中考试、第二单元测试 */
  name: string
  classId: string
  /** 科目列表（可多选） */
  subjects: string[]
  /** 各科目满分, 缺省时按科目默认 (语数英 100, 其他 50) */
  subjectFullScores?: Record<string, number>
  /** 考试日期 */
  date: string
  /** 备注 */
  note: string
  /** 本次考试分析情况描述（成绩分析 / 综合分析中编辑保存） */
  analysisNote?: string
  createdAt: number
}
