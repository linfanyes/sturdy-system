<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Grid3x3 } from 'lucide-vue-next'

const router = useRouter()
type Cell = { v: number; fixed: boolean; error: boolean }
const board = ref<Cell[][]>([])
const selected = ref<[number, number] | null>(null)
const wins = ref(parseInt(localStorage.getItem('web_game_sudoku_highscore') || '0'))

function makePuzzle(): Cell[][] {
  // 简单生成：基于一个完整解挖空
  const base = [
    [5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],
    [8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],
    [9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9],
  ]
  return base.map(row => row.map(v => {
    const fixed = Math.random() < 0.45
    return { v: fixed ? v : 0, fixed, error: false }
  }))
}

function reset() {
  board.value = makePuzzle()
  selected.value = null
}

function select(r: number, c: number) {
  if (board.value[r][c].fixed) return
  selected.value = [r, c]
}

function input(n: number) {
  if (!selected.value) return
  const [r, c] = selected.value
  const cell = board.value[r][c]
  if (cell.fixed) return
  cell.v = n
  cell.error = n !== 0 && !isValid(r, c, n)
  if (isComplete()) {
    wins.value++
    localStorage.setItem('web_game_sudoku_highscore', String(wins.value))
  }
}

function isValid(r: number, c: number, n: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (i !== c && board.value[r][i].v === n) return false
    if (i !== r && board.value[i][c].v === n) return false
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const rr = br + i, cc = bc + j
    if ((rr !== r || cc !== c) && board.value[rr][cc].v === n) return false
  }
  return true
}

function isComplete(): boolean {
  return board.value.every(row => row.every(c => c.v !== 0 && !c.error))
}

const complete = computed(() => isComplete())
reset()
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Grid3x3 class="w-6 h-6 text-butter-500" /> 数独
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span v-if="complete" class="text-mint-500 font-semibold">🎉 完成！</span>
        <span v-else class="text-cocoa-700 font-semibold">点击格子输入数字</span>
        <span class="text-cocoa-500 text-sm">完成次数：{{ wins }}</span>
      </div>

      <div class="inline-block bg-cocoa-700 p-1 rounded-lg">
        <div class="grid grid-cols-9 gap-px bg-cocoa-700">
          <button
            v-for="(cell, idx) in board.flat()"
            :key="idx"
            class="w-9 h-9 flex items-center justify-center text-base font-semibold transition-colors"
            :class="[
              cell.fixed ? 'bg-cream-100 text-cocoa-900' : 'bg-white text-butter-500 hover:bg-cream-50',
              cell.error ? 'bg-sakura-500 text-white' : '',
              selected && selected[0] === Math.floor(idx/9) && selected[1] === idx%9 ? 'ring-2 ring-butter-400' : '',
              (Math.floor(idx/9) % 3 === 2 && Math.floor(idx/9) !== 8) || (idx%3 === 2 && idx%9 !== 8) ? '' : ''
            ]"
            @click="select(Math.floor(idx/9), idx%9)"
          >
            {{ cell.v || '' }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-9 gap-2">
        <button
          v-for="n in 9"
          :key="n"
          class="w-9 h-9 rounded-lg bg-cream-100 hover:bg-cream-200 text-cocoa-900 font-semibold"
          @click="input(n)"
        >{{ n }}</button>
        <button class="w-9 h-9 rounded-lg bg-cream-200 hover:bg-cream-300 text-cocoa-500" @click="input(0)">✕</button>
      </div>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 新一局
      </button>
    </div>
  </div>
</template>
