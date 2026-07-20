<template>
  <view class="page" :class="{ dark }" :style="cssVars">
    <view class="hd">弹球打砖块</view>
    <view class="status">
      <text>分数 {{ score }}</text>
      <text class="dot">·</text>
      <text>最高 {{ best }}</text>
      <text class="dot">·</text>
      <text>❤️ {{ lives }}</text>
    </view>

    <!-- 难度选择 -->
    <view v-if="!started" class="diff">
      <view class="diff-tip">选择难度</view>
      <view class="diff-row">
        <view class="diff-btn" @click="start(5)">简单 5 行</view>
        <view class="diff-btn" @click="start(7)">普通 7 行</view>
        <view class="diff-btn" @click="start(10)">困难 10 行</view>
      </view>
      <view class="tip">左右滑动控制挡板，击碎所有砖块通关</view>
    </view>

    <!-- 游戏区 -->
    <view v-if="started" class="board" @touchmove="tm">
      <view
        v-for="(b, i) in bricks"
        :key="i"
        class="brick"
        :style="{ left: b.x + 'rpx', top: b.y + 'rpx', width: b.w + 'rpx', height: b.h + 'rpx', background: b.alive ? b.color : 'transparent' }"
      ></view>
      <view class="paddle" :style="{ left: paddle.x + 'rpx', top: paddle.y + 'rpx', width: paddle.w + 'rpx', height: paddle.h + 'rpx' }"></view>
      <view class="ball" :style="{ left: ball.x + 'rpx', top: ball.y + 'rpx' }">⚪</view>

      <view v-if="over" class="overlay">
        <view class="over-title">{{ won ? '🏆 通关' : '💀 游戏结束' }}</view>
        <view class="over-score">分数 {{ score }}{{ isNewRecord ? ' · 新纪录' : '' }}</view>
        <view class="over-row">
          <view class="over-btn" @click="start(curRows)">再来一局</view>
          <view class="over-btn ghost" @click="quit">换难度</view>
        </view>
      </view>
    </view>

    <view v-if="started && !over" class="back-btn" @click="quit">返回难度</view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onUnload, onHide, onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { useGame, vibrate, playSound, destroySound, pickColors, clamp } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const colors = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('breakout')

// 通过 CSS 变量把配色注入到 scoped 样式
const cssVars = computed(() => ({
  '--bg': colors.value.bg,
  '--board': colors.value.board,
  '--text': colors.value.text,
  '--sub': colors.value.sub,
  '--primary': colors.value.primary,
  '--danger': colors.value.danger,
  '--border': colors.value.border,
}))

// 棋盘尺寸（rpx）。min(630rpx, 92vw) 在所有机型上恒等于 630rpx，故用 630 做坐标运算
const W = 630, H = 880
const pw = 120, ph = 20, ballR = 10
// 每行砖块颜色（越上层分越高）
const ROW_COLORS = ['#e64340', '#e6a23c', '#f1c40f', '#07c160', '#409eff', '#9b59b6', '#1abc9c', '#e06c75', '#3498db', '#16a085']

// px → rpx 换算（用于触摸坐标映射）
const sys = uni.getSystemInfoSync()
const rpxRatio = 750 / sys.windowWidth

const started = ref(false)
const over = ref(false)
const won = ref(false)
const score = ref(0)
const lives = ref(3)
const curRows = ref(7)
const bricks = ref([])
const paddle = ref({ x: (W - pw) / 2, y: H - 60, w: pw, h: ph })
const ball = ref({ x: W / 2, y: H - 90, vx: 4, vy: -5 })
let timer = null
let hits = 0
let boardRect = null
let paused = false

// 构建砖块墙
function buildBricks(rows) {
  const arr = []
  const cols = 8, gap = 4, bw = 74, bh = 32, top = 60, leftOff = 1
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      arr.push({
        x: leftOff + gap + c * (bw + gap),
        y: top + r * (bh + gap),
        w: bw, h: bh,
        color: ROW_COLORS[r % ROW_COLORS.length],
        points: (rows - r) * 5 + 5,
        alive: true,
      })
    }
  }
  return arr
}

// 测量棋盘位置，用于把触摸坐标映射到 rpx 坐标
function measure() {
  return new Promise((res) => {
    uni.createSelectorQuery().select('.board').boundingClientRect((r) => {
      if (r && r.width) boardRect = r
      res()
    }).exec()
  })
}

