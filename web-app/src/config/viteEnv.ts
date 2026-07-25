/**
 * 读取 Vite 构建期注入的环境变量（仅 Vite/ESM 运行时有效）。
 *
 * 抽离为独立模块的原因：
 *  - `import.meta` 属 ESM-only 语法，在 Jest(CJS) 测试环境下直接解析会报错；
 *  - 把这段逻辑隔离后，测试时可通过 mock `@/config/viteEnv` 优雅隔离，
 *    从而让 request.ts 在测试环境可被正常 import 并编写行为单测。
 */
export function getViteEnvApiBase(): string | undefined {
  try {
    // @ts-ignore Vite 注入的 import.meta.env
    const v = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE
    if (typeof v === 'string' && v.trim()) return v.trim()
  } catch {
    /* 非 Vite 环境（如 Jest）回退 */
  }
  return undefined
}
