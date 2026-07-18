import { reactive } from 'vue'

const TOKEN_KEY = 'g_token'
const USER_KEY = 'g_user'
const THEME_KEY = 'g_theme'
const SCHEME_KEY = 'g_scheme'

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
})

// 主题：light / dark。默认跟随系统；用户手动切换后持久化。
const sysDark =
  typeof uni.getSystemInfoSync === 'function' &&
  uni.getSystemInfoSync().theme === 'dark'
export const theme = reactive({
  mode: uni.getStorageSync(THEME_KEY) || (sysDark ? 'dark' : 'light'),
  colorScheme: uni.getStorageSync(SCHEME_KEY) || 'butter',
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
  uni.setStorageSync(USER_KEY, user)
}

export function logout() {
  auth.token = ''
  auth.user = null
  uni.removeStorageSync(TOKEN_KEY)
  uni.removeStorageSync(USER_KEY)
}
