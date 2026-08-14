import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { resolveApiBase, getRuntimeApiBase } from '@/config/apiBase'
import { getViteEnvApiBase } from '@/config/viteEnv'
import { isSessionInvalid } from '@gardener/shared/utils/security'

/**
 * 全局 HTTP 封装：对接小程序后端（NestJS）。
 * - baseURL 解析：运行时 window.__APP_CONFIG__.API_BASE_URL > 构建期 VITE_API_BASE > '/api/v1'
 * - JWT 注入：Authorization: Bearer <token>
 * - 401 自动清除登录态并跳转登录页
 * - 响应拦截器返回 res.data（已解包）
 * - 内置 AbortController 取消支持 + SWR GET 缓存
 */

/** 默认走 v1 API；旧 /api/* 会由后端 307 重定向到 /api/v1/* */
export function getApiBase(): string {
  return resolveApiBase(getRuntimeApiBase(), getViteEnvApiBase(), '/api/v1')
}

const instance: AxiosInstance = axios.create({
  baseURL: getApiBase(),
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// ========== AbortController 支持 ==========
interface PendingRequest {
  controller: AbortController
  url: string
  method: string
}
const pendingRequests = new Map<string, PendingRequest>()

/** 取消指定 URL 的进行中请求（同 URL 同时只保留最新一个） */
export function cancelRequest(url: string, method = 'GET') {
  const key = `${method}:${url}`
  const pending = pendingRequests.get(key)
  if (pending) {
    pending.controller.abort()
    pendingRequests.delete(key)
  }
}

/** 取消所有进行中请求（路由切换/登出时调用） */
export function cancelAllRequests() {
  for (const [, { controller }] of pendingRequests) controller.abort()
  pendingRequests.clear()
}

// ========== SWR GET 缓存 ==========
const swrCache = new Map<string, { data: any; expireAt: number }>()
const SWR_DEFAULT_TTL = 30_000 // 30s
const SWR_FRESH_TIME = 5_000   // 5s 内直接命中（新鲜）
const SWR_STALE_TIME = 10_000  // 10s 内返回旧值 + 后台刷新（stale-while-revalidate）

/** 带缓存的 GET 请求 */
export function cachedGet<T = any>(url: string, ttl = SWR_DEFAULT_TTL): Promise<T> {
  const cacheKey = `GET:${url}`
  const now = Date.now()
  const cached = swrCache.get(cacheKey)

  // 新鲜命中：缓存创建时间在 FRESH_TIME 内 → 直接返回，不触发请求
  if (cached && cached.expireAt > now && (cached.expireAt - now) > (ttl - SWR_FRESH_TIME)) {
    return Promise.resolve(cached.data as T)
  }

  // 过期或不存在 → 请求
  const pending = get<T>(url).then((data) => {
    swrCache.set(cacheKey, { data, expireAt: Date.now() + ttl })
    return data
  }).catch((err) => {
    swrCache.delete(cacheKey)
    throw err
  })

  // 若有旧缓存，后台刷新同时返回旧值
  if (cached && cached.expireAt > now) return Promise.resolve(cached.data as T)
  return pending
}

/** 清除指定或全部缓存 */
export function clearCache(url?: string) {
  if (url) {
    swrCache.delete(`GET:${url}`)
  } else {
    swrCache.clear()
  }
}

// ========== 请求拦截 ==========
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('trace_web_token')
  if (token) {
    const h = config.headers as unknown as {
      set?: (k: string, v: string) => void
      Authorization?: string
    }
    if (typeof h.set === 'function') {
      h.set('Authorization', `Bearer ${token}`)
    } else {
      h.Authorization = `Bearer ${token}`
    }
  }

  // 记录进行中请求（用于取消）
  const url = config.url || ''
  const method = (config.method || 'get').toUpperCase()
  const key = `${method}:${url}`
  const existing = pendingRequests.get(key)
  if (existing) existing.controller.abort()
  const controller = new AbortController()
  config.signal = controller.signal
  pendingRequests.set(key, { controller, url, method })

  return config
})

// ========== 响应拦截 ==========
instance.interceptors.response.use(
  (res) => {
    const url = res.config.url || ''
    const method = (res.config.method || 'get').toUpperCase()
    pendingRequests.delete(`${method}:${url}`)
    return res.data
  },
  async (err: AxiosError<any>) => {
    // 清理取消的请求
    const url = (err.config?.url as string) || ''
    const method = ((err.config?.method as string) || 'get').toUpperCase()
    pendingRequests.delete(`${method}:${url}`)

    if (axios.isCancel(err)) {
      return Promise.reject(new Error('REQUEST_CANCELLED'))
    }

    const status = err.response?.status
    const msg = err.response?.data?.message || err.message || '请求失败'
    if (status === 401) {
      const urlCheck = (err.config?.url as string) || ''
      const isLoginApi = [
        '/admin/login',
        '/school-admin/login',
        '/auth/password-login',
        '/auth/unified-login',
        '/parent-auth/login',
      ].some((p) => urlCheck.includes(p))
      if (!isLoginApi) {
        // 仅「真·会话失效」文案才清除登录态（正则见 shared/utils/security.ts）。
        // 注意：后端 JwtAuthGuard 对"角色不匹配"也返回 401 '权限不足'，但那是伪·会话失效，
        // 不应登出；精确文案判定可避免无权限请求把用户误踢回登录页。
        const msgText = typeof err.response?.data?.message === 'string' ? err.response.data.message : ''
        if (isSessionInvalid(msgText)) {
          await handleUnauthorized()
        }
      }
    }
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)))
  },
)

// ========== 类型声明 ==========
interface TypedAxios {
  get<T = any, R = T>(url: string, config?: any): Promise<R>
  post<T = any, R = T>(url: string, data?: any, config?: any): Promise<R>
  put<T = any, R = T>(url: string, data?: any, config?: any): Promise<R>
  patch<T = any, R = T>(url: string, data?: any, config?: any): Promise<R>
  delete<T = any, R = T>(url: string, config?: any): Promise<R>
}

const request = instance as unknown as TypedAxios

export default request
export const get = request.get.bind(request)
export const post = request.post.bind(request)
export const put = request.put.bind(request)
export const del = request.delete.bind(request)

export function cachedCrudList<T = any>(path: string, params?: Record<string, any>, ttl?: number) {
  const url = params ? `${path}?${new URLSearchParams(params).toString()}` : path
  return cachedGet<T[]>(url, ttl).then((data) => {
    if (Array.isArray(data)) return data as T[]
    if (data && Array.isArray(data.items)) return data.items as T[]
    if (data && Array.isArray(data.list)) return data.list as T[]
    return (Array.isArray(data) ? data : []) as T[]
  })
}

/**
 * 统一处理「会话失效」：清除登录态 + 同步清空 Pinia store + 跳转登录页。
 */
export async function handleUnauthorized(): Promise<void> {
  localStorage.removeItem('trace_web_token')
  localStorage.removeItem('trace_web_user')
  clearCache()
  cancelAllRequests()
  try {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    if (auth.token) auth.logout()
  } catch { /* store 未就绪时忽略，localStorage 已清 */ }
  if (!location.hash.startsWith('#/login')) location.hash = '#/login'
}
