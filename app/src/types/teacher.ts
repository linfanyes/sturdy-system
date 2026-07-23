/** 任教条目：把班级和学科绑定 */
export interface TeachingEntry {
  classId: string
  subject: string
}

export interface Teacher {
  id: string
  name: string
  position: string // 教师职务
  phone: string
  email: string
  teachings: TeachingEntry[] // 任教班级学科，复合维度
  remark: string
  joinAt: string
  avatar: string
  isStarred: boolean
}

/** 教师在某个班级教授某个科目的任教配置 */
export interface TeachingAssignment {
  classId: string
  subject: string
}
