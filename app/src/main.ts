import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import router from './router'
import { setCurrentUserId } from './utils/storage'
import { initGlobalShortcuts } from './composables/useKeyboardShortcuts'
import { startAutoBackup, getAutoBackupEnabled } from './utils/backup'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')

// ============ 按登录人隔离 localStorage ============
// 1. 启动时恢复 userStore, 从 'trace-user' 中读取当前登录人
// 2. 调用 setCurrentUserId(id), 通知所有 store reload 对应用户的数据
// 3. 之后 login/logout 时, user store 内部会同步调用 setCurrentUserId
// ==================================================
;(function bootstrapUserScope() {
  try {
    const raw = localStorage.getItem('trace-user')
    if (!raw) return
    const data = JSON.parse(raw)
    if (data?.user?.id) {
      // 注意: 这里调用会触发所有已注册 store 的 reload
      // 由于 userStore 此时已被首次访问 (上面 useUserStore), 各 store 应该已注册 onUserChange
      setCurrentUserId(data.user.id)
    }
  } catch (e) {
    console.warn('[main] bootstrapUserScope err:', e)
  }
})()

// ============ 全局功能初始化 ============
// 键盘快捷键
initGlobalShortcuts()

// 自动备份（按开关决定是否启动；默认每 2 小时一次）
if (getAutoBackupEnabled()) startAutoBackup()
