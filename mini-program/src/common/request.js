import { API_BASE } from './config'
import { getToken } from './store'

/**
 * 统一请求封装：自动带 token，401 跳转登录。
 */
export function request(path, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: API_BASE + path,
      method,
      data,
      header: {
        Authorization: 'Bearer ' + (getToken() || ''),
        'Content-Type': 'application/json',
      },
      success: (res) => {
        if (res.statusCode === 401) {
          uni.reLaunch({ url: '/pages/login/login' })
          return reject(new Error('登录已过期'))
        }
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data)
        else reject(res.data || new Error('请求失败'))
      },
      fail: (e) => reject(e),
    })
  })
}

export const api = {
  get: (p) => request(p),
  post: (p, d) => request(p, 'POST', d),
  // 后端更新接口用 PATCH（@Patch），这里统一发 PATCH，避免 404/405
  put: (p, d) => request(p, 'PATCH', d),
  patch: (p, d) => request(p, 'PATCH', d),
  del: (p) => request(p, 'DELETE'),
}

export default api