function resetBall() {
  ball.value = { x: paddle.value.x + pw / 2, y: paddle.value.y - 18, vx: 4, vy: -5 }
}

// 游戏主循环
function tick() {
  if (over.value || paused) return
  const b = ball.value
  b.x += b.vx
  b.y += b.vy
  // 左右墙
  if (b.x < ballR) { b.x = ballR; b.vx = -b.vx }
  if (b.x > W - ballR) { b.x = W - ballR; b.vx = -b.vx }
  // 顶墙
  if (b.y < ballR) { b.y = ballR; b.vy = -b.vy }
  // 挡板碰撞
  const p = paddle.value
  if (b.vy > 0 && b.y + ballR >= p.y && b.y + ballR <= p.y + ph + 8 && b.x >= p.x - 4 && b.x <= p.x + pw + 4) {
    b.y = p.y - ballR
    const rel = (b.x - (p.x + pw / 2)) / (pw / 2)
    b.vx = clamp(rel * 6, -7, 7)
    b.vy = -Math.abs(b.vy)
    vibrate('short'); playSound('tap')
  }
  // 砖块碰撞
  for (const br of bricks.value) {
    if (!br.alive) continue
    if (b.x + ballR > br.x && b.x - ballR < br.x + br.w && b.y + ballR > br.y && b.y - ballR < br.y + br.h) {
      br.alive = false
      score.value += br.points
      b.vy = -b.vy
      hits++
      vibrate('short'); playSound('hit')
      // 每 6 次命中提速
      if (hits % 6 === 0) {
        const sp = Math.min(Math.hypot(b.vx, b.vy) * 1.08, 12)
        const ang = Math.atan2(b.vy, b.vx)
        b.vx = Math.cos(ang) * sp
        b.vy = Math.sin(ang) * sp
      }
      break
    }
  }
  // 落底失球
  if (b.y > H + 20) {
    lives.value--
    vibrate('long'); playSound('fail')
    if (lives.value <= 0) endGame(false)
    else resetBall()
  }
  // 通关
  if (bricks.value.length && bricks.value.every((br) => !br.alive)) endGame(true)
}

function endGame(win) {
  over.value = true
  won.value = win
  if (timer) { clearInterval(timer); timer = null }
  submitScore(score.value)
  if (win) { vibrate('long'); playSound('win') }
}

// 触摸：挡板跟随手指
function tm(e) {
  if (over.value) return
  if (!boardRect) { measure(); return }
  const x = e.touches[0].clientX
  paddle.value.x = clamp((x - boardRect.left) * rpxRatio - pw / 2, 0, W - pw)
}

async function start(rows) {
  curRows.value = rows
  bricks.value = buildBricks(rows)
  score.value = 0
  lives.value = 3
  over.value = false
  won.value = false
  hits = 0
  paddle.value = { x: (W - pw) / 2, y: H - 60, w: pw, h: ph }
  resetBall()
  started.value = true
  paused = false
  await nextTick()
  await measure()
  if (timer) clearInterval(timer)
  timer = setInterval(tick, 30)
}

function quit() {
  if (timer) { clearInterval(timer); timer = null }
  started.value = false
  over.value = false
}

// 暂停 / 恢复
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
.board { position: relative; width: min(630rpx, 92vw); height: 880rpx; background: var(--board); border-radius: 16rpx; overflow: hidden; border: 2rpx solid var(--border); touch-action: none; }
.brick { position: absolute; border-radius: 6rpx; }
.paddle { position: absolute; background: var(--primary); border-radius: 10rpx; box-shadow: 0 0 8rpx rgba(0,0,0,0.15); }
.ball { position: absolute; font-size: 26rpx; line-height: 1; transform: translate(-50%, -50%); }
.back-btn { margin-top: 20rpx; font-size: 26rpx; color: var(--sub); padding: 12rpx 40rpx; border: 2rpx solid var(--border); border-radius: 30rpx; }
.overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.over-title { font-size: 44rpx; color: #fff; font-weight: 800; }
.over-score { font-size: 30rpx; color: #ffe; margin: 16rpx 0 24rpx; }
.over-row { display: flex; gap: 20rpx; }
.over-btn { background: var(--primary); color: #fff; padding: 16rpx 40rpx; border-radius: 30rpx; font-size: 28rpx; }
.over-btn.ghost { background: transparent; border: 2rpx solid #fff; }
</style>
