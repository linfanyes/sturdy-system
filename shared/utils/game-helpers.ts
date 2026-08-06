/**
 * 小游戏跨端通用工具函数 —— 从 mini-program/src/common/game.js 提升
 * 
 * 小游戏内通用算法：随机 / 乱序 / 钳制 / 时间格式化。
 * 零平台依赖，可在 Web 端 / 小程序 / 后端共用。
 * 
 * 来源对齐：mini-program/common/game.js::rand/shuffle/clamp/fmtTime
 */

/** 整数随机 [min, max] 闭区间 */
export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Fisher-Yates 洗牌，返回新数组（不修改原数组） */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = a[i] as T
    a[i] = a[j] as T
    a[j] = tmp
  }
  return a
}

/** 数值钳制到 [min, max] */
export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/**
 * 毫秒 → mm:ss 时间字符串
 * @param ms 毫秒数
 */
export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const ss = s % 60
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

/**
 * 简单节流：同一 key 在 ttlMs 内只执行一次。
 * 用于防止游戏内循环写最高分等场景的高频请求。
 */
export function createThrottle(ttlMs: number): (key: string) => boolean {
  const last: Record<string, number> = {}
  return (key: string): boolean => {
    const now = Date.now()
    if (last[key] !== undefined && now - last[key] < ttlMs) return false
    last[key] = now
    return true
  }
}
