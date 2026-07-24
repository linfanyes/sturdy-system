<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Timer } from 'lucide-vue-next'

const router = useRouter()
const total = 15
const numbers = ref<number[]>([])
const next = ref(1)
const startTime = ref(0)
const elapsed = ref(0)
const finished = ref(false)
const errorIdx = ref(-1)
const best = ref(parseFloat(localStorage.getItem('web_game_sequence_highscore') || '0') || 0)
let timer: ReturnType<typeof setInterval> | null = null

function shuffle(): number[] {
  const arr = Array.from({ length: total }, (_, i) => i + 1)
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function reset() {
  numbers.value = shuffle()
  next.value = 1
  elapsed.value = 0
  finished.value = false
  errorIdx.value = -1
  startTime.value = Date.now()
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (!finished.value) elapsed.value = (Date.now() - startTime.value) / 1000
  }, 100)
}

function click(n: number, i: number) {
  if (finished.value) return
  if (n === next.value) {
    next.value++
    if (next.value > total) {
      finished.value = true
      if (timer) clearInterval(timer)
      const t = elapsed.value
      if (best.value === 0 || t < best.value) {
        best.value = t
        localStorage.setItem('web_game_sequence_highscore', String(t))
      }
    }
  } else {
    errorIdx.value = i
    setTimeout(() => (errorIdx.value = -1), 400)
  }
}

const timeStr = computed(() => elapsed.value.toFixed(1) + 's')
onMounted(reset)
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Timer class="w-6 h-6 text-butter-500" /> 数字排序
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">下一个：{{ next > total ? '完成' : next }}</span>
        <span class="text-cocoa-500">用时：{{ timeStr }}</span>
        <span class="text-cocoa-500">最佳：{{ best ? best.toFixed(1) + 's' : '-' }}</span>
      </div>

      <div class="grid grid-cols-5 gap-2">
        <button
          v-for="(n, i) in numbers"
          :key="i"
          class="w-14 h-14 rounded-xl text-xl font-bold flex items-center justify-center transition-colors"
          :class="n < next ? 'bg-mint-100 text-mint-500' : errorIdx === i ? 'bg-sakura-500 text-white' : 'bg-butter-500 text-white hover:bg-butter-400'"
          @click="click(n, i)"
        >
          {{ n }}
        </button>
      </div>

      <div v-if="finished" class="text-mint-500 font-semibold">🎉 通关！用时 {{ timeStr }}</div>

      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 inline-flex items-center gap-1" @click="reset">
        <RefreshCw class="w-4 h-4" /> 重新开始
      </button>
    </div>
  </div>
</template>
