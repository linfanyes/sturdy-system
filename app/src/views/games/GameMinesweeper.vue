<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { RotateCcw, Flag, Clock, Bomb } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const router = useRouter()

const ROWS = 9
const COLS = 9
const MINES = 10

interface Cell {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  adjacentMines: number
}

type Board = Cell[][]

const board = ref<Board>(createEmptyBoard())
const gameOver = ref(false)
const gameWon = ref(false)
const firstClick = ref(true)
const timeElapsed = ref(0)
const flagCount = ref(0)
let timer: number | null = null

const numberColors: Record<number, string> = {
  1: 'text-sky-500',
  2: 'text-green-500',
  3: 'text-red-500',
  4: 'text-indigo-600',
  5: 'text-amber-700',
  6: 'text-cyan-500',
  7: 'text-cocoa-900',
  8: 'text-gray-500',
}

function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      adjacentMines: 0,
    }))
  )
}

function placeMines(b: Board, safeRow: number, safeCol: number) {
  let placed = 0
  while (placed < MINES) {
    const r = Math.floor(Math.random() * ROWS)
    const c = Math.floor(Math.random() * COLS)
    // 第一次点击的位置及其周围不放雷
    if (Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1) continue
    if (!b[r][c].isMine) {
      b[r][c].isMine = true
      placed++
    }
  }
  // 计算每个格子周围的雷数
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      if (b[i][j].isMine) continue
      let count = 0
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          const ni = i + di
          const nj = j + dj
          if (ni >= 0 && ni < ROWS && nj >= 0 && nj < COLS && b[ni][nj].isMine) {
            count++
          }
        }
      }
      b[i][j].adjacentMines = count
    }
  }
}

function startTimer() {
  if (timer) return
  timer = window.setInterval(() => {
    timeElapsed.value++
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function revealCell(row: number, col: number) {
  if (gameOver.value || gameWon.value) return
  const cell = board.value[row][col]
  if (cell.isRevealed || cell.isFlagged) return

  // 第一次点击
  if (firstClick.value) {
    firstClick.value = false
    placeMines(board.value, row, col)
    startTimer()
  }

  cell.isRevealed = true

  // 踩雷
  if (cell.isMine) {
    gameOver.value = true
    stopTimer()
    revealAllMines()
    return
  }

  // 空白格子，递归展开
  if (cell.adjacentMines === 0) {
    for (let di = -1; di <= 1; di++) {
      for (let dj = -1; dj <= 1; dj++) {
        const ni = row + di
        const nj = col + dj
        if (ni >= 0 && ni < ROWS && nj >= 0 && nj < COLS) {
          revealCell(ni, nj)
        }
      }
    }
  }

  checkWin()
}

function toggleFlag(row: number, col: number, e: MouseEvent) {
  e.preventDefault()
  if (gameOver.value || gameWon.value) return
  const cell = board.value[row][col]
  if (cell.isRevealed) return

  if (cell.isFlagged) {
    cell.isFlagged = false
    flagCount.value--
  } else {
    cell.isFlagged = true
    flagCount.value++
  }
}

function revealAllMines() {
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      if (board.value[i][j].isMine) {
        board.value[i][j].isRevealed = true
      }
    }
  }
}

function checkWin() {
  let unrevealedSafe = 0
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      if (!board.value[i][j].isRevealed && !board.value[i][j].isMine) {
        unrevealedSafe++
      }
    }
  }
  if (unrevealedSafe === 0) {
    gameWon.value = true
    stopTimer()
  }
}

function newGame() {
  stopTimer()
  board.value = createEmptyBoard()
  gameOver.value = false
  gameWon.value = false
  firstClick.value = true
  timeElapsed.value = 0
  flagCount.value = 0
}

const minesRemaining = computed(() => MINES - flagCount.value)

const formattedTime = computed(() => {
  const mins = Math.floor(timeElapsed.value / 60)
  const secs = timeElapsed.value % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
})

function getCellClass(cell: Cell) {
  if (!cell.isRevealed) {
    return 'bg-cream-200 hover:bg-cream-300 cursor-pointer border-cream-300'
  }
  if (cell.isMine) {
    return 'bg-red-100 border-red-200'
  }
  return 'bg-white/80 border-cream-100'
}

onMounted(() => {
  // 阻止右键菜单
  document.addEventListener('contextmenu', preventContextMenu)
})

onUnmounted(() => {
  stopTimer()
  document.removeEventListener('contextmenu', preventContextMenu)
})

function preventContextMenu(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.minesweeper-board')) {
    e.preventDefault()
  }
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="💣"
      title="扫雷"
      description="逻辑推理，避开所有地雷！"
      gradient="from-sky2-100 via-cream-50 to-sky2-200"
      status-text="初级 9×9"
      status-color="bg-sky2-100 text-sky2-600"
      :back-to="'games'"
    />

    <!-- 信息面板 -->
    <div class="flex gap-3">
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Bomb :size="12" />
          剩余雷数
        </div>
        <div class="text-2xl font-bold text-red-500 font-number">{{ minesRemaining }}</div>
      </div>
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Clock :size="12" />
          用时
        </div>
        <div class="text-2xl font-bold text-sky2-600 font-number">{{ formattedTime }}</div>
      </div>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="relative">
        <div class="card-soft p-3 minesweeper-board">
          <div class="grid gap-1" :style="{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }">
            <template v-for="(row, i) in board" :key="i">
              <button
                v-for="(cell, j) in row"
                :key="`${i}-${j}`"
              class="w-8 h-8 sm:w-9 sm:h-9 rounded-lg border flex items-center justify-center font-bold text-sm transition-all duration-75 select-none"
              :class="getCellClass(cell)"
              @click="revealCell(i, j)"
              @contextmenu="toggleFlag(i, j, $event)"
            >
              <!-- 旗帜 -->
              <Flag
                v-if="cell.isFlagged && !cell.isRevealed"
                :size="14"
                class="text-red-500"
              />
              <!-- 雷 -->
              <span v-else-if="cell.isRevealed && cell.isMine" class="text-base">💣</span>
              <!-- 数字 -->
              <span
                v-else-if="cell.isRevealed && cell.adjacentMines > 0"
                :class="numberColors[cell.adjacentMines]"
              >
                {{ cell.adjacentMines }}
              </span>
            </button>
            </template>
          </div>
        </div>

        <!-- 胜利遮罩 -->
        <div
          v-if="gameWon"
          class="absolute inset-0 bg-mint-400/90 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🎉</div>
          <div class="text-2xl font-bold text-cocoa-900 mb-1">恭喜获胜！</div>
          <div class="text-sm text-cocoa-700 mb-4">用时：{{ formattedTime }}</div>
          <button class="btn-primary" @click="newGame">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>

        <!-- 失败遮罩 -->
        <div
          v-if="gameOver"
          class="absolute inset-0 bg-red-400/90 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">💥</div>
          <div class="text-2xl font-bold text-white mb-1">游戏结束</div>
          <div class="text-sm text-white/80 mb-4">踩到地雷了！</div>
          <button class="btn-primary" @click="newGame">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center">
      <button class="btn-primary" @click="newGame">
        <RotateCcw :size="16" />
        新游戏
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 左键翻开格子，右键标记旗帜</p>
      <p>首次点击保证安全，放心开始吧！</p>
    </div>
  </div>
</template>
