/**
 * shared/games/snake.ts —— 贪吃蛇纯状态机。
 *
 * 端侧适配仅需：
 *   - clearTimeout/setTimeout 驱动 step()
 *   - vibrate/playSound / submitScore 由 callbck 注入
 *
 * 零平台依赖：不引用 uni./wx./window./document。
 */

import { inBounds } from './types'
import type { Dir } from './types'

export type SnakeDifficulty = 'slow' | 'medium' | 'fast'

export interface SnakeConfig {
  /** 棋盘宽度（正方形），默认 15 */
  size?: number
  /** 难度 → 基准毫秒 */
  speed?: number
  /** 难度预设 */
  difficulty?: SnakeDifficulty
}

/** 蛇身单元 */
export interface Cell {
  r: number
  c: number
}

/** 游戏状态快照 */
export interface SnakeState {
  snake: Cell[]
  dir: Dir
  nextDir: Dir
  food: Cell | null // null = 棋盘已满，玩家胜利
  score: number
  ate: number
  over: boolean
  size: number
}

/** 钩子（端侧注入音效/震动/提交） */
export interface SnakeHooks {
  onEat?: (score: number, ate: number) => void
  onDie?: () => void
}

const SPEED_PRESETS: Record<SnakeDifficulty, number> = {
  slow: 280,
  medium: 200,
  fast: 130,
}

const MIN_INTERVAL = 80
const RAMP_EVERY = 5
const RAMP_AMOUNT = 10

export class SnakeGame {
  size: number
  snake: Cell[]
  dir: Dir
  nextDir: Dir
  food: Cell | null
  score = 0
  ate = 0
  over = false
  private speed: number
  private hooks: SnakeHooks

  constructor(config: SnakeConfig = {}, hooks: SnakeHooks = {}) {
    const size = config.size ?? 15
    const difficulty = config.difficulty ?? 'medium'
    const speed = config.speed ?? SPEED_PRESETS[difficulty]
    this.size = size
    this.speed = speed
    this.hooks = hooks
    this.snake = initialSnake(size)
    this.dir = { r: 0, c: 1 }
    this.nextDir = { r: 0, c: 1 }
    this.food = randomFood(this.snake, size)
  }

  /** 计算当前帧间隔（难度递增） */
  currentInterval(): number {
    const reduce = Math.floor(this.ate / RAMP_EVERY) * RAMP_AMOUNT
    return Math.max(MIN_INTERVAL, this.speed - reduce)
  }

  /** 设置下一个方向（拒绝 180° 反向） */
  setDir(r: number, c: number): boolean {
    // 与当前已生效方向比较（在 step 时才生效）
    if (this.dir.r === -r && this.dir.c === -c) return false
    this.nextDir = { r, c }
    return true
  }

  /** 推动一帧；返回 { ate, moved, over } */
  step(): { ate: boolean; over: boolean } {
    if (this.over) return { ate: false, over: true }
    this.dir = this.nextDir
    const head = this.snake[0]!
    const nr = head.r + this.dir.r
    const nc = head.c + this.dir.c

    if (!inBounds(nr, nc, this.size) ||
        this.snake.some((s) => s.r === nr && s.c === nc)) {
      this.die()
      return { ate: false, over: true }
    }

    const newHead: Cell = { r: nr, c: nc }
    const ateFood = this.food && nr === this.food.r && nc === this.food.c
    this.snake = [newHead, ...this.snake]
    if (ateFood) {
      this.score++
      this.ate++
      this.food = randomFood(this.snake, this.size)
      // P1-9修复：food 为 null 表示棋盘已满，玩家胜利
      if (this.food === null) {
        this.over = true // 胜利也标记为 over，端侧据此判断胜利
        return { ate: true, over: true }
      }
      this.hooks.onEat?.(this.score, this.ate)
    } else {
      this.snake.pop()
    }
    return { ate: !!ateFood, over: false }
  }

  private die() {
    this.over = true
    this.hooks.onDie?.()
  }

  /** 重置 */
  reset() {
    this.snake = initialSnake(this.size)
    this.dir = { r: 0, c: 1 }
    this.nextDir = { r: 0, c: 1 }
    this.score = 0
    this.ate = 0
    this.over = false
    this.food = randomFood(this.snake, this.size)
  }

  /** 导出快照（端侧渲染或持久化） */
  snapshot(): SnakeState {
    return {
      snake: this.snake.map((c) => ({ ...c })),
      dir: { ...this.dir },
      nextDir: { ...this.nextDir },
      food: { ...this.food },
      score: this.score,
      ate: this.ate,
      over: this.over,
      size: this.size,
    }
  }
}

/** 初始化蛇（中部水平 3 节） */
function initialSnake(size: number): Cell[] {
  const mid = Math.floor(size / 2)
  return [
    { r: mid, c: mid },
    { r: mid, c: mid - 1 },
    { r: mid, c: mid - 2 },
  ]
}

/**
 * 在空格上随机放置食物（Math.random 两端均可）。
 * P1-9修复：棋盘满时（理论上的胜利条件）返回 null 而非 undefined，避免 TypeError。
 */
function randomFood(snake: Cell[], size: number): Cell | null {
  const occupied = new Set(snake.map((s) => `${s.r},${s.c}`))
  const empty: Cell[] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (!occupied.has(`${r},${c}`)) empty.push({ r, c })
  if (empty.length === 0) return null // 棋盘已满，游戏应判定胜利
  return empty[Math.floor(Math.random() * empty.length)]!
}
