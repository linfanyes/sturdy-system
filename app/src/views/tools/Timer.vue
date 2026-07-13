<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Play, Pause, RotateCcw, Plus, Minus } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const presets = [30, 60, 90, 120, 180, 300]
const total = ref(60)
const remain = ref(60)
const running = ref(false)
let timer: number | null = null

function start() {
  if (remain.value <= 0) {
    remain.value = total.value
  }
  running.value = true
  timer = window.setInterval(() => {
    if (remain.value > 0) {
      remain.value -= 1
    } else {
      pause()
      ring()
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
  remain.value = total.value
}
function add(n: number) {
  pause()
  remain.value = Math.max(0, remain.value + n)
  total.value = Math.max(total.value, remain.value)
}
function setPreset(n: number) {
  pause()
  total.value = n
  remain.value = n
}

const mm = computed(() => Math.floor(remain.value / 60).toString().padStart(2, '0'))
const ss = computed(() => (remain.value % 60).toString().padStart(2, '0'))
const progress = computed(() =>
  total.value ? (1 - remain.value / total.value) * 100 : 0,
)
const danger = computed(() => remain.value > 0 && remain.value <= 10)

function ring() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.value = 880
    o.type = 'sine'
    o.connect(g)
    g.connect(ctx.destination)
    g.gain.setValueAtTime(0, ctx.currentTime)
    g.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05)
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6)
    o.start()
    o.stop(ctx.currentTime + 0.7)
  } catch (e) {
    /* noop */
  }
}

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="⏱️"
      title="课堂倒计时"
      description="课堂小测、计时答题、课间休息的好帮手"
      gradient="from-butter-100 via-cream-50 to-mint-100"
    />
    <div class="grid lg:grid-cols-3 gap-5">
      <div class="card-soft p-10 lg:col-span-2 text-center relative overflow-hidden bg-gradient-to-br from-mint-100 via-cream-50 to-butter-100">
        <div
          class="number text-[140px] leading-none my-2 transition-colors"
          :class="danger ? 'text-sakura-500 animate-wiggle' : 'text-cocoa-900'"
        >
          {{ mm }}:{{ ss }}
        </div>
        <div class="w-full max-w-md mx-auto h-2 rounded-full bg-white/60 overflow-hidden mt-4">
          <div
            class="h-full bg-gradient-to-r from-mint-400 to-butter-400 transition-all"
            :style="{ width: progress + '%' }"
          />
        </div>
        <div class="flex items-center justify-center gap-2 mt-6">
          <button
            v-if="!running"
            class="btn-primary !px-6 !py-3"
            @click="start"
          >
            <Play :size="16" /> 开始
          </button>
          <button
            v-else
            class="btn-sakura !px-6 !py-3"
            @click="pause"
          >
            <Pause :size="16" /> 暂停
          </button>
          <button
            class="btn-secondary !px-4 !py-3"
            @click="reset"
          >
            <RotateCcw :size="16" /> 重置
          </button>
        </div>
        <div class="flex items-center justify-center gap-2 mt-4">
          <button
            class="btn-ghost !py-1.5 !px-3 text-xs"
            @click="add(-10)"
          >
            <Minus :size="12" /> 10秒
          </button>
          <button
            class="btn-ghost !py-1.5 !px-3 text-xs"
            @click="add(10)"
          >
            <Plus :size="12" /> 10秒
          </button>
          <button
            class="btn-ghost !py-1.5 !px-3 text-xs"
            @click="add(60)"
          >
            <Plus :size="12" /> 1分钟
          </button>
        </div>
      </div>
      <div class="space-y-5">
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-3">
            预设时长
          </h3>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="p in presets"
              :key="p"
              class="card-flat p-3 hover:bg-butter-100 transition text-center"
              @click="setPreset(p)"
            >
              <div class="number text-2xl">
                {{ p }}
              </div>
              <div class="text-xs text-cocoa-500">
                秒
              </div>
            </button>
          </div>
        </div>
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-2">
            自定义
          </h3>
          <input
            v-model.number="total"
            type="number"
            min="5"
            class="input-soft"
            @change="remain = total"
          >
          <p class="text-xs text-cocoa-500 mt-2">
            💡 提示：到 10 秒以内会变色并伴随提示音
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
