<script setup lang="ts">
/**
 * 贪吃蛇 —— 核心状态机已提升到 @gardener/shared/games/snake。
 * 桥接：响应式渲染、键盘事件、200ms 定时触发、localStorage 最高分保留。
 * 坐标系转换：shared {r=row, c=col} ↔ web {x=col, y=row}。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'
import { SnakeGame } from '@gardener/shared/games/snake'

const router = useRouter()
const SIZE = 18

// shared 状态机（size 18 对齐 web 端网格）
const machine = new SnakeGame({ size: SIZE, speed: 200, difficulty: 'medium' })

// 响应式镜像（保持模板 API 兼容）
const snake = ref(machine.snapshot().snake)
const food = ref(machine.snapshot().food)
const score = ref(0)
const gameOver = ref(false)
const best = ref(parseInt(localStorage.getItem('web_game_snake_highscore') || '0'))
let timer: ReturnType<typeof setInterval> | null = null

function syncFromMachine() {
  const s = machine.snapshot()
  snake.value = s.snake
  food.value = s.food
  // 原 web 端显示分值：每个食物 +10，与改造前行为一致（shared 内部 +1/食 × 10）
  score.value = s.score * 10
  gameOver.value = s.over
}

function tick() {
  if (machine.over) return
  const res = machine.step()
  syncFromMachine()
  if (res.over) {
    if (timer) { clearInterval(timer); timer = null }
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('web_game_snake_highscore', String(score.value))
    }
  }
}

;(machine as any).hooks = { onDie: () => { if (timer) { clearInterval(timer); timer = null } } }

function reset() {
  if (timer) { clearInterval(timer); timer = null }
  ;(machine as any).speed = 200
  machine.reset()
  syncFromMachine()
  timer = setInterval(tick, 200)
}

// 键盘方向（防 180° 反向在 shared SnakeGame.setDir 中处理）
const DIR: Record<string, { dx: number; dy: number }> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
}
function onKey(e: KeyboardEvent) {
  const nd = DIR[e.key]
  if (!nd) return
  // web {x=col, y=row} → shared {r=row, c=col} ⇒ setDir(r=dy, c=dx)
  const accepted = machine.setDir(nd.dy, nd.dx)
  if (accepted) e.preventDefault()
}

onMounted(() => { reset(); window.addEventListener('keydown', onKey) })
onUnmounted(() => { window.removeEventListener('keydown', onKey); if (timer) clearInterval(timer) })

// 单元格渲染：模板坐标 (r=row, c=col) ↔ shared {r, c} 直接对应
function cellType(r: number, c: number): string {
  const head = snake.value[0]
  if (head && head.r === r && head.c === c) return 'head'
  if (snake.value.some(s => s.r === r && s.c === c)) return 'body'
  if (food.value && food.value.r === r && food.value.c === c) return 'food'
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
