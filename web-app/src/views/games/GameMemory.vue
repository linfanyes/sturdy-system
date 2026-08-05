<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-vue-next'

const router = useRouter()
const emojis = ['🍎', '🍌', '🍇', '🍓', '🍑', '🍒', '🥝', '🍍']

interface Card { id: number; emoji: string; flipped: boolean; matched: boolean }

const cards = ref<Card[]>([])
const flipped = ref<number[]>([])
const moves = ref(0)
const matched = ref(0)
const best = ref(parseInt(localStorage.getItem('web_game_memory_highscore') || '999'))

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function reset() {
  const pairs = shuffle([...emojis, ...emojis])
  cards.value = pairs.map((e, i) => ({ id: i, emoji: e, flipped: false, matched: false }))
  flipped.value = []
  moves.value = 0
  matched.value = 0
}

function flip(i: number) {
  const c = cards.value[i]
  if (c.flipped || c.matched || flipped.value.length === 2) return
  c.flipped = true
  flipped.value.push(i)
  if (flipped.value.length === 2) {
    moves.value++
    const [a, b] = flipped.value
    if (cards.value[a].emoji === cards.value[b].emoji) {
      cards.value[a].matched = true
      cards.value[b].matched = true
      matched.value += 2
      flipped.value = []
      if (matched.value === cards.value.length && moves.value < best.value) {
        best.value = moves.value
        localStorage.setItem('web_game_memory_highscore', String(moves.value))
      }
    } else {
      setTimeout(() => {
        cards.value[a].flipped = false
        cards.value[b].flipped = false
        flipped.value = []
      }, 800)
    }
  }
}

const won = computed(() => matched.value === cards.value.length && cards.value.length > 0)
onMounted(reset)
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Trophy class="w-6 h-6 text-butter-500" /> 记忆翻牌
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full text-sm">
        <span class="text-cocoa-700">步数：{{ moves }}</span>
        <span class="text-cocoa-500">最佳：{{ best === 999 ? '-' : best }}</span>
        <span v-if="won" class="text-mint-500 font-semibold">通关！</span>
      </div>

      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="(c, i) in cards"
          :key="c.id"
          class="w-16 h-16 rounded-xl text-3xl flex items-center justify-center transition-all"
          :class="c.flipped || c.matched ? 'bg-cream-100' : 'bg-butter-500 hover:bg-butter-400'"
          @click="flip(i)"
        >
          {{ c.flipped || c.matched ? c.emoji : '❓' }}
        </button>
      </div>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
