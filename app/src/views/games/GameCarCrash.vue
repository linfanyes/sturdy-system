<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Play, RotateCcw, Zap, Clock } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

// ===== 类型定义 =====
interface Car {
  id: number
  lane: number
  y: number // 中心点 y（百分比 0~100）
}

// ===== 常量 =====
const TICK = 30
const LANES = 4
const LANE_W = 100 / LANES
const CAR_W = 18
const CAR_H = 9
const PLAYER_W = 16
const PLAYER_H = 10
const PLAYER_Y = 85
const PLAYER_SPEED = 4
const SPAWN_EVERY = 38
const BASE_SPEED = 1.4

function laneX(lane: number): number {
  return ((lane + 0.5) * LANE_W) as number
}

// ===== 状态 =====
const playerX = ref(50)
const cars = ref<Car[]>([])
const elapsed = ref(0)
const dodged = ref(0)
const bestScore = ref(0)
const isPlaying = ref(false)
const gameOver = ref(false)
let gameTimer: number | null = null
let tickCount = 0
let idCounter = 1
const keys = new Set<string>()

function resetState() {
  playerX.value = 50
  cars.value = []
  elapsed.value = 0
  dodged.value = 0
  tickCount = 0
  idCounter = 1
  keys.clear()
}

function startGame() {
  resetState()
  gameOver.value = false
  isPlaying.value = true
  startLoop()
}

function restartGame() {
  startGame()
}

function startLoop() {
  if (gameTimer) return
  gameTimer = window.setInterval(loop, TICK)
}

function stopLoop() {
  if (gameTimer) {
    clearInterval(gameTimer)
    gameTimer = null
  }
}

function spawnCar() {
  const lane = Math.floor(Math.random() * LANES)
  cars.value.push({ id: idCounter++, lane, y: -CAR_H })
}

// 矩形重叠检测
function overlap(ax: number, aw: number, ay: number, ah: number, bx: number, bw: number, by: number, bh: number): boolean {
  return (
    Math.abs(ax - bx) * 2 < aw + bw &&
    Math.abs(ay - by) * 2 < ah + bh
  )
}

function loop() {
  if (!isPlaying.value || gameOver.value) return
  tickCount++
  elapsed.value += TICK / 1000

  // 玩家左右移动
  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
    playerX.value = Math.max(PLAYER_W / 2, playerX.value - PLAYER_SPEED)
  }
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
    playerX.value = Math.min(100 - PLAYER_W / 2, playerX.value + PLAYER_SPEED)
  }

  // 来车下移
  const speed = BASE_SPEED + Math.min(2.5, elapsed.value / 25)
  const next: Car[] = []
  for (const c of cars.value) {
    const ny = c.y + speed
    // 碰撞
    if (
      overlap(playerX.value, PLAYER_W, PLAYER_Y, PLAYER_H, laneX(c.lane), CAR_W, ny, CAR_H)
    ) {
      endGame()
      return
    }
    if (ny > 100 + CAR_H) {
      dodged.value += 1
      continue
    }
    next.push({ ...c, y: ny })
  }
  cars.value = next

  if (tickCount % SPAWN_EVERY === 0) {
    spawnCar()
  }
}

function endGame() {
  stopLoop()
  gameOver.value = true
  isPlaying.value = false
  const finalScore = dodged.value * 10
  if (finalScore > bestScore.value) {
    bestScore.value = finalScore
    localStorage.setItem('car-best', String(bestScore.value))
  }
}

function handleKeydown(e: KeyboardEvent) {
  const k = e.key
  if (['ArrowLeft', 'ArrowRight', ' '].includes(k)) {
    e.preventDefault()
  }
  if (k === ' ') {
    if (!isPlaying.value && !gameOver.value) startGame()
    return
  }
  keys.add(k)
}

function handleKeyup(e: KeyboardEvent) {
  keys.delete(e.key)
}

function handleTouch(dir: 'left' | 'right') {
  if (!isPlaying.value) {
    startGame()
    return
  }
  if (dir === 'left') {
    playerX.value = Math.max(PLAYER_W / 2, playerX.value - LANE_W)
  } else {
    playerX.value = Math.min(100 - PLAYER_W / 2, playerX.value + LANE_W)
  }
}

