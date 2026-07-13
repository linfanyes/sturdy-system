import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import Inspector from 'unplugin-vue-dev-locator/vite'
import viteCompression from 'vite-plugin-compression'
import { visualizer } from 'rollup-plugin-visualizer'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'

// https://vite.dev/config/
// 所有路径均使用相对路径 (相对当前配置文件位置), 确保项目可在任意根目录下运行
const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  base: './', // 相对路径基础, 适配任意部署根目录
  server: {
    port: 5201, // 默认开发端口, 配合 hosts 中的 teacherWorkStation:5201
    host: true, // 监听所有网卡, 允许通过本地域名访问
  },
  build: {
    sourcemap: false, // 生产环境不生成 sourcemap, 减小构建体积
    outDir: 'dist', // 相对路径, 输出到当前目录下的 dist
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-vue': ['vue', 'vue-router', 'pinia'],
        },
      },
    },
  },
  plugins: [
    vue(),
    Inspector(),
    // gzip 压缩, 部署后大幅减少传输体积
    viteCompression({
      verbose: false,
      threshold: 10240, // 10KB 以上才压缩
    }),
    // brotli 压缩, 比 gzip 压缩率更高
    viteCompression({
      verbose: false,
      algorithm: 'brotliCompress',
      threshold: 10240,
    }),
    // 包体积可视化分析, 构建后生成 dist/stats.html
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
    }),
    // PWA 支持, 离线可用 + 可安装到桌面
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Trace 教师工作台',
        short_name: 'Trace',
        description: '本地优先的教师教学管理工具',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 限制预缓存文件大小为 3MB
        globIgnores: ['**/pdf.worker.min-*.mjs', '**/pdf-*.js', '**/xlsx-*.js'], // 排除大文件预缓存
        runtimeCaching: [
          {
            urlPattern: /.*\.(?:png|jpg|jpeg|svg|gif)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30天
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 60, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/assets\/(pdf|xlsx|jszip|download)-.*\.(?:js|mjs)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'doc-lib-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  optimizeDeps: {
    // 预打包文档解析相关依赖, 避免首次上传时触发 Vite 反复优化重载
    include: ['pdfjs-dist', 'jszip', 'xlsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // @ = src, 相对当前配置文件
    },
  },
})
