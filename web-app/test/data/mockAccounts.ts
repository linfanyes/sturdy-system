/**
 * 测试数据：多角色账号、后端地址、登录响应样本。
 * 供 apiBase 单测与 Login 页面测试复用（即「测试数据」）。
 */

export type Role = 'teacher' | 'school_admin' | 'parent' | 'super'

export interface MockAccount {
  role: Role
  username?: string
  studentNo?: string
  password: string
  name: string
}

/** 各角色样本账号（与 Login.vue 表单字段对应） */
export const mockAccounts: Record<Role, MockAccount> = {
  teacher: { role: 'teacher', username: 'teacher01', password: 'Teacher@123', name: '王老师' },
  school_admin: { role: 'school_admin', username: 'admin01', password: 'Admin@123', name: '李主任' },
  parent: { role: 'parent', studentNo: '2024001', password: '123456', name: '张小宝家长' },
  super: { role: 'super', username: 'super', password: 'Super@2026', name: '超级管理员' },
}

/** 微信云托管生产域名（来自用户配置） */
export const cloudApiBase = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com/api'

/** 本地开发后端地址 */
export const localApiBase = 'http://localhost:3000/api'

/** 兜底地址 */
export const fallbackApiBase = '/api'

/** 构造登录成功响应样本 */
export function mockLoginSuccess(role: Role): { token: string; user: { id: string; name: string; role: Role } } {
  return {
    token: `mock-jwt-${role}`,
    user: { id: 'u1', name: mockAccounts[role].name, role },
  }
}
