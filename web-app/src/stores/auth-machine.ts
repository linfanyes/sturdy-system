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
import { ref, computed, watch, type Ref } from 'vue'
import {
  createAuthMachine,
  createLocalStoragePersistence,
} from '@gardener/shared/auth/factory'
import type { AuthUser, Role } from '@/types/user'
import * as authApi from '@/api/auth'
import { isViteDev } from '@/config/viteEnv'
import { TOKEN_KEY, USER_KEY, MULTI_ROLE_KEY } from '@/constants/storage-keys'

// P2修复：Feature Profile 类型定义，替代 any
interface FeatureProfile {
  role?: string
  schoolId?: string
  effectiveFeatures?: string[]
  rawFeatures?: string[]
  schoolFeatureFlags?: string[] | null
  user?: {
    position?: string
    subject?: string
    subjects?: string[]
    [key: string]: unknown
  }
}

function toSharedUser(u: AuthUser) {
  return { ...u, id: String(u.id), role: u.role, name: u.name } as any
}

function fromSharedUser(u: any): AuthUser {
  return { ...u } as AuthUser
}

/**
 * 创建 machine 实例的工厂函数。
 * 每次调用创建新实例，HMR 场景下用于替换悬挂的旧实例。
 */
function createMachineInstance() {
  return createAuthMachine({
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
}

// HMR 兼容：开发期热替换时标记需重建 machine
let _hmrDisposed = false
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    _hmrDisposed = true
  })
}

/**
 * Web 鉴权 store（Pinia）。
 * 对外 API 与旧版 useAuthStore 一致；状态由共享 machine 驱动。
 *
 * machine 实例挂在 store 内部（而非模块级变量），避免 HMR 竞态：
 * 每次 store 初始化时若检测到 HMR  disposal 标记，则重建 machine。
 */
export const useAuthStore = defineStore('auth', () => {
  // machine 实例：闭包内私有，对外通过 authMachine 暴露只读引用
  let _machine = createMachineInstance()
  // DCLP：检测 HMR 后首次访问时自动重建
  if (_hmrDisposed) {
    _machine = createMachineInstance()
    _hmrDisposed = false
  }

  /** 暴露 machine 只读引用（兼容旧外部调用） */
  const machine = _machine

  // 响应式字段：由 machine 事件同步
  const token = ref<string>(machine.token || '')
  const user = ref<AuthUser | null>(machine.user ? fromSharedUser(machine.user) : null)
  const role = ref<Role | null>(machine.role)
  const isLoggedIn = ref(machine.isLoggedIn)
  const effectiveFeatures = ref<string[]>(user.value?.effectiveFeatures || [])
  const schoolFeatureFlags = ref<string[] | null>(user.value?.schoolFeatureFlags ?? null)
  // P0-6修复：标记 effectiveFeatures 是否已加载完成
  const featuresLoaded = ref(false)

  function syncFromMachine() {
    token.value = machine.token || ''
    user.value = machine.user ? fromSharedUser(machine.user) : null
    role.value = machine.role
    isLoggedIn.value = machine.isLoggedIn
    effectiveFeatures.value = user.value?.effectiveFeatures ?? []
    schoolFeatureFlags.value = user.value?.schoolFeatureFlags ?? null
  }

  // 订阅 machine 事件，实现 machine → 响应式单向同步
  machine.on('login', syncFromMachine)
  machine.on('logout', syncFromMachine)
  machine.on('switchRole', syncFromMachine)
  machine.on('restore', syncFromMachine)
  machine.on('tokenExpired', syncFromMachine)

  /** 兼容旧版 setAuth：采纳外部登录结果，统一走共享状态机，保持 machine/store/localStorage 三方一致 */
  function setAuth(t: string, u: AuthUser) {
    machine.adopt({ token: t, user: toSharedUser(u) })
    // adopt 内部已 emit('login') → syncFromMachine 会同步 refs；此处再显式同步一次兜底，
    // 保证即使调用发生在监听注册之前也不丢失状态。
    syncFromMachine()
  }

  async function logout() {
    await machine.logout()
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
    await machine.login({ username, password })
    await fetchMe()
  }

  /** 后端自动识别角色的统一登录（新登录页使用） */
  async function loginByUsername(username: string, password: string) {
    await machine.login({ username, password })
    await fetchMe()
  }

  function applyFeatureProfile(profile: FeatureProfile | null) {
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
    // P0-6修复：标记功能包已加载完成
    featuresLoaded.value = true
  }

  async function fetchMe() {
    try {
      const profile = await authApi.getMe()
      applyFeatureProfile(profile)
    } catch (_e) {
      // 拉取失败不影响登录态，但仍标记为已加载（避免路由守卫无限等待）
      featuresLoaded.value = true
    }
  }

  // P0-6修复：确保功能包加载完成（Promise 唤醒模式，无忙等待）
  let _featuresResolve: (() => void) | null = null
  const _featuresPromise = new Promise<void>((resolve) => {
    _featuresResolve = resolve
  })
  // 监听 featuresLoaded 变化，满足条件时立即唤醒
  watch(featuresLoaded, (loaded) => {
    if (loaded && _featuresResolve) {
      _featuresResolve()
      _featuresResolve = null
    }
  })

  async function ensureFeaturesLoaded(timeoutMs = 5000): Promise<void> {
    if (featuresLoaded.value) return
    // Promise.race 实现超时兜底，无需轮询
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
    await Promise.race([_featuresPromise, timeout])
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
    // P0-6修复：暴露功能包加载状态
    featuresLoaded: computed(() => featuresLoaded.value),
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
    ensureFeaturesLoaded,
    applyFeatureProfile,
    restore: () => machine.restore(),
    switchRole: (r: Role) => machine.switchRole(r),
    /** 暴露 machine 实例（兼容旧外部调用 authMachine.xxx） */
    authMachine: machine,
  }
})

/**
 * 向后兼容：旧代码通过 `authMachine` 直接访问 machine 实例。
 * 注意：此引用在 store 初始化后有效；HMR 场景下若 store 被重建，需重新获取。
 */
export const authMachine = {
  get token() { return useAuthStore().authMachine.token },
  get user() { return useAuthStore().authMachine.user },
  get role() { return useAuthStore().authMachine.role },
  get isLoggedIn() { return useAuthStore().authMachine.isLoggedIn },
  login(...args: any[]) { return useAuthStore().authMachine.login(...args) },
  logout(...args: any[]) { return useAuthStore().authMachine.logout(...args) },
  adopt(...args: any[]) { return useAuthStore().authMachine.adopt(...args) },
  restore(...args: any[]) { return useAuthStore().authMachine.restore(...args) },
  switchRole(...args: any[]) { return useAuthStore().authMachine.switchRole(...args) },
  on(...args: any[]) { return useAuthStore().authMachine.on(...args) },
  off(...args: any[]) { return useAuthStore().authMachine.off(...args) },
}
