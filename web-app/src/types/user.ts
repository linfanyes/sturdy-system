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

/** 各角色登录入参 */
export interface SuperLoginDto { username: string; password: string }
export interface SchoolAdminLoginDto { username: string; password: string }
export interface TeacherLoginDto { username: string; password: string }
export interface ParentLoginDto { studentNo: string; password: string }
