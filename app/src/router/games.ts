import type { RouteRecordRaw } from 'vue-router'

export const gameRoutes: RouteRecordRaw[] = [
  {
    path: 'games',
    name: 'games',
    component: () => import('../views/games/GamesIndex.vue'),
    meta: { title: '小游戏合集', icon: '🎮', keepAlive: true },
  },
  {
    path: 'games/24point',
    name: 'game-24point',
    component: () => import('../views/games/Game24Point.vue'),
    meta: { title: '24点', icon: '🧮', keepAlive: true },
  },
  {
    path: 'games/2048',
    name: 'game-2048',
    component: () => import('../views/games/Game2048.vue'),
    meta: { title: '2048', icon: '🔢', keepAlive: true },
  },
  {
    path: 'games/minesweeper',
    name: 'game-minesweeper',
    component: () => import('../views/games/GameMinesweeper.vue'),
    meta: { title: '扫雷', icon: '💣', keepAlive: true },
  },
  {
    path: 'games/snake',
    name: 'game-snake',
    component: () => import('../views/games/GameSnake.vue'),
    meta: { title: '贪吃蛇', icon: '🐍', keepAlive: true },
  },
  {
    path: 'games/tic-tac-toe',
    name: 'game-tic-tac-toe',
    component: () => import('../views/games/GameTicTacToe.vue'),
    meta: { title: '井字棋', icon: '⭕', keepAlive: true },
  },
  {
    path: 'games/gomoku',
    name: 'game-gomoku',
    component: () => import('../views/games/GameGomoku.vue'),
    meta: { title: '五子棋', icon: '⚫', keepAlive: true },
  },
  {
    path: 'games/match3',
    name: 'game-match3',
    component: () => import('../views/games/GameMatch3.vue'),
    meta: { title: '消消乐', icon: '🧩', keepAlive: true },
  },
  {
    path: 'games/whack',
    name: 'game-whack',
    component: () => import('../views/games/GameWhack.vue'),
    meta: { title: '打地鼠', icon: '🔨', keepAlive: true },
  },
  {
    path: 'games/puzzle',
    name: 'game-puzzle',
    component: () => import('../views/games/GamePuzzle.vue'),
    meta: { title: '数字华容道', icon: '🧠', keepAlive: true },
  },
  {
    path: 'games/tetris',
    name: 'game-tetris',
    component: () => import('../views/games/GameTetris.vue'),
    meta: { title: '俄罗斯方块', icon: '🎮', keepAlive: true },
  },
  {
    path: 'games/plane',
    name: 'game-plane',
    component: () => import('../views/games/GamePlane.vue'),
    meta: { title: '飞机大战', icon: '✈️', keepAlive: true },
  },
  {
    path: 'games/motorcycle',
    name: 'game-motorcycle',
    component: () => import('../views/games/GameMotorcycle.vue'),
    meta: { title: '极速摩托', icon: '🏍️', keepAlive: true },
  },
  {
    path: 'games/car-crash',
    name: 'game-car-crash',
    component: () => import('../views/games/GameCarCrash.vue'),
    meta: { title: '汽车躲避', icon: '🚗', keepAlive: true },
  },
  {
    path: 'games/sudoku',
    name: 'game-sudoku',
    component: () => import('../views/games/GameSudoku.vue'),
    meta: { title: '数独', icon: '🔢', keepAlive: true },
  },
  {
    path: 'games/sequence',
    name: 'game-sequence',
    component: () => import('../views/games/GameSequence.vue'),
    meta: { title: '数字排序', icon: '🚂', keepAlive: true },
  },
  {
    path: 'games/memory',
    name: 'game-memory',
    component: () => import('../views/games/GameMemory.vue'),
    meta: { title: '记忆翻牌', icon: '🃏', keepAlive: true },
  },
  {
    path: 'games/slide-puzzle',
    name: 'game-slide-puzzle',
    component: () => import('../views/games/GameSlidePuzzle.vue'),
    meta: { title: '图片拼图', icon: '🧩', keepAlive: true },
  },
  {
    path: 'games/color-match',
    name: 'game-color-match',
    component: () => import('../views/games/GameColorMatch.vue'),
    meta: { title: '颜色反应', icon: '🎨', keepAlive: true },
  },
]
