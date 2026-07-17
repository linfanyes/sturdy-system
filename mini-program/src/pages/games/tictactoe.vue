<template>
  <view class="page">
    <view class="hd">井字棋 · 你执 ❌，电脑执 ⭕</view>
    <view class="status">{{ status }}</view>
    <view class="board">
      <view v-for="(c, i) in board" :key="i" class="cell" @click="tap(i)">
        <text v-if="c === 1">❌</text>
        <text v-else-if="c === 2">⭕</text>
      </view>
    </view>
    <button class="btn" @click="reset">重新开始</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const board = ref(Array(9).fill(0))
const turn = ref(1)
const over = ref(false)
const status = ref('轮到你了')

const wins = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
]

function checkWinner(b) {
  for (const w of wins) {
    if (b[w[0]] && b[w[0]] === b[w[1]] && b[w[1]] === b[w[2]]) return b[w[0]]
  }
  if (b.every((x) => x)) return 3
  return 0
}

function tap(i) {
  if (over.value || board.value[i] !== 0 || turn.value !== 1) return
  board.value[i] = 1
  const r = checkWinner(board.value)
  if (r) return finish(r)
  turn.value = 2
  status.value = '电脑思考中…'
  setTimeout(aiMove, 350)
}

function aiMove() {
  const empties = board.value.map((v, i) => (v === 0 ? i : -1)).filter((i) => i >= 0)
  if (!empties.length) return
  // 先堵后攻再随机
  const pick = findWin(2) ?? findWin(1) ?? empties[Math.floor(Math.random() * empties.length)]
  board.value[pick] = 2
  const r = checkWinner(board.value)
  if (r) return finish(r)
  turn.value = 1
  status.value = '轮到你了'
}

function findWin(p) {
  for (let i = 0; i < 9; i++) {
    if (board.value[i] !== 0) continue
    const t = board.value.slice()
    t[i] = p
    if (checkWinner(t) === p) return i
  }
  return null
}

function finish(r) {
  over.value = true
  status.value = r === 1 ? '🎉 你赢了！' : r === 2 ? '😢 电脑赢了' : '🤝 平局'
}

function reset() {
  board.value = Array(9).fill(0)
  turn.value = 1
  over.value = false
  status.value = '轮到你了'
}

onLoad(() => reset())
</script>

<style scoped>
.page { padding: 40rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 30rpx; font-weight: 700; color: #a07b3b; }
.status { margin: 16rpx 0 24rpx; font-size: 28rpx; color: #4a3f35; }
.board { width: 540rpx; height: 540rpx; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8rpx; background: #e9d8b8; padding: 8rpx; border-radius: 16rpx; }
.cell { background: #fff; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; font-size: 70rpx; }
.btn { margin-top: 30rpx; background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 60rpx; }
</style>
