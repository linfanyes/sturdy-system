<script setup lang="ts">
import { ref, computed } from 'vue'
import { RotateCcw, Circle, Swords } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

type Stone = 'black' | 'white' | null
type Board = Stone[][]

const SIZE = 15

const board = ref<Board>(createEmptyBoard())
const currentPlayer = ref<'black' | 'white'>('black')
const gameOver = ref(false)
const winner = ref<Stone>(null)
const moveHistory = ref<{ row: number; col: number; player: Stone }[]>([])

function createEmptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<Stone>(SIZE).fill(null))
}

function checkWin(row: number, col: number, player: Stone): boolean {
  if (!player) return false

  const directions = [
    [0, 1],   // 水平
    [1, 0],   // 垂直
    [1, 1],   // 右下斜
    [1, -1],  // 左下斜
  ]

  for (const [dr, dc] of directions) {
    let count = 1

    // 正方向
    for (let i = 1; i < 5; i++) {
      const r = row + dr * i
      const c = col + dc * i
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) break
      if (board.value[r][c] !== player) break
      count++
    }

    // 反方向
    for (let i = 1; i < 5; i++) {
      const r = row - dr * i
      const c = col - dc * i
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) break
      if (board.value[r][c] !== player) break
      count++
    }

    if (count >= 5) return true
  }

  return false
}

function placeStone(row: number, col: number) {
  if (board.value[row][col] !== null || gameOver.value) return

  board.value[row][col] = currentPlayer.value
  moveHistory.value.push({ row, col, player: currentPlayer.value })

  if (checkWin(row, col, currentPlayer.value)) {
    gameOver.value = true
    winner.value = currentPlayer.value
    return
  }

  // 检查平局（棋盘满）
  const isFull = board.value.every(row => row.every(cell => cell !== null))
  if (isFull) {
    gameOver.value = true
    return
  }

  currentPlayer.value = currentPlayer.value === 'black' ? 'white' : 'black'
}

function resetGame() {
  board.value = createEmptyBoard()
  currentPlayer.value = 'black'
  gameOver.value = false
  winner.value = null
  moveHistory.value = []
}

const statusText = computed(() => {
  if (winner.value === 'black') return '🎉 黑方获胜！'
  if (winner.value === 'white') return '🎉 白方获胜！'
  if (gameOver.value) return '🤝 平局'
  return currentPlayer.value === 'black' ? '黑方执棋' : '白方执棋'
})

const lastMove = computed(() => {
  if (moveHistory.value.length === 0) return null
  return moveHistory.value[moveHistory.value.length - 1]
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="⚫"
      title="五子棋"
      description="黑白对弈，五子连珠"
      gradient="from-cocoa-100 via-cream-50 to-cocoa-200"
      status-text="双人对战"
      status-color="bg-cocoa-100 text-cocoa-600"
      :back-to="'games'"
    />

    <!-- 状态提示 -->
    <div class="text-center">
      <span
        class="chip text-sm px-4 py-1.5"
        :class="{
          'bg-cocoa-200 text-cocoa-700': winner === 'black',
          'bg-cream-100 text-cocoa-600': winner === 'white',
          'bg-cocoa-100 text-cocoa-600': !winner && currentPlayer === 'black' && !gameOver,
          'bg-cream-50 text-cocoa-500': !winner && currentPlayer === 'white' && !gameOver,
          'bg-butter-100 text-butter-600': gameOver && !winner,
        }"
      >
        <span class="inline-flex items-center gap-1.5">
          <Swords v-if="!gameOver" :size="14" />
          <Circle v-else :size="14" />
          {{ statusText }}
        </span>
      </span>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="card-soft p-3 sm:p-4 bg-butter-200/50">
        <!-- 棋盘 -->
        <div class="relative select-none">
          <!-- 棋盘线条 -->
          <svg
            class="absolute inset-0 w-full h-full"
            :viewBox="`0 0 ${(SIZE - 1) * 20 + 20} ${(SIZE - 1) * 20 + 20}`"
          >
            <!-- 竖线 -->
            <line
              v-for="i in SIZE"
              :key="'v' + i"
              :x1="(i - 1) * 20 + 10"
              y1="10"
              :x2="(i - 1) * 20 + 10"
              :y2="(SIZE - 1) * 20 + 10"
              stroke="#8b7355"
              stroke-width="0.5"
            />
            <!-- 横线 -->
            <line
              v-for="i in SIZE"
              :key="'h' + i"
              x1="10"
              :y1="(i - 1) * 20 + 10"
              :x2="(SIZE - 1) * 20 + 10"
              :y2="(i - 1) * 20 + 10"
              stroke="#8b7355"
              stroke-width="0.5"
            />
            <!-- 星位点 -->
            <circle
              v-for="pos in [
                [3, 3], [3, 7], [3, 11],
                [7, 3], [7, 7], [7, 11],
                [11, 3], [11, 7], [11, 11],
              ]"
              :key="'star' + pos[0] + pos[1]"
              :cx="pos[1] * 20 + 10"
              :cy="pos[0] * 20 + 10"
              r="2"
              fill="#8b7355"
            />
          </svg>

          <!-- 棋子层 -->
          <div
            class="relative grid"
            :style="{
              gridTemplateColumns: `repeat(${SIZE}, 1fr)`,
              width: 'min(85vw, 480px)',
              height: 'min(85vw, 480px)',
            }"
          >
            <template v-for="(row, i) in board" :key="i">
              <button
                v-for="(cell, j) in row"
                :key="`${i}-${j}`"
                class="relative flex items-center justify-center hover:bg-cocoa-200/20 transition-colors cursor-pointer"
                :disabled="cell !== null || gameOver"
                @click="placeStone(i, j)"
              >
                <!-- 棋子 -->
                <div
                  v-if="cell"
                  class="w-[85%] h-[85%] rounded-full shadow-md transition-all duration-200 relative"
                  :class="[
                    cell === 'black'
                      ? 'bg-gradient-to-br from-cocoa-600 via-cocoa-800 to-cocoa-900'
                      : 'bg-gradient-to-br from-white via-cream-50 to-cream-200 border border-cream-300',
                  ]"
                >
                  <!-- 棋子高光 -->
                  <div
                    class="w-1/3 h-1/3 rounded-full opacity-40 absolute top-[15%] left-[20%]"
                    :class="cell === 'black' ? 'bg-cocoa-400' : 'bg-white'"
                  ></div>
                  <!-- 最后一手标记 -->
                  <div
                    v-if="lastMove && lastMove.row === i && lastMove.col === j"
                    class="absolute inset-0 flex items-center justify-center"
                  >
                    <div
                      class="w-2 h-2 rounded-full"
                      :class="cell === 'black' ? 'bg-red-400' : 'bg-red-500'"
                    ></div>
                  </div>
                </div>
                <!-- 悬停预览 -->
                <div
                  v-else-if="!gameOver"
                  class="w-[60%] h-[60%] rounded-full opacity-0 hover:opacity-30 transition-opacity"
                  :class="currentPlayer === 'black' ? 'bg-cocoa-800' : 'bg-cream-200 border border-cream-400'"
                ></div>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button class="btn-primary" @click="resetGame">
        <RotateCcw :size="16" />
        重新开始
      </button>
    </div>

    <!-- 提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 双人对战，黑先白后，五子连珠获胜</p>
      <p>横、竖、斜任意方向连成五子即可取胜</p>
    </div>
  </div>
</template>
