import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

/**
 * 全局 HTTP 封装：对接小程序后端（NestJS）。
 * - baseURL 来自 VITE_API_BASE（开发=localhost:3000/api，生产=云托管公网域名/api）
 * - JWT 注入：Authorization: Bearer <token>（与小程序 callContainer 透传方式一致）
 * - 401 自动清除登录态并跳转登录页
 * - 响应拦截器返回 res.data（已解包），类型声明同步解包
 */
const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
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
      // token 失效：清除登录态，跳转登录（通过 hash 改变触发路由守卫，避免循环依赖）
      localStorage.removeItem('trace_web_token')
      localStorage.removeItem('trace_web_user')
      if (!location.hash.startsWith('#/login')) location.hash = '#/login'
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
