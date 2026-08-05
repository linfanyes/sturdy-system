<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Puzzle } from 'lucide-vue-next'

const router = useRouter()
const SIZE = 8
const COLORS = 6
const grid = ref<number[][]>([])
const selected = ref<[number, number] | null>(null)
const score = ref(0)
const best = ref(parseInt(localStorage.getItem('web_game_match3_highscore') || '0'))

const colorClasses = [
  'bg-sakura-500', 'bg-butter-500', 'bg-mint-500', 'bg-sky2-500', 'bg-cocoa-500', 'bg-butter-300',
]

function build(): number[][] {
  const g: number[][] = []
  for (let r = 0; r < SIZE; r++) {
    const row: number[] = []
    for (let c = 0; c < SIZE; c++) {
      let v = Math.floor(Math.random() * COLORS)
      while ((c >= 2 && row[c-1] === v && row[c-2] === v) || (r >= 2 && g[r-1][c] === v && g[r-2][c] === v)) {
        v = Math.floor(Math.random() * COLORS)
      }
      row.push(v)
    }
    g.push(row)
  }
  return g
}

function reset() {
  grid.value = build()
  score.value = 0
  selected.value = null
}

function click(r: number, c: number) {
  if (!selected.value) {
    selected.value = [r, c]
    return
  }
  const [r0, c0] = selected.value
  if (Math.abs(r - r0) + Math.abs(c - c0) === 1) {
    [grid.value[r0][c0], grid.value[r][c]] = [grid.value[r][c], grid.value[r0][c0]]
    selected.value = null
    resolveMatches()
  } else {
    selected.value = [r, c]
  }
}

function findMatches(): Set<number> {
  const matched = new Set<number>()
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE - 2; c++) {
      const v = grid.value[r][c]
      if (v !== -1 && v === grid.value[r][c+1] && v === grid.value[r][c+2]) {
        matched.add(r * SIZE + c); matched.add(r * SIZE + c+1); matched.add(r * SIZE + c+2)
        let k = c + 3
        while (k < SIZE && grid.value[r][k] === v) { matched.add(r * SIZE + k); k++ }
      }
    }
  }
  for (let c = 0; c < SIZE; c++) {
    for (let r = 0; r < SIZE - 2; r++) {
      const v = grid.value[r][c]
      if (v !== -1 && v === grid.value[r+1][c] && v === grid.value[r+2][c]) {
        matched.add(r * SIZE + c); matched.add((r+1) * SIZE + c); matched.add((r+2) * SIZE + c)
        let k = r + 3
        while (k < SIZE && grid.value[k][c] === v) { matched.add(k * SIZE + c); k++ }
      }
    }
  }
  return matched
}

function resolveMatches() {
  let m = findMatches()
  if (m.size === 0) return
  score.value += m.size * 10
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('web_game_match3_highscore', String(score.value))
  }
  for (const idx of m) grid.value[Math.floor(idx / SIZE)][idx % SIZE] = -1
  // 下落
  for (let c = 0; c < SIZE; c++) {
    let write = SIZE - 1
    for (let r = SIZE - 1; r >= 0; r--) {
      if (grid.value[r][c] !== -1) {
        grid.value[write][c] = grid.value[r][c]
        if (write !== r) grid.value[r][c] = -1
        write--
      }
    }
    for (let r = write; r >= 0; r--) grid.value[r][c] = Math.floor(Math.random() * COLORS)
  }
  setTimeout(resolveMatches, 100)
}

const hasSelected = computed(() => selected.value !== null)
reset()
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Puzzle class="w-6 h-6 text-butter-500" /> 消消乐
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">分数：{{ score }}</span>
        <span class="text-cocoa-500 text-sm">最高：{{ best }}</span>
      </div>

      <div class="bg-cocoa-700 p-1 rounded-lg">
        <div class="grid grid-cols-8 gap-1">
          <button
            v-for="(v, idx) in grid.flat()"
            :key="idx"
            class="w-8 h-8 rounded transition-all"
            :class="[
              colorClasses[v] || 'bg-cocoa-700',
              hasSelected && selected![0] === Math.floor(idx/SIZE) && selected![1] === idx%8 ? 'ring-2 ring-white scale-95' : ''
            ]"
            @click="click(Math.floor(idx/SIZE), idx%8)"
          ></button>
        </div>
      </div>

      <p class="text-xs text-cocoa-500">点击两个相邻方块交换</p>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
