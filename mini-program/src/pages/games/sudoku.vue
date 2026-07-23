<template>
  <view class="page" :style="{ background: c.bg, color: c.text }">
    <!-- 顶部状态条 -->
    <view class="top-bar">
      <view class="title">数独</view>
      <view class="stats">
        <view class="stat">
          <text class="label">计时</text>
          <text class="val">{{ fmtTime(elapsed) }}</text>
        </view>
        <view class="stat">
          <text class="label">难度</text>
          <text class="val">{{ diffLabel }}</text>
        </view>
        <view class="stat">
          <text class="label">通关</text>
          <text class="val">{{ solvedCount }}</text>
        </view>
      </view>
    </view>

    <!-- 难度切换 -->
    <view class="diff-row">
      <view
        v-for="d in diffs"
        :key="d.holes"
        class="diff"
        :style="diff === d.holes ? { background: c.primary, color: '#fff' } : { background: c.cell, color: c.sub }"
        @click="changeDiff(d.holes)"
      >{{ d.label }}</view>
    </view>

    <!-- 数独棋盘 -->
    <view class="board-wrap">
      <view class="board" :style="{ background: c.border }">
        <view
          v-for="(v, i) in show"
          :key="i"
          class="cell"
          :class="cellClass(i)"
          :style="cellStyle(i)"
          @click="pick(i)"
        >
          <text v-if="v" class="num" :style="{ color: puzzle[i] ? c.text : (bad[i] ? c.danger : c.info) }">{{ v }}</text>
          <view v-else-if="notes[i] && notes[i].length" class="notes">
            <text v-for="n in 9" :key="n" class="note">{{ notes[i].includes(n) ? n : '' }}</text>
          </view>
        </view>
      </view>

      <!-- 暂停遮罩 -->
      <view v-if="paused" class="pause-mask" :style="{ background: c.board }" @click="togglePause">
        <text class="pause-txt" :style="{ color: c.primary }">已暂停，点击继续</text>
      </view>
    </view>

    <!-- 数字盘 3×3 -->
    <view class="pad">
      <view
        v-for="n in 9"
        :key="n"
        class="num-btn"
        :style="{ background: c.cell, color: c.text }"
        @click="fill(n)"
      >{{ n }}</view>
      <view class="num-btn erase" :style="{ background: c.cell, color: c.danger }" @click="fill(0)">⌫</view>
    </view>

    <!-- 模式切换 -->
    <view class="mode-row">
      <view
        class="mode"
        :style="noteMode ? { background: c.purple, color: '#fff' } : { background: c.cell, color: c.sub }"
        @click="toggleNote"
      >{{ noteMode ? '笔记中' : '笔记' }}</view>
      <view class="mode" :style="{ background: c.cell, color: c.sub }" @click="togglePause">{{ paused ? '继续' : '暂停' }}</view>
    </view>

    <view class="btn-row">
      <button class="btn" :style="{ background: c.info, color: '#fff' }" @click="check">检查</button>
      <button class="btn" :style="{ background: c.primary, color: '#fff' }" @click="reset">新题</button>
    </view>

    <view class="status" :style="{ color: c.sub }">{{ status }}</view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { pickColors, vibrate, playSound, destroySound, fmtTime, useGame } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const c = computed(() => pickColors(dark.value))
// 通关次数累计（数独无传统"分数"，用通关次数代替）
const { best: solvedCount, submitScore: addSolved } = useGame('sudoku')

const diffs = [
  { holes: 35, label: '简单' },
  { holes: 45, label: '中等' },
  { holes: 55, label: '困难' },
]
const diff = ref(45)
const diffLabel = computed(() => diffs.find((d) => d.holes === diff.value)?.label || '中等')

