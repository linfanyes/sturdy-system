import request from './request'
import type {
  AuthUser,
  SuperLoginDto,
  SchoolAdminLoginDto,
  TeacherLoginDto,
  ParentLoginDto,
} from '@/types/user'

/** 统一登录响应（由各登录函数转换后返回） */
export interface LoginResult {
  token: string
  user: AuthUser
}

/**
 * 超管登录：POST /api/admin/login
 * 后端返回 { role:'super', token, user:{ name } }
 */
export async function superLogin(dto: SuperLoginDto): Promise<LoginResult> {
  const res = await request.post<any, any>('/admin/login', dto)
  return {
    token: res.token,
    user: { id: 'super', role: 'super', name: res.user?.name || '超级管理员' },
  }
}

/**
 * 校管登录：POST /api/school-admin/login
 * 后端返回 { token, admin:{ id, name, schoolId, schoolName, schoolCode } }
 */
export async function schoolAdminLogin(dto: SchoolAdminLoginDto): Promise<LoginResult> {
  const res = await request.post<any, any>('/school-admin/login', dto)
  const a = res.admin || {}
  return {
    token: res.token,
    user: {
      id: a.id,
      role: 'school_admin',
      name: a.name,
      schoolId: a.schoolId,
      schoolName: a.schoolName,
    },
  }
}

/**
 * 教师密码登录：POST /api/auth/password-login
 * 后端返回 { token, user:{ id, name, username, school, schoolId, phone, features, ... } }
 */
export async function teacherLogin(dto: TeacherLoginDto): Promise<LoginResult> {
  const res = await request.post<any, any>('/auth/password-login', dto)
  const u = res.user || {}
  return {
    token: res.token,
    user: {
      id: u.id,
      role: 'teacher',
      name: u.name,
      schoolId: u.schoolId,
      schoolName: u.school,
      features: u.features || [],
    },
  }
}

/**
 * 家长登录：POST /api/parent-auth/login
 * 后端返回 { token, parent:{ imUserId, studentId, studentName, classId, studentNo } }
 */
export async function parentLogin(dto: ParentLoginDto): Promise<LoginResult> {
  const res = await request.post<any, any>('/parent-auth/login', dto)
  const p = res.parent || {}
  return {
    token: res.token,
    user: {
      id: p.imUserId,
      role: 'parent',
      name: '家长',
      studentId: p.studentId,
      studentName: p.studentName,
      classId: p.classId,
    },
  }
}

/** 健康检查：GET /api/health */
export function checkHealth() {
  return request.get<any, { status: string; time: string }>('/health')
}
