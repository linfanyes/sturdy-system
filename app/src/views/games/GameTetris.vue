<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Play, Pause, RotateCcw, Trophy, Zap, ChevronDown, ChevronUp, RotateCw } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const COLS = 10
const ROWS = 20

type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
type Cell = TetrominoType | null
type Board = Cell[][]

interface Piece {
  type: TetrominoType
  shape: number[][]
  x: number
  y: number
}

// 7种经典方块形状
const SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
}

// 方块颜色
const COLORS: Record<TetrominoType, string> = {
  I: 'bg-cyan-400',
  O: 'bg-yellow-400',
  T: 'bg-purple-400',
  S: 'bg-green-400',
  Z: 'bg-red-400',
  J: 'bg-blue-400',
  L: 'bg-orange-400',
}

const TETROMINO_TYPES: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function randomPiece(): Piece {
  const type = TETROMINO_TYPES[Math.floor(Math.random() * TETROMINO_TYPES.length)]
  const shape = SHAPES[type].map(row => [...row])
  return {
    type,
    shape,
    x: Math.floor((COLS - shape[0].length) / 2),
    y: 0,
  }
}

function rotateMatrix(matrix: number[][]): number[][] {
  const n = matrix.length
  const rotated = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rotated[j][n - 1 - i] = matrix[i][j]
    }
  }
  return rotated
}

const board = ref<Board>(createEmptyBoard())
const currentPiece = ref<Piece | null>(null)
const nextPiece = ref<Piece | null>(null)
const score = ref(0)
const bestScore = ref(0)
const level = ref(1)
const linesCleared = ref(0)
const isPlaying = ref(false)
const isPaused = ref(false)
const gameOver = ref(false)

let gameLoop: number | null = null

// 下落速度（毫秒），等级越高越快
const dropSpeed = computed(() => {
  const base = 800
  const min = 100
  return Math.max(min, base - (level.value - 1) * 70)
})

function startGame() {
  if (gameOver.value) {
    resetGame()
  }
  isPlaying.value = true
  isPaused.value = false
  gameOver.value = false

  if (!currentPiece.value) {
    currentPiece.value = randomPiece()
    nextPiece.value = randomPiece()
  }

  startLoop()
}

function pauseGame() {
  isPaused.value = true
  stopLoop()
}

function resumeGame() {
  isPaused.value = false
  startLoop()
}

function togglePause() {
  if (!isPlaying.value || gameOver.value) {
    startGame()
    return
  }
  if (isPaused.value) {
    resumeGame()
  } else {
    pauseGame()
  }
}

function startLoop() {
  if (gameLoop) return
  gameLoop = window.setInterval(tick, dropSpeed.value)
}

function stopLoop() {
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
}

function resetGame() {
  stopLoop()
  board.value = createEmptyBoard()
  currentPiece.value = null
  nextPiece.value = null
  score.value = 0
  level.value = 1
  linesCleared.value = 0
  isPlaying.value = false
  isPaused.value = false
  gameOver.value = false
}

function tick() {
  if (!currentPiece.value || !isPlaying.value || isPaused.value) return
  moveDown()
}

function canMove(piece: Piece, dx: number, dy: number): boolean {
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (!piece.shape[row][col]) continue
      const newX = piece.x + col + dx
      const newY = piece.y + row + dy
      if (newX < 0 || newX >= COLS || newY >= ROWS) return false
      if (newY >= 0 && board.value[newY][newX]) return false
    }
  }
  return true
}

function canRotate(piece: Piece): boolean {
  const rotated = rotateMatrix(piece.shape)
  const testPiece: Piece = { ...piece, shape: rotated }
  return canMove(testPiece, 0, 0)
}

function moveLeft() {
  if (!currentPiece.value || !isPlaying.value || isPaused.value) return
  if (canMove(currentPiece.value, -1, 0)) {
    currentPiece.value.x--
  }
}

function moveRight() {
  if (!currentPiece.value || !isPlaying.value || isPaused.value) return
  if (canMove(currentPiece.value, 1, 0)) {
    currentPiece.value.x++
  }
}

function moveDown(): boolean {
  if (!currentPiece.value || !isPlaying.value || isPaused.value) return false
  if (canMove(currentPiece.value, 0, 1)) {
    currentPiece.value.y++
    return true
  } else {
    lockPiece()
    return false
  }
}

function hardDrop() {
  if (!currentPiece.value || !isPlaying.value || isPaused.value) return
  while (canMove(currentPiece.value, 0, 1)) {
    currentPiece.value.y++
    score.value += 1 // 硬降额外分
  }
  lockPiece()
}

function rotatePiece() {
  if (!currentPiece.value || !isPlaying.value || isPaused.value) return
  if (currentPiece.value.type === 'O') return // O型不需要旋转

  const rotated = rotateMatrix(currentPiece.value.shape)
  const testPiece: Piece = { ...currentPiece.value, shape: rotated }

  // 尝试基本旋转
  if (canMove(testPiece, 0, 0)) {
    currentPiece.value.shape = rotated
    return
  }

  // 墙踢：尝试左右偏移
  const kicks = [1, -1, 2, -2]
  for (const kick of kicks) {
    if (canMove(testPiece, kick, 0)) {
      currentPiece.value.shape = rotated
      currentPiece.value.x += kick
      return
    }
  }
}

