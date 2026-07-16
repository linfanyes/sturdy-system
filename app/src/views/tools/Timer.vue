<script setup lang="ts">
// 课堂计时器：支持倒计时与正计时（秒表），含预设、自定义、SVG 进度环、计次、全屏、提示音
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Play, Pause, RotateCcw, Maximize, Minimize, Flag } from 'lucide-vue-next'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import { useToastStore } from '../../stores/toast'

const toast = useToastStore()

const mode = ref<'countdown' | 'stopwatch'>('countdown')

// ============ 倒计时 ============
const presets = [1, 3, 5, 10, 15] // 分钟
const customMin = ref(3)
const customSec = ref(0)
const totalSec = ref(180) // 总秒数
const remainSec = ref(180) // 剩余秒数
const running = ref(false)
let timer: number | null = null

function setPreset(min: number) {
  pause()
  totalSec.value = min * 60
  remainSec.value = min * 60
}

function applyCustom() {
  pause()
  const total = customMin.value * 60 + customSec.value
  if (total <= 0) {
    toast.warning('请输入有效时长')
    return
  }
  totalSec.value = total
  remainSec.value = total
}

function startCountdown() {
  if (remainSec.value <= 0) {
    remainSec.value = totalSec.value
  }
  running.value = true
  timer = window.setInterval(() => {
    remainSec.value -= 1
    if (remainSec.value <= 0) {
      remainSec.value = 0
      pause()
      timeUp()
    }
  }, 1000)
}

function pause() {
  running.value = false
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function reset() {
  pause()
  remainSec.value = totalSec.value
}

const cdMm = computed(() => Math.floor(remainSec.value / 60).toString().padStart(2, '0'))
const cdSs = computed(() => (remainSec.value % 60).toString().padStart(2, '0'))
const cdProgress = computed(() => {
  if (totalSec.value <= 0) return 0
  return (1 - remainSec.value / totalSec.value) * 100
})
const cdDanger = computed(() => remainSec.value > 0 && remainSec.value <= 10)

// SVG 进度环半径（viewBox 240x240，圆心 120,120，半径 120 刚好贴边）
const RING_R = 120

function timeUp() {
  toast.warning('时间到！')
  playBeeps(3)
}

// ============ 正计时（秒表）============
const swMs = ref(0) // 已用毫秒
const swRunning = ref(false)
let swTimer: number | null = null
let swStartTs = 0
const laps = ref<number[]>([])

function startStopwatch() {
  swRunning.value = true
  swStartTs = Date.now() - swMs.value
  swTimer = window.setInterval(() => {
    swMs.value = Date.now() - swStartTs
  }, 50)
}

function pauseStopwatch() {
  swRunning.value = false
  if (swTimer) {
    clearInterval(swTimer)
    swTimer = null
  }
}

function resetStopwatch() {
  pauseStopwatch()
  swMs.value = 0
  laps.value = []
}

function addLap() {
  laps.value.unshift(swMs.value)
}

const swMm = computed(() => Math.floor(swMs.value / 60000).toString().padStart(2, '0'))
const swSs = computed(() => (Math.floor(swMs.value / 1000) % 60).toString().padStart(2, '0'))
const swMs2 = computed(() => Math.floor((swMs.value % 1000) / 10).toString().padStart(2, '0'))

function formatLap(ms: number): string {
  const mm = Math.floor(ms / 60000).toString().padStart(2, '0')
  const ss = (Math.floor(ms / 1000) % 60).toString().padStart(2, '0')
  const cs = Math.floor((ms % 1000) / 10).toString().padStart(2, '0')
  return `${mm}:${ss}.${cs}`
}

// ============ 提示音（AudioContext 生成 beep）============
function playBeeps(times: number) {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    for (let i = 0; i < times; i++) {
      const t0 = ctx.currentTime + i * 0.4
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.frequency.value = 880
      o.type = 'sine'
      o.connect(g)
      g.connect(ctx.destination)
      g.gain.setValueAtTime(0, t0)
      g.gain.linearRampToValueAtTime(0.3, t0 + 0.05)
      g.gain.linearRampToValueAtTime(0, t0 + 0.3)
      o.start(t0)
      o.stop(t0 + 0.32)
    }
  } catch {
    /* noop */
  }
}

// ============ 全屏 ============
const fullscreenEl = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

async function toggleFullscreen() {
  if (!fullscreenEl.value) return
  try {
    if (!document.fullscreenElement) {
      await fullscreenEl.value.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  } catch {
    /* noop */
  }
}

function onFsChange() {
  isFullscreen.value = !!document.fullscreenElement
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFsChange)
})

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', onFsChange)
  if (timer) clearInterval(timer)
  if (swTimer) clearInterval(swTimer)
})
</script>

