/**
 * 后端 API 基础地址解析（与部署/换域名强相关，已抽离为可单测纯逻辑）。
 *
 * 解析优先级：
 *   1. 运行时配置 window.__APP_CONFIG__.API_BASE_URL（部署后改 config.js 免重建）
 *   2. 构建期环境变量 import.meta.env.VITE_API_BASE（由 .env.production 注入）
 *   3. 兜底 '/api'（本地开发代理场景）
 *
 * 本文件刻意不引用 import.meta，以保证在 Jest(CJS) 下可被安全导入测试；
 * 真实的「构建期环境变量」读取放在 request.ts（仅生产/Vite 运行时生效）。
 */

/** 解析后端 API 基础地址：runtime > buildTime > fallback */
export function resolveApiBase(
  runtime?: string | null,
  buildTime?: string | null,
  fallback = '/api',
): string {
  const rt = (runtime ?? '').trim()
  if (rt) return rt
  const bt = (buildTime ?? '').trim()
  if (bt) return bt
  return fallback
}

/** 读取运行时配置（public/config.js 注入到 window.__APP_CONFIG__），无则返回 undefined */
export function getRuntimeApiBase(): string | undefined {
  try {
    const cfg = (window as unknown as { __APP_CONFIG__?: { API_BASE_URL?: string } }).__APP_CONFIG__
    if (cfg && typeof cfg.API_BASE_URL === 'string' && cfg.API_BASE_URL.trim()) {
      return cfg.API_BASE_URL.trim()
    }
  } catch {
    /* window 不可用时忽略 */
  }
  return undefined
}
