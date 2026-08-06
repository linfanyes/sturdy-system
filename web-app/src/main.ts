import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import { installFeedback } from '@/utils/feedback'
import { installGameScoreReporter } from '@/api/games'
import './style.css'

// 安装小游戏最高分全局自动上报（补丁 Storage.setItem，所有游戏写入成绩时同步到后端）
installGameScoreReporter()

const app = createApp(App)
app.use(createPinia())
app.use(router)
installFeedback(app)
// 全局错误兜底：未捕获异常集中记录（ErrorBoundary 负责 UI 兜底）
app.config.errorHandler = (err, _instance, info) => {
  // eslint-disable-next-line no-console
  console.error('[global errorHandler]', err, info)
}
app.mount('#app')
