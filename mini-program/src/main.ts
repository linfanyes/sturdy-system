import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { setCurrentUserId } from './utils/storage'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)

  try {
    const raw = uni.getStorageSync('trace-user')
    if (raw) {
      const data = JSON.parse(raw)
      if (data?.user?.id) {
        setCurrentUserId(data.user.id)
      }
    }
  } catch (e) {
    console.warn('[main] bootstrapUserScope err:', e)
  }

  return {
    app,
    pinia,
  }
}
