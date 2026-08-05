<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw } from 'lucide-vue-next'

const router = useRouter()
const started = ref(false)
const over = ref(false)
const score = ref(0)
const combo = ref(0)
const rows = ref<{ id: number; y: number; blackCol: number; tapped: boolean; miss: boolean }[]>([])
const best = ref(parseInt(localStorage.getItem('web_game_tapblack_highscore') || '0'))

const COLS = 4
const TILE_H = 100
const INIT_ROWS = 6
const BOARD_H = 520
const BOARD_W = 360
const colW = BOARD_W / COLS
let timer: ReturnType<typeof setInterval> | null = null
let speed = 2
let uid = 0

const mult = computed(() => Math.min(1 + Math.floor(combo.value / 10), 5))

function initRows() {
  rows.value = []
  for (let i = 0; i < INIT_ROWS; i++) {
    rows.value.push({ id: uid++, y: -TILE_H + i * TILE_H, blackCol: Math.floor(Math.random() * 4), tapped: false, miss: false })
  }
}

function tick() {
  if (over.value) return
  for (const r of rows.value) r.y += speed
  for (const r of rows.value) {
    if (r.y > BOARD_H && !r.tapped) {
      r.miss = true
      return fail()
    }
  }
  rows.value = rows.value.filter((r) => r.y <= BOARD_H + TILE_H)
  let topY = Infinity
  for (const r of rows.value) if (r.y < topY) topY = r.y
  while (topY > -TILE_H) {
    topY -= TILE_H
    rows.value.push({ id: uid++, y: topY, blackCol: Math.floor(Math.random() * 4), tapped: false, miss: false })
  }
}

function tapTile(row: { id: number; y: number; blackCol: number; tapped: boolean; miss: boolean }, col: number) {
  if (over.value || row.tapped) return
  if (col === row.blackCol) {
    row.tapped = true
    combo.value++
    score.value += 1 * mult.value
    if (score.value % 10 === 0) speed = Math.min(speed + 0.3, 8)
  } else {
    row.miss = true
    fail()
  }
}

function fail() {
  if (over.value) return
  over.value = true
  if (timer) { clearInterval(timer); timer = null }
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('web_game_tapblack_highscore', String(score.value))
  }
}

function start() {
  score.value = 0; combo.value = 0; speed = 2
  over.value = false; uid = 0
  initRows()
  started.value = true
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

function stop() {
  if (timer) { clearInterval(timer); timer = null }
  started.value = false
}

onUnmounted(stop)
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <RefreshCw class="w-6 h-6 text-butter-500" /> 别踩白块
    </h1>

    <div v-if="!started" class="flex flex-col items-center gap-4 py-12">
      <p class="text-cocoa-600">点击黑块得分，别踩白块</p>
      <p class="text-cocoa-400 text-sm">速度会逐渐加快，连对 10 次分数翻倍</p>
      <button class="px-8 py-3 bg-butter-500 text-white rounded-xl font-semibold hover:bg-butter-600 transition-colors" @click="start">开始游戏</button>
      <p class="text-cocoa-400 text-xs mt-4">最高分：{{ best }}</p>
    </div>

    <div v-else class="bg-surface rounded-2xl p-4 shadow-softer flex flex-col items-center gap-3">
      <div class="flex items-center justify-between w-full text-sm">
        <span class="text-cocoa-700 font-semibold">得分：{{ score }}</span>
        <span class="text-cocoa-500">连击 {{ combo }} ×{{ mult }}</span>
        <span class="text-cocoa-500">最高 {{ best }}</span>
      </div>

      <div class="relative overflow-hidden rounded-xl border-2 border-cocoa-200" :style="{ width: BOARD_W + 'px', height: BOARD_H + 'px' }">
        <div v-for="row in rows" :key="row.id">
          <div v-for="col in 4" :key="col"
            class="absolute cursor-pointer border-r border-b border-cocoa-200 box-border transition-colors"
            :style="{
              left: ((col - 1) * colW) + 'px',
              top: row.y + 'px',
              width: colW + 'px',
              height: TILE_H + 'px',
            }"
            :class="{
              'bg-gray-900': (col - 1) === row.blackCol && !row.tapped && !row.miss,
              'bg-butter-400': (col - 1) === row.blackCol && row.tapped,
              'bg-red-500': row.miss,
              'bg-gray-100': (col - 1) !== row.blackCol,
            }"
            @click="tapTile(row, col - 1)"
          ></div>
        </div>

        <div v-if="over" class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
          <p class="text-white text-xl font-bold">💀 失败</p>
          <p class="text-white/80 mt-2">得分 {{ score }}{{ score > best ? ' · 新纪录' : '' }}</p>
          <button class="mt-4 px-8 py-2 bg-butter-500 text-white rounded-xl" @click="start">再来一局</button>
        </div>
      </div>
    </div>
  </div>
</template>
