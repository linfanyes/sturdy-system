<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const canvas = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const gameOver = ref(false)
const best = ref(parseInt(localStorage.getItem('web_game_carcrash_highscore') || '0'))
let ctx: CanvasRenderingContext2D | null = null
let timer: ReturnType<typeof setInterval> | null = null

const W = 200, H = 360
const LANES = [40, 100, 160]
let player = { x: 100, lane: 1 }
let cars: { x: number; y: number }[] = []
let keys: Record<string, boolean> = {}
let speed = 3
let tickCount = 0

function reset() {
  player = { x: LANES[1], lane: 1 }
  cars = []
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
  // 左右移动
  if (keys['ArrowLeft'] && player.lane > 0) { player.lane--; keys['ArrowLeft'] = false }
  if (keys['ArrowRight'] && player.lane < 2) { player.lane++; keys['ArrowRight'] = false }
  player.x = LANES[player.lane]
  // 生成对向车辆
  if (tickCount % 50 === 0) {
    const lane = Math.floor(Math.random() * 3)
    cars.push({ x: LANES[lane], y: -30 })
  }
  cars.forEach(c => (c.y += speed))
  cars = cars.filter(c => c.y < H + 30)
  if (tickCount % 100 === 0) speed = Math.min(8, speed + 0.3)
  // 碰撞
  if (cars.some(c => Math.abs(c.x - player.x) < 20 && Math.abs(c.y - (H - 50)) < 25)) {
    gameOver.value = true
    if (timer) clearInterval(timer)
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('web_game_carcrash_highscore', String(score.value))
    }
    return
  }
  score.value++
  draw()
}

function draw() {
  if (!ctx) return
  ctx.fillStyle = '#3d2817'
  ctx.fillRect(0, 0, W, H)
  // 车道
  ctx.strokeStyle = '#7a5c3d'
  ctx.setLineDash([10, 12])
  ctx.beginPath(); ctx.moveTo(70, 0); ctx.lineTo(70, H); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(130, 0); ctx.lineTo(130, H); ctx.stroke()
  ctx.setLineDash([])
  // 玩家车
  ctx.fillStyle = '#d4a574'
  ctx.fillRect(player.x - 12, H - 60, 24, 36)
  // 敌车
  ctx.fillStyle = '#f4a5a5'
  const cx = ctx
  cars.forEach(c => cx.fillRect(c.x - 12, c.y, 24, 36))
}

function onKey(e: KeyboardEvent, down: boolean) {
  if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
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

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">🚗 汽车躲避</h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">分数：{{ score }}</span>
        <span class="text-cocoa-500 text-sm">最高：{{ best }}</span>
        <span v-if="gameOver" class="text-sakura-500 font-semibold">游戏结束</span>
      </div>

      <canvas ref="canvas" :width="W" :height="H" class="rounded-lg"></canvas>
      <p class="text-xs text-cocoa-500">←→ 切换车道躲避来车</p>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
