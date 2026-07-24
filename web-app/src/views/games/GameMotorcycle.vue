<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const canvas = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const gameOver = ref(false)
const best = ref(parseInt(localStorage.getItem('web_game_motorcycle_highscore') || '0'))
let ctx: CanvasRenderingContext2D | null = null
let timer: ReturnType<typeof setInterval> | null = null

const W = 360, H = 200
let player = { x: 60, y: H / 2 }
let obstacles: { x: number; y: number; w: number; h: number }[] = []
let keys: Record<string, boolean> = {}
let speed = 3
let tickCount = 0

function reset() {
  player = { x: 60, y: H / 2 }
  obstacles = []
  score.value = 0
  gameOver.value = false
  speed = 3
  tickCount = 0
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

function tick() {
  if (gameOver.value) return
  tickCount++
  if (keys['ArrowUp']) player.y = Math.max(15, player.y - 4)
  if (keys['ArrowDown']) player.y = Math.min(H - 15, player.y + 4)
  // 生成障碍
  if (tickCount % 40 === 0) {
    const h = 20 + Math.random() * 40
    obstacles.push({ x: W, y: Math.random() * (H - h), w: 20, h })
  }
  obstacles.forEach(o => (o.x -= speed))
  obstacles = obstacles.filter(o => o.x > -30)
  // 加速
  if (tickCount % 100 === 0) speed = Math.min(8, speed + 0.3)
  // 碰撞
  for (const o of obstacles) {
    if (player.x + 12 > o.x && player.x - 12 < o.x + o.w &&
        player.y + 10 > o.y && player.y - 10 < o.y + o.h) {
      gameOver.value = true
      if (timer) clearInterval(timer)
      if (score.value > best.value) {
        best.value = score.value
        localStorage.setItem('web_game_motorcycle_highscore', String(score.value))
      }
      return
    }
  }
  score.value++
  draw()
}

function draw() {
  if (!ctx) return
  ctx.fillStyle = '#3d2817'
  ctx.fillRect(0, 0, W, H)
  // 道路虚线
  ctx.strokeStyle = '#7a5c3d'
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(0, H / 2)
  ctx.lineTo(W, H / 2)
  ctx.stroke()
  ctx.setLineDash([])
  // 玩家摩托
  ctx.fillStyle = '#d4a574'
  ctx.fillRect(player.x - 12, player.y - 8, 24, 16)
  // 障碍
  ctx.fillStyle = '#f4a5a5'
  const c = ctx
  obstacles.forEach(o => c.fillRect(o.x, o.y, o.w, o.h))
}

function onKey(e: KeyboardEvent, down: boolean) {
  if (['ArrowUp', 'ArrowDown'].includes(e.key)) {
    e.preventDefault()
    keys[e.key] = down
  }
}
const kd = (e: KeyboardEvent) => onKey(e, true)
const ku = (e: KeyboardEvent) => onKey(e, false)

onMounted(() => {
  if (canvas.value) ctx = canvas.value.getContext('2d')
  reset()
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
})
onUnmounted(() => {
  window.removeEventListener('keydown', kd)
  window.removeEventListener('keyup', ku)
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">🏍️ 极速摩托</h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">分数：{{ score }}</span>
        <span class="text-cocoa-500 text-sm">最高：{{ best }}</span>
        <span v-if="gameOver" class="text-sakura-500 font-semibold">游戏结束</span>
      </div>

      <canvas ref="canvas" :width="W" :height="H" class="rounded-lg"></canvas>
      <p class="text-xs text-cocoa-500">↑↓ 躲避障碍，速度递增</p>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