const puzzle = ref(Array(81).fill(0)) // 初始题面（固定）
const solution = ref(Array(81).fill(0)) // 完整解
const show = ref(Array(81).fill(0)) // 当前显示
const notes = ref(Array.from({ length: 81 }, () => [])) // 候选数字
const bad = ref(Array(81).fill(false))
const sel = ref(-1)
const status = ref('点击空格 → 选数字')
const noteMode = ref(false)
const paused = ref(false)
const elapsed = ref(0)
const startedAt = ref(0)
let timer = null

/** 启动计时 */
function startTimer() {
  stopTimer()
  startedAt.value = Date.now() - elapsed.value
  timer = setInterval(() => {
    if (!paused.value) elapsed.value = Date.now() - startedAt.value
  }, 500)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

/** 切换暂停 */
function togglePause() {
  if (paused.value) {
    startedAt.value = Date.now() - elapsed.value
    paused.value = false
  } else {
    paused.value = true
  }
}

/** 数独回溯求解 */
function solve(grid) {
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0) {
      const r = Math.floor(i / 9), col = i % 9
      const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5)
      for (const n of nums) {
        if (isValid(grid, r, col, n)) {
          grid[i] = n
          if (solve(grid)) return true
          grid[i] = 0
        }
      }
      return false
    }
  }
  return true
}
function isValid(grid, r, col, n) {
  for (let k = 0; k < 9; k++) {
    if (grid[r * 9 + k] === n) return false
    if (grid[k * 9 + col] === n) return false
  }
  const br = Math.floor(r / 3) * 3, bc = Math.floor(col / 3) * 3
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      if (grid[(br + i) * 9 + (bc + j)] === n) return false
  return true
}

/** 生成题目 */
function gen() {
  const grid = Array(81).fill(0)
  solve(grid)
  solution.value = grid.slice()
  // 随机挖空
  const idx = [...Array(81).keys()].sort(() => Math.random() - 0.5)
  for (let k = 0; k < diff.value; k++) grid[idx[k]] = 0
  puzzle.value = grid.slice()
  show.value = grid.slice()
  notes.value = Array.from({ length: 81 }, () => [])
  bad.value = Array(81).fill(false)
  sel.value = -1
  status.value = '点击空格 → 选数字'
  elapsed.value = 0
  startTimer()
}

/** 选中格子 */
function pick(i) {
  if (paused.value) return
  sel.value = i
  playSound('tap')
}

/** 填数字 */
function fill(n) {
  if (paused.value || sel.value < 0) return
  const i = sel.value
  if (puzzle.value[i] !== 0) return

  if (noteMode.value && n !== 0) {
    // 笔记模式：切换候选
    const arr = notes.value[i]
    const idx = arr.indexOf(n)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(n)
    playSound('tap')
    return
  }

  show.value[i] = n
  notes.value[i] = []
  if (n === 0) {
    bad.value[i] = false
    playSound('tap')
    return
  }
  // 即时校验
  if (n === solution.value[i]) {
    bad.value[i] = false
    playSound('hit')
    vibrate('short')
    // 检查是否完成
    if (show.value.every((v, k) => v === solution.value[k])) {
      stopTimer()
      playSound('win')
      vibrate('long')
      status.value = `🎉 通关！用时 ${fmtTime(elapsed.value)}`
      addSolved(solvedCount.value + 1)
    }
  } else {
    bad.value[i] = true
    playSound('fail')
    vibrate('short')
    status.value = '这个数字不对'
  }
}

/** 检查全局 */
function check() {
  let wrong = 0
  for (let i = 0; i < 81; i++) {
    if (puzzle.value[i] === 0) {
      if (show.value[i] !== 0 && show.value[i] !== solution.value[i]) {
        bad.value[i] = true
        wrong++
      }
    }
  }
  status.value = wrong === 0 ? '已填部分全部正确' : `发现 ${wrong} 处错误`
  if (wrong === 0) playSound('hit')
  else playSound('fail')
}

/** 切换笔记模式 */
function toggleNote() {
  noteMode.value = !noteMode.value
  playSound('tap')
}

