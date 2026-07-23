<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { RotateCcw, Clock, Zap, Play, Pause } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const SIZE = 8
const GAME_TIME = 60
const COLOR_COUNT = 6

// 颜色类型
type GemColor = 0 | 1 | 2 | 3 | 4 | 5

interface Gem {
  color: GemColor
  id: number
  matched: boolean
  falling: boolean
}

type Board = Gem[][]

let gemIdCounter = 0

// 颜色配置（奶油色系风格）
const gemColors = [
  { bg: 'from-sakura-300 to-sakura-400', glow: 'shadow-sakura-300/50', name: '樱粉' },
  { bg: 'from-butter-300 to-butter-400', glow: 'shadow-butter-300/50', name: '奶油' },
  { bg: 'from-mint-300 to-mint-400', glow: 'shadow-mint-300/50', name: '薄荷' },
  { bg: 'from-sky2-300 to-sky2-400', glow: 'shadow-sky2-300/50', name: '天蓝' },
  { bg: 'from-purple-300 to-purple-400', glow: 'shadow-purple-300/50', name: '葡萄' },
  { bg: 'from-orange-300 to-orange-400', glow: 'shadow-orange-300/50', name: '甜橙' },
]

const board = ref<Board>([])
const score = ref(0)
const timeLeft = ref(GAME_TIME)
const gameStarted = ref(false)
const gameEnded = ref(false)
const selectedGem = ref<{ row: number; col: number } | null>(null)
const isAnimating = ref(false)
const combo = ref(0)
let timer: number | null = null

function createGem(color?: GemColor): Gem {
  return {
    color: color ?? (Math.floor(Math.random() * COLOR_COUNT) as GemColor),
    id: gemIdCounter++,
    matched: false,
    falling: false,
  }
}

function createBoard(): Board {
  const newBoard: Board = []
  for (let i = 0; i < SIZE; i++) {
    const row: Gem[] = []
    for (let j = 0; j < SIZE; j++) {
      let gem = createGem()
      // 确保初始不会有三连
      while (
        (j >= 2 && row[j - 1].color === gem.color && row[j - 2].color === gem.color) ||
        (i >= 2 && newBoard[i - 1][j].color === gem.color && newBoard[i - 2][j].color === gem.color)
      ) {
        gem = createGem()
      }
      row.push(gem)
    }
    newBoard.push(row)
  }
  return newBoard
}

// 检查是否相邻
function isAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
  return (Math.abs(r1 - r2) === 1 && c1 === c2) || (Math.abs(c1 - c2) === 1 && r1 === r2)
}

// 交换两个方块
function swapGems(r1: number, c1: number, r2: number, c2: number) {
  const temp = board.value[r1][c1]
  board.value[r1][c1] = board.value[r2][c2]
  board.value[r2][c2] = temp
}

// 查找所有匹配
function findMatches(): Set<string> {
  const matches = new Set<string>()

  // 横向检查
  for (let i = 0; i < SIZE; i++) {
    for (let j = 0; j < SIZE - 2; j++) {
      const color = board.value[i][j].color
      if (board.value[i][j + 1].color === color && board.value[i][j + 2].color === color) {
        let k = j
        while (k < SIZE && board.value[i][k].color === color) {
          matches.add(`${i}-${k}`)
          k++
        }
      }
    }
  }

  // 纵向检查
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE - 2; i++) {
      const color = board.value[i][j].color
      if (board.value[i + 1][j].color === color && board.value[i + 2][j].color === color) {
        let k = i
        while (k < SIZE && board.value[k][j].color === color) {
          matches.add(`${k}-${j}`)
          k++
        }
      }
    }
  }

  return matches
}

// 标记匹配的方块
function markMatches(matches: Set<string>) {
  matches.forEach(pos => {
    const [r, c] = pos.split('-').map(Number)
    board.value[r][c].matched = true
  })
}

// 移除匹配的方块并下落填充
async function removeAndFall(): Promise<number> {
  let matchCount = 0

  // 统计并移除匹配的方块
  for (let j = 0; j < SIZE; j++) {
    const column: Gem[] = []
    for (let i = SIZE - 1; i >= 0; i--) {
      if (!board.value[i][j].matched) {
        column.push(board.value[i][j])
      } else {
        matchCount++
      }
    }
    // 从底部填充
    for (let i = SIZE - 1; i >= 0; i--) {
      const idx = SIZE - 1 - i
      if (idx < column.length) {
        board.value[i][j] = column[idx]
        board.value[i][j].falling = true
      } else {
        board.value[i][j] = createGem()
        board.value[i][j].falling = true
      }
    }
  }

  // 清除下落状态
  setTimeout(() => {
    for (let i = 0; i < SIZE; i++) {
      for (let j = 0; j < SIZE; j++) {
        board.value[i][j].falling = false
        board.value[i][j].matched = false
      }
    }
  }, 300)

  return matchCount
}

// 处理连锁消除
async function processMatches(): Promise<boolean> {
  const matches = findMatches()
  if (matches.size === 0) return false

  combo.value++
  const comboMultiplier = Math.min(combo.value, 5)
  const baseScore = matches.size * 10
  score.value += baseScore * comboMultiplier

  markMatches(matches)

  await new Promise(resolve => setTimeout(resolve, 300))

  await removeAndFall()

  await new Promise(resolve => setTimeout(resolve, 350))

  // 递归检查连锁
  return processMatches()
}

