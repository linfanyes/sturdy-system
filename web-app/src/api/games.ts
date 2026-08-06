import request from './request'

/**
 * 小游戏得分 API：统一上报与查询各游戏最高分。
 * 后端按教师租户隔离，幂等更新最高分。
 */
export interface GameScoreDTO {
  gameKey: string
  gameName?: string
  score: number
  durationSec?: number
}

/** 上报一次对局得分 */
export function submitGameScore(dto: GameScoreDTO) {
  return request.post('/game-scores', dto)
}

/** 查询当前教师所有游戏得分（榜单） */
export function fetchGameScores() {
  return request.get('/game-scores')
}

/** 查询单游戏最高分 */
export function fetchGameBest(gameKey: string) {
  return request.get(`/game-scores/${gameKey}`)
}

/**
 * 自动上报各游戏的最高分到后端。
 *
 * Web 端所有小游戏都统一用 `localStorage.setItem('web_game_<key>_highscore', score)` 记录最高分。
 * 为避免逐个修改 30+ 个游戏组件，这里对 Storage.prototype.setItem 做一次全局轻量补丁：
 * 只要写入的键命中 `web_game_*_highscore`，就异步把该成绩上报到 /game-scores（幂等，失败静默）。
 *
 * 此函数只需在应用启动时调用一次（已由 GamesIndex 与路由守卫触发）。
 */
let reporterInstalled = false

export function installGameScoreReporter() {
  if (reporterInstalled) return
  reporterInstalled = true

  const originalSetItem = Storage.prototype.setItem
  const originalGetItem = Storage.prototype.getItem

  // 键 → 显示名映射（用于榜单展示；未命中则直接用 gameKey）
  const NAME_BY_KEY: Record<string, string> = {
    '2048': '2048', snake: '贪吃蛇', flappy: '像素鸟', whack: '打地鼠',
    tetris: '俄罗斯方块', plane: '飞机大战', motorcycle: '极速摩托',
    carcrash: '汽车躲避', tapblack: '别踩白块', breakout: '弹球打砖块',
    catchcoin: '接金币', jump: '跳一跳', memory: '记忆翻牌',
    puzzle: '数字华容道', sliding: '数字推盘', slidepuzzle: '图片拼图',
    colormatch: '颜色反应', colormatching: '颜色匹配',
    match3: '消消乐', dice: '摇骰子',
    '24point': '24点', sudoku: '数独', minesweeper: '扫雷',
    gomoku: '五子棋', tictactoe: '井字棋', sequence: '数字排序',
  }

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
    // 节流：同一游戏 5 秒内仅上报一次，避免游戏内循环写最高分时高频请求
    const now = Date.now()
    if (lastReport[gameKey] !== undefined && now - lastReport[gameKey] < 5000) return
    lastReport[gameKey] = now
    // 异步上报，失败静默（不影响游戏本体）
    import('./games').then(({ submitGameScore }) => {
      submitGameScore({
        gameKey,
        gameName: NAME_BY_KEY[gameKey] || gameKey,
        score,
      }).catch(() => { /* 静默 */ })
    }).catch(() => { /* 静默 */ })
  }

  // 避免引用失效：getItem 无需补丁，仅占位保持一致（不覆盖）
  void originalGetItem
}