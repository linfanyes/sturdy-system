<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Grid3X3 } from 'lucide-vue-next'

const router = useRouter()
const N = ref(4)
const pattern = ref('seq')
const grid = ref<number[]>([])
const targetArr = ref<number[]>([])
const steps = ref(0)
const elapsed = ref(0)
const solved = ref(false)
const bestSteps = ref<Record<string, number>>(JSON.parse(localStorage.getItem('web_game_slidingPuzzle_best') || '{}'))
let blankPos = 0
let timer: ReturnType<typeof setInterval> | null = null
let startTime = 0

const diffs = [{ n: 3 }, { n: 4 }, { n: 5 }]
const patterns = [
  { k: 'seq', n: '顺序' },
  { k: 'rev', n: '倒序' },
  { k: 'snake', n: '蛇���' },
  { k: 'spiral', n: '螺旋' },
]
const patternName = computed(() => patterns.find((p) => p.k === pattern.value)?.n || '')

const solvedArr = computed(() => targetArr.value)

function bestKey() { return N.value + 'x' + N.value + '_' + pattern.value }

function getBest(): number {
  return bestSteps.value[bestKey()] || 0
}

function saveBest(stepsN: number) {
  const prev = getBest()
  if (prev === 0 || stepsN < prev) {
    bestSteps.value[bestKey()] = stepsN
    localStorage.setItem('web_game_slidingPuzzle_best', JSON.stringify(bestSteps.value))
    return true
  }
  return false
}

function buildSolved(n: number, pat: string): { arr: number[]; blankPos: number } {
  const arr = Array(n * n).fill(0)
  const order: number[] = []
  if (pat === 'seq') {
    for (let i = 0; i < n * n; i++) order.push(i)
  } else if (pat === 'rev') {
    for (let i = n * n - 2; i >= 0; i--) order.push(i)
    order.push(n * n - 1)
  } else if (pat === 'snake') {
    for (let r = 0; r < n; r++) {
      if (r % 2 === 0) for (let c = 0; c < n; c++) order.push(r * n + c)
      else for (let c = n - 1; c >= 0; c--) order.push(r * n + c)
    }
  } else if (pat === 'spiral') {
    let top = 0, bot = n - 1, left = 0, right = n - 1
    while (top <= bot && left <= right) {
      for (let c = left; c <= right; c++) order.push(top * n + c); top++
      for (let r = top; r <= bot; r++) order.push(r * n + right); right--
      if (top <= bot) { for (let c = right; c >= left; c--) order.push(bot * n + c); bot-- }
      if (left <= right) { for (let r = bot; r >= top; r--) order.push(r * n + left); left++ }
    }
  }
  for (let i = 0; i < n * n - 1; i++) arr[order[i]] = i + 1
  return { arr, blankPos: order[n * n - 1] }
}

function shuffleSolvable(solved: { arr: number[]; blankPos: number }): { g: number[]; blank: number } {
  const g = solved.arr.slice()
  let blank = solved.blankPos
  let lastBlank = -1
  const n = N.value
  for (let i = 0; i < 100; i++) {
    const neighbors: number[] = []
    const r = Math.floor(blank / n), c = blank % n
    if (r > 0) neighbors.push(blank - n)
    if (r < n - 1) neighbors.push(blank + n)
    if (c > 0) neighbors.push(blank - 1)
    if (c < n - 1) neighbors.push(blank + 1)
    const filt = neighbors.filter((p) => p !== lastBlank)
    const pick = (filt.length ? filt : neighbors)[Math.floor(Math.random() * (filt.length ? filt.length : neighbors.length))]
    g[blank] = g[pick]
    g[pick] = 0
    lastBlank = blank
    blank = pick
  }
  return { g, blank }
}

function newGame() {
  const s = buildSolved(N.value, pattern.value)
  targetArr.value = s.arr.slice()
  const { g, blank } = shuffleSolvable(s)
  grid.value = g
  blankPos = blank
  steps.value = 0
  elapsed.value = 0
  solved.value = false
  if (timer) clearInterval(timer)
  startTime = Date.now()
  timer = setInterval(() => { if (!solved.value) elapsed.value = Date.now() - startTime }, 200)
}

function setDiff(n: number) { if (n !== N.value) { N.value = n; newGame() } }
function setPattern(k: string) { if (k !== pattern.value) { pattern.value = k; newGame() } }

function checkSolved(): boolean {
  for (let i = 0; i < N.value * N.value; i++) {
    if (grid.value[i] !== targetArr.value[i]) return false
  }
  return true
}

