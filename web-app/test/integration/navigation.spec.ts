import { createPinia, setActivePinia } from 'pinia'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'

// request.ts 含 import.meta（Vite 注入），CJS 下无法解析；测试路由守卫无需真实 HTTP，统一 mock。
jest.mock('@/api/request', () => ({
  __esModule: true,
  default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}))

/**
 * 路由守卫集成测试（NAV-01~05）：用真实 router + pinia 驱动 beforeEach 守卫，
 * 不挂载组件，仅断言 currentRoute 的最终落点。
 */
describe('路由守卫 / 角色权限（NAV-01~05）', () => {
  beforeEach(async () => {
    setActivePinia(createPinia())
    localStorage.clear()
    // router 是模块级单例，上一测试可能停留在其子路由（如 /super-dashboard），
    // 若直接 push('/super') 会被判定为同路由 no-op 而不再触发守卫。
    // 这里先重置到无鉴权、无重定向的中性路由 /forbidden，保证后续 push 必跑守卫。
    await router.push('/forbidden')
  })

  function loginAs(role: string) {
    const auth = useAuthStore()
    auth.setAuth('tok', { id: '1', role: role as any, name: 't' })
  }

  it('NAV-01 未登录访问 /super 跳转到 /login', async () => {
    await router.push('/super')
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/super')
  })

  it('NAV-02 已登录访问 / 按角色重定向到工作台', async () => {
    loginAs('super')
    await router.push('/')
    expect(router.currentRoute.value.fullPath).toBe('/super')
  })

  it('NAV-03 角色不匹配（teacher 访问 /super）跳 403', async () => {
    loginAs('teacher')
    await router.push('/super')
    expect(router.currentRoute.value.name).toBe('forbidden')
  })

  it('NAV-05 未知路径跳 404', async () => {
    loginAs('teacher')
    await router.push('/this/does/not/exist')
    expect(router.currentRoute.value.name).toBe('not-found')
  })

  it('NAV-04 已登录访问 /login 跳回角色首页', async () => {
    loginAs('school_admin')
    await router.push('/login')
    expect(router.currentRoute.value.fullPath).toBe('/school-admin')
  })
})
