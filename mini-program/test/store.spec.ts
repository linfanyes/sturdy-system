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
  setAuth,
  setUser,
  setTheme,
  logout,
  FONT_SIZES,
  SCHEMES,
} = require('../src/common/store')

describe('store 状态管理', () => {
  describe('初始状态', () => {
    it('auth 对象初始状态', () => {
      expect(auth.token).toBe('')
      expect(auth.user).toBeNull()
      expect(auth.features).toEqual([])
    })

    it('theme 初始状态', () => {
      expect(theme.mode).toBe('light')
    })

    it('FONT_SIZES 和 SCHEMES 常量存在且为数组', () => {
      expect(Array.isArray(FONT_SIZES)).toBe(true)
      expect(FONT_SIZES.length).toBeGreaterThan(0)
      expect(Array.isArray(SCHEMES)).toBe(true)
      expect(SCHEMES.length).toBeGreaterThan(0)
    })
  })

  describe('状态变更', () => {
    it('setAuth 设置后 auth.token 正确', () => {
      setAuth('test-token', { id: 1, name: '张老师' })
      expect(auth.token).toBe('test-token')
      expect(auth.user).toEqual({ id: 1, name: '张老师' })
    })

    it('setUser 设置 user 并提取 features', () => {
      setUser({ id: 2, name: '李老师', features: ['exams', 'grades'] })
      expect(auth.user).toEqual({ id: 2, name: '李老师', features: ['exams', 'grades'] })
      expect(auth.features).toEqual(['exams', 'grades'])
    })

    it('setTheme 修改后 theme.mode 正确', () => {
      setTheme('dark')
      expect(theme.mode).toBe('dark')
      setTheme('light')
      expect(theme.mode).toBe('light')
    })

    it('logout 清理 auth', () => {
      setAuth('will-logout', { name: '待登出' })
      expect(auth.token).toBe('will-logout')
      logout()
      expect(auth.token).toBe('')
      expect(auth.user).toBeNull()
    })
  })
})
