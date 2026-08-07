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
 * 后端返回 { role:'super', token, user:{ name } }
 */
export async function superLogin(dto: SuperLoginDto): Promise<LoginResult> {
  const res = await request.post<any, any>('/admin/login', dto)
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
      effectiveFeatures: res.effectiveFeatures,
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
 * 统一登录响应（含师兼家双角色选择场景）
 */
export interface ParentKidInfo {
  studentId: string | number
  studentName: string
  studentNo?: string
  classId?: string | number
}

/** 后端统一登录对家长分支的响应（双身份场景：无 user 字段，含 kids/parentId） */
export interface UnifiedLoginParent {
  role: string
  token: string
  parentId: string
  kids: ParentKidInfo[]
  needsBind: boolean
  effectiveFeatures?: string[]
}

export interface UnifiedLoginResult extends LoginResult {
  needsRoleChoice?: boolean
  roles?: Array<'teacher' | 'parent'>
  teacher?: { role: string; token: string; user: any }
  parent?: UnifiedLoginParent
}

/**
 * 由后端 parent 分支响应构造 AuthUser（后端 parent 无 user 字段，含 kids/parentId）。
 * 兼容两种结构：双身份（kids 数组，取第一个孩子）与单身份（imUserId/studentId 直出）。
 * 修复点：此前双身份登录直接 spread parent 对象，user 缺失 id/name，家长端欢迎语等展示异常。
 */
export function buildParentUser(p: any): AuthUser {
  const firstKid = Array.isArray(p?.kids) && p.kids.length ? p.kids[0] : null
  return {
    id: p?.imUserId ?? p?.parentId ?? '',
    role: 'parent',
    name: firstKid ? `${firstKid.studentName}家长` : p?.name || '家长',
    ...(firstKid
      ? { studentId: firstKid.studentId, studentName: firstKid.studentName, classId: firstKid.classId }
      : { studentId: p?.studentId, studentName: p?.studentName, classId: p?.classId }),
    effectiveFeatures: p?.effectiveFeatures,
  }
}

/**
 * 后端统一登录：POST /api/auth/unified-login
 * 后端按 超管→校管→教师→家长 顺序匹配，返回 { role, token, user }
 * 家长字段为 parent，这里统一映射为 AuthUser。
 * 当教师同时拥有家长身份时，返回 needsRoleChoice: true 及双 token。
 */
export async function unifiedLogin(username: string, password: string): Promise<UnifiedLoginResult> {
  const res = await request.post<any, any>('/auth/unified-login', { username, password })

  // 师兼家双角色选择场景
  if (res.needsRoleChoice) {
    return {
      token: '',
      user: { id: '', role: 'teacher', name: '' },
      needsRoleChoice: true,
      roles: res.roles || ['teacher', 'parent'],
      teacher: res.teacher,
      parent: res.parent,
    }
  }

  const role: Role = res.role
  const token: string = res.token

  let user: AuthUser
  switch (role) {
    case 'super':
      user = { id: 'super', role: 'super' as Role, name: res.user?.name || '超级管理员', effectiveFeatures: res.effectiveFeatures }
      break
    case 'school_admin': {
      const a = res.user || {}
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
      const t = res.user || {}
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
      const p = res.parent || {}
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
  return request.get<any, { status: string; time: string }>('/health')
}

/** 当前用户资料（含扩展字段）：GET /api/users/me */
export function getProfileMe() {
  return request.get<any, any>('/users/me')
}

/**
 * 当前登录态功能档案：GET /api/auth/me
 * 返回 { role, schoolId, effectiveFeatures, rawFeatures, schoolFeatureFlags, user }
 */
export async function getMe() {
  const res = await request.get<any, any>('/auth/me')
  return res
}
