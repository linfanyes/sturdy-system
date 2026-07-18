import { CLOUDRUN_ENV, CLOUDRUN_SERVICE, API_PREFIX } from './config'
import { getToken } from './store'

/**
 * 统一请求封装：走微信云托管私有链路（wx.cloud.callContainer），不依赖公网域名。
 * 自动带 token，401 跳转登录。
 */
export function request(path, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const cloud = typeof wx !== 'undefined' && wx.cloud
    if (!cloud || typeof cloud.callContainer !== 'function') {
      return reject(new Error('当前环境不支持云托管私有链路，请用微信开发者工具/真机（基础库 ≥ 2.13）'))
    }
    cloud.callContainer({
      config: { env: CLOUDRUN_ENV },
      path: API_PREFIX + path,
      method,
      data,
      header: {
        'content-type': 'application/json',
        // 服务名必须放在 header 的 X-WX-SERVICE（官方要求，不是 config.service）
        'X-WX-SERVICE': CLOUDRUN_SERVICE,
        Authorization: 'Bearer ' + (getToken() || ''),
      },
      success: (res) => {
        const status = res.statusCode || (res.data && res.data.statusCode)
        if (status === 401) {
          uni.reLaunch({ url: '/pages/login/login' })
          return reject(new Error('登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(res.data)
        else reject(res.data || new Error('请求失败'))
      },
      fail: (e) => reject(e),
    })
  })
}

export const api = {
  get: (p) => request(p),
  post: (p, d) => request(p, 'POST', d),
  // 后端个人资料/AI配置等更新接口用 @Put，必须发 PUT（不要改发 PATCH，否则 404/405）
  put: (p, d) => request(p, 'PUT', d),
  // 通用 CRUD 基类用 @Patch(':id')，保持发 PATCH
  patch: (p, d) => request(p, 'PATCH', d),
  del: (p) => request(p, 'DELETE'),
}
export default api
