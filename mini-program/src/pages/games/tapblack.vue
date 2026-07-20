<template>
  <view class="page" :class="{ dark }" :style="cssVars">
    <view class="hd">别踩白块</view>
    <view class="status">
      <text>分数 {{ score }}</text>
      <text class="dot">·</text>
      <text>最高 {{ best }}</text>
      <text class="dot">·</text>
      <text>连击 {{ combo }} ×{{ mult }}</text>
    </view>

    <!-- 开始入口 -->
    <view v-if="!started" class="diff">
      <view class="diff-tip">点击黑块得分，别踩白块</view>
      <view class="diff-btn" @click="start">开始游戏</view>
      <view class="tip">速度会逐渐加快，连对 10 次分数翻倍</view>
    </view>

    <!-- 游戏区 -->
    <view v-if="started" class="board">
      <view
        v-for="(row, ri) in rows"
        :key="row.id"
      >
        <view
          v-for="col in 4"
          :key="col"
          class="tile"
          :class="{ black: (col - 1) === row.blackCol, tapped: row.tapped, miss: row.miss }"
          :style="{ left: ((col - 1) * colW) + 'rpx', top: row.y + 'rpx', width: colW + 'rpx', height: tileH + 'rpx' }"
          @click="tapTile(row, col - 1)"
        ></view>
      </view>

      <view v-if="over" class="overlay">
        <view class="over-title">{{ won ? '🏆 通关' : '💀 失败' }}</view>
        <view class="over-score">分数 {{ score }}{{ isNewRecord ? ' · 新纪录' : '' }}</view>
        <view class="over-row">
          <view class="over-btn" @click="start">再来一局</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onUnload, onHide, onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { useGame, vibrate, playSound, destroySound, pickColors, rand, clamp } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const colors = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('tapblack')

const cssVars = computed(() => ({
  '--bg': colors.value.bg,
  '--board': colors.value.board,
  '--text': colors.value.text,
  '--sub': colors.value.sub,
  '--primary': colors.value.primary,
  '--danger': colors.value.danger,
  '--border': colors.value.border,
  '--cell': colors.value.cell,
}))

// 棋盘尺寸（rpx）
const W = 630, H = 880
const colW = W / 4
const tileH = 160
const INIT_ROWS = 6

const started = ref(false)
const over = ref(false)
const won = ref(false)
const score = ref(0)
const combo = ref(0)
const rows = ref([])
let timer = null
let speed = 2
let uid = 0
let paused = false

// 连击倍率：每连对 10 次提升，封顶 5
const mult = computed(() => clamp(1 + Math.floor(combo.value / 10), 1, 5))

// 初始化行
function initRows() {
  rows.value = []
  for (let i = 0; i < INIT_ROWS; i++) {
    rows.value.push({ id: uid++, y: -tileH + i * tileH, blackCol: rand(0, 3), tapped: false, miss: false })
  }
}

// 主循环
function tick() {
  if (over.value || paused) return
  for (const r of rows.value) r.y += speed
  // 越界处理
  const out = rows.value.filter((r) => r.y > H)
  for (const r of out) {
    if (!r.tapped) {
      r.miss = true
      return fail()
    }
  }
  rows.value = rows.value.filter((r) => r.y <= H + tileH)
  // 顶部补充新行
  let topY = Infinity
  for (const r of rows.value) if (r.y < topY) topY = r.y
  while (topY > -tileH) {
    topY -= tileH
    rows.value.push({ id: uid++, y: topY, blackCol: rand(0, 3), tapped: false, miss: false })
  }
}

// 点击方块
function tapTile(row, col) {
  if (over.value || row.tapped) return
  if (col === row.blackCol) {
    row.tapped = true
    combo.value++
    score.value += 1 * mult.value
    vibrate('short'); playSound('hit')
    // 每 10 分提速
    if (score.value % 10 === 0) speed = Math.min(speed + 0.3, 8)
  } else {
    row.miss = true
    fail()
  }
}

function fail() {
  if (over.value) return
  over.value = true
  won.value = false
  vibrate('long'); playSound('fail')
  if (timer) { clearInterval(timer); timer = null }
  submitScore(score.value)
}

function start() {
  score.value = 0
  combo.value = 0
  speed = 2
  over.value = false
  won.value = false
  uid = 0
  initRows()
  started.value = true
  paused = false
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

function pauseGame() {
  if (!started.value || over.value || paused) return
  if (timer) { clearInterval(timer); timer = null }
  paused = true
}
function resumeGame() {
  if (!started.value || over.value || !paused) return
  paused = false
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

onHide(() => pauseGame())
onShow(() => resumeGame())
onUnload(() => { if (timer) clearInterval(timer); destroySound() })
</script>

<style scoped>
.page { background: var(--bg); min-height: 100vh; color: var(--text); padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--primary); }
.status { font-size: 26rpx; color: var(--sub); margin: 10rpx 0; display: flex; align-items: center; }
.status .dot { margin: 0 10rpx; }
.diff { margin-top: 60rpx; display: flex; flex-direction: column; align-items: center; }
.diff-tip { font-size: 30rpx; color: var(--sub); margin-bottom: 30rpx; }
.diff-btn { background: var(--primary); color: #fff; padding: 24rpx 80rpx; border-radius: 16rpx; font-size: 30rpx; }
.tip { font-size: 24rpx; color: var(--sub); margin-top: 40rpx; }
.board { position: relative; width: min(630rpx, 92vw); height: 880rpx; background: var(--board); border-radius: 16rpx; overflow: hidden; border: 2rpx solid var(--border); touch-action: none; }
.tile { position: absolute; background: var(--cell); border-right: 2rpx solid var(--border); border-bottom: 2rpx solid var(--border); box-sizing: border-box; }
.tile.black { background: #222; }
.tile.black.tapped { background: var(--primary); }
.tile.tapped { opacity: 0.6; }
.tile.miss { background: var(--danger) !important; }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.over-title { font-size: 44rpx; color: #fff; font-weight: 800; }
.over-score { font-size: 30rpx; color: #ffe; margin: 16rpx 0 24rpx; }
.over-row { display: flex; gap: 20rpx; }
.over-btn { background: var(--primary); color: #fff; padding: 16rpx 40rpx; border-radius: 30rpx; font-size: 28rpx; }
</style>
