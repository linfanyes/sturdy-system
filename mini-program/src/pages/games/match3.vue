<template>
  <view class="page">
    <view class="hd">消消乐</view>
    <view class="status">分数 {{ score }} · 点两个相邻方块交换</view>
    <view class="board">
      <view v-for="(c, i) in grid" :key="i" class="cell" :style="{ background: colors[c] }"
        :class="{ sel: sel === i }" @click="tap(i)"></view>
    </view>
    <button class="btn" @click="reset">重新开始</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const N = 8, K = 5
const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6']
const grid = ref([])
const sel = ref(-1)
const score = ref(0)

function rnd() { return Math.floor(Math.random() * K) }
function gen() {
  let g
  do { g = Array.from({ length: N * N }, () => rnd()) } while (findMatches(g).length)
  grid.value = g
  score.value = 0; sel.value = -1
}
function idx(r, c) { return r * N + c }
function findMatches(g) {
  const m = Array(N * N).fill(false)
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N - 2; c++) {
      const a = g[idx(r, c)], b = g[idx(r, c + 1)], d = g[idx(r, c + 2)]
      if (a === b && b === d) { m[idx(r, c)] = m[idx(r, c + 1)] = m[idx(r, c + 2)] = true }
    }
  }
  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N - 2; r++) {
      const a = g[idx(r, c)], b = g[idx(r + 1, c)], d = g[idx(r + 2, c)]
      if (a === b && b === d) { m[idx(r, c)] = m[idx(r + 1, c)] = m[idx(r + 2, c)] = true }
    }
  }
  return m
}
function tap(i) {
  if (sel.value === -1) { sel.value = i; return }
  if (sel.value === i) { sel.value = -1; return }
  const r1 = Math.floor(sel.value / N), c1 = sel.value % N
  const r2 = Math.floor(i / N), c2 = i % N
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) { sel.value = i; return }
  const g = grid.value.slice()
  ;[g[sel.value], g[i]] = [g[i], g[sel.value]]
  if (!findMatches(g).some((x) => x)) { sel.value = -1; return }
  grid.value = g
  sel.value = -1
  resolve()
}
function resolve() {
  let g = grid.value.slice()
  let cleared = 0
  while (true) {
    const m = findMatches(g)
    if (!m.some((x) => x)) break
    for (let i = 0; i < m.length; i++) if (m[i]) { g[i] = -1; cleared++ }
    // 下落
    for (let c = 0; c < N; c++) {
      const col = []
      for (let r = N - 1; r >= 0; r--) if (g[idx(r, c)] !== -1) col.push(g[idx(r, c)])
      while (col.length < N) col.push(rnd())
      for (let r = N - 1, k = 0; r >= 0; r--, k++) g[idx(r, c)] = col[k]
    }
  }
  grid.value = g
  score.value += cleared * 10
}
function reset() { gen() }
onLoad(() => gen())
</script>

<style scoped>
.page { padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 24rpx; color: #4a3f35; margin: 8rpx 0; }
.board { width: 600rpx; height: 600rpx; display: grid; grid-template-columns: repeat(8, 1fr); gap: 4rpx; background: #5a4a2a; padding: 4rpx; border-radius: 10rpx; }
.cell { border-radius: 8rpx; }
.cell.sel { outline: 4rpx solid #fff; }
.btn { margin-top: 16rpx; background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 60rpx; }
</style>
