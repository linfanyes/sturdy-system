/**
 * 小游戏得分云端同步（mini-program 端）。
 * - reportScore：把单局最高分上报到后端（幂等 upsert，失败静默，节流防抖）。
 * - fetchScores / fetchBest：查询当前教师的历史成绩（得分榜）。
 * 后端接口与 Web 端共用：POST/GET /game-scores（JwtAuthGuard 按教师租户隔离）。
 */
import { api } from './request'

// 键 → 显示名映射（用于榜单展示；未命中则直接用 gameKey）
const NAME_BY_KEY = {
  '2048': '2048', snake: '贪吃蛇', flappy: '像素鸟', whack: '打地鼠',
  tetris: '俄罗斯方块', plane: '飞机大战', motorcycle: '极速摩托',
  carCrash: '汽车躲避', tapblack: '别踩白块', breakout: '弹球打砖块',
  catchcoin: '接金币', jump: '跳一跳', memory: '记忆翻牌',
  puzzle: '数字华容道', sliding: '数字推盘', slidePuzzle: '图片拼图',
  colormatch: '颜色匹配', colorReact: '颜色反应', match3: '消消乐',
  dice: '摇骰子', '24point': '24点', sudoku: '数独', minesweeper: '扫雷',
  gomoku: '五子棋', ticTacToe: '井字棋', sequence: '数字排序',
}

// 上报节流：同一游戏 6 秒内只上报一次，避免游戏内多次调用 submitScore 高频请求
const lastReport = {}

/**
 * 上报某游戏当前最高分到后端。
 * 幂等（后端只增不减 bestScore），网络失败静默，不影响游戏体验。
 * @param {string} gameKey 游戏唯一标识
 * @param {number} score   当前分数
 * @param {string} [gameName] 显示名（可选，缺省用映射）
 */
export function reportScore(gameKey, score) {
  if (!gameKey || !(score > 0)) return Promise.resolve()
  const now = Date.now()
  if (lastReport[gameKey] && now - lastReport[gameKey] < 6000) return Promise.resolve()
  lastReport[gameKey] = now
  return api
    .post('/game-scores', {
      gameKey,
      gameName: NAME_BY_KEY[gameKey] || gameKey,
      score: Math.floor(score),
    })
    .catch(() => {}) // 静默
}

/** 查询当前教师所有游戏得分（榜单），失败返回空数组 */
export async function fetchScores() {
  try {
    const data = await api.get('/game-scores')
    return Array.isArray(data) ? data : []
  } catch (e) {
    return []
  }
}

/** 查询单游戏最高分，失败返回 null */
export async function fetchBest(gameKey) {
  try {
    return await api.get('/game-scores/' + encodeURIComponent(gameKey))
  } catch (e) {
    return null
  }
}