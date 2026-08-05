<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const canvas = ref<HTMLCanvasElement | null>(null)
const score = ref(0)
const gameOver = ref(false)
const best = ref(parseInt(localStorage.getItem('web_game_tetris_highscore') || '0'))
let ctx: CanvasRenderingContext2D | null = null
let timer: ReturnType<typeof setInterval> | null = null

const COLS = 10, ROWS = 20, CELL = 24
const SHAPES = [
  [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]], [[1,0,0],[1,1,1]],
  [[0,0,1],[1,1,1]], [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]],
]
const COLORS = ['#d4a574', '#a8d5a8', '#f4a5a5', '#a5c5f4', '#d4a5f4', '#f4d4a5', '#a5f4d4']

let board: number[][] = []
let cur: { shape: number[][]; x: number; y: number; color: number } | null = null

function reset() {
  board = Array.from({ length: ROWS }, () => Array(COLS).fill(-1))
  score.value = 0
  gameOver.value = false
  spawn()
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 400)
  draw()
}

function spawn() {
  const i = Math.floor(Math.random() * SHAPES.length)
  cur = { shape: SHAPES[i].map(r => [...r]), x: 3, y: 0, color: i }
  if (collides(cur.shape, cur.x, cur.y)) {
    gameOver.value = true
    if (timer) clearInterval(timer)
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('web_game_tetris_highscore', String(score.value))
    }
  }
}

function collides(shape: number[][], x: number, y: number): boolean {
  for (let r = 0; r < shape.length; r++) for (let c = 0; c < shape[r].length; c++) {
    if (!shape[r][c]) continue
    const nx = x + c, ny = y + r
    if (nx < 0 || nx >= COLS || ny >= ROWS) return true
    if (ny >= 0 && board[ny][nx] !== -1) return true
  }
  return false
}

function merge() {
  if (!cur) return
  for (let r = 0; r < cur.shape.length; r++) for (let c = 0; c < cur.shape[r].length; c++) {
    if (cur.shape[r][c] && cur.y + r >= 0) board[cur.y + r][cur.x + c] = cur.color
  }
  // 清行
  let cleared = 0
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== -1)) {
      board.splice(r, 1)
      board.unshift(Array(COLS).fill(-1))
      cleared++
      r++
    }
  }
  if (cleared) score.value += cleared * 100
  spawn()
}

function tick() {
  if (!cur || gameOver.value) return
  if (!collides(cur.shape, cur.x, cur.y + 1)) {
    cur.y++
  } else {
    merge()
  }
  draw()
}

function rotate() {
  if (!cur) return
  const s = cur.shape
  const ns = s[0].map((_, i) => s.map(r => r[i]).reverse())
  if (!collides(ns, cur.x, cur.y)) cur.shape = ns
}

function move(dx: number) {
  if (!cur) return
  if (!collides(cur.shape, cur.x + dx, cur.y)) cur.x += dx
}

function draw() {
  if (!ctx) return
  ctx.fillStyle = '#3d2817'
  ctx.fillRect(0, 0, COLS * CELL, ROWS * CELL)
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (board[r][c] !== -1) drawCell(c, r, COLORS[board[r][c]])
  }
  if (cur) for (let r = 0; r < cur.shape.length; r++) for (let c = 0; c < cur.shape[r].length; c++) {
    if (cur.shape[r][c]) drawCell(cur.x + c, cur.y + r, COLORS[cur.color])
  }
}

function drawCell(c: number, r: number, color: string) {
  if (!ctx) return
  ctx.fillStyle = color
  ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2)
}

function onKey(e: KeyboardEvent) {
  if (gameOver.value) return
  if (e.key === 'ArrowLeft') { e.preventDefault(); move(-1); draw() }
  else if (e.key === 'ArrowRight') { e.preventDefault(); move(1); draw() }
  else if (e.key === 'ArrowDown') { e.preventDefault(); tick() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); rotate(); draw() }
}

onMounted(() => {
  if (canvas.value) ctx = canvas.value.getContext('2d')
  reset()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => { window.removeEventListener('keydown', onKey); if (timer) clearInterval(timer) })
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">🎮 俄罗斯方块</h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">分数：{{ score }}</span>
        <span class="text-cocoa-500 text-sm">最高：{{ best }}</span>
        <span v-if="gameOver" class="text-sakura-500 font-semibold">游戏结束</span>
      </div>

      <canvas ref="canvas" :width="COLS * CELL" :height="ROWS * CELL" class="rounded-lg"></canvas>
      <p class="text-xs text-cocoa-500">←→移动 ↑旋转 ↓加速</p>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
