<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Palette } from 'lucide-vue-next'

const router = useRouter()
const colorMap = [
  { name: '红', cls: 'text-red-500', hex: '红' },
  { name: '蓝', cls: 'text-blue-500', hex: '蓝' },
  { name: '绿', cls: 'text-green-500', hex: '绿' },
  { name: '黄', cls: 'text-yellow-500', hex: '黄' },
  { name: '紫', cls: 'text-purple-500', hex: '紫' },
]
const word = ref(colorMap[0])
const color = ref(colorMap[0])
const options = ref<typeof colorMap>([])
const score = ref(0)
const time = ref(30)
const running = ref(false)
const feedback = ref('')
const best = ref(parseInt(localStorage.getItem('web_game_colormatch_highscore') || '0'))
let countdown: ReturnType<typeof setInterval> | null = null

// P2修复：Fisher-Yates 洗牌算法，保证均匀分布
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function round() {
  word.value = colorMap[Math.floor(Math.random() * colorMap.length)]
  let c = colorMap[Math.floor(Math.random() * colorMap.length)]
  while (c.name === word.value.name) c = colorMap[Math.floor(Math.random() * colorMap.length)]
  color.value = c
  const opts = new Set<typeof colorMap[0]>([c])
  while (opts.size < 4) opts.add(colorMap[Math.floor(Math.random() * colorMap.length)])
  options.value = shuffle([...opts])
  feedback.value = ''
}

function start() {
  score.value = 0
  time.value = 30
  running.value = true
  round()
  countdown = setInterval(() => {
    time.value--
    if (time.value <= 0) stop()
  }, 1000)
}

function stop() {
  running.value = false
  if (countdown) clearInterval(countdown)
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('web_game_colormatch_highscore', String(score.value))
  }
}

function pick(o: typeof colorMap[0]) {
  if (!running.value) return
  if (o.name === color.value.name) {
    score.value++
    feedback.value = '✓'
  } else {
    feedback.value = '✗'
  }
  round()
}

function reset() {
  stop()
  score.value = 0
  time.value = 30
  feedback.value = ''
}

onUnmounted(stop)
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Palette class="w-6 h-6 text-butter-500" /> 颜色反应
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">得分：{{ score }}</span>
        <span class="text-cocoa-500">剩余：{{ time }}s</span>
        <span class="text-cocoa-500">最高：{{ best }}</span>
      </div>

      <div class="text-7xl font-bold py-6" :class="color.cls">
        {{ word.name }}
        <span class="ml-2 text-2xl">{{ feedback }}</span>
      </div>
      <p class="text-xs text-cocoa-500">选择字的颜色，不是字义</p>

      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="o in options"
          :key="o.name"
          class="px-6 py-3 rounded-xl bg-cream-100 hover:bg-cream-200 text-cocoa-900 font-semibold"
          :disabled="!running"
          @click="pick(o)"
        >
          {{ o.name }}
        </button>
      </div>

      <div class="flex gap-2">
        <button v-if="!running" class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="start">开始</button>
        <button class="px-4 py-2 rounded-xl bg-cream-200 text-cocoa-700 hover:bg-cream-300 inline-flex items-center gap-1" @click="reset">
          <RefreshCw class="w-4 h-4" /> 重置
        </button>
      </div>
    </div>
  </div>
</template>
