<template>
  <view class="page" :class="{ dark }" :style="pageStyle">
    <view class="hd">颜色匹配</view>
    <view class="status">
      <text>得分 {{ score }}</text>
      <text>最高 {{ best }}</text>
      <text>连击 {{ combo }}×</text>
      <text class="time" :class="{ warn: time <= 5 }">{{ time }}s</text>
    </view>

    <view class="target-wrap" v-if="running">
      <text class="t-lab">目标色</text>
      <view class="target" :style="{ background: targetHex }"></view>
      <text class="t-tip">选最接近的色块</text>
    </view>

    <view v-if="!running" class="ready">
      <view class="big-color" :style="{ background: readyColor }"></view>
      <button class="btn" @click="start">{{ score > 0 ? '再玩一次' : '开始游戏' }}</button>
    </view>

    <view v-if="running" class="opts" :style="{ gridTemplateColumns: 'repeat(' + optCols + ', 1fr)' }">
      <view v-for="(o, i) in options" :key="i" class="opt"
        :class="{ wrong: wrongIdx === i }"
        :style="{ background: o.hex }"
        @click="choose(i)"></view>
    </view>

    <view v-if="lastFeedback" class="fb" :class="lastFeedback.type">
      {{ lastFeedback.text }}
    </view>

    <view v-if="running" class="phase">当前阶段：{{ phaseLabel }}</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload, onHide, onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { useGame, vibrate, playSound, destroySound, pickColors, rand } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const colors = computed(() => pickColors(dark.value))
const pageStyle = computed(() => ({
  '--bg': colors.value.bg,
  '--card': colors.value.card,
  '--cell': colors.value.cell,
  '--border': colors.value.border,
  '--text': colors.value.text,
  '--sub': colors.value.sub,
  '--primary': colors.value.primary,
  '--accent': colors.value.accent,
  '--danger': colors.value.danger,
}))

const { best, submitScore } = useGame('colormatch')

const score = ref(0)
const combo = ref(0)
const time = ref(30)
const running = ref(false)
const targetHex = ref('#888888')
const options = ref([])
const wrongIdx = ref(-1)
const lastFeedback = ref(null)
let timer = null
let targetHsl = [0, 0, 0]
let targetIdx = -1
let roundStart = 0

const readyColor = ref('#e6a23c')

// 阶段：基于已用时间
const elapsed = computed(() => 30 - time.value)
const phaseLabel = computed(() => {
  if (elapsed.value < 10) return '6 色块 · 较易'
  if (elapsed.value < 20) return '7 色块 · 中等'
  return '9 色块 · 困难'
})
const optCols = computed(() => options.value.length <= 6 ? 3 : 3)

// HSL → HEX
function hslToHex(h, s, l) {
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
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return '#' + to(r) + to(g) + to(b)
}

function genRound() {
  // 难度参数
  let numOpts, hueRange, slRange
  if (elapsed.value < 10) { numOpts = 6; hueRange = 30; slRange = 25 }
  else if (elapsed.value < 20) { numOpts = 7; hueRange = 20; slRange = 18 }
  else { numOpts = 9; hueRange = 12; slRange = 12 }

  targetHsl = [rand(0, 359), rand(45, 90), rand(35, 70)]
  targetHex.value = hslToHex(targetHsl[0], targetHsl[1], targetHsl[2])

  const opts = [{ hsl: targetHsl.slice(), hex: targetHex.value, isTarget: true }]
  const used = new Set([targetHsl.map((v) => Math.round(v)).join(',')])

  while (opts.length < numOpts) {
    const dh = (Math.random() * 2 - 1) * hueRange
    const ds = (Math.random() * 2 - 1) * slRange
    const dl = (Math.random() * 2 - 1) * slRange
    const cand = [
      (targetHsl[0] + dh + 360) % 360,
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
  targetIdx = opts.findIndex((o) => o.isTarget)
  roundStart = Date.now()
  wrongIdx.value = -1
}

function choose(i) {
  if (!running.value) return
  const o = options.value[i]
  if (o.isTarget) {
    combo.value++
    const base = 10
    let gain = base
    if (combo.value >= 5) gain *= 2
    score.value += gain
    playSound('hit')
    vibrate('short')
    lastFeedback.value = { type: 'ok', text: '✓ 对！' + (combo.value >= 5 ? ' 连击 ×2' : '') + ' +' + gain }
    setTimeout(() => { if (running.value) genRound() }, 150)
  } else {
    combo.value = 0
    playSound('fail')
    vibrate('short')
    wrongIdx.value = i
    lastFeedback.value = { type: 'no', text: '✗ 错了' }
    setTimeout(() => { if (running.value) genRound() }, 400)
  }
}

function start() {
  score.value = 0
  combo.value = 0
  time.value = 30
  running.value = true
  lastFeedback.value = null
  genRound()
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    time.value--
    if (time.value <= 0) {
      clearInterval(timer)
      timer = null
      running.value = false
      submitScore(score.value)
      uni.showToast({ title: '得分 ' + score.value, icon: 'none' })
    }
  }, 1000)
}

function stop() {
  if (timer) { clearInterval(timer); timer = null }
  running.value = false
}

onLoad(() => {
  // 随机一个待开始底色
  readyColor.value = hslToHex(rand(0, 359), rand(45, 90), rand(40, 70))
})

onUnload(() => { stop(); destroySound() })
onHide(() => { stop() })
onShow(() => { /* 恢复后用户需手动开始 */ })
</script>

<style scoped>
.page { background: var(--bg); min-height: 100vh; color: var(--text); padding: 30rpx; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--primary); }
.status { display: flex; gap: 24rpx; font-size: 24rpx; color: var(--sub); margin: 12rpx 0; flex-wrap: wrap; justify-content: center; }
.time { color: var(--primary); font-weight: 700; }
.time.warn { color: var(--danger); }

.target-wrap { display: flex; flex-direction: column; align-items: center; margin: 16rpx 0; }
.t-lab { font-size: 24rpx; color: var(--sub); }
.target { width: 220rpx; height: 220rpx; border-radius: 24rpx; margin: 16rpx 0; border: 4rpx solid var(--border); box-shadow: 0 4rpx 16rpx rgba(0,0,0,.12); }
.t-tip { font-size: 22rpx; color: var(--sub); }

.ready { display: flex; flex-direction: column; align-items: center; margin-top: 40rpx; }
.big-color { width: 280rpx; height: 280rpx; border-radius: 28rpx; margin-bottom: 30rpx; border: 4rpx solid var(--border); }

.opts { width: min(630rpx, 92vw); display: grid; gap: 14rpx; margin-top: 10rpx; }
.opt { height: 150rpx; border-radius: 14rpx; border: 2rpx solid var(--border); transition: transform .1s; }
.opt:active { transform: scale(0.95); }
.opt.wrong { animation: shake 0.4s; }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8rpx); } 75% { transform: translateX(8rpx); } }

.fb { margin-top: 16rpx; font-size: 26rpx; padding: 10rpx 24rpx; border-radius: 16rpx; }
.fb.ok { color: var(--accent); background: rgba(7, 193, 96, .12); }
.fb.no { color: var(--danger); background: rgba(230, 67, 64, .12); }

.btn { background: var(--primary); color: #fff; border-radius: 40rpx; padding: 0 70rpx; font-size: 30rpx; line-height: 80rpx; }
.phase { margin-top: 18rpx; font-size: 22rpx; color: var(--sub); }
</style>
