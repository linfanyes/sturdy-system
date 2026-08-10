import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, type RouteRecordRaw } from 'vue-router'
import { routes } from '@/router'
import { buildSafeApiModule } from '../helpers/safeApi'

/* ---------- 全局 mock：所有后端 API + 图标库 ---------- */
jest.mock('@/api/request', () => buildSafeApiModule())
jest.mock('@/api/auth', () => buildSafeApiModule())
jest.mock('@/api/admin', () => buildSafeApiModule())
jest.mock('@/api/school-admin', () => buildSafeApiModule())
jest.mock('@/api/teacher', () => buildSafeApiModule())
jest.mock('@/api/parent', () => buildSafeApiModule())
jest.mock('@/api/notification', () => buildSafeApiModule())
jest.mock('lucide-vue-next', () => new Proxy({}, { get: () => ({ template: '<span class="lucide-icon" />' }) }))

let mockAuthUser: any = {}
jest.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    get user() { return mockAuthUser },
    get role() { return mockAuthUser?.role },
    get isLoggedIn() { return true },
    logout: jest.fn(),
    loginByUsername: jest.fn(),
    setAuth: jest.fn(),
    updateUser: jest.fn(),
    fetchMe: jest.fn().mockResolvedValue(null),
  }),
}))

// roleSwitch store 未在此测试安装 pinia，需要与 auth 一样做模块级 mock
jest.mock('@/stores/roleSwitch', () => ({
  useRoleSwitchStore: () => ({
    teacherToken: '',
    parentToken: '',
    teacherUser: null,
    parentUser: null,
    currentRole: null,
    setTokens: jest.fn(),
    switchTo: jest.fn(),
    clear: jest.fn(),
  }),
}))

/* ---------- 收集所有叶子路由（页面组件） ---------- */
interface Leaf { path: string; name?: string; component: any; props?: any }
function collectLeaves(rs: RouteRecordRaw[], prefix = '', acc: Leaf[] = []): Leaf[] {
  for (const r of rs) {
    const path = (prefix + '/' + r.path).replace(/\/+/g, '/').replace(/\/$/, '') || '/'
    if (r.children && r.children.length) {
      collectLeaves(r.children, path, acc)
    } else if (r.component) {
      acc.push({ path, name: r.name as string | undefined, component: r.component, props: typeof r.props === 'object' ? r.props : undefined })
    }
  }
  return acc
}
const leaves = collectLeaves(routes)

function roleForPath(path: string): string {
  if (path.startsWith('/super')) return 'super'
  if (path.startsWith('/school-admin')) return 'school_admin'
  if (path.startsWith('/teacher')) return 'teacher'
  if (path.startsWith('/parent')) return 'parent'
  return 'super'
}

async function loadComponent(loader: any) {
  const mod = await loader()
  return mod.default
}

describe(`全路由冒烟渲染（共 ${leaves.length} 个页面）`, () => {
  it('叶子路由数量合理（应覆盖全部页面，> 100）', () => {
    expect(leaves.length).toBeGreaterThan(100)
  })

  leaves.forEach((leaf) => {
    it(`渲染 ${leaf.path}`, async () => {
      mockAuthUser = { role: roleForPath(leaf.path), name: '冒烟测试' }
      const Comp = await loadComponent(leaf.component)
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: '/login', name: 'login', component: { template: '<div/>' } },
          { path: leaf.path, name: leaf.name, component: Comp },
        ],
      })
      await router.push(leaf.path)
      await router.isReady()
      const wrapper = mount(Comp, {
        props: leaf.props,
        global: { plugins: [router] },
        attachTo: document.body,
      })
      await flushPromises()
      // 断言：成功渲染出非空 DOM（挂载/模板/接口错误会在此抛错）
      expect(wrapper.html().length).toBeGreaterThan(0)
    })
  })
})
