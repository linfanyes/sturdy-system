import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

let mockAuthUser: any = {}
jest.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get user() { return mockAuthUser },
    get role() { return mockAuthUser?.role },
    get isLoggedIn() { return true },
    logout: jest.fn(),
    loginByUsername: jest.fn(),
  }),
}))
jest.mock('@/api/school-admin', () => ({
  __esModule: true,
  search: jest.fn(() => Promise.resolve({ teachers: [], classes: [], students: [] })),
}))

function makeRouter(initial: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', name: 'login', component: { template: '<div/>' } },
      { path: '/super', name: 'super-dashboard', component: { template: '<div/>' } },
      { path: '/school-admin', name: 'school-admin-dashboard', component: { template: '<div/>' } },
      { path: '/teacher', name: 'teacher-dashboard', component: { template: '<div/>' } },
      { path: '/parent', name: 'parent-dashboard', component: { template: '<div/>' } },
    ],
  })
  return router
}

describe('AppLayout 侧边栏菜单 / 搜索 / 退出（NAV-06 / SA-06 / SA-07）', () => {
  async function mountWith(role: string, user: any = {}) {
    mockAuthUser = { role, name: '测试用户', ...user }
    const router = makeRouter('/' + role.split('_')[0])
    await router.push('/' + (role === 'school_admin' ? 'school-admin' : role))
    await router.isReady()
    const wrapper = mount(AppLayout, { global: { plugins: [router] } })
    await flushPromises()
    return { wrapper, router }
  }

  it('超管：显示 5 个菜单项与角色标签', async () => {
    const { wrapper } = await mountWith('super')
    expect(wrapper.text()).toContain('超级管理员')
    for (const label of ['工作台', '学校管理', '管理员管理', '审计日志', '平台配置']) {
      expect(wrapper.text()).toContain(label)
    }
  })

  it('校管：显示搜索框与 5 个菜单项', async () => {
    const { wrapper } = await mountWith('school_admin')
    expect(wrapper.find('input[placeholder="全局搜索：教师 / 班级 / 学生"]').exists()).toBe(true)
    for (const label of ['工作台', '教师管理', '班级管理', '学生管理', '学校公告']) {
      expect(wrapper.text()).toContain(label)
    }
  })

  it('家长：仅 1 个菜单项', async () => {
    const { wrapper } = await mountWith('parent')
    expect(wrapper.text()).toContain('孩子动态')
    expect(wrapper.text()).not.toContain('学校管理')
  })

  it('教师：菜单按分组渲染且含工具箱/小游戏分组', async () => {
    const { wrapper } = await mountWith('teacher', { features: [] })
    expect(wrapper.text()).toContain('工具箱总览')
    expect(wrapper.text()).toContain('小游戏')
    expect(wrapper.text()).toContain('AI 对话')
  })

  it('点击退出：调用 auth.logout 并跳转登录', async () => {
    const { wrapper, router } = await mountWith('super')
    const logoutBtn = wrapper.find('button[title="退出登录"]')
    expect(logoutBtn.exists()).toBe(true)
    await logoutBtn.trigger('click')
    await flushPromises()
    // 路由应跳到 login
    expect(router.currentRoute.value.name).toBe('login')
  })
})
