<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <!-- 顶部状态条 -->
    <view class="topbar">
      <view class="stat"><text class="lbl">分数</text><text class="val">{{ score }}</text></view>
      <view class="stat"><text class="lbl">最高</text><text class="val best">{{ best }}</text></view>
      <view class="stat"><text class="lbl">行数</text><text class="val">{{ lines }}</text></view>
      <view class="stat"><text class="lbl">关卡</text><text class="val">{{ level }}</text></view>
    </view>

    <view class="play">
      <!-- 主棋盘 -->
      <view
        class="board"
        :style="{ background: C.board, borderColor: C.border }"
        @touchstart="ts"
        @touchmove="tm"
        @touchend="te"
        @touchcancel="te"
      >
        <view
          v-for="(c, i) in cells"
          :key="i"
          class="cell"
          :class="{ ghost: c.ghost, flash: c.flash }"
          :style="cellBg(c)"
        ></view>

        <!-- 暂停遮罩 -->
        <view v-if="paused && !over" class="mask">
          <text class="pause-ico">⏸</text>
          <text class="pause-tip">点击继续</text>
        </view>
      </view>

      <!-- 侧边栏 -->
      <view class="side">
        <view class="panel" :style="{ background: C.card }">
          <text class="panel-t">下一个</text>
          <view class="next-box">
            <view
              v-for="(c, i) in nextCells"
              :key="i"
              class="next-cell"
              :style="cellBg(c)"
            ></view>
          </view>
        </view>

        <view class="panel" :style="{ background: C.card }">
          <text class="panel-t">操作</text>
          <text class="panel-line">← → 移动</text>
          <text class="panel-line">↑ 旋转</text>
          <text class="panel-line">↓ 软降</text>
          <text class="panel-line">长按 硬降</text>
        </view>

        <button class="btn pause" @click="togglePause">{{ paused ? '继续' : '暂停' }}</button>
      </view>
    </view>

    <button class="btn restart" @click="start">重新开始</button>

    <!-- 死亡画面 -->
    <view v-if="over" class="over-mask">
      <view class="over-card" :style="{ background: C.card }">
        <text class="over-title">游戏结束</text>
        <view class="over-row"><text>本局得分</text><text class="num">{{ score }}</text></view>
        <view class="over-row"><text>最高分</text><text class="num best">{{ best }}</text></view>
        <view class="over-row"><text>消除行数</text><text class="num">{{ lines }}</text></view>
        <view v-if="isNewRecord" class="new-record">🏆 新纪录！</view>
        <button class="btn restart" @click="start">再来一局</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { theme } from '../../common/store'
import { onLoad, onUnload, onHide, onShow } from '@dcloudio/uni-app'
import {
  vibrate, playSound, destroySound, pickColors, useGame, rand,
} from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const C = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('tetris')

// 棋盘配置
const COLS = 10, ROWS = 20
// 7 种方块配色（I 青 / O 黄 / T 紫 / S 绿 / Z 红 / J 蓝 / L 橙）
const TYPES = {
  I: '#00e5e5',
  O: '#f0d000',
  T: '#a000f0',
  S: '#00d050',
  Z: '#e64340',
  J: '#2868e8',
  L: '#f08800',
}
const KEYS = Object.keys(TYPES)
const SHAPES = {
  I: [[1, 1, 1, 1]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1]],
  S: [[0, 1, 1], [1, 1, 0]],
  Z: [[1, 1, 0], [0, 1, 1]],
  J: [[1, 0, 0], [1, 1, 1]],
  L: [[0, 0, 1], [1, 1, 1]],
}

// 状态
const board = ref(Array.from({ length: ROWS }, () => Array(COLS).fill('')))
const cur = ref(null) // { type, m, r, c }
const next = ref('I')
const score = ref(0)
const lines = ref(0)
const level = ref(1)
const over = ref(false)
const paused = ref(false)
const flashRows = ref([]) // 闪白行集合
let timer = null

// 关卡速度（每升 1 级 -50ms，下限 100ms）
const interval = computed(() => Math.max(100, 500 - (level.value - 1) * 50))

