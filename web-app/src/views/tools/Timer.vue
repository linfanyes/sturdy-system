<script setup lang="ts">
/**
 * 倒计时工具
 * - 预设时长 1/3/5/10/15 分钟 + 自定义分钟
 * - 大数字 MM:SS 显示剩余时间
 * - 开始 / 暂停 / 重置
 * - 到时提醒：alert + 背景闪烁
 * - 进度环（SVG circle）
 */
import { ref, computed, onBeforeUnmount, watch } from 'vue'
import { Timer, Play, Pause, RotateCcw, Bell } from 'lucide-vue-next'

const presets = [1, 3, 5, 10, 15]
const customMinutes = ref<number | null>(null)
const totalSeconds = ref(60)
const remaining = ref(60)
const running = ref(false)
const flashing = ref(false)

const RADIUS = 80
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const progress = computed(() => (totalSeconds.value > 0 ? remaining.value / totalSeconds.value : 0))
const dashOffset = computed(() => CIRCUMFERENCE * (1 - progress.value))

function fmt(sec: number) {
  const m = Math.floor(Math.max(0, sec) / 60)
  const s = Math.max(0, sec) % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function setMinutes(min: number) {
  if (running.value) return
  const sec = Math.max(1, Math.floor(min * 60))
  totalSeconds.value = sec
  remaining.value = sec
  customMinutes.value = min
}

function applyCustom() {
  if (running.value) return
  const m = Number(customMinutes.value)
  if (!m || m <= 0) return
  setMinutes(m)
}

watch(customMinutes, (v) => {
  if (v && !running.value) setMinutes(Number(v))
})

let timer: number | undefined
function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

function start() {
  if (remaining.value <= 0) {
    remaining.value = totalSeconds.value
  }
  if (running.value) return
  running.value = true
  timer = window.setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      remaining.value = 0
      finish()
    }
  }, 1000)
}

function pause() {
  running.value = false
  stopTimer()
}

function reset() {
  running.value = false
  stopTimer()
  flashing.value = false
  remaining.value = totalSeconds.value
}

function finish() {
  running.value = false
  stopTimer()
  flashing.value = true
  alert('⏰ 时间到！')
  // 闪烁 6 次（约 3 秒）后自动停止
  window.setTimeout(() => { flashing.value = false }, 3000)
}

onBeforeUnmount(stopTimer)
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Timer class="w-6 h-6 text-butter-500" /> 课堂倒计时
    </h1>

    <!-- 预设时长 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3">预设时长</h2>
      <div class="flex flex-wrap items-center gap-3">
        <button
          v-for="m in presets"
          :key="m"
          :class="['px-4 py-2 rounded-xl text-sm font-medium transition', totalSeconds === m * 60 ? 'bg-butter-500 text-white' : 'bg-cream-100 text-cocoa-500 hover:bg-cream-200']"
          :disabled="running"
          @click="setMinutes(m)"
        >{{ m }} 分钟</button>
        <div class="flex items-center gap-2">
          <label class="text-sm text-cocoa-500">自定义</label>
          <input
            v-model.number="customMinutes"
            type="number"
            min="1"
            placeholder="分钟"
            class="w-24 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 disabled:bg-cream-100"
            :disabled="running"
            @change="applyCustom"
          />
          <span class="text-sm text-cocoa-400">分</span>
        </div>
      </div>
    </div>

    <!-- 倒计时显示 -->
    <div
      :class="['bg-surface rounded-2xl p-8 shadow-softer text-center transition-colors', flashing ? 'bg-butter-100 animate-pulse' : '']"
    >
      <div class="relative inline-flex items-center justify-center">
        <!-- SVG 进度环 -->
        <svg width="200" height="200" viewBox="0 0 200 200" class="-rotate-90">
          <circle
            cx="100"
            cy="100"
            :r="RADIUS"
            fill="none"
            stroke="rgb(var(--cream-200))"
            stroke-width="12"
          />
          <circle
            cx="100"
            cy="100"
            :r="RADIUS"
            fill="none"
            stroke="rgb(var(--butter-500))"
            stroke-width="12"
            stroke-linecap="round"
            :stroke-dasharray="CIRCUMFERENCE"
            :stroke-dashoffset="dashOffset"
            style="transition: stroke-dashoffset 1s linear"
          />
        </svg>
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <div :class="['text-5xl font-bold tabular-nums', remaining === 0 ? 'text-sakura-500' : 'text-cocoa-900']">
            {{ fmt(remaining) }}
          </div>
          <div class="text-sm text-cocoa-400 mt-1">剩余时间</div>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="flex items-center justify-center gap-3 mt-6">
        <button
          v-if="!running"
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-butter-500 text-white font-medium hover:bg-butter-600"
          @click="start"
        >
          <Play class="w-5 h-5" /> 开始
        </button>
        <button
          v-else
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cocoa-500 text-white font-medium hover:bg-cocoa-700"
          @click="pause"
        >
          <Pause class="w-5 h-5" /> 暂停
        </button>
        <button
          class="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-cream-100 text-cocoa-500 font-medium hover:bg-cream-200"
          @click="reset"
        >
          <RotateCcw class="w-5 h-5" /> 重置
        </button>
      </div>
      <div v-if="flashing" class="mt-4 flex items-center justify-center gap-2 text-sakura-500 font-semibold">
        <Bell class="w-5 h-5 animate-bounce" /> 时间到！
      </div>
    </div>
  </div>
</template>
