/**
 * shared/games —— 跨端游戏状态机纯函数集合。
 *
 * 原则（对齐计划第一节）：
 *   禁止 import uni.* / wx.* / document.* / window.* / process.*。
 *   状态机仅依赖 Math.random（两端运行时均可用），负责：
 *     - 题目/初始状态生成（init / reset / generate）
 *     - 纯状态迁移（step / move / fill / setDir）
 *     - 游戏结束/胜利判定
 *     - 合法走法 / 提示 / undo
 *   计时 / 渲染 / 音效 / 计分提交由端侧 adapter 负责。
 */

/** 方向向量 */
export interface Dir {
  r: number
  c: number
}

/** 4 个基础方向 */
export const DIR: Record<'up' | 'down' | 'left' | 'right', Dir> = {
  up: { r: -1, c: 0 },
  down: { r: 1, c: 0 },
  left: { r: 0, c: -1 },
  right: { r: 0, c: 1 },
}

/** 反向方向映射（用于禁止 180° 掉头） */
export const OPPOSITE: Record<string, string> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

export const dirKey = (d: Dir): string => {
  if (d.r === -1) return 'up'
  if (d.r === 1) return 'down'
  if (d.c === -1) return 'left'
  return 'right'
}

/** 棋盘工具：在 gridSize × gridSize 范围内 */
export const inBounds = (r: number, c: number, n: number) =>
  r >= 0 && r < n && c >= 0 && c < n

/** 工具：深拷贝二维数组 */
export function cloneMatrix<T>(m: T[][]): T[][] {
  return m.map((row) => row.slice())
}

/** 工具：收集矩阵中的空位坐标（值为 0 / null / undefined） */
export function collectEmpty(matrix: number[][]): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i]!
    for (let j = 0; j < row.length; j++) {
      if (!row[j]) out.push([i, j])
    }
  }
  return out
}
