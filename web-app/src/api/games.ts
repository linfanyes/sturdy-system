import request from './request'
import {
  type GameScoreSubmitDTO,
  type GameScoreRecord,
  GAME_SCORES_PATHS,
} from '@gardener/shared/api/endpoints'
import { gameNameByKey, GAME_KEY_TO_NAME, GAME_SCORE_SUBMIT_THROTTLE_MS } from '@gardener/shared/games/mappings'

export type { GameScoreSubmitDTO, GameScoreRecord }

/**
 * 小游戏得分 API：统一上报与查询各游戏最高分。
 * 后端按教师租户隔离，幂等更新最高分。
 *
 * 【共享】路径常量、gameKey→显示名映射、节流时间已从 @gardener/shared 导入，
 * 与小程序端共用同一份事实来源。函数实现仍走 request（Web 适配层）。
 */

/** 上报一次对局得分 */
export function submitGameScore(dto: GameScoreSubmitDTO) {
  return request.post(GAME_SCORES_PATHS.submit, dto)
}

/** 查询当前教师所有游戏得分（榜单） */
export function fetchGameScores() {
  return request.get<GameScoreRecord[]>(GAME_SCORES_PATHS.list)
}

/** 查询单游戏最高分 */
export function fetchGameBest(gameKey: string) {
  return request.get<GameScoreRecord>(GAME_SCORES_PATHS.byKey(gameKey))
}

/**
 * 上报 Web 端游戏最高分到后端。
 *
 * P0-5修复：移除 Storage.prototype.setItem 全局猴子补丁，改为显式调用模式。
 * 游戏组件在更新最高分后应调用此函数上报，避免全局副作用。
 *
 * 【共享】gameKey→显示名映射：GAME_KEY_TO_NAME（来自 @gardener/shared）
 * 【共享】节流时间：GAME_SCORE_SUBMIT_THROTTLE_MS（来自 @gardener/shared）
 */

// 提交去重：防止同一分数连续重复上报刷库（游戏内循环写入会频繁触发）
const lastReport: Record<string, number> = {}

/** 显式上报游戏最高分（由游戏组件在更新最高分后调用） */
export function reportGameHighScore(gameKey: string, score: number): void {
  if (!score) return
  // 节流：同一游戏间隔内仅上报一次
  const now = Date.now()
  if (lastReport[gameKey] !== undefined && now - lastReport[gameKey] < GAME_SCORE_SUBMIT_THROTTLE_MS) return
  lastReport[gameKey] = now
  // 异步上报，失败静默（不影响游戏本体）
  submitGameScore({
    gameKey,
    gameName: gameNameByKey(gameKey),
    score,
  }).catch(() => { /* 静默 */ })
}

/**
 * 从 localStorage 读取并上报历史最高分（应用启动时调用一次）。
 * 用于兼容已有的 localStorage 中已存储的成绩数据。
 */
export function installGameScoreReporter() {
  const keys = Object.keys(localStorage).filter(k => /^web_game_([a-z0-9_]+)_highscore$/.test(k))
  for (const key of keys) {
    const m = /^web_game_([a-z0-9_]+)_highscore$/.exec(key)
    if (!m) continue
    const gameKey = m[1]
    const score = parseInt(localStorage.getItem(key) || '0', 10)
    if (score) reportGameHighScore(gameKey, score)
  }
}

// 向后兼容：保留 NAME_BY_KEY 别名（老代码可能 import { NAME_BY_KEY }）
/** @deprecated 请直接从 @gardener/shared/games/mappings 导入 GAME_KEY_TO_NAME */
export const NAME_BY_KEY: Record<string, string> = GAME_KEY_TO_NAME
