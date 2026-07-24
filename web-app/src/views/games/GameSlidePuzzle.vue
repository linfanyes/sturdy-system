<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Image } from 'lucide-vue-next'

const router = useRouter()
const SIZE = 3
const tiles = ref<number[]>([])
const moves = ref(0)
const best = ref(parseInt(localStorage.getItem('web_game_slidepuzzle_highscore') || '999'))

function shuffle(): number[] {
  // 1..8 + 0(空格)
  let arr = [...Array(SIZE * SIZE - 1).keys()].map(i => i + 1).concat([0])
  // 随机移动若干次保证可解
  for (let i = 0; i < 200; i++) {
    const zi = arr.indexOf(0)
    const r = Math.floor(zi / SIZE), c = zi % SIZE
    const neighbors: number[] = []
    if (r > 0) neighbors.push(zi - SIZE)
    if (r < SIZE - 1) neighbors.push(zi + SIZE)
    if (c > 0) neighbors.push(zi - 1)
    if (c < SIZE - 1) neighbors.push(zi + 1)
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)]
    ;[arr[zi], arr[pick]] = [arr[pick], arr[zi]]
  }
  return arr
}

function reset() {
  tiles.value = shuffle()
  moves.value = 0
}

function click(i: number) {
  const zi = tiles.value.indexOf(0)
  const r1 = Math.floor(i / SIZE), c1 = i % SIZE
  const r2 = Math.floor(zi / SIZE), c2 = zi % SIZE
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return
  ;[tiles.value[i], tiles.value[zi]] = [tiles.value[zi], tiles.value[i]]
  moves.value++
  if (solved.value && moves.value < best.value) {
    best.value = moves.value
    localStorage.setItem('web_game_slidepuzzle_highscore', String(moves.value))
  }
}

const solved = computed(() => tiles.value.every((v, i) => v === 0 ? i === tiles.value.length - 1 : v === i + 1))
reset()
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Image class="w-6 h-6 text-butter-500" /> 图片拼图
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">步数：{{ moves }}</span>
        <span class="text-cocoa-500 text-sm">最佳：{{ best === 999 ? '-' : best }}</span>
        <span v-if="solved" class="text-mint-500 font-semibold">🎉 完成！</span>
      </div>

      <div class="inline-block bg-cocoa-700 p-1 rounded-lg">
        <div class="grid gap-px" :style="{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }">
          <button
            v-for="(t, i) in tiles"
            :key="i"
            class="w-24 h-24 flex items-center justify-center text-3xl font-bold transition-colors"
            :class="t === 0 ? 'bg-cocoa-700' : 'bg-butter-400 hover:bg-butter-500 text-white'"
            @click="click(i)"
          >
            {{ t === 0 ? '' : t }}
          </button>
        </div>
      </div>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新打乱
      </button>
    </div>
  </div>
</template>
