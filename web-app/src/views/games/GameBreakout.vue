<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const started = ref(false)
const over = ref(false)
const won = ref(false)
const score = ref(0)
const lives = ref(3)
const best = ref(parseInt(localStorage.getItem('web_game_breakout_highscore') || '0'))

const W = 360
const H = 500
const PADDLE_W = 70
const PADDLE_H = 14
const BALL_R = 8
const ROW_COLORS = ['#e64340', '#e6a23c', '#f1c40f', '#07c160', '#409eff', '#9b59b6', '#1abc9c', '#e06c75', '#3498db', '#16a085']

let canvas: HTMLCanvasElement | null = null
let ctx: CanvasRenderingContext2D | null = null
let timer: ReturnType<typeof setInterval> | null = null

interface Brick {
  x: number; y: number; w: number; h: number
  color: string; points: number; alive: boolean
}

let bricks: Brick[] = []
let paddle = { x: (W - PADDLE_W) / 2, y: H - 36, w: PADDLE_W, h: PADDLE_H }
let ball = { x: W / 2, y: H - 50, vx: 3, vy: -4 }
let curRows = 7
let hits = 0
let mouseX = W / 2

function buildBricks(rows: number): Brick[] {
  const arr: Brick[] = []
  const cols = 8, gap = 3, bw = 42, bh = 18, top = 30
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      arr.push({
        x: 1 + gap + c * (bw + gap),
        y: top + r * (bh + gap),
        w: bw, h: bh,
        color: ROW_COLORS[r % ROW_COLORS.length],
        points: (rows - r) * 5 + 5,
        alive: true,
      })
    }
  }
  return arr
}

function draw() {
  if (!ctx || !canvas) return
  ctx.clearRect(0, 0, W, H)

  // 背景
  ctx.fillStyle = '#fef7ed'
  ctx.fillRect(0, 0, W, H)

  // 砖块
  for (const br of bricks) {
    if (!br.alive) continue
    ctx.fillStyle = br.color
    ctx.beginPath()
    ctx.roundRect(br.x, br.y, br.w, br.h, 4)
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.roundRect(br.x, br.y, br.w, br.h, 4)
    ctx.stroke()
  }

  // 挡板
  const grd = ctx.createLinearGradient(paddle.x, paddle.y, paddle.x, paddle.y + paddle.h)
  grd.addColorStop(0, '#e6a23c')
  grd.addColorStop(1, '#d4851f')
  ctx.fillStyle = grd
  ctx.beginPath()
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6)
  ctx.fill()
  ctx.shadowColor = 'rgba(0,0,0,0.15)'
  ctx.shadowBlur = 6
  ctx.beginPath()
  ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 6)
  ctx.fill()
  ctx.shadowBlur = 0

  // 球
  ctx.fillStyle = '#e64340'
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(ball.x - 2, ball.y - 2, BALL_R * 0.35, 0, Math.PI * 2)
  ctx.fill()

  // 游戏结束蒙层
  if (over.value) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(won.value ? '🏆 通关' : '💀 游戏结束', W / 2, H / 2 - 20)
    ctx.font = '16px sans-serif'
    ctx.fillText('分数 ' + score.value + (score.value > best.value ? ' · 新纪录' : ''), W / 2, H / 2 + 20)
  }
}

