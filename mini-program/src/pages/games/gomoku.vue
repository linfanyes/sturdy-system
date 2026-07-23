<template>
  <view class="page" :style="{ background: c.bg, color: c.text }">
    <!-- 顶部状态条 -->
    <view class="top-bar">
      <view class="title">五子棋</view>
      <view class="stats">
        <view class="stat">
          <text class="label">计时</text>
          <text class="val">{{ fmtTime(elapsed) }}</text>
        </view>
        <view class="stat">
          <text class="label">步数</text>
          <text class="val">{{ moves.length }}</text>
        </view>
      </view>
    </view>

    <!-- 模式切换 -->
    <view class="mode-row">
      <view
        v-for="m in modes"
        :key="m.key"
        class="mode"
        :style="mode === m.key ? { background: c.primary, color: '#fff' } : { background: c.cell, color: c.sub }"
        @click="changeMode(m.key)"
      >{{ m.label }}</view>
    </view>

    <view class="status" :style="{ color: c.sub }">{{ status }}</view>

    <!-- 棋盘 -->
    <view class="board" :style="{ background: c.board }">
      <view
        v-for="(v, i) in board"
        :key="i"
        class="cell"
        :style="{ background: c.cellAlt }"
        @click="tap(i)"
      >
        <view v-if="v === 1" class="stone black" :class="{ last: i === lastMove }"></view>
        <view v-else-if="v === 2" class="stone white" :class="{ last: i === lastMove }"></view>
      </view>
    </view>

    <view class="btn-row">
      <button class="btn" :style="{ background: c.info, color: '#fff' }" @click="undo">悔棋</button>
      <button class="btn" :style="{ background: c.primary, color: '#fff' }" @click="reset">重新开始</button>
    </view>

    <view v-if="over" class="over" :style="{ color: c.danger }">{{ overText }}</view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { pickColors, vibrate, playSound, destroySound, fmtTime } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const c = computed(() => pickColors(dark.value))

const N = 13
const modes = [
  { key: 'ai', label: 'AI 对战' },
  { key: 'local', label: '双人对战' },
]
const mode = ref('ai')

const board = ref(Array(N * N).fill(0))
const moves = ref([]) // [{i, p}]
const turn = ref(1) // 1 黑 / 2 白
const over = ref(false)
const overText = ref('')
const status = ref('黑棋落子')
const elapsed = ref(0)
const lastMove = ref(-1)
let startedAt = 0
let timer = null

const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]]

/** 启动计时 */
function startTimer() {
  stopTimer()
  startedAt = Date.now()
  elapsed.value = 0
  timer = setInterval(() => { elapsed.value = Date.now() - startedAt }, 500)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

/** 落子后判断胜负（围绕 i 点的四方向连 5） */
function checkWin(i) {
  const r = Math.floor(i / N), col = i % N
  const p = board.value[i]
  for (const [dr, dc] of DIRS) {
    let cnt = 1
    for (const s of [1, -1]) {
      let rr = r + dr * s, cc = col + dc * s
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && board.value[rr * N + cc] === p) {
        cnt++; rr += dr * s; cc += dc * s
      }
    }
    if (cnt >= 5) return true
  }
  return false
}

/** 玩家点击 */
function tap(i) {
  if (over.value || board.value[i] !== 0) return
  if (mode.value === 'ai' && turn.value !== 1) return
  place(i, turn.value)
  if (checkWin(i)) return finish(turn.value)
  if (board.value.every((x) => x)) return finish(0)
  turn.value = turn.value === 1 ? 2 : 1
  status.value = (turn.value === 1 ? '黑棋' : '白棋') + '落子'
  if (mode.value === 'ai' && turn.value === 2) {
    setTimeout(aiMove, 240)
  }
}

/** 落子并记录 */
function place(i, p) {
  board.value[i] = p
  moves.value.push({ i, p })
  lastMove.value = i
  playSound('tap')
  vibrate('short')
}

/** AI 贪心评分 */
function aiMove() {
  if (over.value) return
  let bestScore = -1, bestMove = -1
  for (let i = 0; i < N * N; i++) {
    if (board.value[i] !== 0) continue
    // 只考虑有邻居的位置
    if (!hasNeighbor(i)) continue
    const s = evalPoint(i, 2) * 1.0 + evalPoint(i, 1) * 0.9 // 进攻 + 防守
    if (s > bestScore) { bestScore = s; bestMove = i }
  }
  if (bestMove < 0) {
    // 第一手中心
    bestMove = Math.floor(N * N / 2)
  }
  place(bestMove, 2)
  if (checkWin(bestMove)) return finish(2)
  if (board.value.every((x) => x)) return finish(0)
  turn.value = 1
  status.value = '黑棋落子'
}

/** 位置 i 是否有空邻居 */
function hasNeighbor(i) {
  const r = Math.floor(i / N), col = i % N
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (dr === 0 && dc === 0) continue
      const rr = r + dr, cc = col + dc
      if (rr >= 0 && rr < N && cc >= 0 && cc < N && board.value[rr * N + cc] !== 0) return true
    }
  }
  return false
}

