import { Grade, GradeScore } from './grade.entity'

export const GRADE_INSTRUCTION = `这是一份成绩单（图片 OCR 或文件提取后的文本），请识别其中每个学生及其分数并输出 JSON 数组。每个元素结构：
{ "name": "学生姓名", "studentNo": "学号(可选)", "score": "分数(数字或空字符串表示缺考)" }
规则：
- 只识别真实学生成绩行，跳过表头/标题/合计/平均分/排名行；
- 分数统一为数字（不含小数则整数，含小数保留一位）；
- 缺考/空值用空字符串表示；
- 只返回 JSON 数组，不要任何解释或前后缀文字。`

export interface SubjectStat {
  subject: string
  count: number
  total: number
  avg: number
  max: number
  min: number
  passRate: number
  excellentRate: number
  failCount: number
  scoreRange: number
  stdDev?: number
  distribution: { label: string; count: number }[]
}

export interface WeakStudentItem {
  studentId: string
  studentName: string
  studentNo: string
  score: number | null
  gap: number
}

export interface WeakSubjectResult {
  examId: string
  examName: string
  subject: string
  classAvg: number
  weakCount: number
  weakList: WeakStudentItem[]
}
