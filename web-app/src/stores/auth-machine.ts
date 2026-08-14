/**
 * Web 端鉴权状态机——共享状态机 + Pinia 响应式桥接。
 *
 * 核心状态机来自 shared/auth/factory.ts::createAuthMachine，注入：
 *   - loginFn: 适配 shared Credentials → AuthUser（保留 /auth/unified-login）
 *   - persistence: localStorage 适配器（key 沿用 trace_web_token/trace_web_user 向后兼容）
 *
 * 桥接层（本文件）额外提供：
 *   - reactive 字段（token / user / role / isLoggedIn）供模板直读
 *   - 后端功能包同步（fetchMe / applyFeatureProfile）
 *   - 各角色快捷登录（loginAsTeacher / loginAsParent 等，保持旧调用入口）
 */

import { defineStore } from 'pinia'
import { ref, computed, type Ref } from 'vue'
import {
  createAuthMachine,
  createLocalStoragePersistence,
} from '@gardener/shared/auth/factory'
import type { AuthUser, Role } from '@/types/user'
import * as authApi from '@/api/auth'
import { isViteDev } from '@/config/viteEnv'

// 保持旧 key，避免冷启动时与已有登录态不兼容
const TOKEN_KEY = 'trace_web_token'
const USER_KEY = 'trace_web_user'
const MULTI_ROLE_KEY = 'trace_web_multi_role'

function toSharedUser(u: AuthUser) {
  return { ...u, id: String(u.id), role: u.role, name: u.name } as any
}

function fromSharedUser(u: any): AuthUser {
  return { ...u } as AuthUser
}

// 单例 machine —— 整个应用生命周期内唯一
let _machine: ReturnType<typeof createAuthMachine> | null = null

function getMachine() {
  if (_machine) return _machine
  _machine = createAuthMachine({
    loginFn: async (creds) => {
      const res = await authApi.unifiedLogin(creds.username || '', creds.password || '')
      return {
        token: res.token,
        user: toSharedUser(res.user),
      }
    },
    persistence: createLocalStoragePersistence({
      tokenKey: TOKEN_KEY,
      userKey: USER_KEY,
      multiRoleKey: MULTI_ROLE_KEY,
    }),
    revokeFn: undefined,
    debug: isViteDev(),
  })
  return _machine
}

export const authMachine = getMachine()

/**
 * Web 鉴权 store（Pinia）。
 * 对外 API 与旧版 useAuthStore 一致；状态由共享 machine 驱动。
 */
export const useAuthStore = defineStore('auth', () => {
  // 响应式字段：由 machine 事件同步
  const token = ref<string>(authMachine.token || '')
  const user = ref<AuthUser | null>(authMachine.user ? fromSharedUser(authMachine.user) : null)
  const role = ref<Role | null>(authMachine.role)
  const isLoggedIn = ref(authMachine.isLoggedIn)
  const effectiveFeatures = ref<string[]>(user.value?.effectiveFeatures || [])
  const schoolFeatureFlags = ref<string[] | null>(user.value?.schoolFeatureFlags ?? null)

  function syncFromMachine() {
    token.value = authMachine.token || ''
    user.value = authMachine.user ? fromSharedUser(authMachine.user) : null
    role.value = authMachine.role
    isLoggedIn.value = authMachine.isLoggedIn
    effectiveFeatures.value = (user.value?.effectiveFeatures as string[]) || []
    schoolFeatureFlags.value = (user.value?.schoolFeatureFlags as string[] | null) ?? null
  }

  // 订阅 machine 事件，实现 machine → 响应式单向同步
  authMachine.on('login', syncFromMachine)
  authMachine.on('logout', syncFromMachine)
  authMachine.on('switchRole', syncFromMachine)
  authMachine.on('restore', syncFromMachine)
  authMachine.on('tokenExpired', syncFromMachine)

  /** 兼容旧版 setAuth：采纳外部登录结果，统一走共享状态机，保持 machine/store/localStorage 三方一致 */
  function setAuth(t: string, u: AuthUser) {
    authMachine.adopt({ token: t, user: toSharedUser(u) })
    // adopt 内部已 emit('login') → syncFromMachine 会同步 refs；此处再显式同步一次兜底，
    // 保证即使调用发生在监听注册之前也不丢失状态。
    syncFromMachine()
  }

  async function logout() {
    await authMachine.logout()
  }

  /** 局部更新当前用户信息 */
  function updateUser(patch: Partial<AuthUser>) {
    if (!user.value) return
    const next = { ...user.value, ...patch }
    user.value = next
    localStorage.setItem(USER_KEY, JSON.stringify(next))
    if (patch.effectiveFeatures) effectiveFeatures.value = patch.effectiveFeatures
    if ('schoolFeatureFlags' in patch) schoolFeatureFlags.value = patch.schoolFeatureFlags ?? null
  }

  // 统一登录入口（前端所有角色共用用户名/密码表单）
  async function login(rs: Role, username: string, password: string) {
    await authMachine.login({ username, password })
    await fetchMe()
  }

  /** 后端自动识别角色的统一登录（新登录页使用） */
  async function loginByUsername(username: string, password: string) {
    await authMachine.login({ username, password })
    await fetchMe()
  }

  function applyFeatureProfile(profile: any) {
    if (!profile) return
    const patch: Partial<AuthUser> = {}
    if (Array.isArray(profile.effectiveFeatures)) {
      patch.effectiveFeatures = profile.effectiveFeatures
    }
    if ('schoolFeatureFlags' in profile) {
      patch.schoolFeatureFlags = profile.schoolFeatureFlags ?? null
    }
    const me = profile.user
    if (me && typeof me === 'object') {
      if (me.position !== undefined) patch.position = me.position || ''
      if (me.subject !== undefined) patch.subject = me.subject || ''
      if (Array.isArray(me.subjects)) patch.subjects = me.subjects
    }
    if (Object.keys(patch).length) updateUser(patch)
  }

  async function fetchMe() {
    try {
      const profile = await authApi.getMe()
      applyFeatureProfile(profile)
    } catch (_e) {
      // 拉取失败不影响登录态
    }
  }

  // 各角色登录（兼容旧调用）
  async function loginAsSuper(username: string, password: string) {
    await login('super' as Role, username, password)
  }
  async function loginAsSchoolAdmin(username: string, password: string) {
    await login('school_admin', username, password)
  }
  async function loginAsTeacher(username: string, password: string) {
    await login('teacher', username, password)
  }
  async function loginAsParent(studentNo: string, password: string) {
    await login('parent', studentNo, password)
  }

  return {
    token: computed(() => token.value) as Ref<string>,
    user: computed(() => user.value) as Ref<AuthUser | null>,
    role: computed(() => role.value) as Ref<Role | null>,
    isLoggedIn: computed(() => isLoggedIn.value),
    effectiveFeatures: computed(() => effectiveFeatures.value),
    schoolFeatureFlags: computed(() => schoolFeatureFlags.value),
    setAuth,
    logout,
    updateUser,
    login,
    loginByUsername,
    loginAsSuper,
    loginAsSchoolAdmin,
    loginAsTeacher,
    loginAsParent,
    fetchMe,
    applyFeatureProfile,
    restore: () => authMachine.restore(),
    switchRole: (r: Role) => authMachine.switchRole(r),
  }
})