<template>
  <div
    ref="fullscreenEl"
    :class="isFullscreen
      ? 'min-h-screen bg-gradient-to-br from-cocoa-100 via-cream-50 to-cocoa-100 flex flex-col items-center justify-center p-8 space-y-6'
      : 'space-y-4'"
  >
    <template v-if="!isFullscreen">
      <ToolBackButton />

      <section class="card-soft p-5 bg-gradient-to-br from-cocoa-100 via-cream-50 to-cocoa-100">
        <div class="flex items-start gap-4 flex-wrap">
          <div
            class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cocoa-300 to-cocoa-500 flex items-center justify-center text-2xl shadow-softer"
          >
            ⏱️
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="title-display text-xl text-cocoa-900">
              课堂计时器
            </h2>
            <p class="text-sm text-cocoa-600 mt-1">
              倒计时与正计时两种模式，支持预设、自定义、进度环、计次、全屏与提示音。
            </p>
          </div>
          <button
            class="btn-ghost !py-2 !px-3 text-xs flex items-center gap-1"
            @click="toggleFullscreen"
          >
            <Maximize :size="14" /> 全屏
          </button>
        </div>
      </section>

      <!-- 模式切换 -->
      <section class="card-flat p-2 flex gap-1">
        <button
          class="flex-1 py-2 rounded-xl text-sm transition"
          :class="mode === 'countdown' ? 'bg-cocoa-300 text-cocoa-900 font-medium' : 'text-cocoa-600 hover:bg-cocoa-100'"
          @click="mode = 'countdown'"
        >
          倒计时
        </button>
        <button
          class="flex-1 py-2 rounded-xl text-sm transition"
          :class="mode === 'stopwatch' ? 'bg-cocoa-300 text-cocoa-900 font-medium' : 'text-cocoa-600 hover:bg-cocoa-100'"
          @click="mode = 'stopwatch'"
        >
          正计时（秒表）
        </button>
      </section>
    </template>

    <!-- 全屏模式：浮动退出按钮 + 模式切换 -->
    <template v-else>
      <button
        class="fixed top-4 right-4 btn-ghost !py-2 !px-3 text-xs flex items-center gap-1 z-50 bg-white/80"
        @click="toggleFullscreen"
      >
        <Minimize :size="14" /> 退出全屏
      </button>
      <section class="card-flat p-2 flex gap-1 max-w-md w-full mx-auto">
        <button
          class="flex-1 py-2 rounded-xl text-sm transition"
          :class="mode === 'countdown' ? 'bg-cocoa-300 text-cocoa-900 font-medium' : 'text-cocoa-600 hover:bg-cocoa-100'"
          @click="mode = 'countdown'"
        >
          倒计时
        </button>
        <button
          class="flex-1 py-2 rounded-xl text-sm transition"
          :class="mode === 'stopwatch' ? 'bg-cocoa-300 text-cocoa-900 font-medium' : 'text-cocoa-600 hover:bg-cocoa-100'"
          @click="mode = 'stopwatch'"
        >
          正计时（秒表）
        </button>
      </section>
    </template>

    <!-- 倒计时 -->
    <section
      v-if="mode === 'countdown'"
      class="grid gap-4"
      :class="isFullscreen ? 'grid-cols-1 max-w-3xl w-full' : 'lg:grid-cols-3'"
    >
      <div
        class="card-soft p-8 text-center relative overflow-hidden bg-gradient-to-br from-cocoa-100 via-cream-50 to-cocoa-100"
        :class="isFullscreen ? '' : 'lg:col-span-2'"
      >
        <div class="relative inline-block">
          <svg
            :width="isFullscreen ? 360 : 240"
            :height="isFullscreen ? 360 : 240"
            viewBox="0 0 240 240"
            class="-rotate-90"
          >
            <circle
              cx="120" cy="120" :r="RING_R + 30"
              fill="none" stroke="rgba(190,140,80,0.1)" stroke-width="10"
            />
            <circle
              cx="120" cy="120" :r="RING_R + 30"
              fill="none"
              :stroke="cdDanger ? '#e88a8a' : '#c89b6e'"
              stroke-width="10"
              stroke-linecap="round"
              :stroke-dasharray="2 * Math.PI * (RING_R + 30)"
              :stroke-dashoffset="2 * Math.PI * (RING_R + 30) * (1 - cdProgress / 100)"
              class="transition-all duration-500"
            />
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <div
              class="number leading-none"
              :class="[
                isFullscreen ? 'text-[160px]' : 'text-[96px]',
                cdDanger ? 'text-sakura-500 animate-wiggle' : 'text-cocoa-900',
              ]"
            >
              {{ cdMm }}:{{ cdSs }}
            </div>
            <div class="text-xs text-cocoa-500 mt-1">
              剩余时间
            </div>
          </div>
        </div>
        <div class="flex items-center justify-center gap-2 mt-6 flex-wrap">
          <button
            v-if="!running"
            class="btn-primary !px-6 !py-3 flex items-center gap-1"
            @click="startCountdown"
          >
            <Play :size="16" /> 开始
          </button>
          <button
            v-else
            class="btn-sakura !px-6 !py-3 flex items-center gap-1"
            @click="pause"
          >
            <Pause :size="16" /> 暂停
          </button>
          <button
            class="btn-secondary !px-4 !py-3 flex items-center gap-1"
            @click="reset"
          >
            <RotateCcw :size="16" /> 重置
          </button>
        </div>
      </div>

      <div
        v-if="!isFullscreen"
        class="space-y-4"
      >
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-3">
            预设时长
          </h3>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="p in presets"
              :key="p"
              class="card-flat p-3 hover:bg-cocoa-100 transition text-center"
              :class="totalSec === p * 60 ? '!bg-cocoa-300' : ''"
              @click="setPreset(p)"
            >
              <div class="number text-2xl">
                {{ p }}
              </div>
              <div class="text-xs text-cocoa-500">
                分钟
              </div>
            </button>
          </div>
        </div>
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-2">
            自定义
          </h3>
          <div class="flex items-center gap-2">
            <div class="flex-1">
              <label class="text-xs text-cocoa-500 ml-1">分钟</label>
              <input
                v-model.number="customMin"
                type="number"
                min="0"
                class="input-soft mt-1"
              >
            </div>
            <div class="flex-1">
              <label class="text-xs text-cocoa-500 ml-1">秒</label>
              <input
                v-model.number="customSec"
                type="number"
                min="0"
                max="59"
                class="input-soft mt-1"
              >
            </div>
          </div>
          <button
            class="btn-primary w-full mt-3 !py-2 text-sm"
            @click="applyCustom"
          >
            应用
          </button>
          <p class="text-xs text-cocoa-500 mt-2">
            💡 时间到时会播放 3 声提示音并提醒
          </p>
        </div>
      </div>
    </section>

    <!-- 正计时（秒表）-->
    <section
      v-else
      class="grid gap-4"
      :class="isFullscreen ? 'grid-cols-1 max-w-3xl w-full' : 'lg:grid-cols-3'"
    >
      <div
        class="card-soft p-8 text-center bg-gradient-to-br from-cocoa-100 via-cream-50 to-cocoa-100"
        :class="isFullscreen ? '' : 'lg:col-span-2'"
      >
        <div
          class="number leading-none text-cocoa-900"
          :class="isFullscreen ? 'text-[160px]' : 'text-[96px]'"
        >
          {{ swMm }}:{{ swSs }}<span class="text-[0.5em] text-cocoa-500">.{{ swMs2 }}</span>
        </div>
        <div class="flex items-center justify-center gap-2 mt-6 flex-wrap">
          <button
            v-if="!swRunning"
            class="btn-primary !px-6 !py-3 flex items-center gap-1"
            @click="startStopwatch"
          >
            <Play :size="16" /> 开始
          </button>
          <button
            v-else
            class="btn-sakura !px-6 !py-3 flex items-center gap-1"
            @click="pauseStopwatch"
          >
            <Pause :size="16" /> 暂停
          </button>
          <button
            class="btn-secondary !px-4 !py-3 flex items-center gap-1"
            :disabled="!swRunning"
            @click="addLap"
          >
            <Flag :size="16" /> 计次
          </button>
          <button
            class="btn-secondary !px-4 !py-3 flex items-center gap-1"
            @click="resetStopwatch"
          >
            <RotateCcw :size="16" /> 重置
          </button>
        </div>
      </div>

      <div
        v-if="!isFullscreen"
        class="card-soft p-5"
      >
        <h3 class="title-display text-lg mb-3 flex items-center gap-2">
          <Flag :size="16" /> 计次记录 ({{ laps.length }})
        </h3>
        <div
          v-if="laps.length"
          class="space-y-1.5 max-h-[320px] overflow-y-auto"
        >
          <div
            v-for="(lap, i) in laps"
            :key="i"
            class="flex items-center justify-between text-sm py-1.5 px-2 rounded-lg"
            :class="i === 0 ? 'bg-cocoa-100' : ''"
          >
            <span class="text-cocoa-500">#{{ laps.length - i }}</span>
            <span class="number text-cocoa-900">{{ formatLap(lap) }}</span>
            <span
              v-if="i + 1 < laps.length"
              class="text-xs text-cocoa-400"
            >+{{ formatLap(lap - laps[i + 1]) }}</span>
            <span
              v-else
              class="text-xs text-cocoa-400"
            >起</span>
          </div>
        </div>
        <div
          v-else
          class="text-center text-cocoa-400 py-6 text-sm"
        >
          暂无计次记录
        </div>
      </div>
    </section>
  </div>
</template>
