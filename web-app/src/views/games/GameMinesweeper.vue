<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Bomb, Flag } from 'lucide-vue-next'

const router = useRouter()
const SIZE = 9
const MINES = 10
interface Cell { mine: boolean; revealed: boolean; flagged: boolean; count: number }
const grid = ref<Cell[][]>([])
const gameOver = ref(false)
const won = ref(false)
const wins = ref(parseInt(localStorage.getItem('web_game_minesweeper_highscore') || '0'))

function build(): Cell[][] {
  const g: Cell[][] = Array.from({ length: SIZE }, () =>
    Array.from({ length: SIZE }, () => ({ mine: false, revealed: false, flagged: false, count: 0 }))
  )
  let placed = 0
  while (placed < MINES) {
    const r = Math.floor(Math.random() * SIZE), c = Math.floor(Math.random() * SIZE)
    if (!g[r][c].mine) { g[r][c].mine = true; placed++ }
  }
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (g[r][c].mine) continue
    let cnt = 0
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && g[nr][nc].mine) cnt++
    }
    g[r][c].count = cnt
  }
  return g
}

function reset() {
  grid.value = build()
  gameOver.value = false
  won.value = false
}

function reveal(r: number, c: number) {
  if (gameOver.value) return
  const cell = grid.value[r][c]
  if (cell.revealed || cell.flagged) return
  cell.revealed = true
  if (cell.mine) {
    gameOver.value = true
    grid.value.forEach(row => row.forEach(cl => { if (cl.mine) cl.revealed = true }))
    return
  }
  if (cell.count === 0) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !grid.value[nr][nc].revealed) reveal(nr, nc)
    }
  }
  checkWin()
}

function flag(e: Event, r: number, c: number) {
  e.preventDefault()
  if (gameOver.value) return
  const cell = grid.value[r][c]
  if (!cell.revealed) cell.flagged = !cell.flagged
}

function checkWin() {
  const allSafe = grid.value.every(row => row.every(c => c.mine || c.revealed))
  if (allSafe) {
    won.value = true
    gameOver.value = true
    wins.value++
    localStorage.setItem('web_game_minesweeper_highscore', String(wins.value))
  }
}

const numberColors = ['', 'text-sky2-500', 'text-mint-500', 'text-sakura-500', 'text-cocoa-700', 'text-butter-500', 'text-cocoa-500', 'text-cocoa-900', 'text-cocoa-300']
reset()
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Bomb class="w-6 h-6 text-butter-500" /> 扫雷
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">💣 {{ MINES }} 颗雷</span>
        <span v-if="won" class="text-mint-500 font-semibold">🎉 胜利！</span>
        <span v-else-if="gameOver" class="text-sakura-500 font-semibold">游戏结束</span>
        <span v-else class="text-cocoa-500 text-sm">左键揭开 / 右键标记</span>
        <span class="text-cocoa-500 text-sm">胜场：{{ wins }}</span>
      </div>

      <div class="bg-cocoa-700 p-1 rounded-lg">
        <div class="grid grid-cols-9 gap-px">
          <button
            v-for="(cell, idx) in grid.flat()"
            :key="idx"
            class="w-8 h-8 flex items-center justify-center text-sm font-bold transition-colors"
            :class="cell.revealed ? (cell.mine ? 'bg-sakura-500' : 'bg-cream-100') : 'bg-butter-400 hover:bg-butter-300'"
            @click="reveal(Math.floor(idx/SIZE), idx%SIZE)"
            @contextmenu="flag($event, Math.floor(idx/SIZE), idx%SIZE)"
          >
            <Bomb v-if="cell.revealed && cell.mine" class="w-4 h-4 text-white" />
            <Flag v-else-if="cell.flagged" class="w-4 h-4 text-sakura-500" />
            <span v-else-if="cell.revealed && cell.count > 0" :class="numberColors[cell.count]">{{ cell.count }}</span>
          </button>
        </div>
      </div>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
