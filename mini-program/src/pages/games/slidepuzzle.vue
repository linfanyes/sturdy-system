<template>
  <view class="page" :class="{ dark }" :style="pageStyle">
    <view class="hd">数字推盘</view>
    <view class="status">
      <text>步数 {{ steps }}</text>
      <text>最佳 {{ bestSteps || '-' }}</text>
      <text>{{ fmtTime(elapsed) }}</text>
    </view>

    <!-- 难度 / 关卡选择 -->
    <view class="ctrl">
      <view class="lab">难度</view>
      <view class="tabs">
        <view v-for="d in diffs" :key="d.n" class="tab"
          :class="{ on: N === d.n }" @click="setDiff(d.n)">{{ d.n }}×{{ d.n }}</view>
      </view>
      <view class="lab">目标</view>
      <view class="tabs">
        <view v-for="p in patterns" :key="p.k" class="tab"
          :class="{ on: pattern === p.k }" @click="setPattern(p.k)">{{ p.n }}</view>
      </view>
    </view>

    <!-- 目标预览 -->
    <view class="preview" :style="{ gridTemplateColumns: 'repeat(' + N + ', 1fr)' }">
      <view v-for="(v, i) in solvedArr" :key="'pv'+i" class="pcell" :class="{ blank: v === 0 }">
        <text v-if="v">{{ v }}</text>
      </view>
    </view>
    <view class="pv-lab">↑ 目标排列（{{ patternName }}）</view>

    <!-- 棋盘 -->
    <view class="board"
      :style="{ width: boardSize + 'rpx', height: boardSize + 'rpx', gridTemplateColumns: 'repeat(' + N + ', 1fr)' }"
      @touchstart="ts" @touchend="te">
      <view v-for="(v, i) in grid" :key="i" class="cell"
        :class="{ blank: v === 0, won: wonIdx >= 0 && posOrder.indexOf(i) <= wonIdx }"
        @click="tap(i)">
        <text v-if="v" class="num">{{ v }}</text>
      </view>
    </view>

    <view class="row">
      <button class="btn ghost" @click="newGame">新局</button>
      <button v-if="!solved" class="btn ghost" @click="solveHint">放弃</button>
    </view>

    <view v-if="solved" class="result">🎉 完成！步数 {{ steps }} · 用时 {{ fmtTime(elapsed) }}</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { vibrate, playSound, destroySound, pickColors, fmtTime } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const colors = computed(() => pickColors(dark.value))
const pageStyle = computed(() => ({
  '--bg': colors.value.bg,
  '--card': colors.value.card,
  '--cell': colors.value.cell,
  '--cellAlt': colors.value.cellAlt,
  '--border': colors.value.border,
  '--text': colors.value.text,
  '--sub': colors.value.sub,
  '--primary': colors.value.primary,
  '--accent': colors.value.accent,
}))

const diffs = [{ n: 3 }, { n: 4 }, { n: 5 }]
const patterns = [
  { k: 'seq', n: '顺序' },
  { k: 'rev', n: '倒序' },
  { k: 'snake', n: '蛇形' },
  { k: 'spiral', n: '螺旋' },
]
const patternName = computed(() => patterns.find((p) => p.k === pattern.value).n)

const N = ref(4)
const pattern = ref('seq')
const grid = ref([])
const posOrder = ref([])   // 目标排列：posOrder[i] = 第 i 个填数字的格子位置
const solvedArr = ref([])  // 一维数组展示目标
const steps = ref(0)
const elapsed = ref(0)
const solved = ref(false)
const bestSteps = ref(0)
const wonIdx = ref(-1)
let blankPos = 0
let timer = null
let startTime = 0
let sx = 0, sy = 0

const boardSize = computed(() => Math.min(560, Math.floor(540 / N.value) * N.value))

