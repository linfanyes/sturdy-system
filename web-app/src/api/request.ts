import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { resolveApiBase, getRuntimeApiBase } from '@/config/apiBase'
import { getViteEnvApiBase } from '@/config/viteEnv'
import { isSessionInvalid } from '@gardener/shared/utils/security'

/**
 * 全局 HTTP 封装：对接小程序后端（NestJS）。
 * - baseURL 解析：运行时 window.__APP_CONFIG__.API_BASE_URL > 构建期 VITE_API_BASE > '/api'
 * - JWT 注入：Authorization: Bearer <token>（与小程序 callContainer 透传方式一致）
 * - 401 自动清除登录态并跳转登录页
 * - 响应拦截器返回 res.data（已解包），类型声明同步解包
 */

/** 解析后端 API 基础地址（支持运行时覆盖，便于更换云托管域名免重建） */
export function getApiBase(): string {
  return resolveApiBase(getRuntimeApiBase(), getViteEnvApiBase(), '/api')
}

const instance: AxiosInstance = axios.create({
  baseURL: getApiBase(),
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截：注入 JWT
// 注意：axios v1 的 config.headers 是 AxiosHeaders 实例，直接 `config.headers.Authorization = x`
// 在部分版本/调用链下会被 normalize 丢弃，导致浏览器实际不发 Authorization 头。
// 统一用 .set() 写入（若不存在则回退到直接赋值），保证跨域/云托管场景 token 一定被带上。
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
  return config
})

// 响应拦截：统一错误处理 + 解包 data
instance.interceptors.response.use(
  (res) => res.data,
  async (err: AxiosError<any>) => {
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message || '请求失败'
    if (status === 401) {
      // token 失效：仅「非登录类接口」才清除登录态并跳转登录。
      // 登录类接口（密码/统一登录等）的 401 是"账号密码错误"业务提示，
      // 应交给登录页 errMsg 展示，避免误删用户正在输入的表单并强制跳登录。
      const url = (err.config?.url as string) || ''
      const isLoginApi = [
        '/admin/login',
        '/school-admin/login',
        '/auth/password-login',
        '/auth/unified-login',
        '/parent-auth/login',
      ].some((p) => url.includes(p))
      if (!isLoginApi) {
        // 关键：只有「真正的会话失效」才清除登录态。
        // 后端部分接口把「权限不足/角色不符」也以 401 返回（如校管访问教师专属 /grades），
        // 这类 401 不该清 token 踢登录——否则一个无权限接口就会拖垮整个登录态。
        const msgText = typeof err.response?.data?.message === 'string' ? err.response.data.message : ''
        if (isSessionInvalid(msgText)) {
          await handleUnauthorized()
        }
      }
    }
    // 抛出业务错误（组件层 try/catch 捕获）
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)))
  },
)

/** 类型声明：拦截器已解包 res.data，故方法直接返回数据体而非 AxiosResponse。
 *  保留双类型参数以兼容 axios 的 get<T, R> 调用习惯，R 为实际返回类型。 */
interface TypedAxios {
  get<T = any, R = T>(url: string, config?: any): Promise<R>
  post<T = any, R = T>(url: string, data?: any, config?: any): Promise<R>
  put<T = any, R = T>(url: string, data?: any, config?: any): Promise<R>
  patch<T = any, R = T>(url: string, data?: any, config?: any): Promise<R>
  delete<T = any, R = T>(url: string, config?: any): Promise<R>
}

const request = instance as unknown as TypedAxios

export default request

/**
 * 统一处理「会话失效」：清除登录态 + 同步清空 Pinia store + 跳转登录页。
 *
 * 供两类场景共用：
 *  1. axios 响应拦截器（已确认 isSessionInvalid，调用前即判定为真失效）；
 *  2. 绕过拦截器的原生 fetch 流式接口（ai/chat 等非登录接口）在收到 401 时直接调用。
 *
 * 要点：同步清空 Pinia store 是为了避免路由守卫 isLoggedIn 仍为 true，
 * 导致踢登录被重定向循环拦截。
 */
export async function handleUnauthorized(): Promise<void> {
  localStorage.removeItem('trace_web_token')
  localStorage.removeItem('trace_web_user')
  try {
    const { useAuthStore } = await import('@/stores/auth')
    const auth = useAuthStore()
    if (auth.token) auth.logout()
  } catch { /* store 未就绪时忽略，localStorage 已清 */ }
  if (!location.hash.startsWith('#/login')) location.hash = '#/login'
}
