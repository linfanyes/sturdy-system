<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Circle } from 'lucide-vue-next'

const router = useRouter()
const SIZE = 15
type Stone = 0 | 1 | 2 // 0空 1黑 2白
const board = ref<Stone[][]>(Array.from({ length: SIZE }, () => Array(SIZE).fill(0)))
const current = ref<Stone>(1)
const winner = ref<Stone>(0)
const wins = ref(parseInt(localStorage.getItem('web_game_gomoku_highscore') || '0'))

function place(r: number, c: number) {
  if (board.value[r][c] || winner.value) return
  board.value[r][c] = current.value
  if (checkWin(r, c, current.value)) {
    winner.value = current.value
    if (winner.value === 1) {
      wins.value++
      localStorage.setItem('web_game_gomoku_highscore', String(wins.value))
    }
  } else {
    current.value = current.value === 1 ? 2 : 1
  }
}

function checkWin(r: number, c: number, s: Stone): boolean {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    let count = 1
    for (let i = 1; i < 5; i++) {
      const nr = r + dr * i, nc = c + dc * i
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board.value[nr][nc] !== s) break
      count++
    }
    for (let i = 1; i < 5; i++) {
      const nr = r - dr * i, nc = c - dc * i
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE || board.value[nr][nc] !== s) break
      count++
    }
    if (count >= 5) return true
  }
  return false
}

function reset() {
  board.value = Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
  current.value = 1
  winner.value = 0
}

const status = computed(() => winner.value === 0 ? `${current.value === 1 ? '黑' : '白'}方落子` : `${winner.value === 1 ? '黑' : '白'}方胜`)
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Circle class="w-6 h-6 text-cocoa-900" /> 五子棋
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">{{ status }}</span>
        <span class="text-cocoa-500 text-sm">黑方胜场：{{ wins }}</span>
      </div>

      <div class="inline-block bg-butter-300 p-1 rounded-lg">
        <div class="grid gap-px" :style="{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }">
          <button
            v-for="(cell, idx) in board.flat()"
            :key="idx"
            class="w-6 h-6 bg-butter-300 hover:bg-butter-400 flex items-center justify-center"
            @click="place(Math.floor(idx / SIZE), idx % SIZE)"
          >
            <span v-if="cell === 1" class="w-5 h-5 rounded-full bg-cocoa-900"></span>
            <span v-else-if="cell === 2" class="w-5 h-5 rounded-full bg-white border border-cocoa-300"></span>
          </button>
        </div>
      </div>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
