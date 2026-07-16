<!-- 图片拼图(15 拼图)：4x4 棋盘上 1-15 数字加一个空格，点击空格相邻数字滑入，复原顺序即完成 -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { RotateCcw, Shuffle, Clock, Footprints } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const SIZE = 4
const TOTAL = SIZE * SIZE // 16 格，1-15 + 1 个空格

const tiles = ref<number[]>([])
const moves = ref(0)
const time = ref(0)
const isPlaying = ref(false)
const isWon = ref(false)
let timer: number | null = null

// 数字渐变色背景（1-15）
const tileColors = [
  '',
  'bg-gradient-to-br from-butter-300 to-butter-400 text-cocoa-900',
  'bg-gradient-to-br from-sakura-300 to-sakura-400 text-cocoa-900',
  'bg-gradient-to-br from-mint-300 to-mint-400 text-cocoa-900',
  'bg-gradient-to-br from-sky2-300 to-sky2-400 text-cocoa-900',
  'bg-gradient-to-br from-purple-300 to-purple-400 text-white',
  'bg-gradient-to-br from-orange-300 to-orange-400 text-cocoa-900',
  'bg-gradient-to-br from-teal-300 to-teal-400 text-cocoa-900',
  'bg-gradient-to-br from-rose-300 to-rose-400 text-cocoa-900',
  'bg-gradient-to-br from-butter-400 to-butter-500 text-cocoa-900',
  'bg-gradient-to-br from-sakura-400 to-sakura-500 text-cocoa-900',
  'bg-gradient-to-br from-mint-400 to-mint-500 text-cocoa-900',
  'bg-gradient-to-br from-sky2-400 to-sky2-500 text-cocoa-900',
  'bg-gradient-to-br from-purple-400 to-purple-500 text-white',
  'bg-gradient-to-br from-orange-400 to-orange-500 text-white',
  'bg-gradient-to-br from-teal-400 to-teal-500 text-white',
]

function initTiles() {
  tiles.value = Array.from({ length: TOTAL - 1 }, (_, i) => i + 1)
  tiles.value.push(0)
}

function getNeighborIndices(index: number): number[] {
  const row = Math.floor(index / SIZE)
  const col = index % SIZE
  const ns: number[] = []
  if (row > 0) ns.push(index - SIZE)
  if (row < SIZE - 1) ns.push(index + SIZE)
  if (col > 0) ns.push(index - 1)
  if (col < SIZE - 1) ns.push(index + 1)
  return ns
}

function isAdjacentToEmpty(index: number): boolean {
  const emptyIdx = tiles.value.indexOf(0)
  return getNeighborIndices(index).includes(emptyIdx)
}

function shuffleTiles() {
  let arr = [...tiles.value]
  // 随机走 100 步合法移动，保证可解
  for (let i = 0; i < 100; i++) {
    const emptyIdx = arr.indexOf(0)
    const neighbors = getNeighborIndices(emptyIdx)
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)]
    ;[arr[emptyIdx], arr[pick]] = [arr[pick], arr[emptyIdx]]
  }
  if (checkWinState(arr)) return shuffleTiles()
  tiles.value = arr
}

function moveTile(index: number) {
  if (isWon.value) return
  if (tiles.value[index] === 0) return
  if (!isAdjacentToEmpty(index)) return
  const emptyIdx = tiles.value.indexOf(0)
  const arr = [...tiles.value]
  ;[arr[index], arr[emptyIdx]] = [arr[emptyIdx], arr[index]]
  tiles.value = arr
  moves.value++
  if (!isPlaying.value) {
    isPlaying.value = true
    startTimer()
  }
  if (checkWinState(tiles.value)) {
    isWon.value = true
    stopTimer()
  }
}

function checkWinState(arr: number[]): boolean {
  for (let i = 0; i < TOTAL - 1; i++) {
    if (arr[i] !== i + 1) return false
  }
  return arr[TOTAL - 1] === 0
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

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
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
  handleShuffle()
}

onMounted(() => {
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
      icon="🧩"
      title="图片拼图"
      description="滑动数字方块，按 1-15 顺序排列获胜！"
      gradient="from-purple-100 via-cream-50 to-sky2-100"
      status-text="益智挑战"
      status-color="bg-purple-100 text-purple-600"
      :back-to="'games'"
    />

    <!-- 信息面板 -->
    <div class="grid grid-cols-2 gap-3">
      <div class="card-flat p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Footprints :size="12" /> 步数
        </div>
        <div class="text-xl sm:text-2xl font-bold text-cocoa-900 font-number">{{ moves }}</div>
      </div>
      <div class="card-flat p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Clock :size="12" /> 用时
        </div>
        <div class="text-xl sm:text-2xl font-bold text-cocoa-900 font-number">{{ formatTime(time) }}</div>
      </div>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="relative">
        <div class="card-flat p-2 sm:p-3 bg-gradient-to-br from-purple-100/60 to-sky2-100/60">
          <div
            class="grid gap-2"
            :style="{
              gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))`,
              width: 'min(85vw, 360px)',
              height: 'min(85vw, 360px)',
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
                      isAdjacentToEmpty(index) ? 'ring-2 ring-white/70' : '',
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
          class="absolute inset-0 bg-purple-500/85 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🎉</div>
          <div class="text-2xl font-bold text-white mb-1">完成！</div>
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
      <button class="btn-primary" @click="handleRestart">
        <RotateCcw :size="16" />
        重新开始
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 点击空格相邻的数字方块进行滑动</p>
      <p>将数字按 1-15 顺序排列，空格在右下角即为完成</p>
    </div>
  </div>
</template>
