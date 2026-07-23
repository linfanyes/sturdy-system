<template>
  <view class="page" :style="{ background: c.bg, color: c.text }">
    <!-- 顶部状态条 -->
    <view class="top-bar">
      <view class="title">2048</view>
      <view class="scores">
        <view class="score-box">
          <text class="label">当前</text>
          <text class="val">{{ score }}</text>
        </view>
        <view class="score-box best">
          <text class="label">最高</text>
          <text class="val">{{ best }}</text>
        </view>
      </view>
    </view>

    <!-- 难度切换 -->
    <view class="diff-row">
      <view
        v-for="d in diffs"
        :key="d.size"
        class="diff"
        :class="{ on: size === d.size }"
        :style="size === d.size ? { background: c.primary, color: '#fff' } : { background: c.cell, color: c.sub }"
        @click="changeDiff(d.size)"
      >{{ d.label }}</view>
    </view>

    <!-- 棋盘 -->
    <view
      class="board"
      :style="{ background: c.board, width: boardW, height: boardW, gridTemplateColumns: 'repeat(' + size + ', 1fr)' }"
      @touchstart="ts"
      @touchend="te"
    >
      <view
        v-for="(cell, i) in flat"
        :key="i"
        class="cell"
        :style="{ background: c.cellAlt }"
      >
        <view
          v-if="cell.v"
          class="tile"
          :class="{ merged: cell.merged }"
          :style="tileStyle(cell.v)"
        >{{ cell.v }}</view>
      </view>
    </view>

    <!-- 操作区 -->
    <view class="ctrl">
      <view class="dpad">
        <view class="dpad-btn" :style="{ background: c.cell }" @click="move(1)">↑</view>
        <view class="dpad-row">
          <view class="dpad-btn" :style="{ background: c.cell }" @click="move(3)">←</view>
          <view class="dpad-btn" :style="{ background: c.cell }" @click="move(2)">↓</view>
          <view class="dpad-btn" :style="{ background: c.cell }" @click="move(4)">→</view>
        </view>
      </view>
    </view>

    <view class="btn-row">
      <button class="btn" :style="{ background: c.info, color: '#fff' }" @click="undo">撤销 ({{ history.length }})</button>
      <button class="btn" :style="{ background: c.primary, color: '#fff' }" @click="reset">重新开始</button>
    </view>

    <view v-if="over" class="over" :style="{ color: c.danger }">
      <text>游戏结束！分数 {{ score }}</text>
      <text v-if="isNewRecord" class="new-rec" :style="{ color: c.accent }">🎉 新纪录</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { pickColors, useGame, vibrate, playSound, destroySound } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const c = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('2048')

const diffs = [
  { size: 4, label: '4×4 经典' },
  { size: 5, label: '5×5 大师' },
]
const size = ref(4)
const board = ref([])
const score = ref(0)
const over = ref(false)
const history = ref([]) // 撤销栈，最多 5 步
const flat = ref([]) // 渲染用扁平数组 [{v, merged}]
let sx = 0, sy = 0

// 棋盘宽度响应式
const boardW = computed(() => size.value === 4 ? 'min(630rpx, 92vw)' : 'min(700rpx, 94vw)')

// 数字 → 配色（橙→红→紫渐变）
const TILE_COLORS = {
  2: { bg: '#eee4da', fg: '#3a3a3a' },
  4: { bg: '#ede0c8', fg: '#3a3a3a' },
  8: { bg: '#f2b179', fg: '#fff' },
  16: { bg: '#f59563', fg: '#fff' },
  32: { bg: '#f67c5f', fg: '#fff' },
  64: { bg: '#f65e3b', fg: '#fff' },
  128: { bg: '#edcf72', fg: '#fff' },
  256: { bg: '#edcc61', fg: '#fff' },
  512: { bg: '#edc850', fg: '#fff' },
  1024: { bg: '#edc53f', fg: '#fff' },
  2048: { bg: '#edc22e', fg: '#fff' },
  4096: { bg: '#9b59b6', fg: '#fff' },
  8192: { bg: '#7d3c98', fg: '#fff' },
}

function tileStyle(v) {
  const t = TILE_COLORS[v] || { bg: '#5b2c6f', fg: '#fff' }
  return {
    background: t.bg,
    color: t.fg,
    fontSize: v >= 1024 ? '34rpx' : v >= 128 ? '40rpx' : '48rpx',
  }
}

function clone(b) { return b.map((r) => r.slice()) }

/** 初始化棋盘 */
function init() {
  const b = Array.from({ length: size.value }, () => Array(size.value).fill(0))
  addRand(b); addRand(b)
  board.value = b
  score.value = 0
  over.value = false
  history.value = []
  isNewRecord.value = false
  sync()
}

/** 随机添加新数字 */
function addRand(b) {
  const e = []
  for (let i = 0; i < size.value; i++)
    for (let j = 0; j < size.value; j++)
      if (b[i][j] === 0) e.push([i, j])
  if (!e.length) return
  const [i, j] = e[Math.floor(Math.random() * e.length)]
  b[i][j] = Math.random() < 0.9 ? 2 : 4
}

