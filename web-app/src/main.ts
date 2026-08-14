import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { useAuthStore } from '@/stores/auth'
import { installFeedback } from '@/utils/feedback'
import { installGameScoreReporter } from '@/api/games'
import { lazy } from '@/directives/lazy'
import './style.css'

// 安装小游戏最高分全局自动上报（补丁 Storage.setItem，所有游戏写入成绩时同步到后端）
installGameScoreReporter()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
// 缺陷修复：冷启动恢复持久化登录态。此前无人调用 restore()，刷新/直链进入时
// store 从空的内存态初始化，路由守卫把仍持有有效 token 的用户踢回登录页。
// restore() 内部无 await（localStorage 同步读取 + 同步 emit），调用后同步完成 state 恢复。
useAuthStore().restore()
app.use(router)
app.directive('lazy', lazy)
installFeedback(app)
// 全局错误兜底：未捕获异常集中记录（ErrorBoundary 负责 UI 兜底）
app.config.errorHandler = (err, _instance, info) => {
  // eslint-disable-next-line no-console
  console.error('[global errorHandler]', err, info)
}
app.mount('#app')