function moveTile(tileAt: number) {
  if (solved.value) return
  const n = N.value
  const r1 = Math.floor(tileAt / n), c1 = tileAt % n
  const r2 = Math.floor(blankPos / n), c2 = blankPos % n
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return
  const newGrid = [...grid.value]
  newGrid[blankPos] = newGrid[tileAt]
  newGrid[tileAt] = 0
  grid.value = newGrid
  blankPos = tileAt
  steps.value++
  if (checkSolved()) {
    solved.value = true
    if (timer) { clearInterval(timer); timer = null }
    saveBest(steps.value)
  }
}

function tap(i: number) {
  if (grid.value[i] === 0) return
  moveTile(i)
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return m > 0 ? `${m}分${s % 60}秒` : `${s}秒`
}

function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

onMounted(() => newGame())
onUnmounted(() => stopTimer())
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Grid3X3 class="w-6 h-6 text-butter-500" /> 数字推盘
    </h1>

    <div class="bg-surface rounded-2xl p-4 shadow-softer flex flex-col items-center gap-3">
      <!-- 控制区 -->
      <div class="flex flex-wrap gap-4 w-full text-sm">
        <div>
          <p class="text-cocoa-400 text-xs">难度</p>
          <div class="flex gap-1 mt-1">
            <button v-for="d in diffs" :key="d.n"
              class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              :class="N === d.n ? 'bg-butter-500 text-white' : 'bg-cream-100 text-cocoa-600 hover:bg-cream-200'"
              @click="setDiff(d.n)">{{ d.n }}×{{ d.n }}</button>
          </div>
        </div>
        <div>
          <p class="text-cocoa-400 text-xs">目标</p>
          <div class="flex gap-1 mt-1">
            <button v-for="p in patterns" :key="p.k"
              class="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              :class="pattern === p.k ? 'bg-butter-500 text-white' : 'bg-cream-100 text-cocoa-600 hover:bg-cream-200'"
              @click="setPattern(p.k)">{{ p.n }}</button>
          </div>
        </div>
      </div>

      <!-- 状态 -->
      <div class="flex items-center justify-between w-full text-sm text-cocoa-600">
        <span>步数：{{ steps }}</span>
        <span>最佳：{{ getBest() || '-' }}</span>
        <span>{{ formatTime(elapsed) }}</span>
      </div>

      <!-- 目标预览 -->
      <div class="flex flex-col items-center">
        <div class="grid gap-0.5 bg-cocoa-200 p-0.5 rounded"
          :style="{ gridTemplateColumns: 'repeat(' + N + ', 1fr)', width: 120 + 'px' }">
          <div v-for="(v, i) in solvedArr" :key="'pv' + i"
            class="flex items-center justify-center text-xs aspect-square"
            :class="v === 0 ? 'bg-cream-50' : 'bg-cream-100'">
            <span v-if="v">{{ v }}</span>
          </div>
        </div>
        <p class="text-cocoa-400 text-xs mt-1">↑ 目标排列（{{ patternName }}）</p>
      </div>

      <!-- 棋盘 -->
      <div class="grid gap-1 bg-cocoa-200 p-1 rounded-xl select-none"
        :style="{ gridTemplateColumns: 'repeat(' + N + ', 1fr)', width: 320 + 'px', height: 320 + 'px' }">
        <div v-for="(v, i) in grid" :key="i"
          class="flex items-center justify-center rounded-lg cursor-pointer transition-colors select-none"
          :class="v === 0 ? 'bg-cream-50' : 'bg-cream-200 hover:bg-cream-300 active:bg-butter-200'"
          @click="tap(i)">
          <span v-if="v" class="font-bold text-cocoa-800" :style="{ fontSize: N >= 4 ? '1rem' : '1.5rem' }">{{ v }}</span>
        </div>
      </div>

      <!-- 操作 -->
      <div class="flex gap-2">
        <button class="px-5 py-2 bg-butter-500 text-white rounded-xl text-sm font-medium hover:bg-butter-600" @click="newGame">新局</button>
        <button v-if="!solved" class="px-5 py-2 bg-cream-100 text-cocoa-600 rounded-xl text-sm border border-cocoa-200 hover:bg-cream-200"
          @click="solved = true; grid = [...targetArr]; stopTimer()">放弃</button>
      </div>

      <div v-if="solved" class="text-green-600 font-bold text-lg">🎉 完成！步数 {{ steps }} · 用时 {{ formatTime(elapsed) }}</div>
    </div>
  </div>
</template>
