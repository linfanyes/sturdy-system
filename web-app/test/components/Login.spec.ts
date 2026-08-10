import { mount, flushPromises } from '@vue/test-utils'
import Login from '@/views/Login.vue'

// 图标库为 ESM-only，mock 为最简桩组件，避免 jsdom 转译问题
jest.mock('lucide-vue-next', () => new Proxy({}, { get: () => ({ template: '<span class="icon" />' }) }))

// 统一登录 API（unifiedLogin 返回 token+user，或 needsRoleChoice 双角色选择）
const unifiedLogin = jest.fn()
const buildParentUser = jest.fn((p: any) => ({ role: 'parent', ...(p?.parent || p || {}) }))
jest.mock('@/api/auth', () => ({
  unifiedLogin: (...a: any[]) => unifiedLogin(...a),
  buildParentUser: (...a: any[]) => buildParentUser(...a),
}))

// 用可被断言的 jest.fn 替换真实 Pinia auth store
const mockAuth: any = {
  setAuth: jest.fn((token: string, user: any) => {
    // 与真实 store 一致：setAuth 后 role/user 立即可读
    mockAuth.role = user?.role || null
    mockAuth.user = user || null
  }),
  fetchMe: jest.fn().mockResolvedValue(null),
  role: null as string | null,
  user: null as any,
}
jest.mock('@/stores/auth', () => ({
  useAuthStore: () => mockAuth,
}))

// roleSwitch store：测试未安装 pinia，模块级 mock（与 auth mock 对齐）
const mockRoleSwitch = { setTokens: jest.fn() }
jest.mock('@/stores/roleSwitch', () => ({
  useRoleSwitchStore: () => mockRoleSwitch,
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
    localStorage.clear()
    unifiedLogin.mockReset()
    buildParentUser.mockClear()
    // 注意用 mockClear：mockReset 会清掉 setAuth 内更新 role/user 的实现
    mockAuth.setAuth.mockClear()
    mockRoleSwitch.setTokens.mockReset()
    mockAuth.role = null
    mockAuth.user = null
    push.mockReset()
    wrapper = mount(Login)
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  it('渲染登录标题，不再显示四个角色 tab', () => {
    expect(wrapper.text()).toContain('一键登录')
    const labels = wrapper.findAll('button').map((b) => b.text())
    // 角色 tab 文案应消失
    expect(labels.some((t) => t.includes('校管'))).toBe(false)
    expect(labels.some((t) => t.includes('超管'))).toBe(false)
  })

  it('提供统一的用户名/密码输入与忘记密码引导', () => {
    const inputs = wrapper.findAll('input').filter((i) => !i.attributes('readonly'))
    expect(inputs.map((i) => i.attributes('placeholder'))).toEqual(['请输入用户名', '请输入密码'])
    // 忘记密码引导（账号由老师/管理员创建）
    expect(wrapper.text()).toContain('忘记密码')
  })

  it('选择表情头像更新顶部角标', async () => {
    const avatarBtn = wrapper
      .findAll('button')
      .find((b) => b.attributes('aria-label') === '选择头像 🌈')
    expect(avatarBtn).toBeTruthy()
    await avatarBtn!.trigger('click')
    expect(localStorage.getItem('g_login_avatar')).toBe('🌈')
    // 顶部角标随之更新
    expect(wrapper.find('.shadow-xl').text()).toContain('🌈')
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

  it('兼容旧版对象格式的历史账号（避免 recent.filter is not a function）', async () => {
    // 重构前以 { 角色: string[] } 对象存储，旧浏览器数据会导致 recent 变为对象
    localStorage.setItem(
      'g_recent_accounts',
      JSON.stringify({ teacher: ['old_tea'], super: ['admin'] }),
    )
    wrapper.unmount()
    wrapper = mount(Login)
    await flushPromises()
    // 对象应被展平为数组，不再触发 .filter 报错；去重
    const chips = wrapper
      .findAll('button')
      .map((b) => b.text())
      .filter((t) => t === 'old_tea' || t === 'admin')
    expect(chips).toEqual(expect.arrayContaining(['old_tea', 'admin']))
    // 关键：再次登录保存时不应抛出 recent.filter is not a function
    unifiedLogin.mockResolvedValueOnce({ token: 't', user: { role: 'super', name: 'admin' } })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('admin')
    await inputs[1].setValue('admin')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(unifiedLogin).toHaveBeenCalled()
  })

  it('提交登录：调用 unifiedLogin 并保存历史账号', async () => {
    unifiedLogin.mockResolvedValueOnce({ token: 't', user: { role: 'teacher', name: 'teacher01' } })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('teacher01')
    await inputs[1].setValue('Teacher@123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(unifiedLogin).toHaveBeenCalledWith('teacher01', 'Teacher@123')
    expect(localStorage.getItem('g_recent_accounts')).toContain('teacher01')
  })

  it('登录后按后端返回角色跳转到对应工作台（教师→/teacher）', async () => {
    unifiedLogin.mockResolvedValueOnce({ token: 't', user: { role: 'teacher', name: 'teacher01' } })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('teacher01')
    await inputs[1].setValue('Teacher@123')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockAuth.setAuth).toHaveBeenCalledWith('t', expect.objectContaining({ role: 'teacher' }))
    expect(push).toHaveBeenCalledWith('/teacher')
  })

  it('登录后按后端返回角色跳转（超管→/super）', async () => {
    unifiedLogin.mockResolvedValueOnce({ token: 't', user: { role: 'super', name: 'admin' } })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('admin')
    await inputs[1].setValue('admin')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(push).toHaveBeenCalledWith('/super')
  })

  it('师兼家双角色：弹出身份选择，选家长后写入双 token 并进入家长端', async () => {
    unifiedLogin.mockResolvedValueOnce({
      needsRoleChoice: true,
      teacher: { token: 'tt', user: { role: 'teacher', name: 'T' } },
      parent: { token: 'pp', parent: { id: 'p1' }, studentName: '小明' },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('dual')
    await inputs[1].setValue('pwd')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.text()).toContain('选择登录身份')
    const parentBtn = wrapper.findAll('button').find((b) => b.text().includes('以家长身份进入'))
    expect(parentBtn).toBeTruthy()
    await parentBtn!.trigger('click')
    await flushPromises()

    expect(mockRoleSwitch.setTokens).toHaveBeenCalledWith(expect.objectContaining({
      teacherToken: 'tt',
      parentToken: 'pp',
      initialRole: 'parent',
    }))
    expect(buildParentUser).toHaveBeenCalled()
    expect(push).toHaveBeenCalledWith('/parent')
  })

  it('空表单提交时显示必填提示且不调用登录', async () => {
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(unifiedLogin).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入用户名和密码')
  })

  it('登录失败：显示错误提示且不跳转', async () => {
    unifiedLogin.mockRejectedValueOnce(new Error('账号或密码错误'))
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('teacher01')
    await inputs[1].setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('账号或密码错误')
    expect(push).not.toHaveBeenCalled()
  })
})
