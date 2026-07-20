<template>
  <view class="page" :style="{ background: c.bg, color: c.text }">
    <!-- 顶部状态条 -->
    <view class="top-bar">
      <view class="title">井字棋</view>
      <view class="scores">
        <view class="score-box" :style="{ background: 'rgba(7,193,96,0.18)' }">
          <text class="label" :style="{ color: c.sub }">玩家</text>
          <text class="val" :style="{ color: c.accent }">{{ scoreWin }}</text>
        </view>
        <view class="score-box" :style="{ background: 'rgba(230,67,64,0.18)' }">
          <text class="label" :style="{ color: c.sub }">{{ mode === 'local' ? '白方' : 'AI' }}</text>
          <text class="val" :style="{ color: c.danger }">{{ scoreLose }}</text>
        </view>
        <view class="score-box" :style="{ background: 'rgba(64,158,255,0.18)' }">
          <text class="label" :style="{ color: c.sub }">平局</text>
          <text class="val" :style="{ color: c.info }">{{ scoreDraw }}</text>
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
        :class="{ win: winLine.includes(i) }"
        :style="{ background: winLine.includes(i) ? c.accent : c.card }"
        @click="tap(i)"
      >
        <view v-if="v === 1" class="mark x" :style="{ borderColor: c.danger }"></view>
        <view v-else-if="v === 2" class="mark o" :style="{ borderColor: c.info }"></view>
      </view>
    </view>

    <button class="btn" :style="{ background: c.primary, color: '#fff' }" @click="reset">重新开始</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { pickColors, vibrate, playSound, destroySound } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const c = computed(() => pickColors(dark.value))

const modes = [
  { key: 'easy', label: '简单 AI' },
  { key: 'master', label: '大师 AI' },
  { key: 'local', label: '双人' },
]
const mode = ref('easy')

const board = ref(Array(9).fill(0))
const turn = ref(1) // 1 玩家(❌) / 2 AI或对手(⭕)
const over = ref(false)
const status = ref('轮到你了')
const winLine = ref([])
// 累计计分
const scoreWin = ref(0)
const scoreLose = ref(0)
const scoreDraw = ref(0)

const WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

/** 判断胜负，返回 0/1/2/3(平) 及连线 */
function checkWinner(b) {
  for (const w of WINS) {
    if (b[w[0]] && b[w[0]] === b[w[1]] && b[w[1]] === b[w[2]]) {
      return { winner: b[w[0]], line: w }
    }
  }
  if (b.every((x) => x)) return { winner: 3, line: [] }
  return { winner: 0, line: [] }
}

/** 玩家点击 */
function tap(i) {
  if (over.value || board.value[i] !== 0) return
  if (mode.value !== 'local' && turn.value !== 1) return
  place(i, turn.value)
  const r = checkWinner(board.value)
  if (r.winner) return finish(r)
  turn.value = turn.value === 1 ? 2 : 1
  if (mode.value === 'local') {
    status.value = turn.value === 1 ? '❌ 玩家落子' : '⭕ 玩家落子'
  } else if (turn.value === 2) {
    status.value = 'AI 思考中…'
    setTimeout(aiMove, 320)
  }
}

/** 落子 */
function place(i, p) {
  board.value[i] = p
  playSound('tap')
  vibrate('short')
}

/** 简单 AI：先堵后攻再随机 */
function easyAI(b) {
  const empties = b.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0)
  if (!empties.length) return null
  return findWin(b, 2) ?? findWin(b, 1) ?? empties[Math.floor(Math.random() * empties.length)]
}

/** 找能让 p 获胜的位置 */
function findWin(b, p) {
  for (let i = 0; i < 9; i++) {
    if (b[i] !== 0) continue
    const t = b.slice(); t[i] = p
    if (checkWinner(t).winner === p) return i
  }
  return null
}

/** 大师 AI：minimax 不败 */
function masterAI(b) {
  let bestScore = -Infinity, bestMove = -1
  for (let i = 0; i < 9; i++) {
    if (b[i] !== 0) continue
    b[i] = 2
    const s = minimax(b, 0, false)
    b[i] = 0
    if (s > bestScore) { bestScore = s; bestMove = i }
  }
  return bestMove
}
function minimax(b, depth, isMax) {
  const r = checkWinner(b)
  if (r.winner === 2) return 10 - depth
  if (r.winner === 1) return depth - 10
  if (r.winner === 3) return 0
  if (isMax) {
    let best = -Infinity
    for (let i = 0; i < 9; i++) {
      if (b[i] !== 0) continue
      b[i] = 2
      best = Math.max(best, minimax(b, depth + 1, false))
      b[i] = 0
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < 9; i++) {
      if (b[i] !== 0) continue
      b[i] = 1
      best = Math.min(best, minimax(b, depth + 1, true))
      b[i] = 0
    }
    return best
  }
}

function aiMove() {
  if (over.value) return
  const b = board.value.slice()
  const move = mode.value === 'master' ? masterAI(b) : easyAI(b)
  if (move == null || move < 0) return
  place(move, 2)
  const r = checkWinner(board.value)
  if (r.winner) return finish(r)
  turn.value = 1
  status.value = '轮到你了'
}

/** 结束 */
function finish(r) {
  over.value = true
  winLine.value = r.line
  if (r.winner === 3) {
    status.value = '🤝 平局'
    scoreDraw.value++
    playSound('tap')
  } else if (mode.value === 'local') {
    status.value = (r.winner === 1 ? '❌ 玩家' : '⭕ 玩家') + '获胜！'
    if (r.winner === 1) scoreWin.value++; else scoreLose.value++
    playSound('win')
    vibrate('long')
  } else {
    if (r.winner === 1) { status.value = '🎉 你赢了！'; scoreWin.value++; playSound('win'); vibrate('long') }
    else { status.value = '😢 AI 赢了'; scoreLose.value++; playSound('fail'); vibrate('long') }
  }
}

function changeMode(k) {
  if (k === mode.value) return
  mode.value = k
  reset()
}

function reset() {
  board.value = Array(9).fill(0)
  turn.value = 1
  over.value = false
  winLine.value = []
  status.value = mode.value === 'local' ? '❌ 玩家先手' : '轮到你了'
}

onLoad(() => reset())
onUnload(() => destroySound())
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; display: flex; flex-direction: column; align-items: center; }
.top-bar { width: min(540rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 40rpx; font-weight: 800; }
.scores { display: flex; gap: 10rpx; }
.score-box { padding: 6rpx 16rpx; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; min-width: 80rpx; }
.label { font-size: 18rpx; }
.val { font-size: 28rpx; font-weight: 800; }
.mode-row { display: flex; gap: 10rpx; margin: 8rpx 0 14rpx; flex-wrap: wrap; justify-content: center; }
.mode { padding: 8rpx 22rpx; border-radius: 26rpx; font-size: 24rpx; }
.status { margin: 6rpx 0 16rpx; font-size: 26rpx; }
.board { width: min(540rpx, 92vw); height: min(540rpx, 92vw); display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; padding: 10rpx; border-radius: 18rpx; }
.cell { border-radius: 12rpx; display: flex; align-items: center; justify-content: center; transition: background 0.2s ease; }
.cell.win { background: rgba(7, 193, 96, 0.35) !important; }
.mark { width: 80rpx; height: 80rpx; animation: pop 0.2s ease; }
.mark.x { border: 14rpx solid; border-radius: 8rpx; }
.mark.o { border: 14rpx solid; border-radius: 50%; }
@keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }
.btn { margin-top: 22rpx; border-radius: 40rpx; padding: 0 60rpx; font-size: 26rpx; line-height: 70rpx; }
</style>
