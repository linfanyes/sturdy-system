// store.js 在模块加载期即调用 uni.getStorageSync / uni.getSystemInfoSync，
// 必须在加载前 mock global.uni。使用 require（而非 import）以避免 import 提升。
global.uni = {
  getStorageSync: jest.fn(() => ''),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  getSystemInfoSync: jest.fn(() => ({ theme: 'light' })),
  setTabBarStyle: jest.fn(),
  setBackgroundColor: jest.fn(),
  setNavigationBarColor: jest.fn(),
}

const {
  auth,
  theme,
  parent,
  mockMode,
  switchTabParams,
  FONT_SIZES,
  SCHEMES,
  setAuth,
  setUser,
  setTheme,
  toggleTheme,
  applyAppearance,
  applyColorScheme,
  cycleColorScheme,
  setColorScheme,
  setFontSize,
  applyFontSize,
  initTheme,
  getToken,
  logout,
  logoutParent,
  setParent,
} = require('../src/common/store')

describe('store 状态管理', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 重置状态（注意：reactive 对象不能重新赋值，只能修改属性）
    auth.token = ''
    auth.user = null
    auth.features = []
    theme.mode = 'light'
    theme.colorScheme = 'butter'
    theme.fontSize = 'md'
    parent.token = ''
    parent.user = null
    mockMode.enabled = false
    // switchTabParams 是 reactive 对象，清空属性而非重新赋值
    Object.keys(switchTabParams).forEach(key => delete switchTabParams[key])
  })

  describe('初始状态', () => {
    it('auth 对象初始状态', () => {
      expect(auth.token).toBe('')
      expect(auth.user).toBeNull()
      expect(auth.features).toEqual([])
    })

    it('theme 初始状态', () => {
      expect(theme.mode).toBe('light')
      expect(theme.colorScheme).toBe('butter')
      expect(theme.fontSize).toBe('md')
    })

    it('parent 初始状态', () => {
      expect(parent.token).toBe('')
      expect(parent.user).toBeNull()
    })

    it('mockMode 初始状态', () => {
      expect(mockMode.enabled).toBe(false)
    })

    it('FONT_SIZES 和 SCHEMES 常量存在且为数组', () => {
      expect(Array.isArray(FONT_SIZES)).toBe(true)
      expect(FONT_SIZES.length).toBe(3)
      expect(FONT_SIZES.map((f) => f.value)).toEqual(['sm', 'md', 'lg'])

      expect(Array.isArray(SCHEMES)).toBe(true)
      expect(SCHEMES.length).toBe(4)
      expect(SCHEMES.map((s) => s.value)).toEqual(['butter', 'mint', 'sakura', 'sky'])
    })
  })

  describe('状态变更 - 认证', () => {
    it('setAuth 设置后 auth.token 正确', () => {
      setAuth('test-token', { id: 1, name: '张老师' })
      expect(auth.token).toBe('test-token')
      expect(auth.user).toEqual({ id: 1, name: '张老师' })
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_token', 'test-token')
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_user', JSON.stringify({ id: 1, name: '张老师' }))
    })

    it('setUser 设置 user 并提取 features', () => {
      setUser({ id: 2, name: '李老师', features: ['exams', 'grades'] })
      expect(auth.user).toEqual({ id: 2, name: '李老师', features: ['exams', 'grades'] })
      expect(auth.features).toEqual(['exams', 'grades'])
    })

    it('setUser 处理无 features 的用户', () => {
      setUser({ id: 3, name: '王老师' })
      expect(auth.user).toEqual({ id: 3, name: '王老师' })
      expect(auth.features).toEqual([]) // 默认为空数组
    })

    it('logout 清理 auth 和所有存储', () => {
      setAuth('will-logout', { name: '待登出' })
      expect(auth.token).toBe('will-logout')

      logout()
      expect(auth.token).toBe('')
      expect(auth.user).toBeNull()
      expect(auth.features).toEqual([])

      // 验证所有存储键都被清除
      expect(uni.removeStorageSync).toHaveBeenCalledWith('g_token')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('g_user')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('g_parent_token')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('g_parent_user')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('admin_token')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('sa_token')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('g_mock_mode')
    })

    it('getToken 返回当前 token', () => {
      setAuth('my-token', { id: 1 })
      expect(getToken()).toBe('my-token')
    })
  })

  describe('状态变更 - 主题', () => {
    it('setTheme 修改后 theme.mode 正确', () => {
      setTheme('dark')
      expect(theme.mode).toBe('dark')
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_theme', 'dark')

      setTheme('light')
      expect(theme.mode).toBe('light')
    })

    it('toggleTheme 在 light/dark 间切换', () => {
      theme.mode = 'light'
      toggleTheme()
      expect(theme.mode).toBe('dark')

      toggleTheme()
      expect(theme.mode).toBe('light')
    })

    it('applyAppearance 应用深色/浅色模式', () => {
      applyAppearance('dark')
      expect(uni.setBackgroundColor).toHaveBeenCalled()
      expect(uni.setNavigationBarColor).toHaveBeenCalled()

      applyAppearance('light')
      expect(uni.setBackgroundColor).toHaveBeenCalled()
    })

    it('setColorScheme 设置主题色', () => {
      setColorScheme('mint')
      expect(theme.colorScheme).toBe('mint')
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_scheme', 'mint')

      // 无效 scheme 回退到 butter
      setColorScheme('invalid')
      expect(theme.colorScheme).toBe('butter')
    })

    it('cycleColorScheme 循环切换主题色', () => {
      theme.colorScheme = 'butter'
      const next = cycleColorScheme()
      expect(next).toBe('mint')
      expect(theme.colorScheme).toBe('mint')

      cycleColorScheme() // mint -> sakura
      expect(theme.colorScheme).toBe('sakura')

      cycleColorScheme() // sakura -> sky
      expect(theme.colorScheme).toBe('sky')

      cycleColorScheme() // sky -> butter
      expect(theme.colorScheme).toBe('butter')
    })

    it('setFontSize 设置字体大小', () => {
      setFontSize('lg')
      expect(theme.fontSize).toBe('lg')
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_fontsize', 'lg')
      expect(theme.fontScale).toBe(1.15)

      // 无效 size 回退到 md
      setFontSize('invalid')
      expect(theme.fontSize).toBe('md')
    })

    it('applyFontSize 记录字体缩放', () => {
      applyFontSize('sm')
      expect(theme.fontScale).toBe(0.9)

      applyFontSize('md')
      expect(theme.fontScale).toBe(1)

      applyFontSize('lg')
      expect(theme.fontScale).toBe(1.15)
    })

    it('initTheme 调用应用函数', () => {
      initTheme()
      expect(uni.setBackgroundColor).toHaveBeenCalled()
      expect(uni.setNavigationBarColor).toHaveBeenCalled()
    })
  })

  describe('状态变更 - 家长端', () => {
    it('setParent 设置家长登录态', () => {
      setParent('parent-token', { id: 1, name: '家长' })
      expect(parent.token).toBe('parent-token')
      expect(parent.user).toEqual({ id: 1, name: '家长' })
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_parent_token', 'parent-token')
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_parent_user', JSON.stringify({ id: 1, name: '家长' }))
    })

    it('logoutParent 清理家长登录态', () => {
      setParent('parent-token', { id: 1 })
      logoutParent()
      expect(parent.token).toBe('')
      expect(parent.user).toBeNull()
      expect(uni.removeStorageSync).toHaveBeenCalledWith('g_parent_token')
      expect(uni.removeStorageSync).toHaveBeenCalledWith('g_parent_user')
    })
  })

  describe('演示模式', () => {
    it('mockMode 可直接修改 enabled 属性', () => {
      mockMode.enabled = true
      expect(mockMode.enabled).toBe(true)

      mockMode.enabled = false
      expect(mockMode.enabled).toBe(false)
    })
  })

  describe('tabBar 参数桥接', () => {
    it('switchTabParams 可存取参数', () => {
      switchTabParams.classId = 101
      switchTabParams.subject = '语文'
      expect(switchTabParams.classId).toBe(101)
      expect(switchTabParams.subject).toBe('语文')
    })
  })

  describe('持久化验证', () => {
    it('setAuth 持久化 token 和 user 到存储', () => {
      setAuth('persist-token', { id: 1, name: '持久化用户' })
      // setAuth 现通过 shared authMachine.adopt 写入（machine 持久化 2 次）后，
      // 再直接写 g_token/g_user（2 次），共 4 次；断言关键键被正确写入。
      expect(uni.setStorageSync).toHaveBeenCalledTimes(4)
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_token', 'persist-token')
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_user', JSON.stringify({ id: 1, name: '持久化用户' }))
    })

    it('setTheme 持久化 theme 到存储', () => {
      setTheme('dark')
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_theme', 'dark')
    })

    it('setColorScheme 持久化 scheme 到存储', () => {
      setColorScheme('sakura')
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_scheme', 'sakura')
    })

    it('setFontSize 持久化 fontSize 到存储', () => {
      setFontSize('lg')
      expect(uni.setStorageSync).toHaveBeenCalledWith('g_fontsize', 'lg')
    })
  })
})