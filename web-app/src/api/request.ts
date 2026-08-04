import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { resolveApiBase, getRuntimeApiBase } from '@/config/apiBase'
import { getViteEnvApiBase } from '@/config/viteEnv'

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
instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('trace_web_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一错误处理 + 解包 data
instance.interceptors.response.use(
  (res) => res.data,
  (err: AxiosError<any>) => {
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
        localStorage.removeItem('trace_web_token')
        localStorage.removeItem('trace_web_user')
        if (!location.hash.startsWith('#/login')) location.hash = '#/login'
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
