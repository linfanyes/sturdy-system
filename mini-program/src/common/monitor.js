/**
 * 小程序端轻量监控：全局错误 / Promise 异常上报。
 * 走微信云托管私有链路（wx.cloud.callContainer），与统一请求同链路但独立实现，
 * 避免错误上报依赖 request.js（其内部也会抛错，可能递归触发上报）。
 * 仅生产构建上报（DEMO_MODE_ENABLED=false）；开发/预览环境静默。
 */
import { CLOUDRUN_ENV, CLOUDRUN_SERVICE, API_PREFIX, DEMO_MODE_ENABLED } from './config'

let inited = false
let queue = []
let timer = null

const ENABLED = !DEMO_MODE_ENABLED && typeof wx !== 'undefined' && !!wx.cloud

function report(payload) {
  if (!ENABLED) return
  queue.push(payload)
  if (queue.length > 50) queue.shift()
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    const batch = queue.splice(0)
    try {
      wx.cloud.callContainer({
        config: { env: CLOUDRUN_ENV },
        path: API_PREFIX + '/monitor/log',
        method: 'POST',
        data: batch,
        header: {
          'content-type': 'application/json',
          'X-WX-SERVICE': CLOUDRUN_SERVICE,
          Authorization: 'Bearer ' + (uni.getStorageSync('g_token') || ''),
        },
        success: () => {},
        fail: () => {},
      })
    } catch (e) {
      // 静默：监控不能影响主流程
    }
  }, 3000)
}

/** 在 App.vue onLaunch 调用一次 */
export function initMonitor() {
  if (inited || !ENABLED) return
  inited = true
}

/** App.onError 回调（uni 小程序生命周期） */
export function onAppError(err) {
  report({
    type: 'error',
    page: getCurrentPages?.().slice(-1)?.[0]?.route || '',
    message: String(err || '').slice(0, 2000),
    stack: '',
  })
}

/** App.onUnhandledRejection 回调 */
export function onAppUnhandledRejection(res) {
  const reason = res && (res.reason || res.errMsg || '')
  report({
    type: 'unhandledrejection',
    page: getCurrentPages?.().slice(-1)?.[0]?.route || '',
    message: String(reason || '').slice(0, 2000),
    stack: '',
  })
}
