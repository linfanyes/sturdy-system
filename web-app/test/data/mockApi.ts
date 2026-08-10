/**
 * 测试脚本：可复用的 mock 工厂（auth store / 路由 / 后端响应）。
 * 在 Login 页面测试中通过 jest.mock 注入，隔离真实网络与 Pinia。
 */
import type { MockAccount, Role } from './mockAccounts'

/** 生成一个被 jest.fn 包裹的 auth store 双，用于断言登录调用 */
export function createMockAuthStore() {
  const calls: Array<{ role: Role; args: unknown[] }> = []
  const make =
    (role: Role) =>
    (...args: unknown[]) => {
      calls.push({ role, args })
      return Promise.resolve()
    }
  return {
    loginAsTeacher: jest.fn(make('teacher')),
    loginAsSchoolAdmin: jest.fn(make('school_admin')),
    loginAsParent: jest.fn(make('parent')),
    loginAsSuper: jest.fn(make('super')),
    __calls: calls,
  }
}

/** 将 MockAccount 映射为登录提交用的表单负载 */
export function toLoginPayload(acc: MockAccount): { account: string; password: string } {
  const account = acc.studentNo ?? acc.username ?? ''
  return { account, password: acc.password }
}
