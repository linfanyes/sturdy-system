import { mount, flushPromises } from '@vue/test-utils'
import Login from '@/views/Login.vue'

// 图标库为 ESM-only，mock 为最简桩组件，避免 jsdom 转译问题
jest.mock('lucide-vue-next', () => ({
  Loader2: { template: '<span class="icon" />' },
  Sparkles: { template: '<span class="icon" />' },
}))

// 用可被断言的 jest.fn 替换真实 Pinia auth store
// 真实 store 以 loginByUsername 为主，login 系列为兼容旧逻辑保留
const mockLogin = {
  login: jest.fn(),
  loginByUsername: jest.fn(),
  loginAsTeacher: jest.fn(),
  loginAsSchoolAdmin: jest.fn(),
  loginAsParent: jest.fn(),
  loginAsSuper: jest.fn(),
  // 模拟登录后 role 由后端决定
  role: null as string | null,
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
    Object.values(mockLogin).forEach((fn) => {
      if (typeof fn === 'function') (fn as any).mockReset()
    })
    mockLogin.role = null
    push.mockReset()
    wrapper = mount(Login)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('渲染登录标题，不再显示四个角色 tab', () => {
    expect(wrapper.text()).toContain('登录')
    const labels = wrapper.findAll('button').map((b) => b.text())
    // 角色 tab 文案应消失
    expect(labels.some((t) => t.includes('教师'))).toBe(false)
    expect(labels.some((t) => t.includes('校管'))).toBe(false)
    expect(labels.some((t) => t.includes('家长'))).toBe(false)
    expect(labels.some((t) => t.includes('超管'))).toBe(false)
  })

  it('只显示统一的用户名/密码输入', () => {
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
    localStorage.setItem('g_recent_accounts', JSON.stringify(['old_tea']))
    wrapper.unmount()
    wrapper = mount(Login)
    await flushPromises()
    const chip = wrapper.findAll('button').find((b) => b.text() === 'old_tea')
    expect(chip).toBeTruthy()
    await chip!.trigger('click')
    const usernameInput = wrapper.findAll('input')[0]
    expect((usernameInput.element as HTMLInputElement).value).toBe('old_tea')
  })

  it('提交登录：调用 auth.loginByUsername 并保存历史账号', async () => {
    mockLogin.loginByUsername.mockResolvedValueOnce(undefined)
    mockLogin.role = 'teacher'
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('teacher01')
    await inputs[1].setValue('Teacher@123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockLogin.loginByUsername).toHaveBeenCalledWith('teacher01', 'Teacher@123')
    expect(localStorage.getItem('g_recent_accounts')).toContain('teacher01')
  })

  it('登录后按后端返回角色跳转到对应工作台（教师→/teacher）', async () => {
    mockLogin.loginByUsername.mockResolvedValueOnce(undefined)
    mockLogin.role = 'teacher'
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('teacher01')
    await inputs[1].setValue('Teacher@123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(push).toHaveBeenCalledWith('/teacher')
  })

  it('登录后按后端返回角色跳转（超管→/super）', async () => {
    mockLogin.loginByUsername.mockResolvedValueOnce(undefined)
    mockLogin.role = 'super'
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('admin')
    await inputs[1].setValue('admin')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(push).toHaveBeenCalledWith('/super')
  })

  it('空表单提交时显示必填提示且不调用登录', async () => {
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockLogin.loginByUsername).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入用户名和密码')
  })

  it('登录失败：显示错误提示且不跳转', async () => {
    mockLogin.loginByUsername.mockRejectedValueOnce(new Error('账号或密码错误'))
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('teacher01')
    await inputs[1].setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('账号或密码错误')
    expect(push).not.toHaveBeenCalled()
  })
})
