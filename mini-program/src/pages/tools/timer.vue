<template>
  <view class="page" :class="{ dark }">
    <view class="tabs">
      <view class="tab" :class="{ on: mode === 'down' }" @click="switchMode('down')">⏳ 倒计时</view>
      <view class="tab" :class="{ on: mode === 'sw' }" @click="switchMode('sw')">⏱ 秒表</view>
    </view>

    <!-- 倒计时 -->
    <block v-if="mode === 'down'">
      <canvas canvas-id="ringCanvas" class="ring-canvas"></canvas>
      <view class="display" :class="{ warn: left <= 10 && left > 0 && running }">{{ mm }}:{{ ss }}</view>
      <view class="presets" v-if="!running">
        <view v-for="p in presets" :key="p" class="preset" @click="setPreset(p)">{{ p }}分</view>
      </view>
      <view class="set" v-if="!running">
        <view class="field"><text>分</text><input type="number" v-model="min" /></view>
        <view class="field"><text>秒</text><input type="number" v-model="sec" /></view>
      </view>
      <view class="row">
        <button class="btn" @click="toggleDown">{{ running ? '暂停' : '开始' }}</button>
        <button class="btn ghost" @click="resetDown">重置</button>
      </view>
    </block>

    <!-- 秒表 -->
    <block v-else>
      <view class="display">{{ swDisp }}</view>
      <view class="row">
        <button class="btn" @click="swToggle">{{ swRunning ? '暂停' : (swMs > 0 ? '继续' : '开始') }}</button>
        <button class="btn ghost" @click="swLap" v-if="swRunning || laps.length">计次</button>
        <button class="btn ghost" @click="swReset">重置</button>
      </view>
      <view class="laps" v-if="laps.length">
        <view v-for="(l, i) in lapsView" :key="i" class="lap">
          <text class="ln">第 {{ i + 1 }} 次</text>
          <text class="lt">{{ l }}</text>
        </view>
      </view>
      <view v-else class="empty">点击「开始」计时，按「计次」记录分段</view>
    </block>

    <view class="note">提示：小程序无系统级全屏与提示音，时间到以震动提醒（web 支持全屏大数字与蜂鸣）。</view>
  </view>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { onUnload } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const mode = ref('down')
const presets = [1, 3, 5, 10, 15]

function stopAll() {
  if (downTimer) { clearInterval(downTimer); downTimer = null }
  if (swTimer) { clearInterval(swTimer); swTimer = null }
}
function switchMode(m) {
  if (mode.value === m) return
  stopAll()
  running.value = false
  swRunning.value = false
  mode.value = m
}

/* ---------- 倒计时 ---------- */
const min = ref(5)
const sec = ref(0)
const left = ref(5 * 60)
const running = ref(false)
let downTimer = null

const mm = computed(() => String(Math.floor(left.value / 60)).padStart(2, '0'))
const ss = computed(() => String(left.value % 60).padStart(2, '0'))
const totalSec = computed(() => min.value * 60 + sec.value)
const progress = computed(() => totalSec.value > 0 ? 1 - left.value / totalSec.value : 0)

// canvas 彩虹进度环
function drawRing() {
  const ctx = uni.createCanvasContext('ringCanvas')
  const W = 400, H = 400, cx = W / 2, cy = H / 2, r = 150, lw = 20
  ctx.clearRect(0, 0, W, H)
  // 背景环
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, 2 * Math.PI)
  ctx.setLineWidth(lw)
  ctx.setStrokeStyle(dark.value ? '#2c313a' : '#f0eadc')
  ctx.stroke()
  // 彩色进度：从绿(120°)渐变到红(0°)
  const pct = Math.min(1, Math.max(0, progress.value))
  if (pct < 1) {
    const hue = 120 - pct * 120
    ctx.beginPath()
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + pct * 2 * Math.PI)
    ctx.setLineWidth(lw)
    ctx.setLineCap('round')
    ctx.setStrokeStyle(`hsl(${hue}, 80%, 55%)`)
    ctx.stroke()
  }
  ctx.draw()
}
// 监听倒计时变化重绘进度环
watch([left, totalSec], () => nextTick(drawRing), { immediate: true })

