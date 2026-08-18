/**
 * shared/auth/factory.ts —— 通用鉴权状态机实现。
 *
 * 跨端共用的状态机逻辑：login / logout / restore / switchRole 四大操作的状态变迁与持久化，
 * 各端仅注入 loginFn（调用各自后端适配）和 persistence（localStorage / wx storage 适配器）。
 *
 * 【持久化语义】
 *   - saveLogin / loadLogin：当前"活跃角色"的凭证
 *   - saveMultiRole / loadMultiRole：多角色（师兼家、超管/校管 token 分存）的全量快照
 *   - clearLogin 仅清活跃凭证；clearMultiRole 清多角色快照；logout 两者都清
 *
 * 【事件】通过 on/once 订阅 'login' | 'logout' | 'switchRole' | 'restore' | 'tokenExpired'。
 * Web 端可在 store 中桥接为 Pinia 响应式；小程序端桥接为 reactive。
 *
 * 【对齐】
 *   - Web 适配：web-app/src/stores/auth-machine.ts（Pinia 包装）
 *   - 小程序适配：mini-program/src/common/auth-machine.js（reactive 包装）
 */

import type {
  AuthEvent,
  AuthEventListener,
  AuthMachineOptions,
  AuthPersistence,
  AuthUser,
  Credentials,
  IAuthStateMachineWithEvents,
  LoginResult,
  Role,
} from './machine'
import { AuthError, isJwtExpired } from './machine'

/** 创建跨端共用的鉴权状态机实例 */
export function createAuthMachine(opts: AuthMachineOptions): IAuthStateMachineWithEvents {
  const { loginFn, persistence, revokeFn, debug = false } = opts

  let active: LoginResult | null = null
  let multiRole: Record<string, LoginResult> = {}
  const listeners = new Map<AuthEvent | '*', Set<AuthEventListener>>()

  // —— 事件系统 ——
  function emit(evt: AuthEvent, data?: { token?: string; user?: AuthUser | null; role?: Role | null }) {
    listeners.get(evt)?.forEach((cb) => {
      try {
        cb(evt, data)
      } catch (e) {
        if (debug) console.warn(`[auth] listener for '${evt}' threw`, e)
      }
    })
    listeners.get('*')?.forEach((cb) => {
      try {
        cb(evt, data)
      } catch (e) {
        if (debug) console.warn('[auth] wildcard listener threw', e)
      }
    })
  }

  function on(evt: AuthEvent, cb: AuthEventListener): () => void {
    if (!listeners.has(evt)) listeners.set(evt, new Set())
    listeners.get(evt)!.add(cb)
    return () => listeners.get(evt)?.delete(cb)
  }

  function once(evt: AuthEvent, cb: AuthEventListener): () => void {
    const wrapper: AuthEventListener = (e, d) => {
      off()
      cb(e, d)
    }
    const off = on(evt, wrapper)
    return off
  }

  // —— 状态写入 ——
  function setActive(result: LoginResult) {
    active = result
    if (result.user?.role) {
      multiRole[result.user.role] = result
      persistence.saveMultiRole(multiRole)
    }
    persistence.saveLogin(result)
  }

  // —— 状态机操作 ——
  let loggingIn = false
  async function login(creds: Credentials): Promise<LoginResult> {
    if (loggingIn) throw new AuthError('登录请求进行中，请勿重复提交', 'LOGIN_IN_PROGRESS')
    loggingIn = true
    try {
      let result: LoginResult
      try {
        result = await loginFn(creds)
      } catch (e) {
        throw e instanceof AuthError ? e : new AuthError(e instanceof Error ? e.message : '登录失败', 'LOGIN_FAILED')
      }
      if (!result?.token) throw new AuthError('登录响应缺少 token', 'INVALID_RESPONSE')
      if (!result?.user?.id) throw new AuthError('登录响应缺少 user.id', 'INVALID_RESPONSE')
      if (isJwtExpired(result.token)) throw new AuthError('登录令牌已过期', 'TOKEN_EXPIRED')
      setActive(result)
      emit('login', { token: result.token, user: result.user, role: result.user.role as Role })
      if (debug) console.log('[auth] login ok, role=', result.user.role)
      return result
    } finally {
      loggingIn = false
    }
  }

  async function logout(): Promise<void> {
    const oldToken = active?.token
    active = null
    multiRole = {}
    persistence.clearLogin()
    persistence.clearMultiRole()
    if (revokeFn && oldToken) {
      try {
        await revokeFn(oldToken)
      } catch (e) {
        if (debug) console.warn('[auth] revoke failed:', e)
      }
    }
    emit('logout')
    if (debug) console.log('[auth] logout ok')
  }

  async function restore(): Promise<LoginResult | null> {
    const multi = persistence.loadMultiRole()
    if (multi && Object.keys(multi).length > 0) multiRole = multi
    const saved = persistence.loadLogin()
    if (!saved) {
      if (debug) console.log('[auth] restore: no saved login')
      return null
    }
    if (isJwtExpired(saved.token)) {
      persistence.clearLogin()
      active = null
      emit('tokenExpired', { token: saved.token })
      if (debug) console.log('[auth] restore: token expired')
      return null
    }
    active = saved
    emit('restore', { token: saved.token, user: saved.user, role: saved.user?.role as Role | null })
    if (debug) console.log('[auth] restore ok, role=', saved.user?.role)
    return saved
  }

  async function switchRole(targetRole: Role): Promise<LoginResult> {
    // 已处于目标角色，短路返回
    if (active?.user?.role === targetRole && active) return active
    const target = multiRole[targetRole]
    if (!target) {
      throw new AuthError(`角色 "${targetRole}" 未登录或不在快照中。请先完成该角色的登录。`, 'ROLE_NOT_AVAILABLE')
    }
    if (isJwtExpired(target.token)) {
      delete multiRole[targetRole]
      persistence.saveMultiRole(multiRole)
      throw new AuthError(`角色 "${targetRole}" 的令牌已过期，请重新登录。`, 'TOKEN_EXPIRED')
    }
    active = target
    persistence.saveLogin(target)
    emit('switchRole', { token: target.token, user: target.user, role: targetRole })
    if (debug) console.log('[auth] switchRole →', targetRole)
    return target
  }

  /**
   * 采纳外部已完成的登录结果（不重新发起登录请求）。
   * 登录已由调用方完成后（统一登录 / 切换学生换 token 等），把结果写入内存态 + 多角色快照 + 持久化，
   * 并发射 'login' 事件，使订阅方（store）同步，避免 setAuth 直写导致的 machine/store 状态失步。
   */
  function adopt(result: LoginResult): void {
    if (!result?.token || !result?.user?.id) {
      throw new AuthError('采纳登录结果失败：缺少 token 或 user.id', 'INVALID_RESPONSE')
    }
    setActive(result)
    emit('login', { token: result.token, user: result.user, role: result.user.role as Role })
    if (debug) console.log('[auth] adopt ok, role=', result.user.role)
  }

  return {
    get token() {
      return active?.token ?? null
    },
    get user() {
      return active?.user ?? null
    },
    get role() {
      return (active?.user?.role as Role | null) ?? null
    },
    get isLoggedIn() {
      return !!active?.token && !!active?.user
    },
    login,
    logout,
    restore,
    switchRole,
    adopt,
    on,
    once,
  }
}

