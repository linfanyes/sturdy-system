export interface ClassDutyConfig {
  classId: string
  /** 该班级启用的职务列表 */
  duties: string[]
  /** 职务 -> 学生ID 的分配关系 */
  assignments: Record<string, string | null>
}
