import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

/**
 * 全局 HTTP 封装：对接小程序后端（NestJS）。
 * - baseURL 来自 VITE_API_BASE（开发=localhost:3000/api，生产=云托管公网域名/api）
 * - JWT 注入：Authorization: Bearer <token>（与小程序 callContainer 透传方式一致）
 * - 401 自动清除登录态并跳转登录页
 */
const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
})

// 请求拦截：注入 JWT
request.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('trace_web_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一错误处理
request.interceptors.response.use(
  (res) => res.data,
  (err: AxiosError<any>) => {
    const status = err.response?.status
    const msg = err.response?.data?.message || err.message || '请求失败'
    if (status === 401) {
      // token 失效：清除登录态，跳转登录
      localStorage.removeItem('trace_web_token')
      localStorage.removeItem('trace_web_user')
      if (location.hash !== '#/login') location.hash = '#/login'
    }
    // 抛出业务错误（组件层 try/catch 捕获）
    return Promise.reject(new Error(typeof msg === 'string' ? msg : JSON.stringify(msg)))
  },
)

export default request
