import { reactive } from 'vue'

const TOKEN_KEY = 'g_token'
const USER_KEY = 'g_user'
const THEME_KEY = 'g_theme'

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
