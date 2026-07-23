<template>
  <view class="page" :class="{ dark }" :style="cssVars">
    <view class="hd">跳一跳</view>
    <view class="status">
      <text>分数 {{ score }}</text>
      <text class="dot">·</text>
      <text>最高 {{ best }}</text>
      <text class="dot">·</text>
      <text>连击 {{ combo }}</text>
    </view>

    <!-- 开始入口 -->
    <view v-if="!started" class="diff">
      <view class="diff-tip">长按蓄力，松手跳跃</view>
      <view class="diff-btn" @click="start">开始游戏</view>
      <view class="tip">完美落在平台中心 +2 分（连击递增），平台会逐渐变窄</view>
    </view>

    <!-- 游戏区 -->
    <view v-if="started" class="board" @touchstart="onTs" @touchend="onTe" @touchcancel="onTe">
      <!-- 当前平台 -->
      <view class="plat" :style="platStyle(curScreenX, cw)"></view>
      <!-- 下一个平台 + 中心标记 -->
      <view class="plat next" :style="platStyle(nextScreenX, nw)"></view>
      <view class="center-dot" :style="{ left: (nextScreenX - 6) + 'rpx', top: (baseline - 6) + 'rpx' }"></view>
      <!-- 玩家 -->
      <view class="player" :style="{ left: playerScreenX + 'rpx', top: player.y + 'rpx' }">🟠</view>
      <!-- 蓄力条 -->
      <view class="charge-bar" :style="{ width: (charge * 100) + '%' }"></view>
      <view class="charge-track"></view>

      <view v-if="over" class="overlay">
        <view class="over-title">💀 掉落</view>
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
const { best, isNewRecord, submitScore } = useGame('jump')

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
const SCX = 150          // 玩家屏幕固定 x（相机跟随）
const baseline = 620     // 平台顶部屏幕 y
const platH = 26
const playerHalf = 24
const MAX_TRAVEL = 360   // 满蓄力最远距离
const CHARGE_FULL = 1300 // 满蓄力时长 ms
const JUMP_DUR = 600     // 跳跃动画时长 ms
const JUMP_H = 200       // 跳跃高度
const PERFECT = 14       // 完美中心容差

const started = ref(false)
const over = ref(false)
const score = ref(0)
const combo = ref(0)
const charge = ref(0)
const player = ref({ wx: 0, y: baseline - playerHalf }) // wx 世界坐标，y 屏幕坐标
let cwx = 0, cw = 130     // 当前平台世界中心 + 宽度
let nwx = 0, nw = 130     // 下一个平台
let camX = -SCX           // 相机偏移：屏幕 x = 世界 x - camX
let charging = false
let jumping = false
let chargeT = 0
let jumpT = 0
let jumpStartWX = 0
let travel = 0
let chargeTimer = null
let jumpTimer = null
let paused = false

const curScreenX = computed(() => cwx - camX)
const nextScreenX = computed(() => nwx - camX)
const playerScreenX = computed(() => player.value.wx - camX)

function platStyle(sx, w) {
  return { left: (sx - w / 2) + 'rpx', top: baseline + 'rpx', width: w + 'rpx', height: platH + 'rpx' }
}

function newDist() { return rand(170, 300) }
function newW() { return Math.max(60, 130 - score.value * 2) }

// 蓄力计时
function startChargeTick() {
  if (chargeTimer) clearInterval(chargeTimer)
  chargeTimer = setInterval(() => {
    chargeT += 30
    charge.value = Math.min(1, chargeT / CHARGE_FULL)
  }, 30)
}
// 跳跃动画
function startJumpTick() {
  if (jumpTimer) clearInterval(jumpTimer)
  jumpTimer = setInterval(() => {
    jumpT += 30
    const p = Math.min(1, jumpT / JUMP_DUR)
    player.value.wx = jumpStartWX + travel * p
    player.value.y = baseline - playerHalf - 4 * JUMP_H * p * (1 - p)
    if (p >= 1) {
      clearInterval(jumpTimer); jumpTimer = null
      land()
    }
  }, 30)
}

