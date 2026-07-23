<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <view class="hd">
      <text class="title" :style="{ color: C.primary }">扫雷</text>
      <text class="best" :style="{ background: C.primary }">最佳 {{ bestText }}</text>
    </view>

    <!-- 难度档 -->
    <view class="diff">
      <view
        v-for="(d, i) in diffs"
        :key="i"
        class="diff-i"
        :style="{ background: diffIdx === i ? C.primary : C.cell, color: diffIdx === i ? '#fff' : C.sub, borderColor: diffIdx === i ? C.primary : C.border }"
        @click="setDiff(i)"
      >{{ d.label }}</view>
    </view>

    <!-- 顶部状态条 -->
    <view class="bar" :style="{ background: C.board, borderColor: C.border }">
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">💣 剩余</text>
        <text class="bar-v" :style="{ color: C.danger }">{{ minesLeft }}</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">⏱ 计时</text>
        <text class="bar-v" :style="{ color: C.info }">{{ timeText }}</text>
      </view>
      <view class="bar-i" @click="toggleMode">
        <text class="bar-l" :style="{ color: C.sub }">模式</text>
        <text class="bar-v" :style="{ color: flagMode ? C.danger : C.accent }">{{ flagMode ? '🚩 插旗' : '⛏ 揭开' }}</text>
      </view>
    </view>

    <!-- 棋盘 -->
    <view class="board-wrap" :style="{ width: 'min(630rpx, 92vw)' }">
      <view
        class="board"
        :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)`, background: C.board, borderColor: C.border }"
      >
        <view
          v-for="(c, i) in cells"
          :key="i"
          class="cell"
          :class="{ open: c.open, mine: c.open && c.mine, flag: c.flag, boom: c.boom }"
          :style="cellStyle(c)"
          @click="onClick(i)"
          @longpress="onLong(i)"
        >
          <text v-if="c.flag" class="ic">🚩</text>
          <text v-else-if="c.open && c.mine" class="ic">💣</text>
          <text v-else-if="c.open && c.n > 0" class="num" :style="{ color: numColor(c.n) }">{{ c.n }}</text>
        </view>
      </view>
    </view>

    <view class="row">
      <button class="btn" :style="{ background: C.primary }" @click="reset">重新开始</button>
      <button class="btn ghost" :style="{ background: C.cell, color: C.text, borderColor: C.border }" @click="toggleMode">{{ flagMode ? '切换：揭开' : '切换：插旗' }}</button>
    </view>
    <view class="tip" :style="{ color: C.sub }">单击当前模式操作 · 双击快速揭开 · 长按强制插旗</view>

    <view v-if="over" class="mask">
      <view class="mask-c" :style="{ background: C.card }">
        <text class="mask-t" :style="{ color: win ? C.accent : C.danger }">{{ win ? '🎉 通关！' : '💥 踩雷了' }}</text>
        <text class="mask-s" :style="{ color: C.primary }">{{ win ? '用时 ' + timeText : '再接再厉' }}</text>
        <text v-if="isNewRecord" class="mask-r" :style="{ color: C.danger }">★ 新纪录</text>
        <button class="btn" :style="{ background: C.primary }" @click="reset">再来一局</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { vibrate, playSound, destroySound, pickColors, fmtTime } from '../../common/game'

const C = computed(() => pickColors(theme.mode === 'dark'))

const diffs = [
  { label: '简单 9×9/10', rows: 9, cols: 9, mines: 10 },
  { label: '中等 16×16/40', rows: 16, cols: 16, mines: 40 },
  { label: '困难 16×30/99', rows: 16, cols: 30, mines: 99 },
]
const diffIdx = ref(0)
const cur = computed(() => diffs[diffIdx.value])
const rows = computed(() => cur.value.rows)
const cols = computed(() => cur.value.cols)
const mines = computed(() => cur.value.mines)

const cells = ref([])
const flagMode = ref(false)
const over = ref(false)
const win = ref(false)
const started = ref(false)
const elapsed = ref(0)
const best = ref(0)
const isNewRecord = ref(false)
let timer = null
let lastTap = 0
let lastTapIdx = -1

const timeText = computed(() => fmtTime(elapsed.value))
const bestText = computed(() => best.value ? fmtTime(best.value) : '--')
const minesLeft = computed(() => mines.value - cells.value.filter((c) => c.flag).length)

// 经典彩色：1 蓝 2 绿 3 红 4 暗蓝 5 棕 6 青 7 黑 8 灰
const NUM_COLORS = ['#1976d2', '#388e3c', '#d32f2f', '#0d47a1', '#6d4c41', '#00838f', '#212121', '#757575']
function numColor(n) {
  return NUM_COLORS[n - 1] || C.value.text
}

function setDiff(i) {
  if (diffIdx.value === i) return
  diffIdx.value = i
  best.value = readBest(i)
  reset()
}

function readBest(i) {
  try { return uni.getStorageSync('game_best_minesweeper_' + i) || 0 } catch (e) { return 0 }
}
function writeBest(i, v) {
  try { uni.setStorageSync('game_best_minesweeper_' + i, v) } catch (e) {}
}

function makeEmpty() {
  const n = rows.value * cols.value
  return Array.from({ length: n }, () => ({ mine: false, n: 0, open: false, flag: false, boom: false }))
}

// 首次点击后放雷：避开点击格及其周围 8 格
function placeMines(safeIdx) {
  const r = Math.floor(safeIdx / cols.value)
  const c = safeIdx % cols.value
  const safe = new Set()
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows.value && nc >= 0 && nc < cols.value) safe.add(nr * cols.value + nc)
    }
  }
  const total = rows.value * cols.value
  const candidates = []
  for (let i = 0; i < total; i++) if (!safe.has(i)) candidates.push(i)
  // Fisher-Yates 抽 mines 个
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }
  const g = cells.value
  for (let i = 0; i < mines.value && i < candidates.length; i++) {
    g[candidates[i]].mine = true
  }
  // 计算数字
  for (let i = 0; i < total; i++) {
    if (g[i].mine) continue
    let cnt = 0
    forNeighbors(i, (ni) => { if (g[ni].mine) cnt++ })
    g[i].n = cnt
  }
  cells.value = g.slice()
}

function forNeighbors(i, cb) {
  const r = Math.floor(i / cols.value), c = i % cols.value
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r + dr, nc = c + dc
      if (nr >= 0 && nr < rows.value && nc >= 0 && nc < cols.value) cb(nr * cols.value + nc)
    }
  }
}

// 单击：根据当前模式
function onClick(i) {
  if (over.value) return
  // 双击检测（300ms 内同一格）→ 快速揭开
  const now = Date.now()
  if (lastTapIdx === i && now - lastTap < 300) {
    lastTap = 0; lastTapIdx = -1
    quickReveal(i)
    return
  }
  lastTap = now
  lastTapIdx = i
  if (flagMode.value) {
    toggleFlag(i)
  } else {
    reveal(i)
  }
}

// 长按：强制插旗（不论模式）
function onLong(i) {
  if (over.value) return
  toggleFlag(i)
}

function toggleFlag(i) {
  const c = cells.value[i]
  if (c.open) return
  c.flag = !c.flag
  cells.value = cells.value.slice()
  playSound('tap')
  vibrate('short')
  checkWin()
}

function reveal(i) {
  const c = cells.value[i]
  if (c.flag || c.open) return
  // 首击保护：放雷后再揭开
  if (!started.value) {
    started.value = true
    placeMines(i)
    startTimer()
  }
  c.open = true
  if (c.mine) {
    c.boom = true
    over.value = true
    win.value = false
    // 显示所有雷
    cells.value.forEach((x) => { if (x.mine) x.open = true })
    cells.value = cells.value.slice()
    stopTimer()
    playSound('fail')
    vibrate('long')
    return
  }
  if (c.n === 0) flood(i)
  cells.value = cells.value.slice()
  playSound('tap')
  vibrate('short')
  checkWin()
}

// 双击快速揭开：若该格已揭开且周围旗数 == n，则揭开所有未插旗邻居
function quickReveal(i) {
  const c = cells.value[i]
  if (!c.open || c.n === 0 || c.mine) return
  let flagCnt = 0
  forNeighbors(i, (ni) => { if (cells.value[ni].flag) flagCnt++ })
  if (flagCnt !== c.n) return
  forNeighbors(i, (ni) => {
    const nc = cells.value[ni]
    if (!nc.open && !nc.flag) {
      nc.open = true
      if (nc.mine) {
        nc.boom = true
        over.value = true
        win.value = false
        cells.value.forEach((x) => { if (x.mine) x.open = true })
      } else if (nc.n === 0) {
        flood(ni)
      }
    }
  })
  cells.value = cells.value.slice()
  if (over.value) {
    stopTimer()
    playSound('fail')
    vibrate('long')
    return
  }
  playSound('tap')
  vibrate('short')
  checkWin()
}

function flood(i) {
  const stack = [i]
  while (stack.length) {
    const cur = stack.pop()
    forNeighbors(cur, (ni) => {
      const nc = cells.value[ni]
      if (!nc.open && !nc.mine && !nc.flag) {
        nc.open = true
        if (nc.n === 0) stack.push(ni)
      }
    })
  }
}

function checkWin() {
  if (over.value) return
  const left = cells.value.filter((c) => !c.open && !c.mine).length
  if (left === 0) {
    over.value = true
    win.value = true
    stopTimer()
    // 自动给所有雷插旗
    cells.value.forEach((c) => { if (c.mine) c.flag = true })
    cells.value = cells.value.slice()
    playSound('win')
    vibrate('long')
    const i = diffIdx.value
    const prev = readBest(i)
    // 胜利才记录最佳时间（越小越好）
    if (!prev || elapsed.value < prev) {
      writeBest(i, elapsed.value)
      best.value = elapsed.value
      isNewRecord.value = true
    } else {
      isNewRecord.value = false
    }
  }
}

function toggleMode() {
  flagMode.value = !flagMode.value
  playSound('tap')
  vibrate('short')
}

function startTimer() {
  stopTimer()
  const start = Date.now()
  elapsed.value = 0
  timer = setInterval(() => { elapsed.value = Date.now() - start }, 500)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

function cellStyle(c) {
  if (c.boom) return { background: C.value.danger }
  if (c.open && c.mine) return { background: C.value.cellAlt }
  if (c.open) return { background: C.value.card, borderColor: C.value.border }
  if (c.flag) return { background: C.value.cellAlt, borderColor: C.value.border }
  return { background: C.value.cell, borderColor: C.value.border }
}

function reset() {
  stopTimer()
  over.value = false
  win.value = false
  started.value = false
  isNewRecord.value = false
  flagMode.value = false
  elapsed.value = 0
  cells.value = makeEmpty()
  best.value = readBest(diffIdx.value)
  lastTap = 0
  lastTapIdx = -1
}

onLoad(() => reset())
onUnload(() => { stopTimer(); destroySound() })
onHide(() => stopTimer())
onUnmounted(() => stopTimer())
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 40rpx; font-weight: 800; }
.best { font-size: 22rpx; color: #fff; padding: 6rpx 18rpx; border-radius: 20rpx; }

.diff { display: flex; gap: 10rpx; margin-bottom: 12rpx; flex-wrap: wrap; justify-content: center; }
.diff-i { padding: 8rpx 18rpx; border-radius: 30rpx; border: 2rpx solid; font-size: 22rpx; font-weight: 600; }

.bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; padding: 14rpx 14rpx; border-radius: 14rpx; border: 2rpx solid; margin-bottom: 14rpx; }
.bar-i { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-l { font-size: 20rpx; }
.bar-v { font-size: 28rpx; font-weight: 800; margin-top: 4rpx; }

.board-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; padding: 6rpx 0; }
.board { display: grid; gap: 2rpx; padding: 4rpx; border-radius: 10rpx; border: 2rpx solid; }
.cell { aspect-ratio: 1; border-radius: 4rpx; border: 1rpx solid; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 800; transition: background 0.15s; }
.cell .ic { font-size: 24rpx; line-height: 1; }
.cell .num { line-height: 1; }

.row { display: flex; gap: 12rpx; margin-top: 18rpx; }
.btn { color: #fff; border-radius: 40rpx; padding: 0 36rpx; font-size: 26rpx; line-height: 64rpx; }
.btn.ghost { border: 2rpx solid; }

.tip { font-size: 22rpx; margin-top: 12rpx; text-align: center; }

.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 10; }
.mask-c { width: 480rpx; padding: 40rpx; border-radius: 18rpx; display: flex; flex-direction: column; align-items: center; }
.mask-t { font-size: 36rpx; font-weight: 800; }
.mask-s { font-size: 30rpx; margin-top: 12rpx; }
.mask-r { font-size: 24rpx; margin-top: 8rpx; }
.mask-c .btn { margin-top: 22rpx; }
</style>
