import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import os from 'os'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 读取 web-app/public/config.js 中的 API_BASE_URL，决定开发期 /api 代理目标。
// - config.js 已配置 API_BASE_URL（云端地址）→ 代理到云端（直连线上后端，外网已开启）
// - config.js 未配置 / 已注释（local 模式由 set-web-env.js 切换）→ 代理到本地 localhost:3000
// 这样 start-web-local.bat（node scripts/set-web-env.js local）与 start-web-cloud.bat 各自生效，
// 不再需要在 vite.config.ts 里硬编码云端地址。
const CLOUD_TARGET = 'https://tec-work-283329-8-1440166408.sh.run.tcloudbase.com'
const LOCAL_TARGET = 'http://localhost:3000'

function resolveProxyTarget(): string {
  const configPath = path.resolve(__dirname, 'public', 'config.js')
  try {
    if (!fs.existsSync(configPath)) return LOCAL_TARGET
    const content = fs.readFileSync(configPath, 'utf8')
    // 仅当未注释的 window.__APP_CONFIG__.API_BASE_URL 命中云端地址时，代理到云端
    const activeLine = content
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('API_BASE_URL') && !l.startsWith('//'))
    if (activeLine && activeLine.includes(CLOUD_TARGET)) return CLOUD_TARGET
    return LOCAL_TARGET
  } catch {
    return LOCAL_TARGET
  }
}

const proxyTarget = resolveProxyTarget()

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
      // 开发模式代理目标由 public/config.js 自动决定：
      //   - local 模式（start-web-local.bat）→ localhost:3000 本地后端
      //   - cloud 模式（start-web-cloud.bat）→ 微信云托管后端
      // 见上方 resolveProxyTarget() 实现。
      // 注意：将更具体的 '/api/v1' 放在 '/api' 前面，避免 '/api' 前缀优先匹配导致 '/api/v1' 永远不命中
      '/api/v1': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https'),
      },
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: proxyTarget.startsWith('https'),
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
    emptyOutDir: true,
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
  // Tailwind 3 通过 PostCSS 处理（见 postcss.config.js），无需 @tailwindcss/vite 插件
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@gardener/shared': path.resolve(__dirname, '../shared'),
    },
  },
})