/** 同步 board → flat 渲染数组 */
function sync(mergedSet) {
  const f = []
  for (let i = 0; i < size.value; i++)
    for (let j = 0; j < size.value; j++)
      f.push({ v: board.value[i][j], merged: !!(mergedSet && mergedSet.has(i * size.value + j)) })
  flat.value = f
  // 触发动画：merged 状态会在下次 sync 时清除
  if (mergedSet && mergedSet.size) {
    setTimeout(() => {
      const cur = flat.value.map((x) => ({ v: x.v, merged: false }))
      flat.value = cur
    }, 120)
  }
}

/**
 * 执行移动
 * @param {number} dir 1上 2下 3左 4右
 */
function move(dir) {
  if (over.value) return
  const b = clone(board.value)
  let gained = 0
  const mergedSet = new Set()
  const N = size.value

  const getLine = (i) => {
    if (dir === 3) return b[i]
    if (dir === 4) return b[i].slice().reverse()
    if (dir === 1) return b.map((r) => r[i])
    return b.map((r) => r[i]).reverse()
  }
  const setLine = (i, line) => {
    if (dir === 3) b[i] = line
    else if (dir === 4) b[i] = line.reverse()
    else if (dir === 1) for (let k = 0; k < N; k++) b[k][i] = line[k]
    else for (let k = 0; k < N; k++) b[N - 1 - k][i] = line[k]
  }
  const compress = (line, lineIdx) => {
    let arr = line.filter((x) => x)
    for (let k = 0; k < arr.length - 1; k++) {
      if (arr[k] === arr[k + 1]) {
        arr[k] *= 2
        gained += arr[k]
        // 记录合并位置用于动画
        const origPositions = line.map((v, idx) => ({ v, idx })).filter((x) => x.v !== 0)
        // 合并发生在结果数组的第 k 位，对应目标行/列第 k 个位置
        mergedSet.add(lineIdx * N + k)
        arr.splice(k + 1, 1)
      }
    }
    while (arr.length < N) arr.push(0)
    return arr
  }

  for (let i = 0; i < N; i++) setLine(i, compress(getLine(i), i))

  const changed = JSON.stringify(b) !== JSON.stringify(board.value)
  if (!changed) return

  // 推入撤销栈（最多 5 步）
  history.value.push({ b: clone(board.value), s: score.value })
  if (history.value.length > 5) history.value.shift()

  board.value = b
  if (gained > 0) {
    score.value += gained
    playSound('hit')
    vibrate('short')
  } else {
    playSound('tap')
  }
  addRand(board.value)
  sync(mergedSet)
  checkOver()
}

/** 检测死局 */
function checkOver() {
  const N = size.value
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      if (board.value[i][j] === 0) return
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      const v = board.value[i][j]
      if (j < N - 1 && board.value[i][j + 1] === v) return
      if (i < N - 1 && board.value[i + 1][j] === v) return
    }
  over.value = true
  playSound('fail')
  vibrate('long')
  submitScore(score.value)
}

/** 撤销一步 */
function undo() {
  if (!history.value.length || over.value) return
  const last = history.value.pop()
  board.value = last.b
  score.value = last.s
  sync()
  playSound('tap')
}

/** 滑动手势 */
function ts(e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function te(e) {
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 4 : 3)
  else move(dy > 0 ? 2 : 1)
}

function changeDiff(s) {
  if (s === size.value) return
  size.value = s
  reset()
}

function reset() { init() }

onLoad(() => init())
onUnload(() => destroySound())
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; display: flex; flex-direction: column; align-items: center; }
.top-bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.title { font-size: 44rpx; font-weight: 800; }
.scores { display: flex; gap: 12rpx; }
.score-box { padding: 8rpx 18rpx; border-radius: 14rpx; display: flex; flex-direction: column; align-items: center; min-width: 120rpx; }
.score-box.best { background: rgba(230, 162, 60, 0.18); }
.label { font-size: 20rpx; opacity: 0.7; }
.val { font-size: 30rpx; font-weight: 700; }
.diff-row { display: flex; gap: 14rpx; margin-bottom: 16rpx; }
.diff { padding: 10rpx 22rpx; border-radius: 30rpx; font-size: 24rpx; }
.board { padding: 12rpx; border-radius: 18rpx; display: grid; gap: 12rpx; }
.cell { border-radius: 10rpx; display: flex; align-items: center; justify-content: center; }
.tile { width: 100%; height: 100%; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; font-weight: 800; transition: transform 0.1s ease; }
.tile.merged { transform: scale(1.12); }
.ctrl { margin-top: 22rpx; }
.dpad { display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.dpad-row { display: flex; gap: 10rpx; }
.dpad-btn { width: 90rpx; height: 90rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 38rpx; font-weight: 700; }
.btn-row { display: flex; gap: 18rpx; margin-top: 22rpx; }
.btn { border-radius: 40rpx; padding: 0 40rpx; font-size: 26rpx; line-height: 70rpx; }
.over { margin-top: 18rpx; font-size: 28rpx; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.new-rec { font-size: 24rpx; }
</style>