function setPreset(m) { min.value = m; sec.value = 0; if (!running.value) left.value = m * 60 }
function toggleDown() {
  if (running.value) { clearInterval(downTimer); running.value = false; return }
  if (left.value <= 0) left.value = min.value * 60 + sec.value
  if (left.value <= 0) return
  running.value = true
  downTimer = setInterval(() => {
    left.value--
    if (left.value <= 0) {
      clearInterval(downTimer); running.value = false
      uni.vibrateLong({ fail() {} })
      uni.showToast({ title: '时间到！', icon: 'none' })
    }
  }, 1000)
}
function resetDown() { clearInterval(downTimer); running.value = false; left.value = min.value * 60 + sec.value }

/* ---------- 秒表 ---------- */
const swMs = ref(0)
const swRunning = ref(false)
const laps = ref([])
let swTimer = null
let swStart = 0
let swBase = 0

const swDisp = computed(() => fmt(swMs.value))
function fmt(t) {
  const m = Math.floor(t / 60000)
  const s = Math.floor((t % 60000) / 1000)
  const cs = Math.floor((t % 1000) / 10)
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + '.' + String(cs).padStart(2, '0')
}
function swToggle() {
  if (swRunning.value) { clearInterval(swTimer); swRunning.value = false; swBase = swMs.value; return }
  swStart = Date.now()
  swRunning.value = true
  swTimer = setInterval(() => { swMs.value = swBase + (Date.now() - swStart) }, 30)
}
function swLap() { laps.value.push(swMs.value) }
function swReset() { clearInterval(swTimer); swRunning.value = false; swMs.value = 0; swBase = 0; laps.value = [] }
const lapsView = computed(() => laps.value.map(fmt))

onUnload(stopAll)
</script>

<style scoped>
.page { padding: 40rpx; display: flex; flex-direction: column; align-items: center; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.tabs { display: flex; gap: 16rpx; margin-bottom: 30rpx; }
.tab { background: var(--c-card); border-radius: 40rpx; padding: 14rpx 36rpx; font-size: 28rpx; color: var(--c-accent); }
.tab.on { background: #e6a23c; color: #fff; }
.display { font-size: 130rpx; font-weight: 800; color: #e6a23c; margin: 20rpx 0; font-variant-numeric: tabular-nums; text-align: center; }
.display.warn { color: #e06c75; animation: pulse 0.5s infinite alternate; }
@keyframes pulse { from { opacity: 1; } to { opacity: 0.4; } }
.ring-canvas { width: 400rpx; height: 400rpx; margin: 10rpx auto; display: block; }
.display.warn { color: #e64340; }
.presets { display: flex; flex-wrap: wrap; gap: 16rpx; justify-content: center; margin-bottom: 20rpx; }
.preset { background: var(--c-card); border-radius: 30rpx; padding: 14rpx 30rpx; font-size: 26rpx; color: var(--c-accent); }
.set { display: flex; gap: 30rpx; }
.field { display: flex; align-items: center; gap: 10rpx; background: var(--c-card); border-radius: 14rpx; padding: 10rpx 20rpx; }
.field input { width: 90rpx; text-align: center; font-size: 40rpx; height: 80rpx; min-height: 80rpx; line-height: 80rpx; box-sizing: border-box; color: var(--c-title); }
.row { display: flex; gap: 20rpx; margin-top: 30rpx; flex-wrap: wrap; justify-content: center; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 60rpx; }
.btn.ghost { background: var(--c-card); color: var(--c-accent); border: 2rpx solid #e6a23c; }
.laps { width: 100%; margin-top: 30rpx; }
.lap { display: flex; justify-content: space-between; padding: 20rpx 30rpx; background: var(--c-card); border-radius: 14rpx; margin-bottom: 14rpx; font-size: 30rpx; font-variant-numeric: tabular-nums; }
.ln { color: var(--c-sub); }
.lt { color: var(--c-title); font-weight: 700; }
.empty { color: var(--c-sub); font-size: 26rpx; margin-top: 30rpx; }
.note { margin-top: 40rpx; font-size: 22rpx; color: var(--c-sub); line-height: 1.6; text-align: center; padding: 0 30rpx; }
</style>
