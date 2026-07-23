<template>
  <view class="page" :class="{ dark }" :style="pageStyle">
    <view class="hd">一笔画</view>
    <view class="status">
      <text>关卡 {{ level + 1 }}/{{ levels.length }}</text>
      <text>步数 {{ path.length }}/{{ totalCells }}</text>
      <text>{{ fmtTime(elapsed) }}</text>
    </view>

    <view class="board"
      :style="{ width: boardSize + 'rpx', height: boardSize + 'rpx', gridTemplateColumns: 'repeat(' + N + ', 1fr)' }"
      @touchstart="ts" @touchmove="tm" @touchend="te">
      <view v-for="(c, i) in cells" :key="i" class="cell"
        :class="cellClass(i)">
        <text v-if="i === startCell" class="mark s">S</text>
        <text v-if="i === endCell" class="mark e">E</text>
        <text v-if="pathIndex(i) >= 0" class="num">{{ pathIndex(i) + 1 }}</text>
      </view>
    </view>

    <view class="tip">从 S 画到 E，经过所有格子且不重复</view>

    <view class="row">
      <button class="btn ghost" @click="reset">重置本关</button>
      <button v-if="level > 0" class="btn ghost" @click="prevLevel">上一关</button>
      <button v-if="level < levels.length - 1" class="btn" @click="nextLevel">下一关</button>
    </view>

    <view v-if="win" class="win-mask" @click="win = false">
      <view class="win-card">
        <text class="win-t">🎉 通关！</text>
        <text class="win-s">用时 {{ fmtTime(elapsed) }}</text>
        <view class="row">
          <button v-if="level < levels.length - 1" class="btn" @click.stop="nextLevel(); win = false">下一关</button>
          <button class="btn ghost" @click.stop="reset(); win = false">再来一次</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { vibrate, playSound, destroySound, pickColors, clamp, fmtTime } from '../../common/game'

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
  '--danger': colors.value.danger,
}))

// 5 个关卡：N + 起点 + 终点（保证哈密顿路径存在）
const levels = [
  { n: 3, s: 0, e: 8 },                 // 3x3, 左上→右下
  { n: 4, s: 0, e: 11 },                // 4x4, 左上→第3行第4列(异色)
  { n: 5, s: 0, e: 24 },                // 5x5, 左上→右下
  { n: 6, s: 0, e: 33 },                // 6x6, 左上→(5,3)异色
  { n: 7, s: 0, e: 48 },                // 7x7, 左上→右下
]

const level = ref(0)
const N = computed(() => levels[level.value].n)
const startCell = computed(() => levels[level.value].s)
const endCell = computed(() => levels[level.value].e)
const totalCells = computed(() => N.value * N.value)

const path = ref([])
const win = ref(false)
const elapsed = ref(0)
let startTime = 0
let timer = null
let boardRect = null

const cells = computed(() => Array(totalCells.value).fill(0))
const boardSize = computed(() => Math.min(630, Math.floor(620 / Math.max(N.value, 3)) * N.value))

function pathIndex(i) { return path.value.indexOf(i) }

function cellClass(i) {
  const cls = []
  if ((Math.floor(i / N.value) + i % N.value) % 2 === 0) cls.push('alt')
  if (i === startCell.value) cls.push('start')
  if (i === endCell.value) cls.push('end')
  if (pathIndex(i) >= 0) cls.push('visited')
  if (i === path.value[path.value.length - 1]) cls.push('head')
  if (win.value) cls.push('won')
  return cls
}

function measureBoard() {
  uni.createSelectorQuery().select('.board').boundingClientRect((rect) => {
    boardRect = rect
  }).exec()
}

function pointToCell(x, y) {
  if (!boardRect) return -1
  const relX = x - boardRect.left
  const relY = y - boardRect.top
  if (relX < 0 || relY < 0 || relX >= boardRect.width || relY >= boardRect.height) return -1
  const cellW = boardRect.width / N.value
  const cellH = boardRect.height / N.value
  const c = Math.floor(relX / cellW)
  const r = Math.floor(relY / cellH)
  return r * N.value + c
}

function isAdjacent(a, b) {
  const ra = Math.floor(a / N.value), ca = a % N.value
  const rb = Math.floor(b / N.value), cb = b % N.value
  return Math.abs(ra - rb) + Math.abs(ca - cb) === 1
}