function lockPiece() {
  if (!currentPiece.value) return

  const piece = currentPiece.value
  for (let row = 0; row < piece.shape.length; row++) {
    for (let col = 0; col < piece.shape[row].length; col++) {
      if (!piece.shape[row][col]) continue
      const boardY = piece.y + row
      const boardX = piece.x + col
      if (boardY < 0) {
        // 超出顶部，游戏结束
        endGame()
        return
      }
      board.value[boardY][boardX] = piece.type
    }
  }

  clearLines()
  spawnNextPiece()
}

function clearLines() {
  let cleared = 0
  const newBoard: Board = []

  for (let row = 0; row < ROWS; row++) {
    if (board.value[row].every(cell => cell !== null)) {
      cleared++
    } else {
      newBoard.push(board.value[row])
    }
  }

  if (cleared > 0) {
    // 在顶部添加空行
    while (newBoard.length < ROWS) {
      newBoard.unshift(Array(COLS).fill(null))
    }
    board.value = newBoard

    // 计分：1行100，2行300，3行500，4行800
    const lineScores: Record<number, number> = {
      1: 100,
      2: 300,
      3: 500,
      4: 800,
    }
    const points = (lineScores[cleared] || cleared * 100) * level.value
    score.value += points
    linesCleared.value += cleared

    // 每10行升一级
    const newLevel = Math.floor(linesCleared.value / 10) + 1
    if (newLevel > level.value) {
      level.value = newLevel
      // 重新设置下落速度
      stopLoop()
      startLoop()
    }

    // 更新最高分
    if (score.value > bestScore.value) {
      bestScore.value = score.value
      localStorage.setItem('tetris-best', String(bestScore.value))
    }
  }
}

function spawnNextPiece() {
  currentPiece.value = nextPiece.value || randomPiece()
  nextPiece.value = randomPiece()

  // 检查是否可以放置新方块
  if (!canMove(currentPiece.value, 0, 0)) {
    endGame()
  }
}

function endGame() {
  stopLoop()
  gameOver.value = true
  isPlaying.value = false

  if (score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('tetris-best', String(bestScore.value))
  }
}

// 键盘控制
function handleKeydown(e: KeyboardEvent) {
  if (!isPlaying.value && e.key !== ' ') return

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault()
      moveLeft()
      break
    case 'ArrowRight':
      e.preventDefault()
      moveRight()
      break
    case 'ArrowDown':
      e.preventDefault()
      moveDown()
      break
    case 'ArrowUp':
      e.preventDefault()
      rotatePiece()
      break
    case ' ':
      e.preventDefault()
      if (gameOver.value || !isPlaying.value) {
        startGame()
      } else if (isPaused.value) {
        resumeGame()
      } else {
        hardDrop()
      }
      break
    case 'p':
    case 'P':
      e.preventDefault()
      togglePause()
      break
  }
}

// 获取单元格颜色类
function getCellClass(cell: Cell): string {
  if (!cell) return 'bg-cream-100/50'
  return COLORS[cell]
}

// 获取显示用的完整棋盘（包含当前方块）
const displayBoard = computed(() => {
  const display = board.value.map(row => [...row])

  if (currentPiece.value) {
    const piece = currentPiece.value
    for (let row = 0; row < piece.shape.length; row++) {
      for (let col = 0; col < piece.shape[row].length; col++) {
        if (!piece.shape[row][col]) continue
        const boardY = piece.y + row
        const boardX = piece.x + col
        if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
          display[boardY][boardX] = piece.type
        }
      }
    }
  }

  return display
})

// 预览方块的显示
const nextPieceGrid = computed(() => {
  if (!nextPiece.value) return []
  const piece = nextPiece.value
  const grid: (TetrominoType | null)[][] = []
  for (let row = 0; row < piece.shape.length; row++) {
    grid[row] = []
    for (let col = 0; col < piece.shape[row].length; col++) {
      grid[row][col] = piece.shape[row][col] ? piece.type : null
    }
  }
  return grid
})

const buttonText = computed(() => {
  if (gameOver.value) return '重新开始'
  if (!isPlaying.value) return '开始游戏'
  if (isPaused.value) return '继续'
  return '暂停'
})

