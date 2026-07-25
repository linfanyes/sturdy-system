import { mount, flushPromises } from '@vue/test-utils'
import Login from '@/views/Login.vue'

// 图标库为 ESM-only，mock 为最简桩组件，避免 jsdom 转译问题
jest.mock('lucide-vue-next', () => ({
  Shield: { template: '<span class="icon" />' },
  School: { template: '<span class="icon" />' },
  GraduationCap: { template: '<span class="icon" />' },
  Users: { template: '<span class="icon" />' },
  Loader2: { template: '<span class="icon" />' },
  Sparkles: { template: '<span class="icon" />' },
}))

// 用可被断言的 jest.fn 替换真实 Pinia auth store
const mockLogin = {
  login: jest.fn(),
  loginAsTeacher: jest.fn(),
  loginAsSchoolAdmin: jest.fn(),
  loginAsParent: jest.fn(),
  loginAsSuper: jest.fn(),
}
jest.mock('@/stores/auth', () => ({
  useAuthStore: () => mockLogin,
}))

// 用可断言的 push 替换 vue-router
const push = jest.fn()
jest.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: {} }),
}))

describe('Login.vue 统一登录页测试', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    Object.values(mockLogin).forEach((fn) => (fn as any).mockReset())
    push.mockReset()
    wrapper = mount(Login)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('渲染标题与四个角色 tab', () => {
    expect(wrapper.text()).toContain('登录')
    const labels = wrapper.findAll('button').map((b) => b.text())
    expect(labels.some((t) => t.includes('教师'))).toBe(true)
    expect(labels.some((t) => t.includes('校管'))).toBe(true)
    expect(labels.some((t) => t.includes('家长'))).toBe(true)
    expect(labels.some((t) => t.includes('超管'))).toBe(true)
  })

  it('默认选中教师角色，显示统一的用户名/密码输入', () => {
    const placeholders = wrapper.findAll('input').map((i) => i.attributes('placeholder'))
    expect(placeholders).toEqual(['用户名', '密码'])
  })

  it('切换角色不改变表单结构，仍为用户名/密码', async () => {
    const parentTab = wrapper.findAll('button').find((b) => b.text().includes('家长'))
    expect(parentTab).toBeTruthy()
    await parentTab!.trigger('click')
    const placeholders = wrapper.findAll('input').map((i) => i.attributes('placeholder'))
    expect(placeholders).toEqual(['用户名', '密码'])
  })

  it('选择表情头像更新顶部角标', async () => {
    const badge = wrapper.find('.shadow-pop')
    expect(badge.exists()).toBe(true)
    const avatarBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === '选择头像 🌈')
    expect(avatarBtn).toBeTruthy()
    await avatarBtn!.trigger('click')
    expect(wrapper.find('.shadow-pop').text()).toBe('🌈')
  })

  it('历史账号 chip 出现并可一键填充到用户名', async () => {
    localStorage.setItem('g_recent_accounts', JSON.stringify({ teacher: ['old_tea'] }))
    wrapper.unmount()
    wrapper = mount(Login)
    await flushPromises()
    const chip = wrapper.findAll('button').find((b) => b.text() === 'old_tea')
    expect(chip).toBeTruthy()
    await chip!.trigger('click')
    const usernameInput = wrapper.findAll('input')[0]
    expect((usernameInput.element as HTMLInputElement).value).toBe('old_tea')
  })

  it('提交教师登录：调用 auth.login 并跳转教师工作台', async () => {
    mockLogin.login.mockResolvedValueOnce(undefined)
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('teacher01')
    await inputs[1].setValue('Teacher@123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockLogin.login).toHaveBeenCalledWith('teacher', 'teacher01', 'Teacher@123')
    expect(push).toHaveBeenCalledWith('/teacher')
  })

  it('切换到校管后登录：调用 auth.login 并跳转校管工作台', async () => {
    mockLogin.login.mockResolvedValueOnce(undefined)
    const schoolTab = wrapper.findAll('button').find((b) => b.text().includes('校管'))
    await schoolTab!.trigger('click')
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('admin01')
    await inputs[1].setValue('Admin@123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockLogin.login).toHaveBeenCalledWith('school_admin', 'admin01', 'Admin@123')
    expect(push).toHaveBeenCalledWith('/school-admin')
  })

  it('空表单提交时显示必填提示且不调用登录', async () => {
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockLogin.login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入用户名和密码')
  })

  it('登录失败：显示错误提示且不跳转', async () => {
    mockLogin.login.mockRejectedValueOnce(new Error('账号或密码错误'))
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('teacher01')
    await inputs[1].setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('账号或密码错误')
    expect(push).not.toHaveBeenCalled()
  })
})
