<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Play, Pause, RotateCcw, Trophy, Zap } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const router = useRouter()

const GRID_SIZE = 20
const INITIAL_SPEED = 150 // 毫秒

type Point = { x: number; y: number }
type Direction = 'up' | 'down' | 'left' | 'right'

const snake = ref<Point[]>([{ x: 10, y: 10 }])
const food = ref<Point>({ x: 5, y: 5 })
const direction = ref<Direction>('right')
const nextDirection = ref<Direction>('right')
const score = ref(0)
const bestScore = ref(0)
const isPlaying = ref(false)
const isPaused = ref(false)
const gameOver = ref(false)
const speed = ref(INITIAL_SPEED)
let gameLoop: number | null = null

function generateFood(): Point {
  let newFood: Point
  do {
    newFood = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    }
  } while (snake.value.some(s => s.x === newFood.x && s.y === newFood.y))
  return newFood
}

function startGame() {
  if (gameOver.value) {
    resetGame()
  }
  isPlaying.value = true
  isPaused.value = false
  startLoop()
}

function pauseGame() {
  isPaused.value = true
  stopLoop()
}

function resumeGame() {
  isPaused.value = false
  startLoop()
}

function togglePause() {
  if (!isPlaying.value || gameOver.value) {
    startGame()
    return
  }
  if (isPaused.value) {
    resumeGame()
  } else {
    pauseGame()
  }
}

function startLoop() {
  if (gameLoop) return
  gameLoop = window.setInterval(moveSnake, speed.value)
}

function stopLoop() {
  if (gameLoop) {
    clearInterval(gameLoop)
    gameLoop = null
  }
}

function resetGame() {
  stopLoop()
  snake.value = [{ x: 10, y: 10 }]
  direction.value = 'right'
  nextDirection.value = 'right'
  score.value = 0
  speed.value = INITIAL_SPEED
  food.value = generateFood()
  gameOver.value = false
  isPlaying.value = false
  isPaused.value = false
}

function moveSnake() {
  direction.value = nextDirection.value
  const head = snake.value[0]
  let newHead: Point

  switch (direction.value) {
    case 'up':
      newHead = { x: head.x, y: head.y - 1 }
      break
    case 'down':
      newHead = { x: head.x, y: head.y + 1 }
      break
    case 'left':
      newHead = { x: head.x - 1, y: head.y }
      break
    case 'right':
      newHead = { x: head.x + 1, y: head.y }
      break
  }

  // 撞墙检测
  if (
    newHead.x < 0 ||
    newHead.x >= GRID_SIZE ||
    newHead.y < 0 ||
    newHead.y >= GRID_SIZE
  ) {
    endGame()
    return
  }

  // 撞自己检测
  if (snake.value.some(s => s.x === newHead.x && s.y === newHead.y)) {
    endGame()
    return
  }

  const newSnake = [newHead, ...snake.value]

  // 吃食物
  if (newHead.x === food.value.x && newHead.y === food.value.y) {
    score.value += 10
    if (score.value > bestScore.value) {
      bestScore.value = score.value
      localStorage.setItem('snake-best', String(bestScore.value))
    }
    food.value = generateFood()
    // 加速
    if (speed.value > 60) {
      speed.value = Math.max(60, speed.value - 2)
      stopLoop()
      startLoop()
    }
  } else {
    newSnake.pop()
  }

  snake.value = newSnake
}

function endGame() {
  stopLoop()
  gameOver.value = true
  isPlaying.value = false
}

function changeDirection(dir: Direction) {
  if (!isPlaying.value || isPaused.value) return
  const opposites: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
  }
  if (opposites[dir] !== direction.value) {
    nextDirection.value = dir
  }
}

function handleKeydown(e: KeyboardEvent) {
  const keyMap: Record<string, Direction> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    W: 'up',
    s: 'down',
    S: 'down',
    a: 'left',
    A: 'left',
    d: 'right',
    D: 'right',
  }
  const dir = keyMap[e.key]
  if (dir) {
    e.preventDefault()
    changeDirection(dir)
  }
  if (e.key === ' ') {
    e.preventDefault()
    togglePause()
  }
}

// 触摸滑动
let touchStartX = 0
let touchStartY = 0

function handleTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

function handleTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)
  if (Math.max(absDx, absDy) < 20) return

  if (absDx > absDy) {
    changeDirection(dx > 0 ? 'right' : 'left')
  } else {
    changeDirection(dy > 0 ? 'down' : 'up')
  }
}

const snakeSet = computed(() => {
  const set = new Set<string>()
  snake.value.forEach(s => set.add(`${s.x},${s.y}`))
  return set
})

