<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Circle, X } from 'lucide-vue-next'

const router = useRouter()
type Cell = 'X' | 'O' | ''
const board = ref<Cell[]>(Array(9).fill(''))
const current = ref<'X' | 'O'>('X')
const winner = ref<Cell | 'draw'>(null as unknown as Cell)
let winScore = parseInt(localStorage.getItem('web_game_tictactoe_highscore') || '0')
const xWins = ref(winScore)

const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]

function checkWin(b: Cell[]): Cell | 'draw' {
  for (const [a, c, d] of lines) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a]
  }
  return b.every(v => v) ? 'draw' : null as unknown as Cell
}

function place(i: number) {
  if (board.value[i] || winner.value) return
  board.value[i] = current.value
  const w = checkWin(board.value)
  if (w) {
    winner.value = w
    if (w === 'X') {
      xWins.value++
      localStorage.setItem('web_game_tictactoe_highscore', String(xWins.value))
    }
  } else {
    current.value = current.value === 'X' ? 'O' : 'X'
  }
}

function reset() {
  board.value = Array(9).fill('')
  current.value = 'X'
  winner.value = null as unknown as Cell
}

const status = computed(() => {
  if (winner.value === 'draw') return '平局！'
  if (winner.value) return `${winner.value} 获胜！`
  return `轮到 ${current.value}`
})
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Circle class="w-6 h-6 text-butter-500" /> 井字棋
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">{{ status }}</span>
        <span class="text-sm text-cocoa-500">X 胜场：{{ xWins }}</span>
      </div>

      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="(c, i) in board"
          :key="i"
          class="w-20 h-20 rounded-xl bg-cream-100 hover:bg-cream-200 flex items-center justify-center text-4xl font-bold transition-colors"
          @click="place(i)"
        >
          <X v-if="c === 'X'" class="w-10 h-10 text-sakura-500" />
          <Circle v-else-if="c === 'O'" class="w-10 h-10 text-sky2-500" />
        </button>
      </div>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
