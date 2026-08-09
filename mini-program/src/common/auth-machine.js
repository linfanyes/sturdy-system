/**
 * 小程序端鉴权状态机——共享状态机 + wxStorage 持久化。
 *
 * 核心状态机来自 @gardener/shared/auth/factory 的 createAuthMachine，注入：
 *   - loginFn: 通过 api 调用 /auth/unified-login
 *   - persistence: wxStorage 适配器，key 对齐 route-guard.js 的角色优先级
 *
 * 【持久化 key】对齐 route-guard 的 getCurrentRole 检测优先级：
 *   super        → admin_token / admin_user
 *   school_admin → sa_token / sa_user
 *   parent       → g_parent_token / g_parent_user（家长身份）
 *   teacher      → g_token / g_user（教师身份）
 *
 * 【家长双身份】通过 shared machine 的 multiRole 快照 + switchRole 支持。
 *
 * 【与 store.js 的关系】
 * 本文件仅暴露 machine 实例；reactive 绑定（machine → auth 对象）在 store.js 中注册，
 * 避免循环依赖（store 依赖 machine，machine 不应依赖 store）。
 *
 * 冷启动入口：在 App.vue 的 onLaunch 中调用 initAuthMachineAuth()（store.js 导出）。
 */

import { createAuthMachine, createKvPersistence } from '@gardener/shared/auth/factory'
import { api } from './request'

const TOKEN_KEY = 'g_token'
const USER_KEY = 'g_user'
const ADMIN_TOKEN_KEY = 'admin_token'
const ADMIN_USER_KEY = 'admin_user'
const SA_TOKEN_KEY = 'sa_token'
const SA_USER_KEY = 'sa_user'
const PARENT_TOKEN_KEY = 'g_parent_token'
const PARENT_USER_KEY = 'g_parent_user'
const MULTI_ROLE_KEY = '__auth_multi_role__'

// wx 持久化：key 对齐 route-guard.getCurrentRole() 的角色优先级
// saveLogin/loadLogin/clearLogin 需按角色分 key（对齐 route-guard），保留本地实现；
// 多角色快照逻辑复用 shared createKvPersistence，避免重复。
const multiRoleKv = createKvPersistence({
  get: (k) => (uni.getStorageSync(k) == null || uni.getStorageSync(k) === '' ? null : String(uni.getStorageSync(k))),
  set: (k, v) => uni.setStorageSync(k, v),
  remove: (k) => uni.removeStorageSync(k),
  tokenKey: '', // 本适配器不使用 tokenKey/userKey（saveLogin/loadLogin 走角色分 key 逻辑）
  userKey: '',
  multiRoleKey: MULTI_ROLE_KEY,
})

function makeWxPersistence() {
  return {
    saveLogin(result) {
      if (!result || !result.token) return
      const role = result.user && result.user.role
      switch (role) {
        case 'super':
          uni.setStorageSync(ADMIN_TOKEN_KEY, result.token)
          uni.setStorageSync(ADMIN_USER_KEY, JSON.stringify(result.user))
          break
        case 'school_admin':
          uni.setStorageSync(SA_TOKEN_KEY, result.token)
          uni.setStorageSync(SA_USER_KEY, JSON.stringify(result.user))
          break
        case 'parent':
          uni.setStorageSync(PARENT_TOKEN_KEY, result.token)
          uni.setStorageSync(PARENT_USER_KEY, JSON.stringify(result.user))
          break
        case 'teacher':
        default:
          uni.setStorageSync(TOKEN_KEY, result.token)
          const u = result.user
          uni.setStorageSync(USER_KEY, typeof u === 'string' ? u : JSON.stringify(u))
          break
      }
    },
    loadLogin() {
      // 角色优先级链对齐 route-guard.getCurrentRole
      const candidates = [
        { t: ADMIN_TOKEN_KEY, u: ADMIN_USER_KEY },
        { t: SA_TOKEN_KEY, u: SA_USER_KEY },
        { t: PARENT_TOKEN_KEY, u: PARENT_USER_KEY },
        { t: TOKEN_KEY, u: USER_KEY },
      ]
      for (const c of candidates) {
        const t = uni.getStorageSync(c.t)
        if (!t) continue
        const raw = uni.getStorageSync(c.u)
        if (raw == null || raw === '') continue
        try {
          return { token: t, user: typeof raw === 'string' ? JSON.parse(raw) : raw }
        } catch (e) {
          continue
        }
      }
      return null
    },
    clearLogin() {
      // 全部清除，与原生 logout 一致，对齐 route-guard 角色优先级
      uni.removeStorageSync(TOKEN_KEY)
      uni.removeStorageSync(USER_KEY)
      uni.removeStorageSync(ADMIN_TOKEN_KEY)
      uni.removeStorageSync(ADMIN_USER_KEY)
      uni.removeStorageSync(SA_TOKEN_KEY)
      uni.removeStorageSync(SA_USER_KEY)
      uni.removeStorageSync(PARENT_TOKEN_KEY)
      uni.removeStorageSync(PARENT_USER_KEY)
      uni.removeStorageSync(MULTI_ROLE_KEY)
      // parent 双身份 key 由 store.logout 清理
    },
    saveMultiRole: multiRoleKv.saveMultiRole,
    loadMultiRole: multiRoleKv.loadMultiRole,
    clearMultiRole: multiRoleKv.clearMultiRole,
  }
}

