/**
 * 小游戏得分云端同步（mini-program 端）。
 * - reportScore：把单局最高分上报到后端（幂等 upsert，失败静默，节流防抖）。
 * - fetchScores / fetchBest：查询当前教师的历史成绩（得分榜）。
 * 后端接口与 Web 端共用：POST/GET /game-scores（JwtAuthGuard 按教师租户隔离）。
 *
 * 【复用改造】端点路径、gameKey→显示名映射、节流常量均从 @gardener/shared 导入，
 * 与 Web 端（web-app/src/api/games.ts）共用同一份事实来源。
 */
import { api } from './request'
import { GAME_KEY_TO_NAME, GAME_SCORE_SUBMIT_THROTTLE_MS } from '@gardener/shared/utils/game-mappings'
import { GAME_SCORES_PATHS } from '@gardener/shared/api/endpoints'

// 上报节流：同一游戏间隔内仅上报一次，避免游戏内多次调用 submitScore 高频请求
const lastReport = {}

/**
 * 上报某游戏当前最高分到后端。
 * 幂等（后端只增不减 bestScore），网络失败静默，不影响游戏体验。
 * @param {string} gameKey 游戏唯一标识
 * @param {number} score   当前分数
 */
export function reportScore(gameKey, score) {
  if (!gameKey || !(score > 0)) return Promise.resolve()
  const now = Date.now()
  if (lastReport[gameKey] && now - lastReport[gameKey] < GAME_SCORE_SUBMIT_THROTTLE_MS) return Promise.resolve()
  lastReport[gameKey] = now
  return api
    .post(GAME_SCORES_PATHS.base, {
      gameKey,
      gameName: GAME_KEY_TO_NAME[gameKey] || gameKey,
      score: Math.floor(score),
    })
    .catch(() => {}) // 静默
}

/** 查询当前教师所有游戏得分（榜单），失败返回空数组 */
export async function fetchScores() {
  try {
    const data = await api.get(GAME_SCORES_PATHS.base)
    return Array.isArray(data) ? data : []
  } catch (e) {
    return []
  }
}

/** 查询单游戏最高分，失败返回 null */
export async function fetchBest(gameKey) {
  try {
    return await api.get(GAME_SCORES_PATHS.byGameKey(gameKey))
  } catch (e) {
    return null
  }
}