import { defineConfig } from 'vite'
import uniPlugin from '@dcloudio/vite-plugin-uni'
import path from 'path'

const uni = uniPlugin.default || uniPlugin

export default defineConfig({
  plugins: [uni()],
  build: {
    rollupOptions: { external: ['tim-wx-sdk', 'tim-upload-plugin'] },
    // 生产构建剥离 console.log/info/debug/table（保留 error/warn 用于线上错误监控上报）
    esbuild: {
      pure: ['console.log', 'console.info', 'console.debug', 'console.table'],
    },
  },
  resolve: {
    alias: {
      '@gardener/shared': path.resolve(__dirname, '../shared'),
    },
  },
})
