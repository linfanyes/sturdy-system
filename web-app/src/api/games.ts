import request from './request'
import {
  type GameScoreSubmitDTO,
  type GameScoreRecord,
  GAME_SCORES_PATHS,
  GAME_KEY_TO_NAME,
  GAME_SCORE_SUBMIT_THROTTLE_MS,
} from '@gardener/shared/api/endpoints'
import { gameNameByKey } from '@gardener/shared/utils/game-mappings'

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
 * 自动上报各游戏的最高分到后端。
 *
 * Web 端所有小游戏都统一用 `localStorage.setItem('web_game_<key>_highscore', score)` 记录最高分。
 * 为避免逐个修改 30+ 个游戏组件，这里对 Storage.prototype.setItem 做一次全局轻量补丁：
 * 只要写入的键命中 `web_game_*_highscore`，就异步把该成绩上报到 /game-scores（幂等，失败静默）。
 *
 * 此函数只需在应用启动时调用一次（已由 GamesIndex 与路由守卫触发）。
 *
 * 【共享】gameKey→显示名映射：GAME_KEY_TO_NAME（来自 @gardener/shared）
 * 【共享】节流时间：GAME_SCORE_SUBMIT_THROTTLE_MS（来自 @gardener/shared）
 */
let reporterInstalled = false

export function installGameScoreReporter() {
  if (reporterInstalled) return
  reporterInstalled = true

  const originalSetItem = Storage.prototype.setItem
  const originalGetItem = Storage.prototype.getItem

  // 提交去重：防止同一分数连续重复上报刷库（游戏内循环写入会频繁触发）
  const lastReport: Record<string, number> = {}

  Storage.prototype.setItem = function (key: string, value: string) {
    originalSetItem.call(this, key, value)
    // 仅监听 Web 端游戏最高分键：web_game_<key>_highscore
    const m = /^web_game_([a-z0-9_]+)_highscore$/.exec(key)
    if (!m) return
    const gameKey = m[1]
    const score = parseInt(value || '0', 10)
    if (!score) return
    // 节流：同一游戏间隔内仅上报一次，避免游戏内循环写最高分时高频请求
    const now = Date.now()
    if (lastReport[gameKey] !== undefined && now - lastReport[gameKey] < GAME_SCORE_SUBMIT_THROTTLE_MS) return
    lastReport[gameKey] = now
    // 异步上报，失败静默（不影响游戏本体）
    import('./games').then(({ submitGameScore }) => {
      submitGameScore({
        gameKey,
        gameName: gameNameByKey(gameKey),
        score,
      }).catch(() => { /* 静默 */ })
    }).catch(() => { /* 静默 */ })
  }

  // 避免引用失效：getItem 无需补丁，仅占位保持一致（不覆盖）
  void originalGetItem
}

// 向后兼容：保留 NAME_BY_KEY 别名（老代码可能 import { NAME_BY_KEY }）
/** @deprecated 请直接从 @gardener/shared/utils/game-mappings 导入 GAME_KEY_TO_NAME */
export const NAME_BY_KEY: Record<string, string> = GAME_KEY_TO_NAME