/** 假设在 i 落子为 player，返回该点四方向得分总和 */
function evalPoint(i, player) {
  const r = Math.floor(i / N), col = i % N
  let total = 0
  for (const [dr, dc] of DIRS) {
    total += evalLine(r, col, dr, dc, player)
  }
  return total
}

/** 评估单方向得分 */
function evalLine(r, col, dr, dc, player) {
  // 计算 i 两侧连续同色 + 中间空格的得分模式
  let count = 1 // i 自己
  let leftBlocked = false, rightBlocked = false
  let rr = r + dr, cc = col + dc
  while (rr >= 0 && rr < N && cc >= 0 && cc < N && board.value[rr * N + cc] === player) {
    count++; rr += dr; cc += dc
  }
  if (rr < 0 || rr >= N || cc < 0 || cc >= N || (board.value[rr * N + cc] !== 0 && board.value[rr * N + cc] !== player)) rightBlocked = true
  // 修正：上述判定 rightBlocked 时，若该格是 player 的对方棋子或越界 → 被堵
  rr = r - dr; cc = col - dc
  while (rr >= 0 && rr < N && cc >= 0 && cc < N && board.value[rr * N + cc] === player) {
    count++; rr -= dr; cc -= dc
  }
  if (rr < 0 || rr >= N || cc < 0 || cc >= N || (board.value[rr * N + cc] !== 0 && board.value[rr * N + cc] !== player)) leftBlocked = true

  if (count >= 5) return 100000
  const blocks = (leftBlocked ? 1 : 0) + (rightBlocked ? 1 : 0)
  if (count === 4) {
    if (blocks === 0) return 10000 // 活四
    if (blocks === 1) return 1000  // 冲四
    return 0
  }
  if (count === 3) {
    if (blocks === 0) return 1000  // 活三
    if (blocks === 1) return 100   // 眠三
    return 0
  }
  if (count === 2) {
    if (blocks === 0) return 100   // 活二
    if (blocks === 1) return 10    // 眠二
    return 0
  }
  if (count === 1) {
    if (blocks === 0) return 10
    return 1
  }
  return 0
}

/** 悔棋：双人 1 步 / AI 2 步 */
function undo() {
  if (over.value || !moves.value.length) return
  const steps = mode.value === 'ai' ? Math.min(2, moves.value.length) : 1
  for (let k = 0; k < steps; k++) {
    const m = moves.value.pop()
    if (!m) break
    board.value[m.i] = 0
  }
  const last = moves.value[moves.value.length - 1]
  lastMove.value = last ? last.i : -1
  turn.value = last ? (last.p === 1 ? 2 : 1) : 1
  status.value = (turn.value === 1 ? '黑棋' : '白棋') + '落子'
  playSound('tap')
}

function finish(winner) {
  over.value = true
  stopTimer()
  if (winner === 0) {
    overText.value = '平局'
    playSound('tap')
  } else {
    overText.value = (winner === 1 ? '⚫ 黑棋' : '⚪ 白棋') + '胜利！'
    playSound('win')
    vibrate('long')
  }
  status.value = overText.value
}

function changeMode(k) {
  if (k === mode.value) return
  mode.value = k
  reset()
}

function reset() {
  board.value = Array(N * N).fill(0)
  moves.value = []
  turn.value = 1
  over.value = false
  overText.value = ''
  lastMove.value = -1
  status.value = '黑棋落子'
  startTimer()
}

onLoad(() => reset())
onUnload(() => { stopTimer(); destroySound() })
onUnmounted(() => stopTimer())
</script>

<style scoped>
.page { min-height: 100vh; padding: 18rpx; display: flex; flex-direction: column; align-items: center; }
.top-bar { width: min(690rpx, 94vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.title { font-size: 36rpx; font-weight: 800; }
.stats { display: flex; gap: 12rpx; }
.stat { padding: 6rpx 14rpx; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; background: rgba(230, 162, 60, 0.12); min-width: 100rpx; }
.label { font-size: 20rpx; opacity: 0.7; }
.val { font-size: 26rpx; font-weight: 700; }
.mode-row { display: flex; gap: 12rpx; margin: 8rpx 0; }
.mode { padding: 8rpx 26rpx; border-radius: 26rpx; font-size: 24rpx; }
.status { font-size: 24rpx; margin: 6rpx 0 10rpx; }
.board { width: min(690rpx, 94vw); height: min(690rpx, 94vw); display: grid; grid-template-columns: repeat(13, 1fr); gap: 2rpx; padding: 6rpx; border-radius: 10rpx; }
.cell { display: flex; align-items: center; justify-content: center; }
.stone { width: 80%; height: 80%; border-radius: 50%; box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.3); position: relative; animation: drop 0.2s ease; }
.stone.black { background: #1a1a1a; }
.stone.white { background: #f8f8f8; }
.stone.last::after { content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 30%; height: 30%; border-radius: 50%; background: #e64340; }
@keyframes drop { from { transform: scale(0); } to { transform: scale(1); } }
.btn-row { display: flex; gap: 18rpx; margin-top: 18rpx; }
.btn { border-radius: 40rpx; padding: 0 50rpx; font-size: 26rpx; line-height: 70rpx; }
.over { margin-top: 14rpx; font-size: 30rpx; font-weight: 700; }
</style>
