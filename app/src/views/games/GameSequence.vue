<!-- 数字排序游戏：棋盘上数字被打乱，按 1,2,3...N 顺序依次点击，点错闪红并计错误次数 -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RotateCcw, Clock, AlertCircle, Trophy } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

type Difficulty = '简单' | '中等' | '困难'
const config: Record<Difficulty, { max: number; cols: number }> = {
  简单: { max: 15, cols: 4 },
  中等: { max: 25, cols: 5 },
  困难: { max: 36, cols: 6 },
}

const difficulty = ref<Difficulty>('简单')
const numbers = ref<number[]>([])
const nextNum = ref(1)
const errors = ref(0)
const time = ref(0)
const isPlaying = ref(false)
const isWon = ref(false)
const wrongCell = ref<number | null>(null)
let timer: number | null = null
let wrongTimer: number | null = null

const currentConfig = computed(() => config[difficulty.value])

function shuffle(max: number): number[] {
  const arr = Array.from({ length: max }, (_, i) => i + 1)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function startGame(d?: Difficulty) {
  if (d) difficulty.value = d
  stopTimer()
  if (wrongTimer) {
    clearTimeout(wrongTimer)
    wrongTimer = null
  }
  numbers.value = shuffle(currentConfig.value.max)
  nextNum.value = 1
  errors.value = 0
  time.value = 0
  isPlaying.value = true
  isWon.value = false
  wrongCell.value = null
  startTimer()
}

function clickNumber(n: number) {
  if (!isPlaying.value || isWon.value) return
  if (n === nextNum.value) {
    nextNum.value++
    if (nextNum.value > currentConfig.value.max) {
      isWon.value = true
      isPlaying.value = false
      stopTimer()
    }
  } else {
    errors.value++
    wrongCell.value = n
    if (wrongTimer) clearTimeout(wrongTimer)
    wrongTimer = window.setTimeout(() => {
      wrongCell.value = null
    }, 400)
  }
}

function getNumberClass(n: number): string {
  if (wrongCell.value === n) {
    return 'bg-rose-500 text-white scale-95'
  }
  if (n < nextNum.value) {
    return 'bg-mint-300 text-cocoa-500 opacity-60'
  }
  if (n === nextNum.value) {
    return 'bg-gradient-to-br from-butter-400 to-butter-500 text-cocoa-900 shadow-pop hover:brightness-105'
  }
  return 'bg-white/80 text-cocoa-700 hover:bg-butter-100 shadow-sm'
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

onMounted(() => {
  startGame('简单')
})

onUnmounted(() => {
  stopTimer()
  if (wrongTimer) clearTimeout(wrongTimer)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🚂"
      title="数字排序"
      description="按 1,2,3...顺序依次点击打乱的数字"
      gradient="from-butter-100 via-cream-50 to-sakura-100"
      status-text="数字益智"
      status-color="bg-butter-100 text-butter-600"
      :back-to="'games'"
    />

    <!-- 难度选择 -->
    <div class="flex justify-center gap-2 flex-wrap">
      <button
        v-for="d in (['简单', '中等', '困难'] as const)"
        :key="d"
        class="btn-pill text-sm"
        :class="difficulty === d ? 'bg-gradient-to-br from-butter-400 to-butter-500 text-cocoa-900 shadow-pop' : 'bg-cocoa-900/5 text-cocoa-900 hover:bg-cocoa-900/10'"
        @click="startGame(d)"
      >
        {{ d }} (1-{{ config[d].max }})
      </button>
    </div>

    <!-- 信息面板 -->
    <div class="grid grid-cols-3 gap-3">
      <div class="card-flat p-3 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Clock :size="12" /> 用时
        </div>
        <div class="text-xl font-bold text-cocoa-900 font-number">{{ formatTime(time) }}</div>
      </div>
      <div class="card-flat p-3 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" /> 进度
        </div>
        <div class="text-xl font-bold text-cocoa-900 font-number">{{ nextNum - 1 }}/{{ currentConfig.max }}</div>
      </div>
      <div class="card-flat p-3 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <AlertCircle :size="12" /> 错误
        </div>
        <div class="text-xl font-bold text-rose-500 font-number">{{ errors }}</div>
      </div>
    </div>

    <!-- 数字网格 -->
    <div class="flex justify-center">
      <div class="relative">
        <div
          class="grid gap-2"
          :style="{
            gridTemplateColumns: `repeat(${currentConfig.cols}, minmax(0, 1fr))`,
            width: 'min(92vw, 420px)',
          }"
        >
          <button
            v-for="n in numbers"
            :key="n"
            class="aspect-square rounded-xl flex items-center justify-center font-bold text-base sm:text-2xl transition-all duration-150 select-none active:scale-95"
            :class="getNumberClass(n)"
            :disabled="n < nextNum"
            @click="clickNumber(n)"
          >
            {{ n }}
          </button>
        </div>

        <!-- 完成遮罩 -->
        <div
          v-if="isWon"
          class="absolute inset-0 bg-mint-500/85 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🎉</div>
          <div class="text-2xl font-bold text-white mb-1">完成！</div>
          <div class="text-sm text-white/90 mb-1">用时 {{ time }} 秒</div>
          <div class="text-sm text-white/90 mb-4">错误 {{ errors }} 次</div>
          <button class="btn-primary" @click="startGame()">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button class="btn-primary" @click="startGame()">
        <RotateCcw :size="16" />
        重新开始
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 从 1 开始按顺序点击数字，点错会闪红并累计错误</p>
      <p>下一个要点击的数字：<span class="font-bold text-butter-600">{{ isWon ? '已完成' : nextNum }}</span></p>
    </div>
  </div>
</template>
