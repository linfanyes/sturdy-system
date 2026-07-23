<template>
  <view class="page" :class="{ dark }" :style="cssVars">
    <view class="hd">像素鸟</view>
    <view class="status">
      <text>分数 {{ score }}</text>
      <text class="dot">·</text>
      <text>最高 {{ best }}</text>
    </view>

    <!-- 难度选择 -->
    <view v-if="!started" class="diff">
      <view class="diff-tip">选择管道间隙</view>
      <view class="diff-row">
        <view class="diff-btn" @click="start('easy')">大 (易)</view>
        <view class="diff-btn" @click="start('normal')">中</view>
        <view class="diff-btn" @click="start('hard')">小 (难)</view>
      </view>
      <view class="tip">点击屏幕让小鸟上跳，穿过管道间隙得分</view>
    </view>

    <!-- 游戏区 -->
    <view v-if="started" class="board" @touchstart="tap">
      <!-- 管道 -->
      <view v-for="(p, i) in pipes" :key="i">
        <view class="pipe" :style="{ left: p.x + 'rpx', top: '0', width: pipeW + 'rpx', height: p.gapY + 'rpx' }"></view>
        <view class="pipe" :style="{ left: p.x + 'rpx', top: (p.gapY + gapH) + 'rpx', width: pipeW + 'rpx', height: (H - p.gapY - gapH - groundH) + 'rpx' }"></view>
      </view>
      <!-- 小鸟 -->
      <view class="bird" :style="{ left: birdX + 'rpx', top: bird.y + 'rpx', transform: 'translate(-50%,-50%) rotate(' + bird.rot + 'deg)' }">🐦</view>
      <!-- 地面 -->
      <view class="ground" :style="{ top: (H - groundH) + 'rpx', height: groundH + 'rpx' }"></view>

      <view v-if="over" class="overlay">
        <view class="over-title">💥 撞毁</view>
        <view class="over-score">分数 {{ score }}{{ isNewRecord ? ' · 新纪录' : '' }}</view>
        <view class="over-row">
          <view class="over-btn" @click="start(curDiff)">再来一局</view>
          <view class="over-btn ghost" @click="quit">换难度</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onUnload, onHide, onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { useGame, vibrate, playSound, destroySound, pickColors, clamp, rand } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const colors = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('flappy')

const cssVars = computed(() => ({
  '--bg': colors.value.bg,
  '--board': colors.value.board,
  '--text': colors.value.text,
  '--sub': colors.value.sub,
  '--primary': colors.value.primary,
  '--accent': colors.value.accent,
  '--border': colors.value.border,
}))

// 棋盘尺寸（rpx）
const W = 630, H = 880
const groundH = 60
const birdX = 160
const birdSize = 50
const pipeW = 90
// 难度：管道间隙
const GAP = { easy: 240, normal: 200, hard: 160 }
const SPAWN_SPACING = 300 // 每隔 300rpx 一对管道
const SCROLL = 3
const GRAVITY = 0.45
const FLAP_V = -8.5

const started = ref(false)
const over = ref(false)
const score = ref(0)
const curDiff = ref('normal')
const gapH = ref(GAP.normal)
const bird = ref({ y: H / 2, vy: 0, rot: 0 })
const pipes = ref([])
let timer = null
let paused = false

// 生成一对管道
function spawnPipe(x) {
  const minY = 120, maxY = H - groundH - 120 - gapH.value
  pipes.value.push({ x, gapY: rand(minY, maxY), scored: false })
}

// 主循环
function tick() {
  if (over.value || paused) return
  // 小鸟物理
  const b = bird.value
  b.vy += GRAVITY
  b.y += b.vy
  b.rot = clamp(b.vy * 4, -25, 90)
  // 管道滚动
  pipes.value = pipes.value.map((p) => ({ ...p, x: p.x - SCROLL }))
  // 生成新管道
  const last = pipes.value[pipes.value.length - 1]
  if (!last || last.x < W - SPAWN_SPACING) spawnPipe(W)
  // 移除越界
  pipes.value = pipes.value.filter((p) => p.x > -pipeW)
  // 计分
  for (const p of pipes.value) {
    if (!p.scored && p.x + pipeW < birdX) {
      p.scored = true
      score.value++
      vibrate('short'); playSound('hit')
    }
  }
  // 碰撞：地面 / 天花板
  if (b.y + birdSize / 2 >= H - groundH) { b.y = H - groundH - birdSize / 2; return die() }
  if (b.y - birdSize / 2 < 0) { b.y = birdSize / 2; b.vy = 0 }
  // 碰撞：管道
  for (const p of pipes.value) {
    if (birdX + birdSize / 2 > p.x && birdX - birdSize / 2 < p.x + pipeW) {
      if (b.y - birdSize / 2 < p.gapY || b.y + birdSize / 2 > p.gapY + gapH.value) return die()
    }
  }
}

function die() {
  if (over.value) return
  over.value = true
  vibrate('long'); playSound('fail')
  if (timer) { clearInterval(timer); timer = null }
  submitScore(score.value)
}

// 点击：开始 / 拍翅 / 重开
function tap() {
  if (over.value) return
  if (!started.value) return
  bird.value.vy = FLAP_V
  playSound('tap')
}

function start(diff) {
  curDiff.value = diff
  gapH.value = GAP[diff]
  score.value = 0
  over.value = false
  bird.value = { y: H / 2, vy: 0, rot: 0 }
  pipes.value = []
  // 预先生成第一对管道
  spawnPipe(W + 100)
  started.value = true
  paused = false
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

function quit() {
  if (timer) { clearInterval(timer); timer = null }
  started.value = false
  over.value = false
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
.diff-row { display: flex; gap: 20rpx; }
.diff-btn { background: var(--primary); color: #fff; padding: 24rpx 28rpx; border-radius: 16rpx; font-size: 28rpx; }
.tip { font-size: 24rpx; color: var(--sub); margin-top: 40rpx; }
.board { position: relative; width: min(630rpx, 92vw); height: 880rpx; background: linear-gradient(180deg, #87ceeb 0%, #b8e7ff 70%, #d6f0ff 100%); border-radius: 16rpx; overflow: hidden; border: 2rpx solid var(--border); touch-action: none; }
.dark .board { background: linear-gradient(180deg, #1a2740 0%, #243450 70%, #2a3a5a 100%); }
.pipe { position: absolute; background: linear-gradient(90deg, #2e7d32, #43a047, #2e7d32); border: 2rpx solid #1b5e20; box-sizing: border-box; }
.bird { position: absolute; font-size: 50rpx; line-height: 1; }
.ground { position: absolute; left: 0; right: 0; background: linear-gradient(180deg, #ded895, #c9b97a); border-top: 4rpx solid #8d6e3a; }
.dark .ground { background: linear-gradient(180deg, #5a4a2a, #3a2e1a); }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.over-title { font-size: 44rpx; color: #fff; font-weight: 800; }
.over-score { font-size: 30rpx; color: #ffe; margin: 16rpx 0 24rpx; }
.over-row { display: flex; gap: 20rpx; }
.over-btn { background: var(--primary); color: #fff; padding: 16rpx 40rpx; border-radius: 30rpx; font-size: 28rpx; }
.over-btn.ghost { background: transparent; border: 2rpx solid #fff; }
</style>