// 旋转矩阵
function rotMat(m) {
  const n = m.length, w = m[0].length
  const r = Array.from({ length: w }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) for (let j = 0; j < w; j++) r[j][n - 1 - i] = m[i][j]
  return r
}

function collide(m, r, c) {
  for (let i = 0; i < m.length; i++) {
    for (let j = 0; j < m[i].length; j++) {
      if (!m[i][j]) continue
      const nr = r + i, nc = c + j
      if (nc < 0 || nc >= COLS || nr >= ROWS) return true
      if (nr >= 0 && board.value[nr][nc]) return true
    }
  }
  return false
}

function spawn() {
  const type = next.value
  next.value = KEYS[rand(0, KEYS.length - 1)]
  const m = SHAPES[type].map((row) => row.slice())
  const c = Math.floor((COLS - m[0].length) / 2)
  if (collide(m, 0, c)) { gameOver(); return }
  cur.value = { type, m, r: 0, c }
}

function merge() {
  const b = board.value.map((row) => row.slice())
  const { type, m, r, c } = cur.value
  m.forEach((row, i) => row.forEach((v, j) => {
    if (v && r + i >= 0) b[r + i][c + j] = type
  }))
  board.value = b
}

// 计算落点（ghost）
function ghostRow() {
  const { m, r, c } = cur.value
  let gr = r
  while (!collide(m, gr + 1, c)) gr++
  return gr
}

function clearLines() {
  const full = []
  for (let i = 0; i < ROWS; i++) {
    if (board.value[i].every((x) => x)) full.push(i)
  }
  if (!full.length) return
  // 先闪白
  flashRows.value = full
  vibrate('short')
  playSound('hit')
  setTimeout(() => {
    const b = board.value.filter((_, i) => !full.includes(i))
    while (b.length < ROWS) b.unshift(Array(COLS).fill(''))
    board.value = b
    flashRows.value = []
    // 计分
    const n = full.length
    const tab = [0, 100, 300, 500, 800]
    score.value += tab[n] * level.value
    lines.value += n
    // 每 10 行升 1 级
    const newLevel = Math.floor(lines.value / 10) + 1
    if (newLevel > level.value) {
      level.value = newLevel
      playSound('win')
    }
  }, 200)
}

function step() {
  if (over.value || paused.value || flashRows.value.length) return
  if (!cur.value) { spawn(); return }
  const { m, r, c } = cur.value
  if (!collide(m, r + 1, c)) {
    cur.value = { ...cur.value, r: r + 1 }
  } else {
    merge()
    clearLines()
    spawn()
  }
}

function scheduleNext() {
  if (timer) clearTimeout(timer)
  if (over.value || paused.value) return
  timer = setTimeout(() => {
    step()
    scheduleNext()
  }, interval.value)
}

function gameOver() {
  over.value = true
  paused.value = false
  if (timer) clearTimeout(timer)
  timer = null
  vibrate('long')
  playSound('fail')
  submitScore(score.value)
}

// 渲染单元（board + 当前块 + ghost）
const cells = computed(() => {
  const arr = Array(ROWS * COLS).fill(0).map(() => ({ type: '', ghost: false, flash: false }))
  // board
  for (let i = 0; i < ROWS; i++) {
    for (let j = 0; j < COLS; j++) {
      if (board.value[i][j]) arr[i * COLS + j].type = board.value[i][j]
    }
  }
  // 闪白
  flashRows.value.forEach((r) => {
    for (let j = 0; j < COLS; j++) arr[r * COLS + j].flash = true
  })
  if (cur.value && !flashRows.value.length) {
    const { type, m, r, c } = cur.value
    // ghost
    const gr = ghostRow()
    if (gr > r) {
      m.forEach((row, i) => row.forEach((v, j) => {
        if (v) {
          const nr = gr + i, nc = c + j
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && !arr[nr * COLS + nc].type) {
            arr[nr * COLS + nc].ghost = true
            arr[nr * COLS + nc].type = type
          }
        }
      }))
    }
    // 当前块
    m.forEach((row, i) => row.forEach((v, j) => {
      if (v) {
        const nr = r + i, nc = c + j
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          arr[nr * COLS + nc].ghost = false
          arr[nr * COLS + nc].type = type
        }
      }
    }))
  }
  return arr
})