// 生成目标排列：返回 { arr, posOrder, blankPos }
function buildSolved(n, pat) {
  const arr = Array(n * n).fill(0)
  const order = []
  if (pat === 'seq') {
    for (let i = 0; i < n * n; i++) order.push(i)
  } else if (pat === 'rev') {
    for (let i = n * n - 2; i >= 0; i--) order.push(i)
    order.push(n * n - 1)
  } else if (pat === 'snake') {
    for (let r = 0; r < n; r++) {
      if (r % 2 === 0) for (let c = 0; c < n; c++) order.push(r * n + c)
      else for (let c = n - 1; c >= 0; c--) order.push(r * n + c)
    }
  } else if (pat === 'spiral') {
    let top = 0, bot = n - 1, left = 0, right = n - 1
    while (top <= bot && left <= right) {
      for (let c = left; c <= right; c++) order.push(top * n + c)
      top++
      for (let r = top; r <= bot; r++) order.push(r * n + right)
      right--
      if (top <= bot) { for (let c = right; c >= left; c--) order.push(bot * n + c); bot-- }
      if (left <= right) { for (let r = bot; r >= top; r--) order.push(r * n + left); left++ }
    }
  }
  for (let i = 0; i < n * n - 1; i++) arr[order[i]] = i + 1
  return { arr, order, blankPos: order[n * n - 1] }
}

function bestKey() { return 'game_best_slidepuzzle_' + N.value + '_' + pattern.value }

function loadBest() {
  try { return uni.getStorageSync(bestKey()) || 0 } catch (e) { return 0 }
}

function saveBest(steps) {
  const prev = loadBest()
  if (prev === 0 || steps < prev) {
    try { uni.setStorageSync(bestKey(), steps); bestSteps.value = steps; return true } catch (e) {}
  }
  return false
}

// 从已解决态做 100 次随机有效滑动，保证可解
function shuffleSolvable(solved) {
  const g = solved.arr.slice()
  let blank = solved.blankPos
  let lastBlank = -1
  const n = N.value
  for (let i = 0; i < 100; i++) {
    const neighbors = []
    const r = Math.floor(blank / n), c = blank % n
    if (r > 0) neighbors.push(blank - n)
    if (r < n - 1) neighbors.push(blank + n)
    if (c > 0) neighbors.push(blank - 1)
    if (c < n - 1) neighbors.push(blank + 1)
    // 避免立刻撤销上一步
    const filt = neighbors.filter((p) => p !== lastBlank)
    const pick = (filt.length ? filt : neighbors)[Math.floor(Math.random() * (filt.length ? filt.length : neighbors.length))]
    g[blank] = g[pick]
    g[pick] = 0
    lastBlank = blank
    blank = pick
  }
  return { g, blank }
}

function newGame() {
  const s = buildSolved(N.value, pattern.value)
  solvedArr.value = s.arr.slice()
  posOrder.value = s.order.slice()
  bestSteps.value = loadBest()
  const { g, blank } = shuffleSolvable(s)
  grid.value = g
  blankPos = blank
  steps.value = 0
  elapsed.value = 0
  solved.value = false
  wonIdx.value = -1
  if (timer) clearInterval(timer)
  startTime = Date.now()
  timer = setInterval(() => { if (!solved.value) elapsed.value = Date.now() - startTime }, 200)
}

function setDiff(n) { if (n !== N.value) { N.value = n; newGame() } }
function setPattern(k) { if (k !== pattern.value) { pattern.value = k; newGame() } }

function checkSolved() {
  for (let i = 0; i < N.value * N.value; i++) {
    if (grid.value[i] !== solvedArr.value[i]) return false
  }
  return true
}

// 移动：tileAt 位置的方块移入空白（需相邻）
function moveTile(tileAt) {
  if (solved.value) return false
  const r1 = Math.floor(tileAt / N.value), c1 = tileAt % N.value
  const r2 = Math.floor(blankPos / N.value), c2 = blankPos % N.value
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false
  grid.value[blankPos] = grid.value[tileAt]
  grid.value[tileAt] = 0
  blankPos = tileAt
  steps.value++
  playSound('tap')
  vibrate('short')
  if (checkSolved()) {
    solved.value = true
    if (timer) { clearInterval(timer); timer = null }
    saveBest(steps.value)
    playSound('win')
    vibrate('long')
    playWinAnim()
  }
  return true
}

