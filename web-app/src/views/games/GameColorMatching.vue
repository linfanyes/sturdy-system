<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Palette } from 'lucide-vue-next'
import { rand } from '@gardener/shared/utils/game-helpers'

const router = useRouter()

// 状态
const score = ref(0)
const combo = ref(0)
const time = ref(30)
const running = ref(false)
const targetHex = ref('#888888')
const options = ref<{ hex: string; isTarget: boolean }[]>([])
const wrongIdx = ref(-1)
const correctIdx = ref(-1)
const feedback = ref<{ type: 'ok' | 'no'; text: string } | null>(null)
const best = ref(parseInt(localStorage.getItem('web_game_colormatching_highscore') || '0'))
const readyColor = ref('#e6a23c')

let timer: ReturnType<typeof setInterval> | null = null
let targetHsl: [number, number, number] = [0, 0, 0]
let roundStart = 0

// 已用时间
const elapsed = computed(() => 30 - time.value)

// 阶段标签
const phaseLabel = computed(() => {
  if (elapsed.value < 10) return '6 \u8272\u5757 \u00b7 \u8f83\u6613'
  if (elapsed.value < 20) return '7 \u8272\u5757 \u00b7 \u4e2d\u7b49'
  return '9 \u8272\u5757 \u00b7 \u56f0\u96be'
})

// 色块网格列数
const optCols = computed(() => 3)

// HSL → HEX
function hslToHex(h: number, s: number, l: number): string {
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return '#' + to(r) + to(g) + to(b)
}


// 生成一轮
function genRound() {
  let numOpts: number, hueRange: number, slRange: number
  if (elapsed.value < 10) { numOpts = 6; hueRange = 30; slRange = 25 }
  else if (elapsed.value < 20) { numOpts = 7; hueRange = 20; slRange = 18 }
  else { numOpts = 9; hueRange = 12; slRange = 12 }

  targetHsl = [rand(0, 359), rand(45, 90), rand(35, 70)]
  targetHex.value = hslToHex(targetHsl[0], targetHsl[1], targetHsl[2])

  const opts: { hsl: number[]; hex: string; isTarget: boolean }[] = [
    { hsl: targetHsl.slice(), hex: targetHex.value, isTarget: true },
  ]
  const used = new Set([targetHsl.map((v) => Math.round(v)).join(',')])

  while (opts.length < numOpts) {
    const dh = (Math.random() * 2 - 1) * hueRange
    const ds = (Math.random() * 2 - 1) * slRange
    const dl = (Math.random() * 2 - 1) * slRange
    const cand = [
      ((targetHsl[0] + dh) % 360 + 360) % 360,
      Math.max(20, Math.min(95, targetHsl[1] + ds)),
      Math.max(20, Math.min(80, targetHsl[2] + dl)),
    ]
    const key = cand.map((v) => Math.round(v)).join(',')
    if (used.has(key)) continue
    used.add(key)
    opts.push({ hsl: cand, hex: hslToHex(cand[0], cand[1], cand[2]), isTarget: false })
  }

  // 打乱
  for (let i = opts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[opts[i], opts[j]] = [opts[j], opts[i]]
  }

  options.value = opts
  roundStart = Date.now()
  wrongIdx.value = -1
  correctIdx.value = -1
  feedback.value = null
}

// 选择色块
function choose(i: number) {
  if (!running.value) return
  const o = options.value[i]
  if (o.isTarget) {
    combo.value++
    const base = 10
    let gain = base
    if (combo.value >= 5) gain *= 2
    score.value += gain
    correctIdx.value = i
    feedback.value = {
      type: 'ok',
      text: '\u2713 \u6b63\u786e' + (combo.value >= 5 ? ' \u8fde\u51fb \u00d72' : '') + ' +' + gain,
    }
    setTimeout(() => {
      if (running.value) genRound()
    }, 200)
  } else {
    combo.value = 0
    wrongIdx.value = i
    feedback.value = { type: 'no', text: '\u2717 \u9009\u9519\u4e86' }
    setTimeout(() => {
      if (running.value) genRound()
    }, 450)
  }
}