// Next 预览（4x4 网格）
const nextCells = computed(() => {
  const arr = Array(16).fill(0).map(() => ({ type: '' }))
  const m = SHAPES[next.value]
  const offR = Math.floor((4 - m.length) / 2)
  const offC = Math.floor((4 - m[0].length) / 2)
  m.forEach((row, i) => row.forEach((v, j) => {
    if (v) arr[(offR + i) * 4 + (offC + j)].type = next.value
  }))
  return arr
})

function cellBg(c) {
  if (!c.type) return {}
  if (c.flash) return { background: '#ffffff' }
  if (c.ghost) return { background: 'transparent', border: `2rpx dashed ${TYPES[c.type]}` }
  return { background: TYPES[c.type], boxShadow: 'inset 0 0 6rpx rgba(0,0,0,.3)' }
}

// ===== 控制：滑动 + 长按 =====
let sx = 0, sy = 0, lastX = 0, lastY = 0, lastDir = ''
let longPressTimer = null, longPressed = false, moved = false
let lastMoveTime = 0

function ts(e) {
  if (over.value || paused.value) return
  const t = e.touches[0]
  sx = lastX = t.clientX
  sy = lastY = t.clientY
  lastDir = ''
  moved = false
  longPressed = false
  // 长按硬降
  longPressTimer = setTimeout(() => {
    longPressed = true
    hardDrop()
  }, 350)
}
function tm(e) {
  if (over.value || paused.value) return
  const t = e.touches[0]
  const dx = t.clientX - lastX
  const dy = t.clientY - lastY
  const totalDx = t.clientX - sx
  const totalDy = t.clientY - sy
  if (Math.abs(totalDx) > 16 || Math.abs(totalDy) > 16) {
    moved = true
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
  }
  // 横向移动：累计 32rpx 触发一次
  if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 1 : -1)
    lastX = t.clientX
    lastY = t.clientY
  }
  // 纵向：下滑软降
  if (dy > 28 && dy > Math.abs(dx)) {
    const now = Date.now()
    if (now - lastMoveTime > 80) {
      softDrop()
      lastMoveTime = now
    }
    lastY = t.clientY
    lastX = t.clientX
  }
}
function te(e) {
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
  if (over.value || paused.value) return
  if (longPressed) return // 长按已处理
  if (moved) return // 已是滑动操作
  // 短按 = 上滑旋转
  const t = e.changedTouches[0]
  const dy = t.clientY - sy
  const dx = t.clientX - sx
  if (Math.abs(dy) > 30 && dy < 0 && Math.abs(dy) > Math.abs(dx)) {
    rotate()
  } else if (Math.abs(dy) > 30 && dy > 0 && Math.abs(dy) > Math.abs(dx)) {
    softDrop()
  } else if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 1 : -1)
  }
}

function move(d) {
  if (over.value || paused.value || !cur.value) return
  const { m, r, c } = cur.value
  if (!collide(m, r, c + d)) {
    cur.value = { ...cur.value, c: c + d }
    playSound('tap')
  }
}
function rotate() {
  if (over.value || paused.value || !cur.value) return
  const rm = rotMat(cur.value.m)
  const { r, c } = cur.value
  // 简易踢墙
  for (const off of [0, -1, 1, -2, 2]) {
    if (!collide(rm, r, c + off)) {
      cur.value = { ...cur.value, m: rm, c: c + off }
      playSound('tap')
      return
    }
  }
}
function softDrop() {
  if (over.value || paused.value || !cur.value) return
  const { m, r, c } = cur.value
  if (!collide(m, r + 1, c)) {
    cur.value = { ...cur.value, r: r + 1 }
    score.value += 1
  } else {
    merge(); clearLines(); spawn()
    scheduleNext()
  }
}
function hardDrop() {
  if (over.value || paused.value || !cur.value) return
  const gr = ghostRow()
  const dropDist = gr - cur.value.r
  cur.value = { ...cur.value, r: gr }
  score.value += dropDist * 2
  vibrate('short')
  merge(); clearLines(); spawn()
  scheduleNext()
}

