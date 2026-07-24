<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Grid3x3 } from 'lucide-vue-next'

const router = useRouter()
const SIZE = 4
type Grid = number[][]
const grid = ref<Grid>([])
const score = ref(0)
const best = ref(parseInt(localStorage.getItem('web_game_2048_highscore') || '0'))
const won = ref(false)

function emptyGrid(): Grid {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function addRandom() {
  const empty: [number, number][] = []
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (grid.value[r][c] === 0) empty.push([r, c])
  }
  if (empty.length === 0) return
  const [r, c] = empty[Math.floor(Math.random() * empty.length)]
  grid.value[r][c] = Math.random() < 0.9 ? 2 : 4
}

function reset() {
  grid.value = emptyGrid()
  score.value = 0
  won.value = false
  addRandom()
  addRandom()
}

function slide(row: number[]): { row: number[]; gained: number } {
  const arr = row.filter(v => v !== 0)
  let gained = 0
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2
      gained += arr[i]
      if (arr[i] === 2048) won.value = true
      arr.splice(i + 1, 1)
    }
  }
  while (arr.length < SIZE) arr.push(0)
  return { row: arr, gained }
}

function rotate(g: Grid): Grid {
  const n = SIZE
  const r = emptyGrid()
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) r[j][n - 1 - i] = g[i][j]
  return r
}

function move(dir: 'left' | 'right' | 'up' | 'down') {
  let g = grid.value.map(r => [...r])
  const rotations = { left: 0, up: 3, right: 2, down: 1 }[dir]
  for (let i = 0; i < rotations; i++) g = rotate(g)
  let gained = 0
  let changed = false
  g = g.map(row => {
    const { row: nr, gained: gg } = slide(row)
    if (nr.join(',') !== row.join(',')) changed = true
    gained += gg
    return nr
  })
  for (let i = 0; i < (4 - rotations) % 4; i++) g = rotate(g)
  if (changed) {
    grid.value = g
    score.value += gained
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('web_game_2048_highscore', String(score.value))
    }
    addRandom()
  }
}

function onKey(e: KeyboardEvent) {
  const map: Record<string, 'left' | 'right' | 'up' | 'down'> = {
    ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
  }
  if (map[e.key]) {
    e.preventDefault()
    move(map[e.key])
  }
}

const colors: Record<number, string> = {
  0: 'bg-cream-100', 2: 'bg-cream-200 text-cocoa-700', 4: 'bg-butter-100 text-cocoa-700',
  8: 'bg-butter-300 text-white', 16: 'bg-butter-400 text-white', 32: 'bg-butter-500 text-white',
  64: 'bg-sakura-400 text-white', 128: 'bg-sakura-500 text-white', 256: 'bg-mint-400 text-white',
  512: 'bg-mint-500 text-white', 1024: 'bg-sky2-400 text-white', 2048: 'bg-sky2-500 text-white',
}

onMounted(() => { reset(); window.addEventListener('keydown', onKey) })
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Grid3x3 class="w-6 h-6 text-butter-500" /> 2048
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
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
