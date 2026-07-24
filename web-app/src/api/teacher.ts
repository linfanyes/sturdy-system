import request from './request'

/** 教师端：班级列表项（复用 ClassItem 结构） */
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
  parentLoginEnabled?: boolean
  createdAt: string
}

/** 获取当前教师的班级列表 */
export function listMyClasses() {
  return request.get<any, TeacherClass[]>('/classes')
}

/** 获取某班级的学生列表 */
export function listClassStudents(classId: string) {
  return request.get<any, TeacherStudent[]>('/students', { params: { classId } })
}
