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
  /** 有效功能包（学校级 ∩ 教师级 实际可用），来自登录/me；用于菜单显隐与路由守卫 */
  effectiveFeatures?: string[]
  /** 学校级功能包开关（School.featureFlags），来自登录/me；超管/校管为 null */
  schoolFeatureFlags?: string[] | null
  studentId?: number
  studentName?: string
  classId?: number
  position?: string
  teacherNo?: string
  /** 教师主任教学科（如"语文"/"数学"/"英语"），用于按学科过滤菜单/工具 */
  subject?: string
  /** 教师任教学科列表（多数教师只任一科，subjects[0] 即主学科） */
  subjects?: string[]
}
