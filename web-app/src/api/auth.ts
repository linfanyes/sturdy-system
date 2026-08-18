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

// ---- 各接口原始响应类型 ----

/** 超管登录后端返回 */
interface SuperLoginResponse {
  role: 'super'
  token: string
  user?: { name?: string }
  effectiveFeatures?: string[]
}

/** 校管登录后端返回 */
interface SchoolAdminLoginResponse {
  token: string
  admin?: {
    id: string | number
    name?: string
    schoolId?: number
    schoolName?: string
    schoolCode?: string
  }
  effectiveFeatures?: string[]
}

/** 教师登录后端返回 */
interface TeacherLoginResponse {
  token: string
  user?: {
    id: string | number
    name?: string
    username?: string
    school?: string
    schoolId?: number
    phone?: string
    features?: string[]
    position?: string
    subject?: string
    subjects?: string[]
  }
  effectiveFeatures?: string[]
}

/** 家长登录后端返回 */
interface ParentLoginResponse {
  token: string
  parent?: {
    imUserId: string | number
    studentId?: number
    studentName?: string
    classId?: number
    studentNo?: string
  }
  effectiveFeatures?: string[]
}

/** 统一登录后端返回 */
interface UnifiedLoginResponse {
  role: Role
  token: string
  user?: Record<string, any>
  parent?: Record<string, any>
  effectiveFeatures?: string[]
}

/** /auth/me 后端返回 */
interface AuthMeResponse {
  role?: Role
  schoolId?: number
  effectiveFeatures?: string[]
  rawFeatures?: string[]
  schoolFeatureFlags?: string[] | null
  user?: Record<string, any>
}

/**
 * 超管登录：POST /api/admin/login
 * 后端返回 { role:'super', token, user:{ name } }
 */
export async function superLogin(dto: SuperLoginDto): Promise<LoginResult> {
  const res = await request.post<SuperLoginResponse>('/admin/login', dto)
  return {
    token: res.token,
    user: { id: 'super', role: 'super' as Role, name: res.user?.name || '超级管理员', effectiveFeatures: res.effectiveFeatures },
  }
}

/**
 * 校管登录：POST /api/school-admin/login
 * 后端返回 { token, admin:{ id, name, schoolId, schoolName, schoolCode } }
 */
export async function schoolAdminLogin(dto: SchoolAdminLoginDto): Promise<LoginResult> {
  const res = await request.post<SchoolAdminLoginResponse>('/school-admin/login', dto)
  const a = res.admin
  if (!a) throw new Error('登录失败：未返回管理员信息')
  return {
    token: res.token,
    user: {
      id: a.id,
      role: 'school_admin',
      name: a.name,
      schoolId: a.schoolId,
      schoolName: a.schoolName,
      effectiveFeatures: res.effectiveFeatures,
    },
  }
}

/**
 * 教师密码登录：POST /api/auth/password-login
 * 后端返回 { token, user:{ id, name, username, school, schoolId, phone, features, ... } }
 */
export async function teacherLogin(dto: TeacherLoginDto): Promise<LoginResult> {
  const res = await request.post<TeacherLoginResponse>('/auth/password-login', dto)
  const u = res.user
  if (!u) throw new Error('登录失败：未返回教师信息')
  return {
    token: res.token,
    user: {
      id: u.id,
      role: 'teacher',
      name: u.name,
      schoolId: u.schoolId,
      schoolName: u.school,
      features: u.features || [],
      effectiveFeatures: res.effectiveFeatures,
      position: u.position || '',
      subject: u.subject || '',
      subjects: u.subjects || [],
    },
  }
}

/**
 * 家长登录：POST /api/parent-auth/login
 * 后端返回 { token, parent:{ imUserId, studentId, studentName, classId, studentNo } }
 */
export async function parentLogin(dto: ParentLoginDto): Promise<LoginResult> {
  const res = await request.post<ParentLoginResponse>('/parent-auth/login', dto)
  const p = res.parent
  if (!p) throw new Error('登录失败：未返回家长信息')
  return {
    token: res.token,
    user: {
      id: p.imUserId,
      role: 'parent',
      name: '家长',
      studentId: p.studentId,
      studentName: p.studentName,
      classId: p.classId,
      effectiveFeatures: res.effectiveFeatures,
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
    case 'super':
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
 * 统一登录响应
 */
export interface UnifiedLoginResult extends LoginResult {}

/**
 * 后端统一登录：POST /api/auth/unified-login
 * 后端按 超管→校管→教师→家长 顺序匹配，返回 { role, token, user }
 * 家长字段为 parent，这里统一映射为 AuthUser。
 */
export async function unifiedLogin(username: string, password: string): Promise<UnifiedLoginResult> {
  const res = await request.post<UnifiedLoginResponse>('/auth/unified-login', { username, password })

  const role: Role = res.role
  const token: string = res.token

  let user: AuthUser
  switch (role) {
    case 'super':
      user = { id: 'super', role: 'super' as Role, name: res.user?.name || '超级管理员', effectiveFeatures: res.effectiveFeatures }
      break
    case 'school_admin': {
      const a = (res.user ?? {}) as Record<string, any>
      user = {
        id: a.id,
        role: 'school_admin',
        name: a.name,
        schoolId: a.schoolId,
        schoolName: a.schoolName,
        effectiveFeatures: res.effectiveFeatures,
      }
      break
    }
    case 'teacher': {
      const t = (res.user ?? {}) as Record<string, any>
      user = {
        id: t.id,
        role: 'teacher',
        name: t.name,
        schoolId: t.schoolId,
        schoolName: t.school,
        features: t.features || [],
        effectiveFeatures: res.effectiveFeatures,
        position: t.position || '',
        subject: t.subject || '',
        subjects: t.subjects || [],
      }
      break
    }
    case 'parent': {
      const p = (res.parent ?? {}) as Record<string, any>
      user = {
        id: p.imUserId,
        role: 'parent',
        name: '家长',
        studentId: p.studentId,
        studentName: p.studentName,
        classId: p.classId,
        effectiveFeatures: res.effectiveFeatures,
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
  return request.get<{ status: string; time: string }>('/health')
}

/** 当前用户资料（含扩展字段）：GET /api/users/me */
export function getProfileMe() {
  return request.get<AuthUser>('/users/me')
}

/**
 * 当前登录态功能档案：GET /api/auth/me
 * 返回 { role, schoolId, effectiveFeatures, rawFeatures, schoolFeatureFlags, user }
 */
export async function getMe() {
  const res = await request.get<AuthMeResponse>('/auth/me')
  return res
}
