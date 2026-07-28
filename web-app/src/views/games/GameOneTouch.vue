<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, PenLine, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const router = useRouter()

/* ---------- 关卡配置 ---------- */
interface Level {
  n: number
  s: number
  e: number
}

const levels: Level[] = [
  { n: 3, s: 0, e: 8 },
  { n: 4, s: 0, e: 11 },
  { n: 5, s: 0, e: 24 },
  { n: 6, s: 0, e: 33 },
  { n: 7, s: 0, e: 48 },
]

const levelIdx = ref(0)
const N = computed(() => levels[levelIdx.value].n)
const startCell = computed(() => levels[levelIdx.value].s)
const endCell = computed(() => levels[levelIdx.value].e)
const totalCells = computed(() => N.value * N.value)

/* ---------- 游戏状态 ---------- */
const path = ref<number[]>([])
const win = ref(false)
const elapsed = ref(0)
let startTime = 0
let timer: ReturnType<typeof setInterval> | null = null
let boardRect: DOMRect | null = null

/* ---------- 辅助函数 ---------- */
function cellCol(i: number) { return i % N.value }
function cellRow(i: number) { return Math.floor(i / N.value) }
function pathIndex(i: number) { return path.value.indexOf(i) }
function isAdjacent(a: number, b: number) {
  return Math.abs(cellRow(a) - cellRow(b)) + Math.abs(cellCol(a) - cellCol(b)) === 1
}

