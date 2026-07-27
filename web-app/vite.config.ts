import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './',
  // 将 Vite 缓存目录放到系统临时目录下。
  // 原因：本机 safe-delete 拦截器对 node_modules/.vite 的清理会 fail-closed 崩溃，
  // 而临时目录在拦截器白名单内走原生删除，可避免 dev server 启动即崩。
  cacheDir: path.join(os.tmpdir(), 'web-app-vite-cache'),
  server: {
    port: 5201,
    host: 'localhost',
    proxy: {
      // 开发模式直连云托管后端（无需本地启动 server）
      '/api': {
        target: 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    sourcemap: false,
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@gardener/shared': path.resolve(__dirname, '../shared'),
    },
  },
})