function isSnakeBody(x: number, y: number) {
  return snakeSet.value.has(`${x},${y}`)
}

function isSnakeHead(x: number, y: number) {
  return snake.value[0]?.x === x && snake.value[0]?.y === y
}

function isFood(x: number, y: number) {
  return food.value.x === x && food.value.y === y
}

const buttonText = computed(() => {
  if (gameOver.value) return '重新开始'
  if (!isPlaying.value) return '开始游戏'
  if (isPaused.value) return '继续'
  return '暂停'
})

onMounted(() => {
  const saved = localStorage.getItem('snake-best')
  if (saved) bestScore.value = parseInt(saved, 10)
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  stopLoop()
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🐍"
      title="贪吃蛇"
      description="吃食物，越吃越长，别撞墙哦！"
      gradient="from-mint-100 via-cream-50 to-mint-200"
      status-text="经典休闲"
      status-color="bg-mint-100 text-mint-600"
      :back-to="'games'"
    />

    <!-- 分数面板 -->
    <div class="flex gap-3">
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Zap :size="12" />
          当前分数
        </div>
        <div class="text-2xl font-bold text-cocoa-900 font-number">{{ score }}</div>
      </div>
      <div class="card-soft flex-1 p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" />
          最高分
        </div>
        <div class="text-2xl font-bold text-mint-600 font-number">{{ bestScore }}</div>
      </div>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="relative">
        <div
          class="card-soft p-2 select-none touch-none"
          @touchstart.passive="handleTouchStart"
          @touchend.passive="handleTouchEnd"
        >
          <div
            class="grid gap-px bg-cream-200 rounded-xl overflow-hidden"
            :style="{
              gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))`,
              width: 'min(85vw, 400px)',
              height: 'min(85vw, 400px)',
            }"
          >
            <template v-for="y in GRID_SIZE" :key="y">
              <div
                v-for="x in GRID_SIZE"
                :key="`${x}-${y}`"
                class="w-full h-full"
                :class="[
                  isSnakeHead(x - 1, y - 1)
                    ? 'bg-mint-500 rounded-sm'
                    : isSnakeBody(x - 1, y - 1)
                    ? 'bg-mint-400 rounded-sm'
                    : isFood(x - 1, y - 1)
                    ? 'bg-red-400 rounded-full'
                    : 'bg-cream-100',
                ]"
              />
            </template>
          </div>
        </div>

        <!-- 游戏结束遮罩 -->
        <div
          v-if="gameOver"
          class="absolute inset-0 bg-cocoa-900/60 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">💀</div>
          <div class="text-2xl font-bold text-white mb-1">游戏结束</div>
          <div class="text-sm text-white/80 mb-4">得分：{{ score }}</div>
          <button class="btn-primary" @click="startGame">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>

        <!-- 未开始遮罩 -->
        <div
          v-if="!isPlaying && !gameOver"
          class="absolute inset-0 bg-cocoa-900/40 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🐍</div>
          <div class="text-xl font-bold text-white mb-4">准备好了吗？</div>
          <button class="btn-primary" @click="startGame">
            <Play :size="16" />
            开始游戏
          </button>
        </div>

        <!-- 暂停遮罩 -->
        <div
          v-if="isPaused && isPlaying"
          class="absolute inset-0 bg-cocoa-900/40 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">⏸️</div>
          <div class="text-xl font-bold text-white mb-4">游戏暂停</div>
          <button class="btn-primary" @click="resumeGame">
            <Play :size="16" />
            继续游戏
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button class="btn-mint" @click="togglePause">
        <component :is="isPlaying && !isPaused ? Pause : Play" :size="16" />
        {{ buttonText }}
      </button>
      <button class="btn-secondary" @click="resetGame">
        <RotateCcw :size="16" />
        重置
      </button>
    </div>

    <!-- 方向键（移动端友好） -->
    <div class="flex justify-center">
      <div class="grid grid-cols-3 gap-2 w-40">
        <div></div>
        <button class="btn-secondary !p-3" @click="changeDirection('up')">
          ↑
        </button>
        <div></div>
        <button class="btn-secondary !p-3" @click="changeDirection('left')">
          ←
        </button>
        <button class="btn-secondary !p-3" @click="changeDirection('down')">
          ↓
        </button>
        <button class="btn-secondary !p-3" @click="changeDirection('right')">
          →
        </button>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 方向键或 WASD 控制，空格键暂停，移动端可滑动屏幕</p>
      <p>蛇的长度：<span class="font-bold text-mint-600">{{ snake.length }}</span> 节</p>
    </div>
  </div>
</template>
