/**
 * 小游戏全局映射（跨端共享）
 *
 * 【gameKey → 显示名】映射 —— 两端维护同一份，消除榜单展示漂移。
 * Web 端（web-app/src/api/games.ts）和 小程序端（mini-program/common/game-score.js）各一份，现收拢到 shared。
 *
 * 命名：以游戏索引键（gameKey）为 key，对应中文展示名为 value。
 * 未匹配的 gameKey 由调用方直接用原始 key（或可选回退到 `游戏${key}`）。
 */
/** gameKey → 中文名映射（权威来源） */
export declare const GAME_KEY_TO_NAME: Record<string, string>;
/** 默认节流时间（ms）：同一游戏两次上报至少间隔 5 秒 */
export declare const GAME_SCORE_SUBMIT_THROTTLE_MS = 5000;
/**
 * 根据 gameKey 获取显示名，无映射时回退到 fallback（默认原始 key）
 */
export declare function gameNameByKey(gameKey: string, fallback?: string): string;
//# sourceMappingURL=mappings.d.ts.map