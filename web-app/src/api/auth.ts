import request from './request'
import type {
  AuthUser,
  Role,
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
 * 后端返回 { role:'super_admin', token, user:{ name } }
 */
export async function superLogin(dto: SuperLoginDto): Promise<LoginResult> {
  const res = await request.post<any, any>('/admin/login', dto)
  return {
    token: res.token,
    user: { id: 'super_admin', role: 'super_admin' as Role, name: res.user?.name || '超级管理员' },
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

/**
 * 统一登录入口：前端所有角色共用一个用户名/密码表单，
 * 根据 role 路由到对应后端接口。家长角色将 username 映射为 studentNo。
 * @deprecated 新登录页使用 unifiedLogin，由后端自动识别角色
 */
export async function login(role: Role, username: string, password: string): Promise<LoginResult> {
  switch (role) {
    case 'super_admin':
      return superLogin({ username, password })
    case 'school_admin':
      return schoolAdminLogin({ username, password })
    case 'teacher':
      return teacherLogin({ username, password })
    case 'parent':
      return parentLogin({ studentNo: username, password })
    default:
      throw new Error('未知登录角色')
  }
}

/**
 * 后端统一登录：POST /api/auth/unified-login
 * 后端按 超管→校管→教师→家长 顺序匹配，返回 { role, token, user }
 * 家长字段为 parent，这里统一映射为 AuthUser。
 */
export async function unifiedLogin(username: string, password: string): Promise<LoginResult> {
  const res = await request.post<any, any>('/auth/unified-login', { username, password })
  const role: Role = res.role
  const token: string = res.token

  let user: AuthUser
  switch (role) {
    case 'super_admin':
      user = { id: 'super_admin', role: 'super_admin' as Role, name: res.user?.name || '超级管理员' }
      break
    case 'school_admin': {
      const a = res.user || {}
      user = {
        id: a.id,
        role: 'school_admin',
        name: a.name,
        schoolId: a.schoolId,
        schoolName: a.schoolName,
      }
      break
    }
    case 'teacher': {
      const t = res.user || {}
      user = {
        id: t.id,
        role: 'teacher',
        name: t.name,
        schoolId: t.schoolId,
        schoolName: t.school,
        features: t.features || [],
      }
      break
    }
    case 'parent': {
      const p = res.parent || {}
      user = {
        id: p.imUserId,
        role: 'parent',
        name: '家长',
        studentId: p.studentId,
        studentName: p.studentName,
        classId: p.classId,
      }
      break
    }
    default:
      throw new Error('未知登录角色')
  }

  return { token, user }
}

/** 健康检查：GET /api/health */
export function checkHealth() {
  return request.get<any, { status: string; time: string }>('/health')
}