function togglePause() {
  if (over.value) return
  paused.value = !paused.value
  playSound('tap')
  if (!paused.value) scheduleNext()
  else if (timer) { clearTimeout(timer); timer = null }
}

function start() {
  if (timer) clearTimeout(timer)
  board.value = Array.from({ length: ROWS }, () => Array(COLS).fill(''))
  cur.value = null
  next.value = KEYS[rand(0, KEYS.length - 1)]
  score.value = 0
  lines.value = 0
  level.value = 1
  over.value = false
  paused.value = false
  flashRows.value = []
  isNewRecord.value = false
  spawn()
  scheduleNext()
}

onLoad(() => start())
onShow(() => {
  if (!over.value && !paused.value && !timer && cur.value) scheduleNext()
})
onHide(() => {
  if (!over.value && !paused.value) paused.value = true
  if (timer) { clearTimeout(timer); timer = null }
  if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null }
})
onUnload(() => {
  if (timer) clearTimeout(timer)
  if (longPressTimer) clearTimeout(longPressTimer)
  timer = null
  destroySound()
})
onUnmounted(() => {
  if (timer) clearTimeout(timer)
  if (longPressTimer) clearTimeout(longPressTimer)
})
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }

.topbar { width: min(630rpx, 92vw); display: flex; gap: 10rpx; margin-bottom: 16rpx; }
.stat { flex: 1; background: rgba(0,0,0,.04); border-radius: 12rpx; padding: 10rpx 0; display: flex; flex-direction: column; align-items: center; }
.stat .lbl { font-size: 20rpx; opacity: .6; }
.stat .val { font-size: 30rpx; font-weight: 700; margin-top: 2rpx; }
.stat .val.best { color: #e6a23c; }

.play { display: flex; gap: 16rpx; }
.board {
  position: relative;
  width: 300rpx; height: 600rpx;
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  grid-template-rows: repeat(20, 1fr);
  gap: 1rpx;
  padding: 4rpx;
  border-radius: 8rpx;
  border: 2rpx solid;
}
.cell { background: rgba(0,0,0,.12); border-radius: 2rpx; }
.cell.flash { animation: flash 0.2s linear; }
@keyframes flash {
  0% { background: #fff; }
  100% { background: #fff; }
}

.side { display: flex; flex-direction: column; gap: 12rpx; width: 180rpx; }
.panel { padding: 12rpx; border-radius: 10rpx; }
.panel-t { font-size: 22rpx; font-weight: 700; opacity: .7; }
.next-box { width: 100%; aspect-ratio: 1; display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(4, 1fr); gap: 2rpx; margin-top: 8rpx; background: rgba(0,0,0,.08); padding: 4rpx; border-radius: 6rpx; }
.next-cell { border-radius: 2rpx; }
.panel-line { display: block; font-size: 20rpx; opacity: .7; margin-top: 4rpx; }

.btn { background: #e6a23c; color: #fff; border-radius: 12rpx; font-size: 24rpx; padding: 0 20rpx; line-height: 60rpx; margin-top: auto; }
.btn.pause { background: #409eff; }
.btn.restart { background: #e6a23c; padding: 0 36rpx; line-height: 64rpx; margin-top: 18rpx; }

.mask {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.6);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border-radius: 8rpx; z-index: 5;
}
.pause-ico { font-size: 80rpx; color: #fff; }
.pause-tip { color: #fff; font-size: 24rpx; margin-top: 10rpx; }

.over-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.over-card { width: 520rpx; padding: 36rpx; border-radius: 20rpx; display: flex; flex-direction: column; align-items: center; }
.over-title { font-size: 38rpx; font-weight: 800; color: #e64340; margin-bottom: 20rpx; }
.over-row { width: 100%; display: flex; justify-content: space-between; padding: 10rpx 0; font-size: 26rpx; }
.over-row .num { font-weight: 700; }
.over-row .num.best { color: #e6a23c; }
.new-record { color: #e6a23c; font-weight: 700; margin: 10rpx 0; font-size: 28rpx; }
</style>
