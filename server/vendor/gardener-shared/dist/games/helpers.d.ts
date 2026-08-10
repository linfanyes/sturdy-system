/**
 * 小游戏跨端通用工具函数 —— 从 mini-program/src/common/game.js 提升
 *
 * 小游戏内通用算法：随机 / 乱序 / 钳制 / 时间格式化。
 * 零平台依赖，可在 Web 端 / 小程序 / 后端共用。
 *
 * 来源对齐：mini-program/common/game.js::rand/shuffle/clamp/fmtTime
 */
/**
 * 整数随机 [min, max] 闭区间（自动交换 min/max）
 */
export declare function randInt(min: number, max: number): number;
/** 整数随机 [min, max] 闭区间 */
export declare function rand(min: number, max: number): number;
/** Fisher-Yates 洗牌，返回新数组（不修改原数组） */
export declare function shuffle<T>(arr: readonly T[]): T[];
/** 数值钳制到 [min, max] */
export declare function clamp(v: number, min: number, max: number): number;
/**
 * 毫秒 → mm:ss 时间字符串
 * @param ms 毫秒数
 */
export declare function fmtTime(ms: number): string;
/**
 * 简单节流：同一 key 在 ttlMs 内只执行一次。
 * 用于防止游戏内循环写最高分等场景的高频请求。
 */
export declare function createThrottle(ttlMs: number): (key: string) => boolean;
//# sourceMappingURL=helpers.d.ts.map