async function loginFn(creds) {
  const username = creds.username || creds.studentNo || ''
  const password = creds.password || ''
  const res = await api.post('/auth/unified-login', { username, password })
  // 师兼家（needsRoleChoice）：先返回 teacher 角色
  if (res && res.needsRoleChoice) {
    return {
      token: res.teacher ? res.teacher.token : '',
      user: res.teacher
        ? res.teacher.user || { id: '', role: 'teacher', name: '' }
        : { id: '', role: 'teacher', name: '' },
    }
  }
  let user
  switch (res.role) {
    case 'super':
      user = {
        id: (res.user && res.user.id) || 'super',
        role: 'super',
        name: (res.user && res.user.name) || '超级管理员',
        effectiveFeatures: res.effectiveFeatures,
      }
      break
    case 'school_admin': {
      const a = res.user || {}
      user = {
        id: a.id,
        role: 'school_admin',
        name: a.name,
        schoolId: a.schoolId,
        schoolName: a.schoolName,
        effectiveFeatures: res.effectiveFeatures,
      }
      break
    }
    case 'teacher': {
      const t = res.user || {}
      user = {
        id: t.id,
        role: 'teacher',
        name: t.name,
        schoolId: t.schoolId,
        schoolName: t.school,
        features: t.features || [],
        effectiveFeatures: res.effectiveFeatures,
        position: t.position || '',
        subject: t.subject || '',
        subjects: t.subjects || [],
      }
      break
    }
    case 'parent': {
      const p = res.parent || res.user || {}
      const firstKid = Array.isArray(p.kids) && p.kids.length ? p.kids[0] : null
      user = {
        id: p.imUserId || p.parentId || p.id || '',
        role: 'parent',
        name: firstKid ? `${firstKid.studentName}家长` : p.name || '家长',
        studentId: firstKid ? firstKid.studentId : p.studentId,
        studentName: firstKid ? firstKid.studentName : p.studentName,
        classId: firstKid ? firstKid.classId : p.classId,
        effectiveFeatures: res.effectiveFeatures,
      }
      break
    }
    default:
      user = res.user || { id: '', role: res.role || 'teacher', name: '' }
  }
  return { token: res.token, user }
}

export const authMachine = createAuthMachine({
  loginFn,
  persistence: makeWxPersistence(),
  debug: false,
})

/**
 * 小程序启动时调用：把 machine 实例绑定到 store 并向 reactive 状态同步。
 * 在 App.vue 的 onLaunch 中调用：
 *   import { bindAuthMachine, authMachine } from './common/auth-machine'
 *   import { auth } from './common/store'
 *   bindAuthMachine(auth)  // 注册事件桥接
 *   authMachine.restore()  // 冷启动恢复
 *
 * @param {object} authReactive - store 中的 auth reactive 对象
 */
export function bindAuthMachine(authReactive) {
  const syncAuth = () => {
    authReactive.token = authMachine.token || ''
    authReactive.user = authMachine.user
  }
  authMachine.on('login', syncAuth)
  authMachine.on('logout', syncAuth)
  authMachine.on('switchRole', syncAuth)
  authMachine.on('restore', syncAuth)
  authMachine.on('tokenExpired', syncAuth)
  // 首次同步：当前 machine 状态 → reactive
  syncAuth()
}