function tap(i) {
  if (grid.value[i] === 0) return
  moveTile(i)
}

// 滑动方向：方块朝该方向滑入空白
function swipe(dir) {
  // dir: 1=上, 2=下, 3=左, 4=右
  const r = Math.floor(blankPos / N.value), c = blankPos % N.value
  let tile = -1
  if (dir === 1 && r < N.value - 1) tile = blankPos + N.value       // 下方块上滑
  else if (dir === 2 && r > 0) tile = blankPos - N.value            // 上方块下滑
  else if (dir === 3 && c < N.value - 1) tile = blankPos + 1        // 右方块左滑
  else if (dir === 4 && c > 0) tile = blankPos - 1                  // 左方块右滑
  if (tile >= 0) moveTile(tile)
}

function ts(e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function te(e) {
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) swipe(dx > 0 ? 4 : 3)
  else swipe(dy > 0 ? 2 : 1)
}

function playWinAnim() {
  let i = 0
  wonIdx.value = 0
  const t = setInterval(() => {
    i++
    wonIdx.value = i
    if (i >= N.value * N.value - 1) clearInterval(t)
  }, 80)
}

function solveHint() {
  uni.showModal({ title: '放弃本局', content: '直接显示答案？', success: (r) => {
    if (r.confirm) { grid.value = solvedArr.value.slice(); solved.value = true; if (timer) { clearInterval(timer); timer = null } }
  }})
}

onLoad(() => { newGame() })
onUnload(() => { if (timer) clearInterval(timer); destroySound() })
onHide(() => { if (timer) { clearInterval(timer); timer = null } })
</script>

<style scoped>
.page { background: var(--bg); min-height: 100vh; color: var(--text); padding: 24rpx; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--primary); }
.status { display: flex; gap: 24rpx; font-size: 24rpx; color: var(--sub); margin: 8rpx 0; }

.ctrl { width: min(630rpx, 92vw); margin-bottom: 12rpx; }
.lab { font-size: 22rpx; color: var(--sub); margin: 8rpx 0 4rpx; }
.tabs { display: flex; gap: 10rpx; flex-wrap: wrap; }
.tab { background: var(--card); border: 2rpx solid var(--border); border-radius: 24rpx; padding: 8rpx 18rpx; font-size: 24rpx; color: var(--text); }
.tab.on { background: var(--primary); color: #fff; border-color: var(--primary); }

.preview { width: 180rpx; display: grid; gap: 2rpx; background: var(--border); padding: 2rpx; border-radius: 6rpx; margin-top: 6rpx; }
.pcell { background: var(--cellAlt); display: flex; align-items: center; justify-content: center; font-size: 18rpx; color: var(--text); aspect-ratio: 1; }
.pcell.blank { background: var(--cell); }
.pv-lab { font-size: 20rpx; color: var(--sub); margin: 4rpx 0 12rpx; }

.board { display: grid; gap: 6rpx; background: var(--border); padding: 6rpx; border-radius: 14rpx; }
.cell { background: var(--card); border-radius: 8rpx; display: flex; align-items: center; justify-content: center; transition: background .2s; }
.cell.blank { background: var(--cell); }
.cell.won { background: var(--accent); animation: pop 0.4s ease; }
@keyframes pop { 0% { transform: scale(0.85); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }
.num { font-size: 44rpx; font-weight: 700; color: var(--text); }

.row { display: flex; gap: 14rpx; margin-top: 16rpx; }
.btn { background: var(--primary); color: #fff; border-radius: 40rpx; padding: 0 40rpx; font-size: 28rpx; line-height: 72rpx; }
.btn.ghost { background: var(--card); color: var(--primary); border: 2rpx solid var(--primary); }
.result { margin-top: 18rpx; font-size: 28rpx; font-weight: 700; color: var(--accent); }
</style>
