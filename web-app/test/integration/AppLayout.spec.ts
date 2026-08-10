import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'

// mock 后端 API 模块（避免加载 request.ts 触发 import.meta 报错）
jest.mock('@/api/admin', () => ({
  listSchools: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  listSchoolAdmins: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  listAuditLogs: jest.fn().mockResolvedValue({ items: [], total: 0 }),
}))
jest.mock('@/api/school-admin', () => ({
  search: jest.fn().mockResolvedValue({ teachers: [], classes: [], students: [] }),
}))

// mock auth store：以 super 角色登录
jest.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    isLoggedIn: true,
    role: 'super',
    user: { id: 'super', role: 'super', name: '超级管理员' },
    logout: jest.fn(),
  }),
}))

// roleSwitch store：测试未安装 pinia，模块级 mock（与 auth mock 对齐）
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


const Empty = { template: '<div class="child-page">子页面内容</div>' }

describe('AppLayout + 嵌套路由渲染', () => {
  it('子路由组件通过 router-view 渲染到主内容区（修复前为空白 slot）', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/super',
          component: AppLayout,
          meta: { requiresAuth: true, roles: ['super'] },
          children: [
            { path: '', name: 'super-dashboard', component: Empty },
          ],
        },
      ],
    })

    const wrapper = mount(AppLayout, {
      global: { plugins: [router] },
    })

    await router.push('/super')
    await router.isReady()
    await flushPromises()

    // 侧边栏菜单正常
    expect(wrapper.text()).toContain('园丁工作台')
    expect(wrapper.text()).toContain('工作台')
    // 关键：子路由内容应渲染到主内容区，而非空白
    expect(wrapper.find('.child-page').exists()).toBe(true)
    expect(wrapper.text()).toContain('子页面内容')
  })
})