// 落地判定
function land() {
  jumping = false
  const landingWX = jumpStartWX + travel
  const lo = nwx - nw / 2 - 4, hi = nwx + nw / 2 + 4
  if (landingWX < lo || landingWX > hi) { return fail() }
  const centerDist = Math.abs(landingWX - nwx)
  if (centerDist < PERFECT) {
    combo.value++
    score.value += 2 + (combo.value - 1)
    vibrate('short'); playSound('win')
  } else {
    score.value += 1
    combo.value = 0
    vibrate('short'); playSound('hit')
  }
  // 相机归位：玩家落到新平台，归一化到 SCX
  cwx = nwx
  cw = nw
  nwx = cwx + newDist()
  nw = newW()
  player.value.wx = landingWX
  camX = landingWX - SCX
  player.value.y = baseline - playerHalf
}

function fail() {
  if (over.value) return
  over.value = true
  vibrate('long'); playSound('fail')
  clearAll()
  submitScore(score.value)
}

function clearAll() {
  if (chargeTimer) { clearInterval(chargeTimer); chargeTimer = null }
  if (jumpTimer) { clearInterval(jumpTimer); jumpTimer = null }
}

// 触摸：按下蓄力，松开跳跃
function onTs() {
  if (over.value || jumping.value || paused) return
  charging = true
  chargeT = 0
  charge.value = 0
  startChargeTick()
}
function onTe() {
  if (!charging) return
  charging = false
  if (chargeTimer) { clearInterval(chargeTimer); chargeTimer = null }
  const power = charge.value
  charge.value = 0
  if (power < 0.03) return // 误触
  jumping = true
  jumpStartWX = player.value.wx
  travel = power * MAX_TRAVEL
  jumpT = 0
  playSound('tap')
  startJumpTick()
}

function start() {
  score.value = 0
  combo.value = 0
  charge.value = 0
  over.value = false
  charging = false
  jumping = false
  chargeT = 0; jumpT = 0
  clearAll()
  player.value = { wx: 0, y: baseline - playerHalf }
  cwx = 0; cw = 130
  nwx = cwx + newDist(); nw = 130
  camX = player.value.wx - SCX
  started.value = true
  paused = false
}

function pauseGame() {
  if (!started.value || over.value || paused) return
  paused = true
  if (chargeTimer) { clearInterval(chargeTimer); chargeTimer = null }
  if (jumpTimer) { clearInterval(jumpTimer); jumpTimer = null }
}
function resumeGame() {
  if (!started.value || over.value || !paused) return
  paused = false
  if (charging) startChargeTick()
  if (jumping) startJumpTick()
}

onHide(() => pauseGame())
onShow(() => resumeGame())
onUnload(() => { clearAll(); destroySound() })
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
.plat { position: absolute; background: var(--primary); border-radius: 6rpx; box-shadow: 0 4rpx 0 rgba(0,0,0,0.12); }
.plat.next { background: var(--accent); }
.center-dot { position: absolute; width: 12rpx; height: 12rpx; border-radius: 50%; background: var(--danger); opacity: 0.7; }
.player { position: absolute; font-size: 48rpx; line-height: 1; transform: translate(-50%, -100%); }
.charge-track { position: absolute; left: 30rpx; bottom: 30rpx; width: calc(100% - 60rpx); height: 14rpx; background: rgba(0,0,0,0.12); border-radius: 7rpx; }
.charge-bar { position: absolute; left: 30rpx; bottom: 30rpx; height: 14rpx; background: var(--danger); border-radius: 7rpx; transition: width 0.05s linear; z-index: 2; }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.over-title { font-size: 44rpx; color: #fff; font-weight: 800; }
.over-score { font-size: 30rpx; color: #ffe; margin: 16rpx 0 24rpx; }
.over-row { display: flex; gap: 20rpx; }
.over-btn { background: var(--primary); color: #fff; padding: 16rpx 40rpx; border-radius: 30rpx; font-size: 28rpx; }
</style>
