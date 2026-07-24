import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { AuthUser, Role } from '@/types/user'
import * as authApi from '@/api/auth'

/**
 * 全局登录态 store。
 * - token 持久化到 localStorage（trace_web_token）
 * - user 持久化到 localStorage（trace_web_user）
 * - 提供 4 种角色的登录方法 + 退出
 */
export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('trace_web_token') || '')
  const user = ref<AuthUser | null>(
    (() => {
      const raw = localStorage.getItem('trace_web_user')
      return raw ? (JSON.parse(raw) as AuthUser) : null
    })(),
  )

  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const role = computed<Role | null>(() => user.value?.role ?? null)

  function setAuth(t: string, u: AuthUser) {
    token.value = t
    user.value = u
    localStorage.setItem('trace_web_token', t)
    localStorage.setItem('trace_web_user', JSON.stringify(u))
  }

  function logout() {
    token.value = ''
    user.value = null
    localStorage.removeItem('trace_web_token')
    localStorage.removeItem('trace_web_user')
  }

  /** 局部更新当前用户信息（如编辑个人资料后同步本地） */
  function updateUser(patch: Partial<AuthUser>) {
    if (!user.value) return
    user.value = { ...user.value, ...patch }
    localStorage.setItem('trace_web_user', JSON.stringify(user.value))
  }

  // 各角色登录
  async function loginAsSuper(username: string, password: string) {
    const { token: t, user: u } = await authApi.superLogin({ username, password })
    setAuth(t, u)
  }
  async function loginAsSchoolAdmin(username: string, password: string) {
    const { token: t, user: u } = await authApi.schoolAdminLogin({ username, password })
    setAuth(t, u)
  }
  async function loginAsTeacher(username: string, password: string) {
    const { token: t, user: u } = await authApi.teacherLogin({ username, password })
    setAuth(t, u)
  }
  async function loginAsParent(studentNo: string, password: string) {
    const { token: t, user: u } = await authApi.parentLogin({ studentNo, password })
    setAuth(t, u)
  }

  return {
    token,
    user,
    isLoggedIn,
    role,
    setAuth,
    logout,
    updateUser,
    loginAsSuper,
    loginAsSchoolAdmin,
    loginAsTeacher,
    loginAsParent,
  }
})
