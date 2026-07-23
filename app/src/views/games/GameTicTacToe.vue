<script setup lang="ts">
import { ref, computed } from 'vue'
import { RotateCcw, Trophy, Minus, User, Bot } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

type Player = 'X' | 'O' | null
type Board = Player[][]

const SIZE = 3
const HUMAN: Player = 'O'
const AI: Player = 'X'

const board = ref<Board>(createEmptyBoard())
const currentPlayer = ref<Player>(HUMAN)
const gameOver = ref(false)
const winner = ref<Player>(null)
const isDraw = ref(false)
const scores = ref({ player: 0, draw: 0, ai: 0 })

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<Player>(SIZE).fill(null))
}

function checkWin(b: Board, player: Player): boolean {
  // 检查行和列
  for (let i = 0; i < SIZE; i++) {
    if (b[i].every(cell => cell === player)) return true
    if (b.every(row => row[i] === player)) return true
  }
  // 检查对角线
  if (b.every((row, i) => row[i] === player)) return true
  if (b.every((row, i) => row[SIZE - 1 - i] === player)) return true
  return false
}

function isBoardFull(b: Board): boolean {
  return b.every(row => row.every(cell => cell !== null))
}

function getEmptyCells(b: Board): [number, number][] {
  const cells: [number, number][] = []
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE; j++) {
      if (b[i][j] === null) cells.push([i, j])
    }
  }
  return cells
}

// 简单AI：优先堵玩家，其次找自己能赢的位置，否则随机
function findWinningMove(b: Board, player: Player): [number, number] | null {
  const empty = getEmptyCells(b)
  for (const [r, c] of empty) {
    const testBoard = b.map(row => [...row])
    testBoard[r][c] = player
    if (checkWin(testBoard, player)) return [r, c]
  }
  return null
}

function aiMove() {
  if (gameOver.value) return

  // 1. 优先找AI能赢的位置
  const winningMove = findWinningMove(board.value, AI)
  if (winningMove) {
    placePiece(winningMove[0], winningMove[1], AI)
    return
  }

  // 2. 其次堵玩家能赢的位置
  const blockingMove = findWinningMove(board.value, HUMAN)
  if (blockingMove) {
    placePiece(blockingMove[0], blockingMove[1], AI)
    return
  }

  // 3. 占中心
  if (board.value[1][1] === null) {
    placePiece(1, 1, AI)
    return
  }

  // 4. 占角落
  const corners: [number, number][] = [[0, 0], [0, 2], [2, 0], [2, 2]]
  const emptyCorners = corners.filter(([r, c]) => board.value[r][c] === null)
  if (emptyCorners.length > 0) {
    const [r, c] = emptyCorners[Math.floor(Math.random() * emptyCorners.length)]
    placePiece(r, c, AI)
    return
  }

  // 5. 随机
  const empty = getEmptyCells(board.value)
  if (empty.length > 0) {
    const [r, c] = empty[Math.floor(Math.random() * empty.length)]
    placePiece(r, c, AI)
  }
}

function placePiece(row: number, col: number, player: Player) {
  if (board.value[row][col] !== null || gameOver.value) return

  board.value[row][col] = player

  if (checkWin(board.value, player)) {
    gameOver.value = true
    winner.value = player
    if (player === HUMAN) {
      scores.value.player++
    } else {
      scores.value.ai++
    }
    return
  }

  if (isBoardFull(board.value)) {
    gameOver.value = true
    isDraw.value = true
    scores.value.draw++
    return
  }

  currentPlayer.value = currentPlayer.value === HUMAN ? AI : HUMAN

  // AI回合
  if (currentPlayer.value === AI && !gameOver.value) {
    setTimeout(() => {
      aiMove()
    }, 400)
  }
}

function handleCellClick(row: number, col: number) {
  if (currentPlayer.value !== HUMAN || gameOver.value) return
  placePiece(row, col, HUMAN)
}

function resetGame() {
  board.value = createEmptyBoard()
  currentPlayer.value = HUMAN
  gameOver.value = false
  winner.value = null
  isDraw.value = false
}

function resetScores() {
  scores.value = { player: 0, draw: 0, ai: 0 }
  resetGame()
}

const statusText = computed(() => {
  if (winner.value === HUMAN) return '🎉 你赢了！'
  if (winner.value === AI) return '😢 AI获胜'
  if (isDraw.value) return '🤝 平局'
  if (currentPlayer.value === HUMAN) return '你的回合'
  return 'AI思考中...'
})

function getCellClass(cell: Player) {
  if (cell === 'O') return 'text-sakura-500'
  if (cell === 'X') return 'text-sky2-500'
  return ''
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="⭕"
      title="井字棋"
      description="三子连线，挑战AI对手"
      gradient="from-sakura-100 via-cream-50 to-sakura-200"
      status-text="对战游戏"
      status-color="bg-sakura-100 text-sakura-600"
      :back-to="'games'"
    />

    <!-- 计分板 -->
    <div class="flex gap-2 sm:gap-3">
      <div class="card-soft flex-1 p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1 text-xs text-cocoa-500 mb-1">
          <User :size="12" />
          玩家
        </div>
        <div class="text-xl sm:text-2xl font-bold text-sakura-500 font-number">{{ scores.player }}</div>
      </div>
      <div class="card-soft flex-1 p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1 text-xs text-cocoa-500 mb-1">
          <Minus :size="12" />
          平局
        </div>
        <div class="text-xl sm:text-2xl font-bold text-cocoa-500 font-number">{{ scores.draw }}</div>
      </div>
      <div class="card-soft flex-1 p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1 text-xs text-cocoa-500 mb-1">
          <Bot :size="12" />
          AI
        </div>
        <div class="text-xl sm:text-2xl font-bold text-sky2-500 font-number">{{ scores.ai }}</div>
      </div>
    </div>

    <!-- 状态提示 -->
    <div class="text-center">
      <span
        class="chip text-sm px-4 py-1.5"
        :class="{
          'bg-sakura-100 text-sakura-600': winner === HUMAN,
          'bg-sky2-100 text-sky2-600': winner === AI,
          'bg-cocoa-100 text-cocoa-600': isDraw,
          'bg-cream-100 text-cocoa-600': !winner && !isDraw,
        }"
      >
        {{ statusText }}
      </span>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="card-soft p-4 bg-sakura-100/40">
        <div class="grid grid-cols-3 gap-2 sm:gap-3">
          <template v-for="(row, i) in board" :key="i">
            <button
              v-for="(cell, j) in row"
              :key="`${i}-${j}`"
              class="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white/80 flex items-center justify-center text-4xl sm:text-5xl font-bold transition-all duration-150 hover:bg-white hover:shadow-md active:scale-95 shadow-sm"
              :class="getCellClass(cell)"
              :disabled="cell !== null || gameOver || currentPlayer !== HUMAN"
              @click="handleCellClick(i, j)"
            >
              <span v-if="cell">{{ cell === 'O' ? '⭕' : '❌' }}</span>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button class="btn-primary" @click="resetGame">
        <RotateCcw :size="16" />
        再来一局
      </button>
      <button class="btn-secondary" @click="resetScores">
        <Trophy :size="16" />
        重置比分
      </button>
    </div>

    <!-- 提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 你执 ⭕ 先手，AI 执 ❌ 后手</p>
      <p>三子连成一线即可获胜（横、竖、斜均可）</p>
    </div>
  </div>
</template>
