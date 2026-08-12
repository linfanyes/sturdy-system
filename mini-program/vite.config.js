import { defineConfig } from 'vite'
import uniPlugin from '@dcloudio/vite-plugin-uni'
import path from 'path'
import fs from 'fs'

const uni = uniPlugin.default || uniPlugin

export default defineConfig({
  publicDir: 'static',
  plugins: [
    uni(),
    {
      name: 'copy-static-to-dist',
      writeBundle() {
        const src = path.resolve(__dirname, 'static')
        const dest = path.resolve(__dirname, 'dist/build/mp-weixin/static')
        if (fs.existsSync(src)) {
          fs.cpSync(src, dest, { recursive: true, force: true })
          console.log('[copy-static] Copied static files to', dest)
        } else {
          console.warn('[copy-static] Source static directory not found:', src)
        }
      },
    },
  ],
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