// 点击方块
async function handleGemClick(row: number, col: number) {
  if (!gameStarted.value || gameEnded.value || isAnimating.value) return

  if (!selectedGem.value) {
    selectedGem.value = { row, col }
    return
  }

  // 点击同一个方块，取消选中
  if (selectedGem.value.row === row && selectedGem.value.col === col) {
    selectedGem.value = null
    return
  }

  // 检查是否相邻
  if (!isAdjacent(selectedGem.value.row, selectedGem.value.col, row, col)) {
    selectedGem.value = { row, col }
    return
  }

  isAnimating.value = true
  combo.value = 0

  const sr = selectedGem.value.row
  const sc = selectedGem.value.col

  // 交换
  swapGems(sr, sc, row, col)

  await new Promise(resolve => setTimeout(resolve, 200))

  // 检查是否有匹配
  const matches = findMatches()
  if (matches.size === 0) {
    // 没有匹配，换回来
    swapGems(sr, sc, row, col)
    await new Promise(resolve => setTimeout(resolve, 200))
  } else {
    // 有匹配，处理消除
    await processMatches()
  }

  selectedGem.value = null
  isAnimating.value = false
}

// 开始游戏
function startGame() {
  board.value = createBoard()
  score.value = 0
  timeLeft.value = GAME_TIME
  gameStarted.value = true
  gameEnded.value = false
  selectedGem.value = null
  combo.value = 0
  isAnimating.value = false

  if (timer) clearInterval(timer)
  timer = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

// 结束游戏
function endGame() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  gameEnded.value = true
  isAnimating.value = true
}

// 重新开始
function restartGame() {
  startGame()
}

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
})

const timeColor = computed(() => {
  if (timeLeft.value <= 10) return 'text-red-500'
  if (timeLeft.value <= 20) return 'text-orange-500'
  return 'text-mint-500'
})

function isSelected(row: number, col: number): boolean {
  return selectedGem.value?.row === row && selectedGem.value?.col === col
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🧩"
      title="消消乐"
      description="消除方块，轻松解压"
      gradient="from-sakura-100 via-cream-50 to-butter-100"
      status-text="休闲益智"
      status-color="bg-sakura-100 text-sakura-600"
      :back-to="'games'"
    />

    <!-- 分数和时间 -->
    <div class="flex gap-3">
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Zap :size="12" />
          得分
        </div>
        <div class="text-2xl font-bold text-sakura-500 font-number">{{ score }}</div>
      </div>
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Clock :size="12" />
          剩余时间
        </div>
        <div class="text-2xl font-bold font-number" :class="timeColor">{{ timeLeft }}s</div>
      </div>
    </div>

    <!-- 连击提示 -->
    <div v-if="combo > 1 && gameStarted && !gameEnded" class="text-center">
      <span class="chip bg-gradient-to-r from-sakura-400 to-butter-400 text-white text-sm px-4 py-1.5 animate-pulse">
        🔥 {{ combo }} 连击！
      </span>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="relative">
        <!-- 开始遮罩 -->
        <div
          v-if="!gameStarted"
          class="absolute inset-0 z-10 bg-cream-100/90 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center"
        >
          <div class="text-5xl mb-3">🧩</div>
          <div class="text-lg font-bold text-cocoa-800 mb-1">消消乐</div>
          <div class="text-sm text-cocoa-500 mb-4 px-6 text-center max-w-[240px] mx-auto leading-relaxed">
            点击两个相邻方块交换，三个及以上同色连成一线即可消除
          </div>
          <button class="btn-primary" @click="startGame">
            <Play :size="16" />
            开始游戏
          </button>
        </div>

        <!-- 结束遮罩 -->
        <div
          v-if="gameEnded"
          class="absolute inset-0 z-10 bg-cream-100/95 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center"
        >
          <div class="text-5xl mb-3">🎉</div>
          <div class="text-lg font-bold text-cocoa-800 mb-1">时间到！</div>
          <div class="text-sm text-cocoa-500 mb-2">最终得分</div>
          <div class="text-4xl font-bold text-sakura-500 font-number mb-4">{{ score }}</div>
          <button class="btn-primary" @click="restartGame">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>

        <!-- 游戏网格 -->
        <div class="card-soft p-2 sm:p-3 bg-gradient-to-br from-cream-100 to-butter-100/50">
          <div
            class="grid gap-1 sm:gap-1.5"
            :style="{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }"
          >
            <template v-for="(row, i) in board" :key="i">
              <button
                v-for="(gem, j) in row"
                :key="gem.id"
                class="w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center transition-all duration-200 relative"
                :class="[
                  `bg-gradient-to-br ${gemColors[gem.color].bg}`,
                  isSelected(i, j) ? 'ring-3 ring-cocoa-400 ring-offset-2 ring-offset-cream-100 scale-110 z-10' : '',
                  gem.matched ? 'scale-0 opacity-0' : 'scale-100 opacity-100',
                  gem.falling ? '' : '',
                  'shadow-md hover:scale-105 active:scale-95 cursor-pointer',
                ]"
                :disabled="!gameStarted || gameEnded || isAnimating"
                @click="handleGemClick(i, j)"
              >
                <!-- 方块高光 -->
                <div class="absolute top-1 left-1.5 w-2 h-2 bg-white/40 rounded-full"></div>
                <!-- 方块阴影 -->
                <div class="absolute bottom-0.5 right-1 w-3 h-1.5 bg-black/10 rounded-full blur-sm"></div>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button
        v-if="gameStarted && !gameEnded"
        class="btn-primary"
        @click="restartGame"
      >
        <RotateCcw :size="16" />
        重新开始
      </button>
      <button
        v-else-if="!gameStarted"
        class="btn-primary"
        @click="startGame"
      >
        <Play :size="16" />
        开始游戏
      </button>
    </div>

    <!-- 提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 点击选择一个方块，再点击相邻方块进行交换</p>
      <p>三个及以上同色方块连成一线即可消除，连续消除获得连击加分</p>
    </div>
  </div>
</template>