function fmtTime(ms: number) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m}分${sec}秒` : `${sec}秒`
}

/* ---------- 棋盘测量 ---------- */
function measureBoard() {
  const el = document.querySelector('.board-grid')
  if (el) boardRect = el.getBoundingClientRect()
}

/* ---------- 坐标转格子 ---------- */
function pointToCell(clientX: number, clientY: number) {
  if (!boardRect) return -1
  const relX = clientX - boardRect.left
  const relY = clientY - boardRect.top
  if (relX < 0 || relY < 0 || relX >= boardRect.width || relY >= boardRect.height) return -1
  const c = Math.floor(relX / (boardRect.width / N.value))
  const r = Math.floor(relY / (boardRect.height / N.value))
  if (c < 0 || c >= N.value || r < 0 || r >= N.value) return -1
  return r * N.value + c
}

/* ---------- 计时器 ---------- */
function startTimer() {
  if (timer) return
  startTime = Date.now() - elapsed.value
  timer = setInterval(() => { elapsed.value = Date.now() - startTime }, 200)
}
function stopTimer() {
  if (timer) { clearInterval(timer); timer = null }
}

/* ---------- 输入处理 ---------- */
function handlePointerDown(e: MouseEvent | Touch) {
  if (win.value) return
  measureBoard()
  const cell = pointToCell(e.clientX, e.clientY)
  if (cell === -1) return
  if (path.value.length === 0) {
    if (cell === startCell.value) {
      path.value = [cell]
      startTimer()
    }
  }
}

function handlePointerMove(e: MouseEvent | Touch) {
  if (win.value || path.value.length === 0) return
  const cell = pointToCell(e.clientX, e.clientY)
  if (cell === -1) return
  const last = path.value[path.value.length - 1]
  if (cell === last) return
  const idx = path.value.indexOf(cell)
  // 已在路径中 → 回溯到该点
  if (idx >= 0) {
    if (idx <= path.value.length - 2) {
      path.value = path.value.slice(0, idx + 1)
    }
    return
  }
  // 邻接格子 → 扩展路径
  if (isAdjacent(cell, last)) {
    path.value.push(cell)
    checkWin()
  }
}

/* ---------- 鼠标事件 ---------- */
function onMouseDown(e: MouseEvent) {
  handlePointerDown(e)
  e.preventDefault()
}
function onMouseMove(e: MouseEvent) {
  handlePointerMove(e)
}

/* ---------- 触摸事件 ---------- */
function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]
  if (t) handlePointerDown(t)
}
function onTouchMove(e: TouchEvent) {
  const t = e.touches[0]
  if (t) handlePointerMove(t)
}
function onTouchEnd() {
  /* 松手不结束路径, 允许继续 */
}

/* ---------- 胜利检测 ---------- */
function checkWin() {
  if (path.value.length === totalCells.value &&
      path.value[path.value.length - 1] === endCell.value) {
    stopTimer()
    win.value = true
  }
}

/* ---------- 重置 ---------- */
function reset() {
  path.value = []
  win.value = false
  elapsed.value = 0
  stopTimer()
}

/* ---------- 关卡切换 ---------- */
function goToLevel(idx: number) {
  levelIdx.value = idx
  reset()
  requestAnimationFrame(measureBoard)
}

function prevLevel() {
  if (levelIdx.value > 0) goToLevel(levelIdx.value - 1)
}
function nextLevel() {
  if (levelIdx.value < levels.length - 1) goToLevel(levelIdx.value + 1)
}

/* ---------- 格子样式 ---------- */
function cellClasses(i: number) {
  const idx = pathIndex(i)
  const isVisited = idx >= 0
  const isHead = i === path.value[path.value.length - 1]
  const isS = i === startCell.value
  const isE = i === endCell.value
  const alt = (cellRow(i) + cellCol(i)) % 2 === 0

  return {
    'bg-butter-100': alt && !isVisited && !isS && !isE,
    'bg-cream-100': !alt && !isVisited && !isS && !isE,
    'bg-mint-300': isVisited && !isHead,
    'bg-mint-500': isHead,
    'bg-butter-500': isS && !isVisited,
    'bg-sakura-500': isE && !isVisited,
    'ring-2 ring-butter-300': isHead,
    'animate-pop': win.value,
    'text-white': isVisited || isS || isE,
  }
}
</script>

<template>
  <div class="space-y-4 select-none">
    <!-- 返回 -->
    <button
      class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm"
      @click="router.push('/teacher/games')"
    >
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <!-- 标题 -->
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <PenLine class="w-6 h-6" /> 一笔画
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <!-- 状态栏 -->
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold text-sm">
          关卡 {{ levelIdx + 1 }} / {{ levels.length }}
        </span>
        <span class="text-cocoa-500 text-sm">
          步数 {{ path.length }} / {{ totalCells }}
        </span>
        <span class="text-cocoa-600 text-sm font-mono">
          {{ fmtTime(elapsed) }}
        </span>
      </div>

      <!-- 棋盘 -->
      <div
        class="board-grid bg-cocoa-700 p-1 rounded-lg touch-none"
        :class="{ 'cursor-pointer': path.length === 0 }"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div
          class="grid gap-px"
          :style="{ gridTemplateColumns: `repeat(${N}, 1fr)` }"
        >
          <div
            v-for="i in totalCells"
            :key="i"
            class="relative flex items-center justify-center rounded-sm text-xs font-bold transition-colors duration-150"
            :class="[cellClasses(i - 1), 'cell-' + (i - 1)]"
            :style="{
              width: Math.min(480, Math.floor(460 / N)) / 4 + 'rem',
              height: Math.min(480, Math.floor(460 / N)) / 4 + 'rem',
            }"
          >
            <!-- S / E 标记 -->
            <span
              v-if="i - 1 === startCell && pathIndex(i - 1) < 0"
              class="text-lg font-black text-white"
            >S</span>
            <span
              v-if="i - 1 === endCell && pathIndex(i - 1) < 0"
              class="text-lg font-black text-white"
            >E</span>
            <!-- 步数编号 -->
            <span
              v-if="pathIndex(i - 1) >= 0"
              class="text-xs font-bold"
              :class="{ 'text-white': true }"
            >{{ pathIndex(i - 1) + 1 }}</span>
          </div>
        </div>
      </div>

      <!-- 提示 -->
      <p class="text-xs text-cocoa-500 text-center">
        从 <span class="font-bold text-butter-600">S</span> 画到
        <span class="font-bold text-sakura-500">E</span>，
        经过所有格子且不重复
      </p>

      <!-- 操作按钮 -->
      <div class="flex items-center gap-2 flex-wrap justify-center">
        <button
          class="px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-700 hover:bg-cream-200 inline-flex items-center gap-1 text-sm disabled:opacity-40"
          :disabled="levelIdx === 0"
          @click="prevLevel"
        >
          <ChevronLeft class="w-3.5 h-3.5" /> 上一关
        </button>

        <button
          class="px-3 py-1.5 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1 text-sm"
          @click="reset"
        >
          <RotateCcw class="w-3.5 h-3.5" /> 重置本关
        </button>

        <button
          class="px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-700 hover:bg-cream-200 inline-flex items-center gap-1 text-sm disabled:opacity-40"
          :disabled="levelIdx === levels.length - 1"
          @click="nextLevel"
        >
          下一关 <ChevronRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

    <!-- 胜利弹窗 -->
    <Teleport to="body">
      <div
        v-if="win"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click="win = false"
      >
        <div
          class="bg-white rounded-3xl p-8 shadow-pop flex flex-col items-center gap-3 min-w-[220px] animate-fadeIn"
          @click.stop
        >
          <span class="text-5xl">🎉</span>
          <h2 class="text-xl font-black text-cocoa-900">通关！</h2>
          <p class="text-sm text-cocoa-500">用时 {{ fmtTime(elapsed) }}</p>
          <div class="flex items-center gap-2 mt-1">
            <button
              v-if="levelIdx < levels.length - 1"
              class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 text-sm font-semibold inline-flex items-center gap-1"
              @click="nextLevel"
            >
              下一关 <ChevronRight class="w-3.5 h-3.5" />
            </button>
            <button
              class="px-4 py-2 rounded-xl bg-cream-100 text-cocoa-700 hover:bg-cream-200 text-sm font-semibold inline-flex items-center gap-1"
              @click="reset"
            >
              <RotateCcw class="w-3.5 h-3.5" /> 再来一次
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.board-grid {
  user-select: none;
  -webkit-user-select: none;
}

.animate-pop {
  animation: pop 0.4s ease;
}

@keyframes pop {
  0% { transform: scale(0.85); }
  60% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
</style>
