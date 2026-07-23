<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RotateCcw, Shuffle, Trophy, Clock, Footprints } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const SIZE = 3
const TOTAL_TILES = SIZE * SIZE // 9 格，8个数字+1个空格

const tiles = ref<number[]>([])
const moves = ref(0)
const time = ref(0)
const isPlaying = ref(false)
const isWon = ref(false)

let timer: number | null = null

// 方块柔和颜色
const tileColors = [
  '', // 0 = 空格，不用
  'bg-sky2-200 text-sky2-700',
  'bg-mint-200 text-mint-700',
  'bg-butter-200 text-butter-700',
  'bg-sakura-200 text-sakura-700',
  'bg-lavender-200 text-lavender-700',
  'bg-peach-200 text-peach-700',
  'bg-teal-200 text-teal-700',
  'bg-rose-200 text-rose-700',
]

function initTiles() {
  // 初始化为 1-8 和 0（空格）
  tiles.value = Array.from({ length: TOTAL_TILES - 1 }, (_, i) => i + 1)
  tiles.value.push(0)
}

function shuffleTiles() {
  // Fisher-Yates 洗牌，确保可解
  let arr = [...tiles.value]

  // 随机交换多次
  for (let i = 0; i < 100; i++) {
    const emptyIdx = arr.indexOf(0)
    const neighbors = getNeighborIndices(emptyIdx)
    const randomNeighbor = neighbors[Math.floor(Math.random() * neighbors.length)]
    // 交换
    ;[arr[emptyIdx], arr[randomNeighbor]] = [arr[randomNeighbor], arr[emptyIdx]]
  }

  // 确保不是已完成状态
  if (checkWinState(arr)) {
    return shuffleTiles()
  }

  tiles.value = arr
}

function getNeighborIndices(index: number): number[] {
  const row = Math.floor(index / SIZE)
  const col = index % SIZE
  const neighbors: number[] = []

  if (row > 0) neighbors.push(index - SIZE) // 上
  if (row < SIZE - 1) neighbors.push(index + SIZE) // 下
  if (col > 0) neighbors.push(index - 1) // 左
  if (col < SIZE - 1) neighbors.push(index + 1) // 右

  return neighbors
}

function isAdjacentToEmpty(index: number): boolean {
  const emptyIdx = tiles.value.indexOf(0)
  return getNeighborIndices(index).includes(emptyIdx)
}

function moveTile(index: number) {
  if (isWon.value) return
  if (tiles.value[index] === 0) return
  if (!isAdjacentToEmpty(index)) return

  const emptyIdx = tiles.value.indexOf(0)
  const newTiles = [...tiles.value]
  ;[newTiles[index], newTiles[emptyIdx]] = [newTiles[emptyIdx], newTiles[index]]
  tiles.value = newTiles

  moves.value++

  // 开始计时（第一次移动时）
  if (!isPlaying.value) {
    isPlaying.value = true
    startTimer()
  }

  // 检查胜利
  if (checkWinState(tiles.value)) {
    isWon.value = true
    stopTimer()
  }
}

function checkWinState(arr: number[]): boolean {
  for (let i = 0; i < TOTAL_TILES - 1; i++) {
    if (arr[i] !== i + 1) return false
  }
  return arr[TOTAL_TILES - 1] === 0
}