onMounted(() => {
  const saved = localStorage.getItem('tetris-best')
  if (saved) bestScore.value = parseInt(saved, 10)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  stopLoop()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🎮"
      title="俄罗斯方块"
      description="经典方块游戏，消除行数越多得分越高！"
      gradient="from-sakura-100 via-cream-50 to-sky2-100"
      status-text="经典益智"
      status-color="bg-sakura-100 text-sakura-600"
      :back-to="'games'"
    />

    <!-- 分数和信息面板 -->
    <div class="flex gap-3">
      <div class="card-soft flex-1 p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Zap :size="12" />
          分数
        </div>
        <div class="text-xl sm:text-2xl font-bold text-cocoa-900 font-number">{{ score }}</div>
      </div>
      <div class="card-soft flex-1 p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" />
          最高分
        </div>
        <div class="text-xl sm:text-2xl font-bold text-sakura-500 font-number">{{ bestScore }}</div>
      </div>
      <div class="card-soft flex-1 p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          等级
        </div>
        <div class="text-xl sm:text-2xl font-bold text-sky2-600 font-number">{{ level }}</div>
      </div>
    </div>

    <!-- 游戏主区域 -->
    <div class="flex justify-center gap-4">
      <!-- 游戏面板 -->
      <div class="relative">
        <div class="card-soft p-2 bg-gradient-to-b from-cream-100 to-cream-200">
          <div
            class="grid gap-px bg-cream-300/50 rounded-lg overflow-hidden"
            :style="{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              width: 'min(60vw, 240px)',
              height: 'min(120vw, 480px)',
            }"
          >
            <template v-for="(row, y) in displayBoard" :key="y">
              <div
                v-for="(cell, x) in row"
                :key="`${x}-${y}`"
                class="w-full h-full rounded-sm transition-colors"
                :class="getCellClass(cell)"
              />
            </template>
          </div>
        </div>

        <!-- 游戏结束遮罩 -->
        <div
          v-if="gameOver"
          class="absolute inset-0 bg-cocoa-900/70 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">💥</div>
          <div class="text-2xl font-bold text-white mb-1">游戏结束</div>
          <div class="text-sm text-white/80 mb-1">得分：{{ score }}</div>
          <div class="text-sm text-white/80 mb-4">消除行数：{{ linesCleared }}</div>
          <button class="btn-primary" @click="startGame">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>

        <!-- 暂停遮罩 -->
        <div
          v-if="isPaused && isPlaying"
          class="absolute inset-0 bg-cocoa-900/60 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">⏸️</div>
          <div class="text-xl font-bold text-white mb-4">游戏暂停</div>
          <button class="btn-primary" @click="resumeGame">
            <Play :size="16" />
            继续游戏
          </button>
        </div>

        <!-- 未开始遮罩 -->
        <div
          v-if="!isPlaying && !gameOver"
          class="absolute inset-0 bg-cocoa-900/50 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🎮</div>
          <div class="text-xl font-bold text-white mb-1">准备好了吗？</div>
          <div class="text-sm text-white/80 mb-4">消除行数越多得分越高</div>
          <button class="btn-primary" @click="startGame">
            <Play :size="16" />
            开始游戏
          </button>
        </div>
      </div>

      <!-- 右侧信息栏 -->
      <div class="flex flex-col gap-3 w-20 sm:w-24">
        <!-- 下一个方块预览 -->
        <div class="card-soft p-3 text-center">
          <div class="text-xs text-cocoa-500 mb-2">下一个</div>
          <div class="flex justify-center">
            <div
              v-if="nextPieceGrid.length > 0"
              class="grid gap-px"
              :style="{
                gridTemplateColumns: `repeat(${nextPieceGrid[0].length}, 1fr)`,
              }"
            >
              <template v-for="(row, y) in nextPieceGrid" :key="y">
                <div
                  v-for="(cell, x) in row"
                  :key="`next-${x}-${y}`"
                  class="w-4 h-4 sm:w-5 sm:h-5 rounded-sm"
                  :class="cell ? COLORS[cell] : 'bg-transparent'"
                />
              </template>
            </div>
          </div>
        </div>

        <!-- 消除行数 -->
        <div class="card-soft p-3 text-center">
          <div class="text-xs text-cocoa-500 mb-1">消行</div>
          <div class="text-lg font-bold text-cocoa-800 font-number">{{ linesCleared }}</div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button class="btn-sakura" @click="togglePause">
        <component :is="isPlaying && !isPaused ? Pause : Play" :size="16" />
        {{ buttonText }}
      </button>
      <button class="btn-secondary" @click="resetGame">
        <RotateCcw :size="16" />
        重新开始
      </button>
    </div>

    <!-- 移动端控制按钮 -->
    <div class="flex justify-center">
      <div class="grid grid-cols-3 gap-2 w-48">
        <div></div>
        <button class="btn-secondary !p-3" @click="rotatePiece">
          <RotateCw :size="18" />
        </button>
        <div></div>
        <button class="btn-secondary !p-3" @click="moveLeft">
          ←
        </button>
        <button class="btn-secondary !p-3" @click="hardDrop">
          ⬇
        </button>
        <button class="btn-secondary !p-3" @click="moveRight">
          →
        </button>
        <div></div>
        <button class="btn-secondary !p-3" @click="moveDown">
          <ChevronDown :size="18" />
        </button>
        <div></div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 方向键 ← → 移动，↑ 旋转，↓ 加速，空格直接落底，P 暂停</p>
      <p>消行越多倍率越高：1行100分 · 2行300分 · 3行500分 · 4行800分</p>
    </div>
  </div>
</template>
