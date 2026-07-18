<template>
  <view class="page" :class="{ dark }">
    <view class="hd">五子棋 · 双人对战（轮流落子）</view>
    <view class="status">{{ status }}</view>
    <view class="board">
      <view v-for="(c, i) in board" :key="i" class="cell" @click="tap(i)">
        <text v-if="c === 1" class="b">⚫</text>
        <text v-else-if="c === 2" class="w">⚪</text>
      </view>
    </view>
    <button class="btn" @click="reset">重新开始</button>
  </view>
</template>

<script setup>
import { ref, computed} from 'vue'
import { theme } from '../../common/store'
import { onLoad } from '@dcloudio/uni-app'
const dark = computed(() => theme.mode === 'dark')

const N = 13
const board = ref(Array(N * N).fill(0))
const turn = ref(1)
const over = ref(false)
const status = ref('黑棋落子')

function dirs() {
  return [
    [1, 0], [0, 1], [1, 1], [1, -1],
  ]
}

function check(i) {
  const r = Math.floor(i / N)
  const col = i % N
  const p = board.value[i]
  for (const [dr, dc] of dirs()) {
    let cnt = 1
    for (const s of [1, -1]) {
      let rr = r + dr * s
      let cc = col + dc * s
      while (rr >= 0 && rr < N && cc >= 0 && cc < N && board.value[rr * N + cc] === p) {
        cnt++
        rr += dr * s
        cc += dc * s
      }
    }
    if (cnt >= 5) return true
  }
  return false
}

function tap(i) {
  if (over.value || board.value[i] !== 0) return
  board.value[i] = turn.value
  if (check(i)) {
    over.value = true
    status.value = (turn.value === 1 ? '⚫ 黑棋' : '⚪ 白棋') + '胜利！'
    return
  }
  if (board.value.every((x) => x)) {
    over.value = true
    status.value = '平局'
    return
  }
  turn.value = turn.value === 1 ? 2 : 1
  status.value = (turn.value === 1 ? '⚫ 黑棋' : '⚪ 白棋') + '落子'
}

function reset() {
  board.value = Array(N * N).fill(0)
  turn.value = 1
  over.value = false
  status.value = '黑棋落子'
}

onLoad(() => reset())
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 26rpx; font-weight: 700; color: #a07b3b; }
.status { margin: 10rpx 0; font-size: 26rpx; color: var(--c-title); }
.board { width: 690rpx; height: 690rpx; display: grid; grid-template-columns: repeat(13, 1fr); gap: 2rpx; background: #dcb878; padding: 4rpx; border-radius: 10rpx; }
.cell { background: #f3e2c0; display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.b { color: #222; }
.w { color: #fff; }
.btn { margin-top: 16rpx; background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 60rpx; font-size: 26rpx; }
</style>
