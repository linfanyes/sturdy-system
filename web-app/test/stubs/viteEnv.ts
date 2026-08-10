/**
 * Jest(CJS) 环境下 @/config/viteEnv 的替身（通过 jest moduleNameMapper 全局映射）。
 * 真实模块使用 import.meta（ESM-only 语法），CJS 下无法解析；
 * 此 stub 提供等价签名，恒返回「非 dev / 无构建期变量」的安全值。
 */
export function getViteEnvApiBase(): string | undefined {
  return undefined
}

export function isViteDev(): boolean {
  return false
}