/** 计算 cell 高亮 class */
function cellClass(i) {
  return {
    fixed: puzzle.value[i] !== 0,
    sel: sel.value === i,
    related: isRelated(i),
    bad: bad.value[i],
  }
}

/** 是否与选中格同行同列同宫 */
function isRelated(i) {
  if (sel.value < 0 || i === sel.value) return false
  const r1 = Math.floor(sel.value / 9), c1 = sel.value % 9
  const r2 = Math.floor(i / 9), c2 = i % 9
  if (r1 === r2 || c1 === c2) return true
  if (Math.floor(r1 / 3) === Math.floor(r2 / 3) && Math.floor(c1 / 3) === Math.floor(c2 / 3)) return true
  return false
}

/** cell 样式：含 3×3 分隔线 */
function cellStyle(i) {
  const r = Math.floor(i / 9), col = i % 9
  const border = `2rpx solid ${c.value.border}`
  const thick = `4rpx solid ${c.value.border}`
  return {
    background: puzzle.value[i] !== 0 ? c.value.cellAlt : c.value.card,
    borderTop: r % 3 === 0 ? thick : border,
    borderLeft: col % 3 === 0 ? thick : border,
    borderBottom: r === 8 ? thick : border,
    borderRight: col === 8 ? thick : border,
  }
}

function changeDiff(h) {
  if (h === diff.value) return
  diff.value = h
  reset()
}

function reset() { gen() }

onLoad(() => gen())
onHide(() => { if (!paused.value) togglePause() })
onUnload(() => { stopTimer(); destroySound() })
onUnmounted(() => stopTimer())
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.top-bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 40rpx; font-weight: 800; }
.stats { display: flex; gap: 14rpx; }
.stat { padding: 6rpx 16rpx; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; background: rgba(230, 162, 60, 0.12); }
.label { font-size: 20rpx; opacity: 0.7; }
.val { font-size: 26rpx; font-weight: 700; }
.diff-row { display: flex; gap: 12rpx; margin-bottom: 14rpx; }
.diff { padding: 8rpx 22rpx; border-radius: 26rpx; font-size: 24rpx; }
.board-wrap { position: relative; width: min(630rpx, 92vw); height: min(630rpx, 92vw); }
.board { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(9, 1fr); border-radius: 8rpx; overflow: hidden; }
.cell { display: flex; align-items: center; justify-content: center; font-size: 34rpx; box-sizing: border-box; }
.cell.sel { background: rgba(230, 162, 60, 0.4) !important; }
.cell.related { background: rgba(64, 158, 255, 0.15) !important; }
.cell.fixed .num { font-weight: 800; }
.num { font-size: 36rpx; font-weight: 600; }
.notes { display: grid; grid-template-columns: repeat(3, 1fr); width: 100%; height: 100%; }
.note { font-size: 16rpx; display: flex; align-items: center; justify-content: center; opacity: 0.6; }
.pause-mask { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 8rpx; z-index: 9; }
.pause-txt { font-size: 32rpx; font-weight: 700; }
.pad { width: min(630rpx, 92vw); display: grid; grid-template-columns: repeat(5, 1fr); gap: 12rpx; margin-top: 16rpx; }
.num-btn { height: 80rpx; border-radius: 12rpx; display: flex; align-items: center; justify-content: center; font-size: 34rpx; font-weight: 700; }
.num-btn.erase { font-size: 40rpx; }
.mode-row { display: flex; gap: 14rpx; margin-top: 14rpx; }
.mode { padding: 8rpx 30rpx; border-radius: 26rpx; font-size: 24rpx; }
.btn-row { display: flex; gap: 18rpx; margin-top: 14rpx; }
.btn { border-radius: 40rpx; padding: 0 50rpx; font-size: 26rpx; line-height: 70rpx; }
.status { margin-top: 12rpx; font-size: 24rpx; }
</style>