// —— 通用 localStorage 持久化（Node / 浏览器 / jsdom 均可用）——

/**
 * 基于 Key-Value 存储的轻量持久化适配器。
 * 注入 get/set/remove 三函数即可；不直接依赖 localStorage。
 */
export function createKvPersistence(opts: {
  get: (k: string) => string | null | undefined
  set: (k: string, v: string) => void
  remove: (k: string) => void
  tokenKey: string
  userKey: string
  multiRoleKey?: string
}): AuthPersistence {
  const { get, set, remove, tokenKey, userKey, multiRoleKey = '__multi_role__' } = opts

  return {
    saveLogin(result) {
      set(tokenKey, result.token)
      set(userKey, JSON.stringify(result.user))
    },
    loadLogin() {
      const t = get(tokenKey)
      const raw = get(userKey)
      if (!t || !raw) return null
      try {
        return { token: t, user: JSON.parse(raw) as AuthUser }
      } catch {
        return null
      }
    },
    clearLogin() {
      remove(tokenKey)
      remove(userKey)
    },
    saveMultiRole(data) {
      set(multiRoleKey, JSON.stringify(data))
    },
    loadMultiRole() {
      const raw = get(multiRoleKey)
      if (!raw) return null
      try {
        const obj = JSON.parse(raw) as Record<string, LoginResult>
        // 仅保有有效 token 的结果
        return Object.fromEntries(Object.entries(obj).filter(([, v]) => v && v.token))
      } catch {
        return null
      }
    },
    clearMultiRole() {
      remove(multiRoleKey)
    },
  }
}

/**
 * 浏览器端默认适配器：使用 window.localStorage。
 * Web 端可直接使用，测试环境可按需替换为内存实现。
 *
 * ⚠️ 警告：此函数仅限浏览器/Web 端使用。
 * 在服务端（Node.js SSR / 后端）调用时，localStorage 为 undefined，所有操作会被静默跳过。
 * 若需在服务端持久化，请使用 createKvPersistence 注入自定义 KV 适配器。
 */
export function createLocalStoragePersistence(opts?: {
  tokenKey?: string
  userKey?: string
  multiRoleKey?: string
}): AuthPersistence {
  const tokenKey = opts?.tokenKey ?? '__auth_token__'
  const userKey = opts?.userKey ?? '__auth_user__'
  const multiRoleKey = opts?.multiRoleKey ?? '__auth_multi_role__'
  return createKvPersistence({
    get: (k) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null),
    set: (k, v) => {
      if (typeof localStorage !== 'undefined') localStorage.setItem(k, v)
    },
    remove: (k) => {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(k)
    },
    tokenKey,
    userKey,
    multiRoleKey,
  })
}

// 重新导出接口方便下游使用
export type { IAuthStateMachine, IAuthStateMachineWithEvents, AuthMachineOptions, AuthPersistence } from './machine'
