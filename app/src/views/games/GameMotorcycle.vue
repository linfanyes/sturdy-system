<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Play, RotateCcw, Clock, Zap } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

// ===== 类型定义 =====
interface Obstacle {
  id: number
  lane: number // 车道索引
  y: number // 中心点 y（百分比 0~100）
}

// ===== 常量 =====
const TICK = 30 // 游戏循环间隔(ms)
const LANES = 3
const OBSTACLE_W = 22 // 车道宽度的占比
const OBSTACLE_H = 9
const PLAYER_W = 22
const PLAYER_H = 10
const PLAYER_Y = 84 // 玩家固定 y
const SPAWN_EVERY = 45 // 多少 tick 生成一个障碍
const BASE_SPEED = 1.4

function laneX(lane: number): number {
  return ((lane + 0.5) * (100 / LANES)) as number
}

// ===== 状态 =====
const playerLane = ref(1)
const obstacles = ref<Obstacle[]>([])
const elapsed = ref(0) // 坚持秒数
const score = ref(0)
const bestScore = ref(0)
const isPlaying = ref(false)
const gameOver = ref(false)
let gameTimer: number | null = null
let tickCount = 0
let idCounter = 1
const keys = new Set<string>()

function resetState() {
  playerLane.value = 1
  obstacles.value = []
  elapsed.value = 0
  score.value = 0
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

function spawnObstacle() {
  const lane = Math.floor(Math.random() * LANES)
  obstacles.value.push({ id: idCounter++, lane, y: -OBSTACLE_H })
}

function loop() {
  if (!isPlaying.value || gameOver.value) return
  tickCount++
  elapsed.value += TICK / 1000
  score.value = Math.floor(elapsed.value * 10)

  // 车道切换
  if (keys.has('ArrowLeft') || keys.has('a') || keys.has('A')) {
    playerLane.value = Math.max(0, playerLane.value - 1)
    keys.delete('ArrowLeft')
    keys.delete('a')
    keys.delete('A')
  }
  if (keys.has('ArrowRight') || keys.has('d') || keys.has('D')) {
    playerLane.value = Math.min(LANES - 1, playerLane.value + 1)
    keys.delete('ArrowRight')
    keys.delete('d')
    keys.delete('D')
  }

  // 障碍下移（速度随时间略微提升）
  const speed = BASE_SPEED + Math.min(2.5, elapsed.value / 20)
  const next: Obstacle[] = []
  for (const o of obstacles.value) {
    const ny = o.y + speed
    // 与玩家同车道且重叠
    if (
      o.lane === playerLane.value &&
      Math.abs(ny - PLAYER_Y) * 2 < OBSTACLE_H + PLAYER_H
    ) {
      endGame()
      return
    }
    if (ny <= 100 + OBSTACLE_H) {
      next.push({ ...o, y: ny })
    }
  }
  obstacles.value = next

  if (tickCount % SPAWN_EVERY === 0) {
    spawnObstacle()
  }
}

function endGame() {
  stopLoop()
  gameOver.value = true
  isPlaying.value = false
  if (score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('moto-best', String(bestScore.value))
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
    playerLane.value = Math.max(0, playerLane.value - 1)
  } else {
    playerLane.value = Math.min(LANES - 1, playerLane.value + 1)
  }
}

onMounted(() => {
  const saved = localStorage.getItem('moto-best')
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
      icon="🏍️"
      title="极速摩托"
      description="左右切换车道，躲避障碍，看你能坚持多久！"
      gradient="from-orange-100 via-cream-50 to-sakura-100"
      status-text="竞速躲避"
      status-color="bg-orange-100 text-orange-600"
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
          当前得分
        </div>
        <div class="text-2xl font-bold text-orange-500 font-number">{{ score }}</div>
      </div>
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Zap :size="12" />
          最佳
        </div>
        <div class="text-2xl font-bold text-mint-600 font-number">{{ bestScore }}</div>
      </div>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="relative">
        <div
          class="card-soft p-2 overflow-hidden"
          style="width: min(92vw, 360px); height: min(70vh, 540px)"
        >
          <div class="relative w-full h-full overflow-hidden rounded-xl bg-gradient-to-b from-cocoa-800 to-cocoa-900">
            <!-- 车道分隔线 -->
            <div
              v-for="n in LANES - 1"
              :key="'line' + n"
              class="absolute top-0 bottom-0 w-0.5 bg-cream-100/30"
              :style="{ left: (n * (100 / LANES)) + '%' }"
            ></div>

            <!-- 障碍 -->
            <div
              v-for="o in obstacles"
              :key="o.id"
              class="absolute rounded-md bg-gradient-to-br from-red-400 to-red-600 shadow-md flex items-center justify-center"
              :style="{
                left: (laneX(o.lane) - OBSTACLE_W / 2) + '%',
                top: (o.y - OBSTACLE_H / 2) + '%',
                width: OBSTACLE_W + '%',
                height: OBSTACLE_H + '%',
              }"
            >
              <span class="text-white/80 text-xs">🚧</span>
            </div>

            <!-- 玩家摩托 -->
            <div
              class="absolute flex items-center justify-center text-2xl transition-all duration-150"
              :style="{
                left: (laneX(playerLane) - PLAYER_W / 2) + '%',
                top: (PLAYER_Y - PLAYER_H / 2) + '%',
                width: PLAYER_W + '%',
                height: PLAYER_H + '%',
              }"
            >
              🏍️
            </div>
          </div>
        </div>

        <!-- 开始遮罩 -->
        <div
          v-if="!isPlaying && !gameOver"
          class="absolute inset-0 bg-cocoa-900/40 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🏍️</div>
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
          <div class="text-xs text-white/70 mb-4">得分：{{ score }}（最佳 {{ bestScore }}）</div>
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
        ← 左切
      </button>
      <button v-if="isPlaying" class="btn-mint" @click="handleTouch('right')">
        右切 →
      </button>
      <button v-if="gameOver" class="btn-primary" @click="restartGame">
        <RotateCcw :size="16" />
        重新开始
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 方向键 ← / → 或 A / D 切换车道，空格键开始</p>
      <p>移动端可点击「左切 / 右切」按钮，撞上 🚧 障碍即结束</p>
    </div>
  </div>
</template>