function startTimer() {
  if (timer) return
  startTime = Date.now() - elapsed.value
  timer = setInterval(() => { elapsed.value = Date.now() - startTime }, 200)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

// 触摸：从起点开始画线
function ts(e) {
  if (win.value) return
  measureBoard()
  const t = e.touches[0]
  const cell = pointToCell(t.clientX, t.clientY)
  if (cell === -1) return
  if (path.value.length === 0) {
    if (cell === startCell.value) {
      path.value = [cell]
      playSound('tap')
      startTimer()
    }
  }
}

function tm(e) {
  if (win.value || path.value.length === 0) return
  const t = e.touches[0]
  const cell = pointToCell(t.clientX, t.clientY)
  if (cell === -1) return
  const last = path.value[path.value.length - 1]
  if (cell === last) return
  const idx = path.value.indexOf(cell)
  // 已在路径中：回退到该点
  if (idx >= 0) {
    if (idx === path.value.length - 2) {
      path.value = path.value.slice(0, idx + 1)
      playSound('tap')
    } else if (idx < path.value.length - 1) {
      path.value = path.value.slice(0, idx + 1)
      playSound('tap')
    }
    return
  }
  // 邻接：加入路径
  if (isAdjacent(cell, last)) {
    path.value.push(cell)
    playSound('tap')
    checkWin()
  }
}

function te() { /* 松手不结束路径，允许继续 */ }

function checkWin() {
  if (path.value.length === totalCells.value &&
      path.value[path.value.length - 1] === endCell.value) {
    stopTimer()
    win.value = true
    playSound('win')
    vibrate('long')
  }
}

function reset() {
  path.value = []
  win.value = false
  elapsed.value = 0
  stopTimer()
}

function loadLevel(lv) {
  level.value = clamp(lv, 0, levels.length - 1)
  reset()
  setTimeout(measureBoard, 50)
}

function nextLevel() { loadLevel(level.value + 1) }
function prevLevel() { loadLevel(level.value - 1) }

onLoad(() => {
  setTimeout(measureBoard, 100)
})

onUnload(() => {
  stopTimer()
  destroySound()
})

onHide(() => { stopTimer() })
</script>

<style scoped>
.page { background: var(--bg); min-height: 100vh; color: var(--text); padding: 30rpx; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--primary); }
.status { display: flex; gap: 30rpx; font-size: 24rpx; color: var(--sub); margin: 12rpx 0; }

.board { display: grid; gap: 4rpx; background: var(--border); padding: 4rpx; border-radius: 14rpx; touch-action: none; }
.cell { background: var(--cell); border-radius: 6rpx; position: relative; display: flex; align-items: center; justify-content: center; }
.cell.alt { background: var(--cellAlt); }
.cell.start { background: var(--primary); }
.cell.end { background: var(--danger); }
.cell.visited { background: var(--accent); }
.cell.head { box-shadow: inset 0 0 0 4rpx var(--primary); }
.cell.won { background: var(--accent); animation: pop 0.4s ease; }
@keyframes pop { 0% { transform: scale(0.85); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }

.mark { font-size: 28rpx; font-weight: 800; color: #fff; }
.mark.s { color: #fff; }
.mark.e { color: #fff; }
.num { font-size: 22rpx; font-weight: 700; color: #fff; }

.tip { font-size: 22rpx; color: var(--sub); margin: 18rpx 0; }

.row { display: flex; gap: 14rpx; margin-top: 12rpx; flex-wrap: wrap; justify-content: center; }
.btn { background: var(--primary); color: #fff; border-radius: 40rpx; padding: 0 40rpx; font-size: 28rpx; line-height: 72rpx; }
.btn.ghost { background: var(--card); color: var(--primary); border: 2rpx solid var(--primary); }

.win-mask { position: fixed; left: 0; top: 0; right: 0; bottom: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 50; }
.win-card { background: var(--card); padding: 40rpx 50rpx; border-radius: 24rpx; display: flex; flex-direction: column; align-items: center; gap: 14rpx; }
.win-t { font-size: 40rpx; font-weight: 800; color: var(--accent); }
.win-s { font-size: 26rpx; color: var(--sub); }
</style>
