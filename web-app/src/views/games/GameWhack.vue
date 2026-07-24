<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Hammer } from 'lucide-vue-next'

const router = useRouter()
const holes = ref<boolean[]>(Array(9).fill(false))
const score = ref(0)
const time = ref(30)
const running = ref(false)
const best = ref(parseInt(localStorage.getItem('web_game_whack_highscore') || '0'))
let moleTimer: ReturnType<typeof setInterval> | null = null
let countdown: ReturnType<typeof setInterval> | null = null

function pop() {
  holes.value = Array(9).fill(false)
  const i = Math.floor(Math.random() * 9)
  holes.value[i] = true
}

function start() {
  score.value = 0
  time.value = 30
  running.value = true
  pop()
  moleTimer = setInterval(pop, 700)
  countdown = setInterval(() => {
    time.value--
    if (time.value <= 0) stop()
  }, 1000)
}

function stop() {
  running.value = false
  if (moleTimer) clearInterval(moleTimer)
  if (countdown) clearInterval(countdown)
  holes.value = Array(9).fill(false)
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('web_game_whack_highscore', String(score.value))
  }
}

function hit(i: number) {
  if (!running.value || !holes.value[i]) return
  score.value++
  holes.value[i] = false
}

function reset() {
  stop()
  score.value = 0
  time.value = 30
}

onUnmounted(stop)
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Hammer class="w-6 h-6 text-butter-500" /> 打地鼠
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">得分：{{ score }}</span>
        <span class="text-cocoa-500">剩余：{{ time }}s</span>
        <span class="text-cocoa-500">最高：{{ best }}</span>
      </div>

      <div class="grid grid-cols-3 gap-3">
        <button
          v-for="(h, i) in holes"
          :key="i"
          class="w-20 h-20 rounded-2xl bg-cream-200 flex items-center justify-center text-4xl transition-colors"
          :class="h ? 'bg-mint-100' : ''"
          @click="hit(i)"
        >
          <span v-if="h">🐭</span>
        </button>
      </div>

      <div class="flex gap-2">
        <button v-if="!running" class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="start">
          开始
        </button>
        <button class="px-4 py-2 rounded-xl bg-cream-200 text-cocoa-700 hover:bg-cream-300 inline-flex items-center gap-1" @click="reset">
          <RefreshCw class="w-4 h-4" /> 重置
        </button>
      </div>
    </div>
  </div>
</template>
