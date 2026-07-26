/** 四种角色：与后端 JWT payload.role 对齐 */
export type Role = 'super' | 'school_admin' | 'teacher' | 'parent'

/** 登录用户信息（由后端登录接口返回 + 前端拼装） */
export interface AuthUser {
  id: string
  role: Role
  name: string
  schoolId?: string
  schoolName?: string
  /** 教师岗位（如班主任、语文教师等） */
  position?: string
  /** 教师工号 */
  teacherNo?: string
  /** 教师功能权限（仅 teacher 角色有值，空数组=全部可用） */
  features?: string[]
  /** 校管模块权限（仅 school_admin 角色有值） */
  permissions?: string[]
  /** 家长关联学生信息（仅 parent 角色） */
  studentId?: string
  studentName?: string
  classId?: string
}

/** 各角色登录入参 */
export interface SuperLoginDto { username: string; password: string }
export interface SchoolAdminLoginDto { username: string; password: string }
export interface TeacherLoginDto { username: string; password: string }
export interface ParentLoginDto { studentNo: string; password: string }
