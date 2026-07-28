<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const started = ref(false)
const over = ref(false)
const score = ref(0)
const lives = ref(3)
const best = ref(parseInt(localStorage.getItem('web_game_catchcoin_highscore') || '0'))

const CANVAS_W = 360
const CANVAS_H = 520
const BASKET_W = 70
const BASKET_H = 24
const BASKET_Y = CANVAS_H - 40
const ITEM_SIZE = 28
const BASE_SPEED = 2

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let timer: ReturnType<typeof setInterval> | null = null
let items: { id: number; x: number; y: number; emoji: string; type: string }[] = []
let basketX = (CANVAS_W - BASKET_W) / 2
let uid = 0
let spawnAcc = 0
let mouseX = CANVAS_W / 2

function speedMult() { return 1 + Math.floor(score.value / 500) * 0.2 }

function spawn() {
  const r = Math.random() * 100
  let emoji: string, type: string
  if (r < 65) { emoji = '🪙'; type = 'coin' }
  else if (r < 75) { emoji = '💎'; type = 'diamond' }
  else { emoji = '💣'; type = 'bomb' }
  items.push({ id: uid++, x: ITEM_SIZE + Math.random() * (CANVAS_W - 2 * ITEM_SIZE), y: -ITEM_SIZE, emoji, type })
}

function draw() {
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  // 背景
  ctx.fillStyle = '#fef7ed'
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // 网格装饰
  ctx.strokeStyle = '#f0e6d3'
  ctx.lineWidth = 1
  for (let x = 0; x < CANVAS_W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke() }
  for (let y = 0; y < CANVAS_H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke() }

  // 物品
  for (const it of items) {
    ctx.font = '24px serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(it.emoji, it.x, it.y)
  }

  // 篮子
  const grd = ctx.createLinearGradient(basketX, BASKET_Y, basketX, BASKET_Y + BASKET_H)
  grd.addColorStop(0, '#d4a574')
  grd.addColorStop(1, '#a07848')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.roundRect(basketX, BASKET_Y, BASKET_W, BASKET_H, [0, 0, 6, 6])
  ctx.fill()
  ctx.strokeStyle = '#7a5a30'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(basketX, BASKET_Y, BASKET_W, BASKET_H, [0, 0, 6, 6])
  ctx.stroke()
}

function tick() {
  if (over.value) return
  const sp = BASE_SPEED * speedMult()
  basketX += (mouseX - basketX - BASKET_W / 2) * 0.2
  basketX = Math.max(0, Math.min(CANVAS_W - BASKET_W, basketX))

  for (const it of items) it.y += sp

  const caught: typeof items = []
  const bx = basketX
  for (const it of items) {
    if (it.y + ITEM_SIZE >= BASKET_Y && it.y <= BASKET_Y + BASKET_H && it.x >= bx - 4 && it.x <= bx + BASKET_W + 4) {
      caught.push(it)
    }
  }
  for (const it of caught) {
    if (it.type === 'bomb') {
      lives.value--
      if (lives.value <= 0) { items = items.filter((x) => x !== it); return endGame() }
    } else if (it.type === 'diamond') {
      score.value += 50
    } else {
      score.value += 10
    }
    items = items.filter((x) => x !== it)
  }

  items = items.filter((it) => it.y < CANVAS_H + ITEM_SIZE)
  spawnAcc += 30
  if (spawnAcc >= 700) { spawnAcc = 0; spawn() }
  draw()
}

function endGame() {
  over.value = true
  if (timer) { clearInterval(timer); timer = null }
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('web_game_catchcoin_highscore', String(score.value))
  }
  draw()
}

function onMouseMove(e: MouseEvent) {
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  mouseX = (e.clientX - rect.left) * (CANVAS_W / rect.width)
}

function start() {
  score.value = 0; lives.value = 3
  over.value = false
  items = []
  basketX = (CANVAS_W - BASKET_W) / 2
  uid = 0; spawnAcc = 0
  started.value = true
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

function stop() {
  if (timer) { clearInterval(timer); timer = null }
  started.value = false
}

onMounted(() => {
  canvas = document.getElementById('catchcoin-canvas') as HTMLCanvasElement
  if (canvas) ctx = canvas.getContext('2d')
})
onUnmounted(stop)
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <RefreshCw class="w-6 h-6 text-butter-500" /> 接金币
    </h1>

    <div class="bg-white rounded-2xl p-4 shadow-softer flex flex-col items-center gap-3">
      <div class="flex items-center justify-between w-full text-sm">
        <span class="text-cocoa-700 font-semibold">分数 {{ score }}</span>
        <span class="text-cocoa-500">❤️ {{ lives }}</span>
        <span class="text-cocoa-500">最高 {{ best }}</span>
      </div>

      <div v-if="!started" class="flex flex-col items-center gap-3 py-8">
        <p class="text-cocoa-600">鼠标移动篮子接取掉落物</p>
        <div class="flex gap-4 text-xs text-cocoa-400">
          <span>🪙 +10</span>
          <span>💎 +50</span>
          <span>💣 -1 命</span>
        </div>
        <button class="px-8 py-3 bg-butter-500 text-white rounded-xl font-semibold hover:bg-butter-600" @click="start">开始游戏</button>
      </div>

      <canvas v-show="started" id="catchcoin-canvas"
        :width="CANVAS_W" :height="CANVAS_H"
        class="border-2 border-cocoa-200 rounded-xl cursor-pointer"
        @mousemove="onMouseMove"
      ></canvas>

      <div v-if="over" class="flex flex-col items-center gap-2">
        <p class="text-cocoa-800 font-bold text-lg">💀 游戏结束</p>
        <p class="text-cocoa-500 text-sm">分数 {{ score }}{{ score > best ? ' · 新纪录' : '' }}</p>
        <button class="px-8 py-2 bg-butter-500 text-white rounded-xl text-sm" @click="start">再来一局</button>
      </div>
    </div>
  </div>
</template>
