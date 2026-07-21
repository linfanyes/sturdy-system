import { reactive } from 'vue'

const TOKEN_KEY = 'g_token'
const USER_KEY = 'g_user'
const THEME_KEY = 'g_theme'
const SCHEME_KEY = 'g_scheme'
const FONT_KEY = 'g_fontsize'
const MOCK_KEY = 'g_mock_mode'

// 字体大小档位（对齐 web 三档）
export const FONT_SIZES = [
  { value: 'sm', label: '小', scale: 0.9 },
  { value: 'md', label: '标准', scale: 1 },
  { value: 'lg', label: '大', scale: 1.15 },
]

// 主题色板（对齐 web 4 色）：奶黄/薄荷/樱花/天蓝
export const SCHEMES = [
  { value: 'butter', label: '奶黄', color: '#e6a23c' },
  { value: 'mint', label: '薄荷', color: '#07c160' },
  { value: 'sakura', label: '樱花', color: '#e06c75' },
  { value: 'sky', label: '天蓝', color: '#409eff' },
]

export const auth = reactive({
  token: uni.getStorageSync(TOKEN_KEY) || '',
  user: uni.getStorageSync(USER_KEY) || null,
  features: [], // 管理员配置的功能列表,空数组=全部可用
})

// 主题：light / dark。默认跟随系统；用户手动切换后持久化。
const sysDark =
  typeof uni.getSystemInfoSync === 'function' &&
  uni.getSystemInfoSync().theme === 'dark'
export const theme = reactive({
  mode: uni.getStorageSync(THEME_KEY) || (sysDark ? 'dark' : 'light'),
  colorScheme: uni.getStorageSync(SCHEME_KEY) || 'butter',
  fontSize: uni.getStorageSync(FONT_KEY) || 'md',
})

// 演示模式开关（持久化到 localStorage，页面层通过 import { setMockMode } 生效）
export const mockMode = reactive({
  enabled: uni.getStorageSync(MOCK_KEY) === 'true',
})

export function setTheme(mode) {
  theme.mode = mode === 'dark' ? 'dark' : 'light'
  uni.setStorageSync(THEME_KEY, theme.mode)
  applyAppearance(theme.mode)
}

export function toggleTheme() {
  setTheme(theme.mode === 'dark' ? 'light' : 'dark')
}

// 应用系统级外观：背景、导航栏、tabBar
export function applyAppearance(mode) {
  const dark = mode === 'dark'
  try {
    uni.setBackgroundColor({
      backgroundColor: dark ? '#15171c' : '#fff7e6',
      backgroundColorTop: dark ? '#15171c' : '#fff7e6',
      backgroundColorBottom: dark ? '#15171c' : '#fff7e6',
    })
  } catch (e) {}
  try {
    uni.setNavigationBarColor({
      frontColor: dark ? '#ffffff' : '#000000',
      backgroundColor: dark ? '#1f232b' : '#fff7e6',
    })
  } catch (e) {}
  try {
    uni.setTabBarStyle({
      color: dark ? '#8a909a' : '#9aa0a6',
      selectedColor: dark ? '#3fd07f' : '#e6a23c',
      backgroundColor: dark ? '#1a1d23' : '#ffffff',
      borderStyle: dark ? 'white' : 'black',
    })
  } catch (e) {}
}

export function initTheme() {
  applyAppearance(theme.mode)
  applyColorScheme(theme.colorScheme)
  applyFontSize(theme.fontSize)
}

// 应用主题色：同步全局 tabBar 选中色，使主题色在全局可见（对齐 web 强调色变化）
export function applyColorScheme(scheme) {
  const s = SCHEMES.find((x) => x.value === scheme) || SCHEMES[0]
  try {
    uni.setTabBarStyle({ selectedColor: s.color })
  } catch (e) {}
}

// 切换主题色（循环到下一个）
export function cycleColorScheme() {
  const idx = SCHEMES.findIndex((x) => x.value === theme.colorScheme)
  const next = SCHEMES[(idx + 1) % SCHEMES.length]
  setColorScheme(next.value)
  return next.value
}

export function setColorScheme(scheme) {
  if (!SCHEMES.find((x) => x.value === scheme)) scheme = 'butter'
  theme.colorScheme = scheme
  uni.setStorageSync(SCHEME_KEY, scheme)
  applyColorScheme(scheme)
}

// 字体大小：sm / md / lg
export function setFontSize(size) {
  if (!FONT_SIZES.find((x) => x.value === size)) size = 'md'
  theme.fontSize = size
  uni.setStorageSync(FONT_KEY, size)
  applyFontSize(size)
}

// 应用字体大小：通过 setTabBarStyle 不可调字体，仅作为页面 CSS 变量来源
export function applyFontSize(size) {
  const f = FONT_SIZES.find((x) => x.value === size) || FONT_SIZES[1]
  // 仅作记录，由页面 root view 的 :class 控制 CSS 变量缩放
  theme.fontScale = f.scale
}

export function getToken() {
  return auth.token
}

export function setAuth(token, user) {
  auth.token = token
  auth.user = user
  uni.setStorageSync(TOKEN_KEY, token)
  uni.setStorageSync(USER_KEY, user)
}

export function setUser(user) {
  auth.user = user
  // 自动从 user 对象提取管理员配置的功能权限
  if (user && Array.isArray(user.features)) auth.features = user.features
  uni.setStorageSync(USER_KEY, user)
}

export function logout() {
  auth.token = ''
  auth.user = null
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
}
