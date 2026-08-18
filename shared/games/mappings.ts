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
export const GAME_KEY_TO_NAME: Record<string, string> = {
  // —— 经典数字/反应类 ——
  '2048': '2048',
  '24point': '24点',
  sudoku: '数独',
  numberSort: '数字排序',
  whack: '打地鼠',
  catchcoin: '接硬币',
  dice: '摇骰子',

  // —— 动作类 ——
  snake: '贪吃蛇',
  flappy: '像素鸟',
  jump: '跳一跳',
  breakout: '弹球打砖块',
  motorcycle: '极速摩托',
  carcrash: '汽车躲避', // canonical key（小程序原始命名）
  // carCrash: '汽车躲避', // deprecated alias —— 已废弃，统一使用 carcrash
  plane: '飞机大战',

  // —— 益智类 ——
  memory: '记忆翻牌',
  puzzle: '数字华容道',
  sliding: '数字推盘',
  slidepuzzle: '图片拼图',
  gomoku: '五子棋',
  tictactoe: '井字棋',
  minesweeper: '扫雷',
  tapblack: '别踩白块',

  // —— 颜色反应类 ——
  colormatch: '颜色匹配', // canonical key
  // colormatching: '颜色匹配', // deprecated alias —— 已废弃，统一使用 colormatch
  colorReact: '颜色反应', // 兼容小程序（独立游戏，不同于 colormatch）
  match3: '消消乐',
  // sequence: '数字排序', // deprecated alias —— 已废弃，与 numberSort 重复

  // —— 经典复刻类 ——
  tetris: '俄罗斯方块',

  // —— 其他 ——
  geoquiz: '地理问答',
  sciencequiz: '科学问答',
  storychain: '故事接龙',
}

/** 默认节流时间（ms）：同一游戏两次上报至少间隔 5 秒 */
export const GAME_SCORE_SUBMIT_THROTTLE_MS = 5000

/**
 * 根据 gameKey 获取显示名，无映射时回退到 fallback（默认原始 key）
 */
export function gameNameByKey(gameKey: string, fallback?: string): string {
  return GAME_KEY_TO_NAME[gameKey] ?? fallback ?? gameKey
}