function startTimer() {
  stopTimer()
  timer = window.setInterval(() => {
    time.value++
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function handleShuffle() {
  stopTimer()
  isPlaying.value = false
  isWon.value = false
  moves.value = 0
  time.value = 0
  initTiles()
  shuffleTiles()
}

function handleRestart() {
  stopTimer()
  isPlaying.value = false
  isWon.value = false
  moves.value = 0
  time.value = 0
  initTiles()
  shuffleTiles()
}

const bestMoves = ref(0)
const bestTime = ref(0)

function saveBestScore() {
  if (bestMoves.value === 0 || moves.value < bestMoves.value) {
    bestMoves.value = moves.value
    localStorage.setItem('puzzle-best-moves', String(bestMoves.value))
  }
  if (bestTime.value === 0 || time.value < bestTime.value) {
    bestTime.value = time.value
    localStorage.setItem('puzzle-best-time', String(bestTime.value))
  }
}

// 监听胜利，保存最佳成绩
const checkAndSave = () => {
  if (isWon.value) {
    saveBestScore()
  }
}

// 使用 watch 替代
import { watch } from 'vue'
watch(isWon, (newVal) => {
  if (newVal) saveBestScore()
})

onMounted(() => {
  const savedMoves = localStorage.getItem('puzzle-best-moves')
  if (savedMoves) bestMoves.value = parseInt(savedMoves, 10)
  const savedTime = localStorage.getItem('puzzle-best-time')
  if (savedTime) bestTime.value = parseInt(savedTime, 10)

  initTiles()
  shuffleTiles()
})

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🧠"
      title="数字华容道"
      description="滑动数字方块，按 1-8 顺序排列获胜！"
      gradient="from-sky2-100 via-cream-50 to-mint-100"
      status-text="益智挑战"
      status-color="bg-sky2-100 text-sky2-600"
      :back-to="'games'"
    />

    <!-- 信息面板 -->
    <div class="grid grid-cols-3 gap-3">
      <div class="card-soft p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Footprints :size="12" />
          步数
        </div>
        <div class="text-xl sm:text-2xl font-bold text-cocoa-900 font-number">{{ moves }}</div>
      </div>
      <div class="card-soft p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Clock :size="12" />
          用时
        </div>
        <div class="text-xl sm:text-2xl font-bold text-cocoa-900 font-number">
          {{ formatTime(time) }}
        </div>
      </div>
      <div class="card-soft p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" />
          最佳步数
        </div>
        <div class="text-xl sm:text-2xl font-bold text-sky2-600 font-number">
          {{ bestMoves || '-' }}
        </div>
      </div>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="relative">
        <div class="card-soft p-3 sm:p-4 bg-gradient-to-br from-sky2-100/60 to-mint-100/60">
          <div
            class="grid gap-2"
            :style="{
              gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
              width: 'min(75vw, 320px)',
              height: 'min(75vw, 320px)',
            }"
          >
            <div
              v-for="(tile, index) in tiles"
              :key="index"
              class="flex items-center justify-center rounded-xl font-bold text-xl sm:text-2xl transition-all duration-150 select-none"
              :class="[
                tile === 0
                  ? 'bg-transparent'
                  : [
                      tileColors[tile] || 'bg-cream-200 text-cocoa-700',
                      'shadow-md cursor-pointer hover:scale-105 active:scale-95',
                      isAdjacentToEmpty(index) ? 'ring-2 ring-white/50' : '',
                    ],
              ]"
              @click="moveTile(index)"
            >
              <span v-if="tile !== 0">{{ tile }}</span>
            </div>
          </div>
        </div>

        <!-- 胜利遮罩 -->
        <div
          v-if="isWon"
          class="absolute inset-0 bg-mint-500/80 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🎉</div>
          <div class="text-2xl font-bold text-white mb-1">恭喜完成！</div>
          <div class="text-sm text-white/90 mb-1">步数：{{ moves }}</div>
          <div class="text-sm text-white/90 mb-4">用时：{{ formatTime(time) }}</div>
          <button class="btn-primary" @click="handleRestart">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button class="btn-secondary" @click="handleShuffle">
        <Shuffle :size="16" />
        打乱
      </button>
      <button class="btn-sky2" @click="handleRestart">
        <RotateCcw :size="16" />
        重新开始
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 点击空格相邻的数字方块进行滑动</p>
      <p>将数字按 1-8 的顺序排列，空格在右下角即为胜利</p>
    </div>
  </div>
</template>
