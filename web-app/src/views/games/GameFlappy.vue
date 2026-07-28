<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

const router = useRouter()

// Canvas dimensions
const W = 360
const H = 520
const groundH = 40
const birdX = 80
const birdSize = 24
const pipeW = 50
const GAP: Record<string, number> = { easy: 240, normal: 200, hard: 160 }
const SPAWN_SPACING = 180
const SCROLL = 2
const GRAVITY = 0.45
const FLAP_V = -7

const canvasRef = ref<HTMLCanvasElement | null>(null)
const started = ref(false)
const over = ref(false)
const score = ref(0)
const best = ref(parseInt(localStorage.getItem('web_game_flappy_highscore') || '0'))
const isNewRecord = ref(false)

let gapH = GAP.normal
let curDiff = 'normal'
let bird = { y: H / 2, vy: 0, rot: 0 }
let pipes: { x: number; gapY: number; scored: boolean }[] = []
let timer: ReturnType<typeof setInterval> | null = null
let groundOffset = 0

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function spawnPipe(x: number) {
  const minY = 60
  const maxY = H - groundH - 60 - gapH
  pipes.push({ x, gapY: rand(minY, maxY), scored: false })
}

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Sky gradient background
  const skyGrad = ctx.createLinearGradient(0, 0, 0, H)
  skyGrad.addColorStop(0, '#4dc9f6')
  skyGrad.addColorStop(0.7, '#87ceeb')
  skyGrad.addColorStop(1, '#b8e7ff')
  ctx.fillStyle = skyGrad
  ctx.fillRect(0, 0, W, H)

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  const cloudX = (Date.now() * 0.02) % 500
  drawCloud(ctx, cloudX - 100, 60, 40)
  drawCloud(ctx, cloudX - 300, 100, 30)
  drawCloud(ctx, cloudX - 500, 40, 35)

  // Pipes
  for (const p of pipes) {
    // Top pipe
    const topGrad = ctx.createLinearGradient(p.x, 0, p.x + pipeW, 0)
    topGrad.addColorStop(0, '#2e7d32')
    topGrad.addColorStop(0.3, '#4caf50')
    topGrad.addColorStop(0.7, '#4caf50')
    topGrad.addColorStop(1, '#1b5e20')
    ctx.fillStyle = topGrad
    ctx.fillRect(p.x, 0, pipeW, p.gapY)
    // Pipe rim
    ctx.fillStyle = '#388e3c'
    ctx.fillRect(p.x - 3, p.gapY - 16, pipeW + 6, 16)
    ctx.fillStyle = '#1b5e20'
    ctx.strokeRect(p.x - 3, p.gapY - 16, pipeW + 6, 16)

    // Bottom pipe
    const bottomGrad = ctx.createLinearGradient(p.x, 0, p.x + pipeW, 0)
    bottomGrad.addColorStop(0, '#2e7d32')
    bottomGrad.addColorStop(0.3, '#4caf50')
    bottomGrad.addColorStop(0.7, '#4caf50')
    bottomGrad.addColorStop(1, '#1b5e20')
    ctx.fillStyle = bottomGrad
    ctx.fillRect(p.x, p.gapY + gapH, pipeW, H - p.gapY - gapH - groundH)
    // Pipe rim
    ctx.fillStyle = '#388e3c'
    ctx.fillRect(p.x - 3, p.gapY + gapH, pipeW + 6, 16)
    ctx.fillStyle = '#1b5e20'
    ctx.strokeRect(p.x - 3, p.gapY + gapH, pipeW + 6, 16)

    // Highlight
    ctx.fillStyle = 'rgba(255,255,255,0.15)'
    ctx.fillRect(p.x + 4, 0, 8, p.gapY)
    ctx.fillRect(p.x + 4, p.gapY + gapH, 8, H - p.gapY - gapH - groundH)
  }

  // Scroll ground
  groundOffset = (groundOffset + SCROLL) % 24
  ctx.fillStyle = '#ded895'
  ctx.fillRect(0, H - groundH, W, groundH)
  ctx.fillStyle = '#c9b97a'
  for (let gx = -groundOffset; gx < W; gx += 24) {
    ctx.fillRect(gx, H - groundH, 12, groundH)
  }
  ctx.fillStyle = '#8d6e3a'
  ctx.fillRect(0, H - groundH - 2, W, 3)

  // Bird
  ctx.save()
  ctx.translate(birdX, bird.y)
  ctx.rotate((bird.rot * Math.PI) / 180)
  ctx.font = `bold ${birdSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('🐦', 0, 0)
  ctx.restore()

  // Score display on canvas
  if (started.value && !over.value) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.roundRect(W / 2 - 30, 10, 60, 32, 8)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillText(String(score.value), W / 2, 14)
  }
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.beginPath()
  ctx.arc(x, y, size * 0.6, 0, Math.PI * 2)
  ctx.arc(x + size * 0.5, y - size * 0.2, size * 0.5, 0, Math.PI * 2)
  ctx.arc(x + size, y, size * 0.6, 0, Math.PI * 2)
  ctx.fill()
}

function tick() {
  if (over.value) return

  // Bird physics
  bird.vy += GRAVITY
  bird.y += bird.vy
  bird.rot = clamp(bird.vy * 4, -25, 90)

  // Scroll pipes
  for (const p of pipes) {
    p.x -= SCROLL
  }

  // Spawn new pipe
  const last = pipes[pipes.length - 1]
  if (!last || last.x < W - SPAWN_SPACING) spawnPipe(W)

  // Remove off-screen pipes
  pipes = pipes.filter(p => p.x > -pipeW)

  // Scoring
  for (const p of pipes) {
    if (!p.scored && p.x + pipeW < birdX) {
      p.scored = true
      score.value++
    }
  }

  // Collision: ground
  if (bird.y + birdSize / 2 >= H - groundH) {
    bird.y = H - groundH - birdSize / 2
    die()
    return
  }
  // Collision: ceiling
  if (bird.y - birdSize / 2 < 0) {
    bird.y = birdSize / 2
    bird.vy = 0
  }
  // Collision: pipes
  for (const p of pipes) {
    if (birdX + birdSize / 2 > p.x && birdX - birdSize / 2 < p.x + pipeW) {
      if (bird.y - birdSize / 2 < p.gapY || bird.y + birdSize / 2 > p.gapY + gapH) {
        die()
        return
      }
    }
  }
}

function die() {
  if (over.value) return
  over.value = true
  if (timer) { clearInterval(timer); timer = null }
  if (score.value > best.value) {
    best.value = score.value
    isNewRecord.value = true
    localStorage.setItem('web_game_flappy_highscore', String(score.value))
  } else {
    isNewRecord.value = false
  }
}

function flap() {
  if (over.value || !started.value) return
  bird.vy = FLAP_V
}

function handleKeydown(e: KeyboardEvent) {
  if (e.code === 'Space') {
    e.preventDefault()
    if (!started.value) return
    flap()
  }
}

function start(diff: string) {
  curDiff = diff
  gapH = GAP[diff]
  score.value = 0
  over.value = false
  isNewRecord.value = false
  bird = { y: H / 2, vy: 0, rot: 0 }
  pipes = []
  groundOffset = 0
  spawnPipe(W + 80)
  started.value = true
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

function quit() {
  if (timer) { clearInterval(timer); timer = null }
  started.value = false
  over.value = false
}

// Canvas animation loop for rendering
let animId: number | null = null
function renderLoop() {
  draw()
  animId = requestAnimationFrame(renderLoop)
}

onMounted(() => {
  renderLoop()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  if (timer) { clearInterval(timer); timer = null }
  if (animId) { cancelAnimationFrame(animId); animId = null }
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-sky-900 via-sky-800 to-slate-900 flex flex-col items-center px-4 py-6">
    <!-- Header -->
    <div class="w-full max-w-[360px] flex items-center gap-3 mb-4">
      <button
        class="flex items-center gap-1 text-white/70 hover:text-white transition-colors text-sm"
        @click="router.back()"
      >
        <ArrowLeft class="w-4 h-4" />
        返回
      </button>
      <h1 class="text-lg font-bold text-white/90 flex-1 text-center mr-8">像素鸟</h1>
    </div>

    <!-- Difficulty selection -->
    <div v-if="!started" class="flex flex-col items-center gap-6 mt-8">
      <p class="text-white/60 text-sm">选择难度</p>
      <div class="flex gap-3">
        <button
          class="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
          :class="curDiff === 'easy' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-white/10 hover:bg-white/20'"
          @click="start('easy')"
        >
          简单
        </button>
        <button
          class="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
          :class="curDiff === 'normal' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-white/10 hover:bg-white/20'"
          @click="start('normal')"
        >
          普通
        </button>
        <button
          class="px-5 py-2.5 rounded-xl text-sm font-medium text-white transition-colors"
          :class="curDiff === 'hard' ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-white/10 hover:bg-white/20'"
          @click="start('hard')"
        >
          困难
        </button>
      </div>
      <p class="text-white/40 text-xs text-center max-w-[280px] leading-relaxed">
        点击屏幕或按空格键让小鸟上跳，穿过管道间隙得分
      </p>
    </div>

    <!-- Game board -->
    <div
      v-if="started"
      class="relative rounded-2xl overflow-hidden shadow-2xl shadow-black/40"
      :style="{ width: W + 'px', height: H + 'px' }"
      @click="flap"
    >
      <canvas
        ref="canvasRef"
        :width="W"
        :height="H"
        class="block"
      />

      <!-- Game over overlay -->
      <div
        v-if="over"
        class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4"
        @click.stop
      >
        <div class="text-3xl font-bold text-white">💥 撞毁</div>
        <div class="text-white/80 text-base">
          {{ score }} 分
          <span v-if="isNewRecord" class="text-yellow-300 ml-1">· 新纪录!</span>
        </div>
        <div class="text-white/50 text-sm mb-1">最高纪录: {{ best }} 分</div>
        <div class="flex gap-3 mt-1">
          <button
            class="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-full text-sm font-medium transition-colors shadow-lg"
            @click="start(curDiff)"
          >
            再来一局
          </button>
          <button
            class="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full text-sm font-medium transition-colors"
            @click="quit"
          >
            换难度
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
