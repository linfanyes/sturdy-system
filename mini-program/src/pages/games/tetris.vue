<template>
  <view class="page" :class="{ dark }">
    <view class="hd">俄罗斯方块</view>
    <view class="status">分数 {{ score }}</view>
    <view class="wrap">
      <view class="board">
        <view v-for="(c, i) in cells" :key="i" class="cell" :class="{ on: c }"></view>
      </view>
    </view>
    <view class="row">
      <button class="btn" @click="move(-1)">←</button>
      <button class="btn" @click="rot">旋转</button>
      <button class="btn" @click="move(1)">→</button>
    </view>
    <button class="btn down" @click="drop">↓ 加速</button>
    <button class="btn restart" @click="start">重新开始</button>
    <view v-if="over" class="over">游戏结束，分数 {{ score }}</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { theme } from '../../common/store'
import { onLoad, onUnload } from '@dcloudio/uni-app'
const dark = computed(() => theme.mode === 'dark')

const COLS = 10, ROWS = 20
const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[1, 1, 1], [0, 1, 0]],
  [[1, 1, 1], [1, 0, 0]],
  [[1, 1, 1], [0, 0, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
]
const board = ref(Array.from({ length: ROWS }, () => Array(COLS).fill(0)))
const cur = ref(null)
const score = ref(0)
const over = ref(false)
let timer = null

function rotate(m) {
  const n = m.length, w = m[0].length
  const r = Array.from({ length: w }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) for (let j = 0; j < w; j++) r[j][n - 1 - i] = m[i][j]
  return r
}
function collide(m, r, c) {
  for (let i = 0; i < m.length; i++) for (let j = 0; j < m[i].length; j++) {
    if (!m[i][j]) continue
    const nr = r + i, nc = c + j
    if (nc < 0 || nc >= COLS || nr >= ROWS) return true
    if (nr >= 0 && board.value[nr][nc]) return true
  }
  return false
}
function spawn() {
  const s = SHAPES[Math.floor(Math.random() * SHAPES.length)]
  const c = Math.floor((COLS - s[0].length) / 2)
  if (collide(s, 0, c)) { over.value = true; clearInterval(timer); return }
  cur.value = { m: s, r: 0, c }
}
function merge() {
  const b = board.value.map((row) => row.slice())
  const { m, r, c } = cur.value
  m.forEach((row, i) => row.forEach((v, j) => { if (v && r + i >= 0) b[r + i][c + j] = 1 }))
  board.value = b
}
function clearLines() {
  let b = board.value.map((row) => row.slice())
  let cleared = 0
  for (let i = ROWS - 1; i >= 0; i--) {
    if (b[i].every((x) => x)) { b.splice(i, 1); b.unshift(Array(COLS).fill(0)); cleared++; i++ }
  }
  if (cleared) score.value += cleared * 100
  board.value = b
}
function step() {
  if (over.value) return
  const { m, r, c } = cur.value
  if (!collide(m, r + 1, c)) cur.value = { m, r: r + 1, c }
  else { merge(); clearLines(); spawn() }
}
function move(d) {
  if (over.value) return
  const { m, r, c } = cur.value
  if (!collide(m, r, c + d)) cur.value = { m, r, c: c + d }
}
function rot() {
  if (over.value) return
  const rm = rotate(cur.value.m)
  const { r, c } = cur.value
  if (!collide(rm, r, c)) cur.value = { m: rm, r, c }
}
function drop() { if (!over.value) step() }
const cells = computed(() => {
  const b = board.value.map((row) => row.slice())
  if (cur.value) {
    const { m, r, c } = cur.value
    m.forEach((row, i) => row.forEach((v, j) => { if (v && r + i >= 0) b[r + i][c + j] = 1 }))
  }
  const arr = []
  for (let i = 0; i < ROWS; i++) for (let j = 0; j < COLS; j++) arr.push(b[i][j] ? 1 : 0)
  return arr
})
function start() {
  if (timer) clearInterval(timer)
  board.value = Array.from({ length: ROWS }, () => Array(COLS).fill(0))
  score.value = 0; over.value = false
  spawn()
  timer = setInterval(step, 500)
}
function stop() { if (timer) clearInterval(timer) }
onLoad(() => start())
onUnload(() => stop())
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 16rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 34rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 24rpx; color: var(--c-title); margin: 6rpx 0; }
.board { width: 400rpx; height: 800rpx; display: grid; grid-template-columns: repeat(10, 1fr); gap: 1rpx; background: #2c3e50; padding: 4rpx; border-radius: 8rpx; }
.cell { background: #34495e; border-radius: 2rpx; }
.cell.on { background: #1abc9c; }
.row { display: flex; gap: 16rpx; margin-top: 12rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 12rpx; font-size: 28rpx; padding: 0 28rpx; line-height: 68rpx; }
.down { margin-top: 10rpx; }
.restart { margin-top: 10rpx; padding: 0 50rpx; }
.over { margin-top: 10rpx; color: #c0392b; font-weight: 700; }
</style>
