/** 教师端 API 共享类型定义 */

/** 教师端：班级列表项 */
export interface TeacherClass {
  id: string
  teacherId: string
  name: string
  grade: string
  classNo: string
  headTeacher: string
  term: string
  subjects?: string[]
  color?: string
  createdAt: string
}

/** 教师端：学生列表项 */
export interface TeacherStudent {
  id: string
  classId: string
  name: string
  gender: string
  studentNo: string
  parentName?: string
  parentPhone?: string
  studentPhone?: string
  address?: string
  parentLoginEnabled?: boolean
  createdAt: string
}

/** 班级成员（教师） */
export interface ClassMember {
  id: string
  classId: string
  teacherId: string
  teacherName: string
  role: 'head' | 'subject'
  subjects?: string[]
  term: string
}

/** 家长功能包选项 */
export interface ParentFeatureOption { key: string; label: string }

/** 成绩导入行 */
export interface GradeImportRow {
  studentId: string
  score: number | null
  valid?: boolean
  name?: string
  studentNo?: string
}
