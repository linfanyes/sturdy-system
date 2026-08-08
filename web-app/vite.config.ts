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
    hmr: false,
    proxy: {
      // 开发模式代理到本地后端
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // 生产构建剥离 console.log/info/debug/table（保留 error/warn 用于线上错误监控上报）
  // vite 6 已将 build.esbuild 移除，改为顶层 esbuild 选项（esbuild TransformOptions.pure）
  esbuild: {
    pure: ['console.log', 'console.info', 'console.debug', 'console.table'],
  },
  build: {
    sourcemap: false,
    outDir: 'dist',
    emptyOutDir: false,
    // 关闭压缩体积统计：对 120+ chunk 逐个算 gzip 是纯耗时，无构建价值
    reportCompressedSize: false,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // 按稳定性拆分第三方库为可长期缓存的独立 chunk，瘦身后首屏入口，并提升浏览器并行下载效率。
        // 应用代码（非 node_modules、非 shared）不在此返回，保持 Rollup 基于路由的自动懒加载拆分。
        manualChunks(id) {
          // Windows 下 Vite 的模块 id 使用反斜杠，先归一化为正斜杠再做子串匹配
          const fid = id.replace(/\\/g, '/')
          // 本地共享包（file: 依赖 @gardener/shared 的源码，不在 node_modules 内）
          if (fid.includes('@gardener/shared') || fid.includes('/shared/')) {
            return 'vendor-shared'
          }
          if (fid.includes('/node_modules/')) {
            if (fid.includes('lucide-vue-next')) return 'vendor-icons'
            if (fid.includes('/axios/')) return 'vendor-axios'
            if (fid.includes('/dayjs/')) return 'vendor-dayjs'
            if (fid.includes('/clsx/') || fid.includes('/tailwind-merge/')) return 'vendor-utils'
            if (/node_modules\/(vue|vue-router|pinia|@vue)\//.test(fid)) return 'vendor-vue'
          }
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