// 开始
function start() {
  score.value = 0
  combo.value = 0
  time.value = 30
  running.value = true
  feedback.value = null
  genRound()
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    time.value--
    if (time.value <= 0) {
      clearInterval(timer!)
      timer = null
      running.value = false
      if (score.value > best.value) {
        best.value = score.value
        localStorage.setItem('web_game_colormatching_highscore', String(score.value))
      }
    }
  }, 1000)
}

// 停止
function stop() {
  if (timer) { clearInterval(timer); timer = null }
  running.value = false
}

// 重置
function reset() {
  stop()
  score.value = 0
  combo.value = 0
  time.value = 30
  feedback.value = null
  readyColor.value = hslToHex(rand(0, 359), rand(45, 90), rand(40, 70))
}

onUnmounted(stop)
</script>

<template>
  <div class="space-y-4">
    <!-- 返回按钮 -->
    <button
      class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm"
      @click="router.push('/teacher/games')"
    >
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <!-- 标题 -->
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Palette class="w-6 h-6 text-butter-500" /> 颜色匹配
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer flex flex-col items-center gap-5">
      <!-- 状态栏 -->
      <div class="flex items-center justify-between w-full text-sm">
        <span class="text-cocoa-700 font-semibold">得分：{{ score }}</span>
        <span class="text-cocoa-500">最高：{{ best }}</span>
        <span
          class="font-semibold"
          :class="time <= 5 ? 'text-red-500' : 'text-cocoa-500'"
        >
          {{ time }}s
        </span>
      </div>

      <!-- 连击 -->
      <div
        v-if="running && combo > 0"
        class="text-xs font-semibold"
        :class="combo >= 5 ? 'text-orange-500' : 'text-cocoa-400'"
      >
        连击 {{ combo }}x{{ combo >= 5 ? '（2 倍得分）' : '' }}
      </div>

      <!-- 未开始 / 结束 -->
      <div v-if="!running" class="flex flex-col items-center gap-5 mt-4">
        <div
          class="w-32 h-32 md:w-40 md:h-40 rounded-2xl border-2 border-cocoa-200 shadow-md"
          :style="{ background: readyColor }"
        ></div>
        <button
          class="px-8 py-3 rounded-xl bg-butter-500 text-white font-semibold hover:bg-butter-600 transition-colors text-lg"
          @click="start"
        >
          {{ score > 0 ? '再玩一次' : '开始游戏' }}
        </button>
      </div>

      <!-- 游戏中 -->
      <template v-if="running">
        <!-- 目标色 -->
        <div class="flex flex-col items-center gap-2">
          <span class="text-xs text-cocoa-400">目标色</span>
          <div
            class="w-28 h-28 md:w-32 md:h-32 rounded-2xl border-2 border-cocoa-200 shadow-md"
            :style="{ background: targetHex }"
          ></div>
          <span class="text-xs text-cocoa-400">选最接近的色块</span>
        </div>

        <!-- 选项色块 -->
        <div
          class="grid gap-3 w-full max-w-xs"
          :style="{ gridTemplateColumns: `repeat(${optCols}, 1fr)` }"
        >
          <div
            v-for="(o, i) in options"
            :key="i"
            class="aspect-square rounded-xl border border-cocoa-200 cursor-pointer transition-transform duration-100 hover:scale-105 active:scale-95"
            :class="{
              'animate-pulse border-butter-400 border-2': correctIdx === i,
              'animate-[shake_0.4s_ease]': wrongIdx === i,
            }"
            :style="{ background: o.hex }"
            @click="choose(i)"
          ></div>
        </div>

        <!-- 反馈 -->
        <div
          v-if="feedback"
          class="text-sm font-semibold px-4 py-2 rounded-xl"
          :class="feedback.type === 'ok' ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'"
        >
          {{ feedback.text }}
        </div>

        <!-- 阶段 -->
        <div class="text-xs text-cocoa-400">
          当前阶段：{{ phaseLabel }}
        </div>
      </template>

      <!-- 重置 -->
      <button
        v-if="!running && score > 0"
        class="px-4 py-2 rounded-xl bg-cream-200 text-cocoa-700 hover:bg-cream-300 transition-colors text-sm"
        @click="reset"
      >
        重新开始
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-6px); }
  75% { transform: translateX(6px); }
}
</style>
