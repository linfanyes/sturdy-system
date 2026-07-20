<template>
  <view class="page" :class="{ dark }" :style="cssVars">
    <view class="hd">接金币</view>
    <view class="status">
      <text>分数 {{ score }}</text>
      <text class="dot">·</text>
      <text>最高 {{ best }}</text>
      <text class="dot">·</text>
      <text>❤️ {{ lives }}</text>
    </view>

    <!-- 开始入口 -->
    <view v-if="!started" class="diff">
      <view class="diff-tip">左右滑动移动篮子</view>
      <view class="diff-btn" @click="start">开始游戏</view>
      <view class="tip">🪙 +10 · 💎 +50 · 💣 -1 命 · 每 500 分提速</view>
    </view>

    <!-- 游戏区 -->
    <view v-if="started" class="board" @touchmove="tm">
      <!-- 下落物 -->
      <view
        v-for="it in items"
        :key="it.id"
        class="item"
        :style="{ left: it.x + 'rpx', top: it.y + 'rpx' }"
      >{{ it.emoji }}</view>
      <!-- 篮子 -->
      <view class="basket" :style="{ left: basketX + 'rpx', top: basketY + 'rpx', width: basketW + 'rpx', height: basketH + 'rpx' }"></view>

      <view v-if="over" class="overlay">
        <view class="over-title">💀 游戏结束</view>
        <view class="over-score">分数 {{ score }}{{ isNewRecord ? ' · 新纪录' : '' }}</view>
        <view class="over-row">
          <view class="over-btn" @click="start">再来一局</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onUnload, onHide, onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { useGame, vibrate, playSound, destroySound, pickColors, rand, clamp } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const colors = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('catchcoin')

const cssVars = computed(() => ({
  '--bg': colors.value.bg,
  '--board': colors.value.board,
  '--text': colors.value.text,
  '--sub': colors.value.sub,
  '--primary': colors.value.primary,
  '--accent': colors.value.accent,
  '--danger': colors.value.danger,
  '--border': colors.value.border,
}))

// 棋盘尺寸（rpx）
const W = 630, H = 880
const basketW = 130, basketH = 70, basketY = 780
const itemSize = 56
const BASE_SPEED = 3.5
const SPAWN_INTERVAL = 700 // ms

// px → rpx 换算
const sys = uni.getSystemInfoSync()
const rpxRatio = 750 / sys.windowWidth

const started = ref(false)
const over = ref(false)
const score = ref(0)
const lives = ref(3)
const items = ref([])
const basketX = ref((W - basketW) / 2)
let timer = null
let uid = 0
let spawnAcc = 0
let boardRect = null
let paused = false

// 下落速度倍率（每 500 分提升）
function speedMult() { return 1 + Math.floor(score.value / 500) * 0.2 }

// 生成下落物
function spawn() {
  const r = Math.random() * 100
  let emoji, type
  if (r < 65) { emoji = '🪙'; type = 'coin' }
  else if (r < 75) { emoji = '💎'; type = 'diamond' }
  else { emoji = '💣'; type = 'bomb' }
  items.value.push({
    id: uid++,
    x: rand(itemSize, W - itemSize),
    y: -itemSize,
    emoji, type,
  })
}

// 主循环
function tick() {
  if (over.value || paused) return
  const sp = BASE_SPEED * speedMult()
  for (const it of items.value) it.y += sp
  // 接到判定
  const bx = basketX.value
  const caught = []
  for (const it of items.value) {
    if (it.y + itemSize >= basketY && it.y <= basketY + basketH && it.x >= bx - 6 && it.x <= bx + basketW + 6) {
      caught.push(it)
    }
  }
  for (const it of caught) {
    if (it.type === 'bomb') {
      lives.value--
      vibrate('long'); playSound('fail')
      if (lives.value <= 0) { items.value = items.value.filter((x) => x !== it); return endGame() }
    } else if (it.type === 'diamond') {
      score.value += 50
      vibrate('short'); playSound('win')
    } else {
      score.value += 10
      vibrate('short'); playSound('hit')
    }
    items.value = items.value.filter((x) => x !== it)
  }
  // 移除越界
  items.value = items.value.filter((it) => it.y < H + itemSize)
  // 生成
  spawnAcc += 30
  if (spawnAcc >= SPAWN_INTERVAL) { spawnAcc = 0; spawn() }
}

function endGame() {
  over.value = true
  if (timer) { clearInterval(timer); timer = null }
  submitScore(score.value)
}

// 触摸：篮子跟随手指
function tm(e) {
  if (over.value) return
  if (!boardRect) { measure(); return }
  const x = e.touches[0].clientX
  basketX.value = clamp((x - boardRect.left) * rpxRatio - basketW / 2, 0, W - basketW)
}

function measure() {
  return new Promise((res) => {
    uni.createSelectorQuery().select('.board').boundingClientRect((r) => {
      if (r && r.width) boardRect = r
      res()
    }).exec()
  })
}

async function start() {
  score.value = 0
  lives.value = 3
  over.value = false
  items.value = []
  basketX.value = (W - basketW) / 2
  uid = 0
  spawnAcc = 0
  started.value = true
  paused = false
  await nextTick()
  await measure()
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
.item { position: absolute; font-size: 48rpx; line-height: 1; transform: translateX(-50%); }
.basket { position: absolute; background: linear-gradient(180deg, #b8860b, #8b6508); border-radius: 0 0 20rpx 20rpx; border: 3rpx solid #5a4500; box-sizing: border-box; box-shadow: 0 4rpx 0 rgba(0,0,0,0.2); }
.dark .basket { background: linear-gradient(180deg, #8b6508, #5a4500); }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.over-title { font-size: 44rpx; color: #fff; font-weight: 800; }
.over-score { font-size: 30rpx; color: #ffe; margin: 16rpx 0 24rpx; }
.over-row { display: flex; gap: 20rpx; }
.over-btn { background: var(--primary); color: #fff; padding: 16rpx 40rpx; border-radius: 30rpx; font-size: 28rpx; }
</style>
