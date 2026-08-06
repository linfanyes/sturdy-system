<script setup lang="ts">
/**
 * 2048 —— 核心状态机已提升到 @gardener/shared/games/game2048。
 * 桥接：grid 渲染、键盘事件、localStorage 最高分、动画标记。
 * 分数规则（合并后新值直接加入 score）与改造前行为一致。
 */
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Grid3x3 } from 'lucide-vue-next'
import type { Direction2048 } from '@gardener/shared/games/game2048'
import { Game2048 } from '@gardener/shared/games/game2048'

const router = useRouter()
const machine = new Game2048({ size: 4, target: 2048 })

// 响应式镜像
const grid = ref(boardClone(machine.board))
const score = ref(0)
const best = ref(parseInt(localStorage.getItem('web_game_2048_highscore') || '0'))
const won = ref(false)

function boardClone(b: number[][]): number[][] {
  return b.map(r => r.slice())
}

function syncFromMachine() {
  grid.value = boardClone(machine.board)
  score.value = machine.score
  won.value = machine.won
}

function updateBest() {
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('web_game_2048_highscore', String(score.value))
  }
}

function reset() {
  machine.reset()
  syncFromMachine()
  won.value = false
}

const DIR: Record<string, Direction2048> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
}

function move(dir: Direction2048) {
  if (machine.over) return
  const res = machine.move(dir)
  if (!res.moved) return
  syncFromMachine()
  updateBest()
}

function onKey(e: KeyboardEvent) {
  const d = DIR[e.key]
  if (!d) return
  e.preventDefault()
  move(d)
}

onMounted(() => { reset(); window.addEventListener('keydown', onKey) })
onUnmounted(() => window.removeEventListener('keydown', onKey))

// 数字→配色（保留原 web 端配色）
const colors: Record<number, string> = {
  0: 'bg-cream-100', 2: 'bg-cream-200 text-cocoa-700', 4: 'bg-butter-100 text-cocoa-700',
  8: 'bg-butter-300 text-white', 16: 'bg-butter-400 text-white', 32: 'bg-butter-500 text-white',
  64: 'bg-sakura-400 text-white', 128: 'bg-sakura-500 text-white', 256: 'bg-mint-400 text-white',
  512: 'bg-mint-500 text-white', 1024: 'bg-sky2-400 text-white', 2048: 'bg-sky2-500 text-white',
}
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Grid3x3 class="w-6 h-6 text-butter-500" /> 2048
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">分数：{{ score }}</span>
        <span class="text-cocoa-500 text-sm">最高：{{ best }}</span>
        <span v-if="won" class="text-mint-500 font-semibold">🎉 达成2048！</span>
      </div>

      <div class="bg-cocoa-700 p-2 rounded-xl">
        <div class="grid grid-cols-4 gap-2">
          <div
            v-for="(v, i) in grid.flat()"
            :key="i"
            class="w-16 h-16 rounded-lg flex items-center justify-center text-xl font-bold"
            :class="colors[v] || 'bg-cocoa-900 text-white'"
          >{{ v || '' }}</div>
        </div>
      </div>

      <p class="text-xs text-cocoa-500">使用方向键控制</p>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