function tick() {
  if (over.value) return

  // 跟随鼠标
  paddle.x += (mouseX - paddle.x - paddle.w / 2) * 0.25
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x))

  // 球物理
  ball.x += ball.vx
  ball.y += ball.vy

  // 左右墙
  if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = -ball.vx }
  if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -ball.vx }
  // 顶墙
  if (ball.y < BALL_R) { ball.y = BALL_R; ball.vy = -ball.vy }

  // 挡板碰撞
  if (ball.vy > 0 && ball.y + BALL_R >= paddle.y && ball.y + BALL_R <= paddle.y + paddle.h + 4 &&
      ball.x >= paddle.x - 4 && ball.x <= paddle.x + paddle.w + 4) {
    ball.y = paddle.y - BALL_R
    const rel = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)
    ball.vx = Math.max(-5, Math.min(5, rel * 5))
    ball.vy = -Math.abs(ball.vy)
  }

  // 砖块碰撞
  for (const br of bricks) {
    if (!br.alive) continue
    if (ball.x + BALL_R > br.x && ball.x - BALL_R < br.x + br.w &&
        ball.y + BALL_R > br.y && ball.y - BALL_R < br.y + br.h) {
      br.alive = false
      score.value += br.points
      ball.vy = -ball.vy
      hits++
      if (hits % 6 === 0) {
        const sp = Math.min(Math.hypot(ball.vx, ball.vy) * 1.08, 10)
        const ang = Math.atan2(ball.vy, ball.vx)
        ball.vx = Math.cos(ang) * sp
        ball.vy = Math.sin(ang) * sp
      }
      break
    }
  }

  // 落底
  if (ball.y > H + 20) {
    lives.value--
    if (lives.value <= 0) { endGame(false); return }
    resetBall()
  }

  // 通关
  if (bricks.length > 0 && bricks.every((br) => !br.alive)) endGame(true)
  draw()
}

function resetBall() {
  ball.x = paddle.x + paddle.w / 2
  ball.y = paddle.y - BALL_R - 10
  ball.vx = 3
  ball.vy = -4
  draw()
}

function endGame(win: boolean) {
  over.value = true
  won.value = win
  if (timer) { clearInterval(timer); timer = null }
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('web_game_breakout_highscore', String(score.value))
  }
  draw()
}

function onMouseMove(e: MouseEvent) {
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  mouseX = (e.clientX - rect.left) * (W / rect.width)
}

function start(rows: number) {
  curRows = rows
  bricks = buildBricks(rows)
  score.value = 0; lives.value = 3
  over.value = false; won.value = false
  hits = 0
  paddle.x = (W - PADDLE_W) / 2
  resetBall()
  started.value = true
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

function stop() {
  if (timer) { clearInterval(timer); timer = null }
  started.value = false
}

onMounted(() => {
  canvas = document.getElementById('breakout-canvas') as HTMLCanvasElement
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
      <RefreshCw class="w-6 h-6 text-butter-500" /> 弹球打砖块
    </h1>

    <div class="bg-surface rounded-2xl p-4 shadow-softer flex flex-col items-center gap-3">
      <div class="flex items-center justify-between w-full text-sm">
        <span class="text-cocoa-700 font-semibold">分数 {{ score }}</span>
        <span class="text-cocoa-500">❤️ {{ lives }}</span>
        <span class="text-cocoa-500">最高 {{ best }}</span>
      </div>

      <div v-if="!started" class="flex flex-col items-center gap-4 py-8">
        <p class="text-cocoa-600">选择难度</p>
        <div class="flex gap-3">
          <button class="px-5 py-2 bg-butter-400 text-white rounded-xl hover:bg-butter-500" @click="start(5)">简单 5 行</button>
          <button class="px-5 py-2 bg-butter-500 text-white rounded-xl hover:bg-butter-600" @click="start(7)">普通 7 行</button>
          <button class="px-5 py-2 bg-butter-600 text-white rounded-xl hover:bg-butter-700" @click="start(10)">困难 10 行</button>
        </div>
        <p class="text-cocoa-400 text-xs">鼠标左右移动控制挡板</p>
      </div>

      <canvas v-show="started" id="breakout-canvas"
        :width="W" :height="H"
        class="border-2 border-cocoa-200 rounded-xl cursor-none"
        @mousemove="onMouseMove"
      ></canvas>

      <div v-if="over" class="flex flex-col items-center gap-2">
        <button class="px-8 py-2 bg-butter-500 text-white rounded-xl text-sm" @click="start(curRows)">再来一局</button>
        <button class="px-5 py-1 text-cocoa-500 text-xs" @click="started = false; over = false">换难度</button>
      </div>
    </div>
  </div>
</template>
