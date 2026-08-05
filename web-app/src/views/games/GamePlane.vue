<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const canvas = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const gameOver = ref(false)
const best = ref(parseInt(localStorage.getItem('web_game_plane_highscore') || '0'))
let ctx: CanvasRenderingContext2D | null = null
let timer: ReturnType<typeof setInterval> | null = null

const W = 240, H = 360
let player = { x: W / 2, y: H - 40 }
let bullets: { x: number; y: number }[] = []
let enemies: { x: number; y: number }[] = []
let keys: Record<string, boolean> = {}
let tickCount = 0

function reset() {
  player = { x: W / 2, y: H - 40 }
  bullets = []
  enemies = []
  score.value = 0
  gameOver.value = false
  tickCount = 0
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

function tick() {
  if (gameOver.value) return
  tickCount++
  // 移动
  if (keys['ArrowLeft']) player.x = Math.max(15, player.x - 4)
  if (keys['ArrowRight']) player.x = Math.min(W - 15, player.x + 4)
  if (keys['ArrowUp']) player.y = Math.max(15, player.y - 4)
  if (keys['ArrowDown']) player.y = Math.min(H - 15, player.y + 4)
  // 自动发射
  if (tickCount % 8 === 0) bullets.push({ x: player.x, y: player.y - 10 })
  bullets.forEach(b => (b.y -= 6))
  bullets = bullets.filter(b => b.y > 0)
  // 敌机生成
  if (tickCount % 30 === 0) enemies.push({ x: Math.random() * (W - 30) + 15, y: 0 })
  enemies.forEach(e => (e.y += 2))
  // 碰撞：子弹击中敌机
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i]
    for (let j = bullets.length - 1; j >= 0; j--) {
      const b = bullets[j]
      if (Math.abs(b.x - e.x) < 12 && Math.abs(b.y - e.y) < 12) {
        enemies.splice(i, 1)
        bullets.splice(j, 1)
        score.value += 10
        if (score.value > best.value) {
          best.value = score.value
          localStorage.setItem('web_game_plane_highscore', String(score.value))
        }
        break
      }
    }
  }
  // 碰撞：撞到玩家
  if (enemies.some(e => Math.abs(e.x - player.x) < 14 && Math.abs(e.y - player.y) < 14)) {
    gameOver.value = true
    if (timer) clearInterval(timer)
  }
  enemies = enemies.filter(e => e.y < H)
  draw()
}

function draw() {
  if (!ctx) return
  ctx.fillStyle = '#3d2817'
  ctx.fillRect(0, 0, W, H)
  // 玩家
  ctx.fillStyle = '#d4a574'
  ctx.beginPath()
  ctx.moveTo(player.x, player.y - 12)
  ctx.lineTo(player.x - 10, player.y + 10)
  ctx.lineTo(player.x + 10, player.y + 10)
  ctx.closePath()
  ctx.fill()
  // 子弹
  ctx.fillStyle = '#f4d4a5'
  const c = ctx
  bullets.forEach(b => c.fillRect(b.x - 1, b.y - 6, 2, 6))
  // 敌机
  ctx.fillStyle = '#f4a5a5'
  enemies.forEach(e => {
    c.beginPath()
    c.moveTo(e.x, e.y + 10)
    c.lineTo(e.x - 10, e.y - 8)
    c.lineTo(e.x + 10, e.y - 8)
    c.closePath()
    c.fill()
  })
}

function onKey(e: KeyboardEvent, down: boolean) {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
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

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">✈️ 飞机大战</h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">分数：{{ score }}</span>
        <span class="text-cocoa-500 text-sm">最高：{{ best }}</span>
        <span v-if="gameOver" class="text-sakura-500 font-semibold">游戏结束</span>
      </div>

      <canvas ref="canvas" :width="W" :height="H" class="rounded-lg"></canvas>
      <p class="text-xs text-cocoa-500">方向键移动，自动发射子弹</p>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
