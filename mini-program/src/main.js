import { createSSRApp } from 'vue'
import App from './App.vue'
import { CLOUDRUN_ENV } from './common/config'

// 微信云托管私有链路：在入口初始化云开发（仅微信小程序平台）
// #ifdef MP-WEIXIN
if (typeof wx !== 'undefined' && wx.cloud) {
  wx.cloud.init({
    env: CLOUDRUN_ENV,
    traceUser: true,
  })
}
// #endif

export function createApp() {
  const app = createSSRApp(App)
  return { app }
}