onMounted(() => {
  const saved = localStorage.getItem('car-best')
  if (saved) bestScore.value = parseInt(saved, 10)
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
})

onUnmounted(() => {
  stopLoop()
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🚗"
      title="汽车躲避"
      description="左右移动躲避来车，看你能撑多久！"
      gradient="from-sky2-100 via-cream-50 to-butter-100"
      status-text="反应躲避"
      status-color="bg-sky2-100 text-sky2-600"
      :back-to="'games'"
    />

    <!-- 分数面板 -->
    <div class="flex gap-3">
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Clock :size="12" />
          坚持时间
        </div>
        <div class="text-2xl font-bold text-cocoa-900 font-number">
          {{ elapsed.toFixed(1) }}s
        </div>
      </div>
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Zap :size="12" />
          躲避成功
        </div>
        <div class="text-2xl font-bold text-sky2-600 font-number">{{ dodged }}</div>
      </div>
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Zap :size="12" />
          最佳得分
        </div>
        <div class="text-2xl font-bold text-mint-600 font-number">{{ bestScore }}</div>
      </div>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="relative">
        <div
          class="card-soft p-2 overflow-hidden"
          style="width: min(92vw, 380px); height: min(70vh, 540px)"
        >
          <div class="relative w-full h-full overflow-hidden rounded-xl bg-gradient-to-b from-cocoa-700 to-cocoa-900">
            <!-- 车道虚线 -->
            <div
              v-for="n in LANES - 1"
              :key="'line' + n"
              class="absolute top-0 bottom-0 w-0.5 bg-cream-100/20"
              :style="{ left: (n * LANE_W) + '%' }"
            ></div>

            <!-- 来车 -->
            <div
              v-for="c in cars"
              :key="c.id"
              class="absolute flex items-center justify-center text-xl rounded-md bg-gradient-to-br from-rose-400 to-rose-600 shadow-md"
              :style="{
                left: (laneX(c.lane) - CAR_W / 2) + '%',
                top: (c.y - CAR_H / 2) + '%',
                width: CAR_W + '%',
                height: CAR_H + '%',
              }"
            >
              🚙
            </div>

            <!-- 玩家车 -->
            <div
              class="absolute flex items-center justify-center text-2xl transition-all duration-75"
              :style="{
                left: (playerX - PLAYER_W / 2) + '%',
                top: (PLAYER_Y - PLAYER_H / 2) + '%',
                width: PLAYER_W + '%',
                height: PLAYER_H + '%',
              }"
            >
              🚗
            </div>
          </div>
        </div>

        <!-- 开始遮罩 -->
        <div
          v-if="!isPlaying && !gameOver"
          class="absolute inset-0 bg-cocoa-900/40 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🚗</div>
          <div class="text-xl font-bold text-white mb-4">准备好了吗？</div>
          <button class="btn-primary" @click="startGame">
            <Play :size="16" />
            开始游戏
          </button>
        </div>

        <!-- 结束遮罩 -->
        <div
          v-if="gameOver"
          class="absolute inset-0 bg-cocoa-900/60 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">💥</div>
          <div class="text-2xl font-bold text-white mb-1">撞车了！</div>
          <div class="text-sm text-white/80 mb-1">坚持：{{ elapsed.toFixed(1) }}s</div>
          <div class="text-xs text-white/70 mb-4">躲避成功 {{ dodged }} 辆（最佳 {{ bestScore }} 分）</div>
          <button class="btn-primary" @click="restartGame">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button v-if="!isPlaying && !gameOver" class="btn-primary" @click="startGame">
        <Play :size="16" />
        开始游戏
      </button>
      <button v-if="isPlaying" class="btn-mint" @click="handleTouch('left')">
        ← 左移
      </button>
      <button v-if="isPlaying" class="btn-mint" @click="handleTouch('right')">
        右移 →
      </button>
      <button v-if="gameOver" class="btn-primary" @click="restartGame">
        <RotateCcw :size="16" />
        重新开始
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 方向键 ← / → 或 A / D 左右移动，空格键开始</p>
      <p>移动端可点击「左移 / 右移」按钮，被 🚙 撞到即结束</p>
    </div>
  </div>
</template>
