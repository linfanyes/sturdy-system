<script setup lang="ts">
/**
 * 数独 —— 核心状态机已提升到 @gardener/shared/games/sudoku。
 * 桥接：Cell 矩阵呈现（{ v, fixed, error }）、点击选格、数字输入、通关计数。
 * 模板沿用原有 Cell API，内部适配为 shared Sudoku 的 flat 数组模型。
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Grid3x3 } from 'lucide-vue-next'
import { Sudoku } from '@gardener/shared/games/sudoku'

const router = useRouter()
type Cell = { v: number; fixed: boolean; error: boolean }

// shared 状态机（holes=45 接近原 web 的 55% 挖空率）
const machine = new Sudoku({ holes: 45 })

// 派生渲染矩阵：puzzle=1/当前值=2 ⇒ fixed；bad 标记对应 error
function toCellMatrix(): Cell[][] {
  const out: Cell[][] = []
  for (let r = 0; r < 9; r++) {
    const row: Cell[] = []
    for (let c = 0; c < 9; c++) {
      const i = r * 9 + c
      row.push({
        v: machine.current[i]!,
        fixed: machine.puzzle[i] !== 0,
        error: machine.bad[i]!,
      })
    }
    out.push(row)
  }
  return out
}

const board = ref<Cell[][]>(toCellMatrix())
// selected 为 [r, c]；内部对齐到 machine.sel（一维索引）
const selected = ref<[number, number] | null>(null)
const wins = ref(parseInt(localStorage.getItem('web_game_sudoku_highscore') || '0'))

function syncFromMachine() {
  board.value = toCellMatrix()
}

function select(r: number, c: number) {
  if (board.value[r][c].fixed) return
  selected.value = [r, c]
  machine.select(r * 9 + c)
}

function input(n: number) {
  if (!selected.value) return
  const [r, c] = selected.value
  if (board.value[r][c].fixed) return
  machine.select(r * 9 + c)
  const res = machine.fill(n)
  syncFromMachine()
  if (res.solved) {
    wins.value++
    localStorage.setItem('web_game_sudoku_highscore', String(wins.value))
  }
}

function reset() {
  machine.reset()
  selected.value = null
  syncFromMachine()
}

// 完成判定：shared Sudoku 在 fill 时检测到 solved 即所有空格都以 solution 一致值填入
const complete = computed(() => machine.solved)
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

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
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
              cell.fixed ? 'bg-cream-100 text-cocoa-900' : 'bg-surface text-butter-500 hover:bg-cream-50',
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
        <button class="w-9 h-9 rounded-lg bg-cream-200 hover:bg-cream-300 text-cocoa-500" @click="input(0)">✗</button>
      </div>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 新一局
      </button>
    </div>
  </div>
</template>
