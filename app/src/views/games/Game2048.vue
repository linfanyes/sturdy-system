<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { RotateCcw, Trophy, Zap } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const router = useRouter()

type Board = number[][]

const SIZE = 4
const board = ref<Board>(createEmptyBoard())
const score = ref(0)
const bestScore = ref(0)
const gameOver = ref(false)
const gameWon = ref(false)
const hasWon = ref(false)

const tileColors: Record<number, { bg: string; color: string }> = {
  2: { bg: '#eee4da', color: '#776e65' },
  4: { bg: '#ede0c8', color: '#776e65' },
  8: { bg: '#f2b179', color: '#f9f6f2' },
  16: { bg: '#f59563', color: '#f9f6f2' },
  32: { bg: '#f67c5f', color: '#f9f6f2' },
  64: { bg: '#f65e3b', color: '#f9f6f2' },
  128: { bg: '#edcf72', color: '#f9f6f2' },
  256: { bg: '#edcc61', color: '#f9f6f2' },
  512: { bg: '#edc850', color: '#f9f6f2' },
  1024: { bg: '#edc53f', color: '#f9f6f2' },
  2048: { bg: '#edc22e', color: '#f9f6f2' },
}

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function getEmptyCells(b: Board): [number, number][] {
  const cells: [number, number][] = []
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (b[i][j] === 0) cells.push([i, j])
    }
  }
  return cells
}

function addRandomTile(b: Board): Board {
  const empty = getEmptyCells(b)
  if (empty.length === 0) return b
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  const newBoard = b.map(row => [...row])
  newBoard[r][c] = Math.random() < 0.9 ? 2 : 4
  return newBoard
}

function rotateBoard(b: Board): Board {
  const n = b.length
  const rotated = createEmptyBoard()
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      rotated[j][n - 1 - i] = b[i][j]
    }
  }
  return rotated
}

function slideLeft(row: number[]): { row: number[]; score: number } {
  const filtered = row.filter(v => v !== 0)
  let gained = 0
  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2
      gained += filtered[i]
      filtered.splice(i + 1, 1)
    }
  }
  while (filtered.length < SIZE) filtered.push(0)
  return { row: filtered, score: gained }
}

function moveLeft(b: Board): { board: Board; score: number; moved: boolean } {
  let totalScore = 0
  let moved = false
  const newBoard = b.map(row => {
    const { row: newRow, score: s } = slideLeft([...row])
    totalScore += s
    if (newRow.some((v, i) => v !== row[i])) moved = true
    return newRow
  })
  return { board: newBoard, score: totalScore, moved }
}

function move(direction: 'up' | 'down' | 'left' | 'right') {
  if (gameOver.value || gameWon.value) return

  let b = board.value.map(row => [...row])
  let rotations = 0

  switch (direction) {
    case 'left': rotations = 0; break
    case 'up': rotations = 3; break
    case 'right': rotations = 2; break
    case 'down': rotations = 1; break
  }

  for (let i = 0; i < rotations; i++) b = rotateBoard(b)

  const result = moveLeft(b)

  let finalBoard = result.board
  for (let i = 0; i < (4 - rotations) % 4; i++) finalBoard = rotateBoard(finalBoard)

  if (result.moved) {
    board.value = addRandomTile(finalBoard)
    score.value += result.score
    if (score.value > bestScore.value) {
      bestScore.value = score.value
      localStorage.setItem('game2048-best', String(bestScore.value))
    }
    checkWin()
    checkGameOver()
  }
}

function checkWin() {
  if (hasWon.value) return
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board.value[i][j] === 2048) {
        gameWon.value = true
        hasWon.value = true
        return
      }
    }
  }
}

function checkGameOver() {
  // 还有空格
  if (getEmptyCells(board.value).length > 0) return
  // 检查是否有可合并的相邻格子
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      const v = board.value[i][j]
      if (j < SIZE - 1 && v === board.value[i][j + 1]) return
      if (i < SIZE - 1 && v === board.value[i + 1][j]) return
    }
  }
  gameOver.value = true
}

function newGame() {
  board.value = addRandomTile(addRandomTile(createEmptyBoard()))
  score.value = 0
  gameOver.value = false
  gameWon.value = false
}

