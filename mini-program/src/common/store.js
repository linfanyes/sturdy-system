import { reactive } from 'vue'

const TOKEN_KEY = 'g_token'
const USER_KEY = 'g_user'

export const auth = reactive({
  token: uni.getStorageSync(TOKEN_KEY) || '',
  user: uni.getStorageSync(USER_KEY) || null,
})

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
