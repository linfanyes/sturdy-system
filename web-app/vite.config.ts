import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './',
  server: {
    port: 5202,
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