function continueGame() {
  gameWon.value = false
}

function getTileStyle(value: number) {
  if (value === 0) return {}
  const color = tileColors[value] || { bg: '#3c3a32', color: '#f9f6f2' }
  return {
    backgroundColor: color.bg,
    color: color.color,
  }
}

function getTileFontSize(value: number) {
  if (value < 100) return 'text-2xl sm:text-3xl'
  if (value < 1000) return 'text-xl sm:text-2xl'
  return 'text-lg sm:text-xl'
}

// 键盘事件
function handleKeydown(e: KeyboardEvent) {
  const keyMap: Record<string, 'up' | 'down' | 'left' | 'right'> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    s: 'down',
    a: 'left',
    d: 'right',
    W: 'up',
    S: 'down',
    A: 'left',
    D: 'right',
  }
  const dir = keyMap[e.key]
  if (dir) {
    e.preventDefault()
    move(dir)
  }
}

// 触摸滑动
let touchStartX = 0
let touchStartY = 0

function handleTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function handleTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  if (Math.max(absDx, absDy) < 30) return

  if (absDx > absDy) {
    move(dx > 0 ? 'right' : 'left')
  } else {
    move(dy > 0 ? 'down' : 'up')
  }
}

onMounted(() => {
  const saved = localStorage.getItem('game2048-best')
  if (saved) bestScore.value = parseInt(saved, 10)
  newGame()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const maxTile = computed(() => {
  let max = 0
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (board.value[i][j] > max) max = board.value[i][j]
    }
  }
  return max
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🔢"
      title="2048"
      description="滑动合并相同数字，挑战 2048！"
      gradient="from-butter-100 via-cream-50 to-butter-200"
      status-text="经典益智"
      status-color="bg-butter-100 text-butter-600"
      :back-to="'games'"
    />

    <!-- 分数面板 -->
    <div class="flex gap-3">
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Zap :size="12" />
          当前分数
        </div>
        <div class="text-2xl font-bold text-cocoa-900 font-number">{{ score }}</div>
      </div>
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" />
          最高分
        </div>
        <div class="text-2xl font-bold text-butter-600 font-number">{{ bestScore }}</div>
      </div>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div
        class="relative select-none touch-none"
        @touchstart.passive="handleTouchStart"
        @touchend.passive="handleTouchEnd"
      >
        <!-- 游戏背景网格 -->
        <div class="card-soft p-3 bg-butter-200/60">
          <div class="grid grid-cols-4 gap-2 sm:gap-3">
            <template v-for="(row, i) in board" :key="i">
              <div
                v-for="(cell, j) in row"
                :key="`${i}-${j}-${cell}`"
                class="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center font-bold transition-all duration-100"
                :class="[
                  cell === 0 ? 'bg-cream-100/60' : getTileFontSize(cell),
                ]"
                :style="cell !== 0 ? getTileStyle(cell) : {}"
              >
                <span v-if="cell !== 0">{{ cell }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- 胜利遮罩 -->
        <div
          v-if="gameWon"
          class="absolute inset-0 bg-butter-400/90 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🎉</div>
          <div class="text-2xl font-bold text-cocoa-900 mb-1">恭喜获胜！</div>
          <div class="text-sm text-cocoa-700 mb-4">你达到了 2048！</div>
          <div class="flex gap-2">
            <button class="btn-secondary" @click="continueGame">
              继续挑战
            </button>
            <button class="btn-primary" @click="newGame">
              再来一局
            </button>
          </div>
        </div>

        <!-- 失败遮罩 -->
        <div
          v-if="gameOver"
          class="absolute inset-0 bg-cocoa-900/60 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">😢</div>
          <div class="text-2xl font-bold text-white mb-1">游戏结束</div>
          <div class="text-sm text-white/80 mb-4">得分：{{ score }}</div>
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
      <p>💡 使用方向键或 WASD 控制，移动端滑动屏幕</p>
      <p>当前最大方块：<span class="font-bold text-butter-600">{{ maxTile || 0 }}</span></p>
    </div>
  </div>
</template>
