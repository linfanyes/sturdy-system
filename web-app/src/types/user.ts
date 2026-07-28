/**
 * 用户/角色类型定义
 * 重新导出共享包类型，保持向后兼容
 */
export {
  type Role,
  type SubjectOption,
  type RoleOption,
  type User,
  type Teacher,
  type Student,
  type Class,
  type ApiResponse,
  type PageParams,
  type PageResult,
} from '@gardener/shared/types'

import type { Role } from '@gardener/shared/types'

/** 各角色登录入参 */
export interface SuperLoginDto { username: string; password: string }
export interface SchoolAdminLoginDto { username: string; password: string }
export interface TeacherLoginDto { username: string; password: string }
export interface ParentLoginDto { studentNo: string; password: string }

/** 登录后返回的用户信息（auth store 用） */
export interface AuthUser {
  id: string | number
  role: Role
  name: string
  schoolId?: number
  schoolName?: string
  features?: string[]
  studentId?: number
  studentName?: string
  classId?: number
  position?: string
  teacherNo?: string
}
