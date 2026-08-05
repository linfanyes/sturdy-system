<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const SIZE = 18
type P = { x: number; y: number }
const snake = ref<P[]>([{ x: 8, y: 8 }])
const dir = ref<P>({ x: 1, y: 0 })
const food = ref<P>({ x: 12, y: 8 })
const score = ref(0)
const gameOver = ref(false)
const best = ref(parseInt(localStorage.getItem('web_game_snake_highscore') || '0'))
let timer: ReturnType<typeof setInterval> | null = null

function reset() {
  if (timer) clearInterval(timer)
  snake.value = [{ x: 8, y: 8 }]
  dir.value = { x: 1, y: 0 }
  food.value = { x: 12, y: 8 }
  score.value = 0
  gameOver.value = false
  timer = setInterval(tick, 200)
}

function tick() {
  if (gameOver.value) return
  const head = snake.value[0]
  const nh = { x: head.x + dir.value.x, y: head.y + dir.value.y }
  if (nh.x < 0 || nh.x >= SIZE || nh.y < 0 || nh.y >= SIZE ||
      snake.value.some(p => p.x === nh.x && p.y === nh.y)) {
    gameOver.value = true
    if (timer) clearInterval(timer)
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('web_game_snake_highscore', String(score.value))
    }
    return
  }
  snake.value.unshift(nh)
  if (nh.x === food.value.x && nh.y === food.value.y) {
    score.value += 10
    let nf: P
    do {
      nf = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) }
    } while (snake.value.some(p => p.x === nf.x && p.y === nf.y))
    food.value = nf
  } else {
    snake.value.pop()
  }
}

function onKey(e: KeyboardEvent) {
  const m: Record<string, P> = {
    ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  }
  const nd = m[e.key]
  if (nd && (nd.x !== -dir.value.x || nd.y !== -dir.value.y)) {
    e.preventDefault()
    dir.value = nd
  }
}

onMounted(() => { reset(); window.addEventListener('keydown', onKey) })
onUnmounted(() => { window.removeEventListener('keydown', onKey); if (timer) clearInterval(timer) })

function cellType(r: number, c: number): string {
  if (snake.value[0].x === c && snake.value[0].y === r) return 'head'
  if (snake.value.some(p => p.x === c && p.y === r)) return 'body'
  if (food.value.x === c && food.value.y === r) return 'food'
  return ''
}
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      🐍 贪吃蛇
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">分数：{{ score }}</span>
        <span class="text-cocoa-500 text-sm">最高：{{ best }}</span>
        <span v-if="gameOver" class="text-sakura-500 font-semibold">游戏结束</span>
      </div>

      <div class="bg-cocoa-700 p-1 rounded-lg">
        <div class="grid gap-px" :style="{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }">
          <div
            v-for="i in SIZE * SIZE"
            :key="i"
            class="w-4 h-4 rounded-sm"
            :class="{
              'bg-butter-500': cellType(Math.floor((i-1)/SIZE), (i-1)%SIZE) === 'head',
              'bg-butter-300': cellType(Math.floor((i-1)/SIZE), (i-1)%SIZE) === 'body',
              'bg-sakura-500': cellType(Math.floor((i-1)/SIZE), (i-1)%SIZE) === 'food',
              'bg-cream-100': !cellType(Math.floor((i-1)/SIZE), (i-1)%SIZE)
            }"
          ></div>
        </div>
      </div>

      <p class="text-xs text-cocoa-500">使用方向键控制</p>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
