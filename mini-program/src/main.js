import { createSSRApp } from 'vue'
import App from './App.vue'
import { CLOUDRUN_ENV } from './common/config'

// 微信云托管私有链路：在入口初始化云开发（仅微信小程序平台）
// 注意：wx.cloud.init 只能调用【一次】。重复调用会让第二次的内置回调拿到 undefined，
// 微信框架 invoke 包装函数读取 res.errMsg 时崩溃（SystemError: Cannot read property 'errMsg' of undefined）。
// 故仅在此处初始化，App.vue 不再重复初始化（见 App.vue 注释）。
// #ifdef MP-WEIXIN
if (typeof wx !== 'undefined' && wx.cloud) {
  // 幂等保护：避免任何路径下被再次调用
  if (!wx.cloud.__inited) {
    wx.cloud.init({
      env: CLOUDRUN_ENV,
      traceUser: true,
    })
    try { wx.cloud.__inited = true } catch (e) { console.error('[mini catch]', e) }
  }
}
// #endif

export function createApp() {
  const app = createSSRApp(App)
  return { app }
}
