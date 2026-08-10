/**
 * 交互体验测试：统一登录页（UX-LOGIN-xx）
 * 覆盖：渲染、表单校验、密码可见性、大写锁定提示、历史账号、忘记密码引导、
 *       角色跳转、双角色选择、个性化折叠区。
 */
import { mount, flushPromises } from '@vue/test-utils'
import Login from '@/views/Login.vue'

jest.mock('lucide-vue-next', () => new Proxy({}, { get: () => ({ template: '<span class="icon" />' }) }))

const unifiedLogin = jest.fn()
const buildParentUser = jest.fn((p: any) => ({ role: 'parent', ...(p?.parent || p || {}) }))
jest.mock('@/api/auth', () => ({
  unifiedLogin: (...a: any[]) => unifiedLogin(...a),
  buildParentUser: (...a: any[]) => buildParentUser(...a),
}))

const mockAuth: any = {
  setAuth: jest.fn((token: string, user: any) => {
    mockAuth.role = user?.role || null
    mockAuth.user = user || null
  }),
  fetchMe: jest.fn().mockResolvedValue(null),
  role: null as string | null,
  user: null as any,
}
jest.mock('@/stores/auth', () => ({ useAuthStore: () => mockAuth }))

const mockRoleSwitch = { setTokens: jest.fn() }
jest.mock('@/stores/roleSwitch', () => ({ useRoleSwitchStore: () => mockRoleSwitch }))

const push = jest.fn()
jest.mock('vue-router', () => ({
  useRouter: () => ({ push }),
  useRoute: () => ({ query: {} }),
}))

describe('UX-LOGIN 登录页交互体验', () => {
  let wrapper: ReturnType<typeof mount>

  beforeEach(() => {
    localStorage.clear()
    unifiedLogin.mockReset()
    buildParentUser.mockClear()
    mockAuth.setAuth.mockClear()
    mockRoleSwitch.setTokens.mockReset()
    mockAuth.role = null
    mockAuth.user = null
    push.mockReset()
    wrapper = mount(Login)
  })
  afterEach(() => wrapper?.unmount())

  const inputs = () => wrapper.findAll('input').filter((i) => !i.attributes('readonly'))

  it('UX-LOGIN-01 渲染统一登录表单与忘记密码引导', () => {
    expect(wrapper.text()).toContain('一键登录')
    expect(inputs().map((i) => i.attributes('placeholder'))).toEqual(['请输入用户名', '请输入密码'])
    expect(wrapper.text()).toContain('忘记密码')
    // 个性化区（头像/格言）默认折叠，不干扰主流程
    expect(wrapper.find('details').exists()).toBe(true)
  })

  it('UX-LOGIN-02 空表单提交：就地提示必填，不发起请求', async () => {
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(unifiedLogin).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入用户名和密码')
  })

  it('UX-LOGIN-03 密码可见性切换（眼睛图标）', async () => {
    const pwd = inputs()[1]
    expect(pwd.attributes('type')).toBe('password')
    const eyeBtn = wrapper.findAll('button').find((b) => ['显示密码', '隐藏密码'].includes(b.attributes('aria-label') || ''))
    expect(eyeBtn).toBeTruthy()
    await eyeBtn!.trigger('click')
    expect(inputs()[1].attributes('type')).toBe('text')
  })

  it('UX-LOGIN-04 大写锁定开启时给出提示', async () => {
    const orig = window.KeyboardEvent.prototype.getModifierState
    window.KeyboardEvent.prototype.getModifierState = () => true
    try {
      const pwd = inputs()[1]
      await pwd.trigger('keydown', { key: 'A' })
      expect(wrapper.text()).toContain('大写锁定')
    } finally {
      window.KeyboardEvent.prototype.getModifierState = orig
    }
  })

  it('UX-LOGIN-05 最近登录账号一键填充', async () => {
    localStorage.setItem('g_recent_accounts', JSON.stringify(['teacher_a', 'teacher_b']))
    wrapper.unmount()
    wrapper = mount(Login)
    await flushPromises()
    const chip = wrapper.findAll('button').find((b) => b.text() === 'teacher_a')
    expect(chip).toBeTruthy()
    await chip!.trigger('click')
    expect((inputs()[0].element as HTMLInputElement).value).toBe('teacher_a')
  })

  it('UX-LOGIN-06 登录成功按角色跳转且保存历史账号', async () => {
    unifiedLogin.mockResolvedValueOnce({ token: 't', user: { role: 'teacher', name: 'T' } })
    await inputs()[0].setValue('teacher01')
    await inputs()[1].setValue('pwd12345')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mockAuth.setAuth).toHaveBeenCalledWith('t', expect.objectContaining({ role: 'teacher' }))
    expect(push).toHaveBeenCalledWith('/teacher')
    expect(localStorage.getItem('g_recent_accounts')).toContain('teacher01')
  })

  it('UX-LOGIN-07 登录失败：展示后端错误文案且不跳转', async () => {
    unifiedLogin.mockRejectedValueOnce(new Error('用户名或密码错误'))
    await inputs()[0].setValue('teacher01')
    await inputs()[1].setValue('wrong')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('用户名或密码错误')
    expect(push).not.toHaveBeenCalled()
  })

  it('UX-LOGIN-08 师兼家账号弹出身份选择，选家长进入家长端', async () => {
    unifiedLogin.mockResolvedValueOnce({
      needsRoleChoice: true,
      teacher: { token: 'tt', user: { role: 'teacher', name: 'T' } },
      parent: { token: 'pp', parent: { id: 'p1' }, studentName: '小明' },
    })
    await inputs()[0].setValue('dual')
    await inputs()[1].setValue('pwd')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('选择登录身份')
    const parentBtn = wrapper.findAll('button').find((b) => b.text().includes('以家长身份进入'))
    await parentBtn!.trigger('click')
    await flushPromises()
    expect(mockRoleSwitch.setTokens).toHaveBeenCalledWith(expect.objectContaining({ teacherToken: 'tt', parentToken: 'pp', initialRole: 'parent' }))
    expect(push).toHaveBeenCalledWith('/parent')
  })

  it('UX-LOGIN-09 选择表情头像持久化到本地', async () => {
    const btn = wrapper.findAll('button').find((b) => b.attributes('aria-label') === '选择头像 🌈')
    expect(btn).toBeTruthy()
    await btn!.trigger('click')
    expect(localStorage.getItem('g_login_avatar')).toBe('🌈')
  })
})
