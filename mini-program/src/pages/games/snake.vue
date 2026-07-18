<template>
  <view class="page" :class="{ dark }">
    <view class="hd">贪吃蛇</view>
    <view class="status">长度 {{ snake.length }} · 分数 {{ score }}</view>
    <view class="board" @touchstart="ts" @touchend="te">
      <view v-for="(c, i) in cells" :key="i" class="cell" :class="c"></view>
    </view>
    <view class="row">
      <button class="btn" @click="setDir(0,-1)">↑</button>
    </view>
    <view class="row">
      <button class="btn" @click="setDir(-1,0)">←</button>
      <button class="btn" @click="setDir(1,0)">→</button>
    </view>
    <button class="btn restart" @click="start">重新开始</button>
    <view v-if="over" class="over">游戏结束，长度 {{ snake.length }}</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { theme } from '../../common/store'
import { onLoad, onUnload } from '@dcloudio/uni-app'
const dark = computed(() => theme.mode === 'dark')

const N = 15
const snake = ref([])
const dir = ref({ r: 0, c: 1 })
const food = ref({ r: 2, c: 2 })
const score = ref(0)
const over = ref(false)
let timer = null
let sx = 0, sy = 0

const cells = computed(() => {
  const arr = Array(N * N).fill('')
  snake.value.forEach((s, i) => { arr[s.r * N + s.c] = i === 0 ? 'head' : 'body' })
  arr[food.value.r * N + food.value.c] = 'food'
  return arr
})

function placeFood() {
  let p
  do { p = { r: Math.floor(Math.random() * N), c: Math.floor(Math.random() * N) } }
  while (snake.value.some((s) => s.r === p.r && s.c === p.c))
  food.value = p
}
function step() {
  const head = snake.value[0]
  const nr = head.r + dir.value.r, nc = head.c + dir.value.c
  if (nr < 0 || nr >= N || nc < 0 || nc >= N || snake.value.some((s) => s.r === nr && s.c === nc)) {
    over.value = true; clearInterval(timer)
    uni.showToast({ title: '结束 长度' + snake.value.length, icon: 'none' })
    return
  }
  const ns = [{ r: nr, c: nc }, ...snake.value]
  if (nr === food.value.r && nc === food.value.c) { score.value++; placeFood() } else ns.pop()
  snake.value = ns
}
function setDir(r, c) {
  if (dir.value.r === -r && dir.value.c === -c) return
  dir.value = { r, c }
}
function ts(e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function te(e) {
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return
  if (Math.abs(dx) > Math.abs(dy)) setDir(0, dx > 0 ? 1 : -1)
  else setDir(dy > 0 ? 1 : 0, 0)
}
function start() {
  if (timer) clearInterval(timer)
  snake.value = [{ r: 7, c: 7 }, { r: 7, c: 6 }, { r: 7, c: 5 }]
  dir.value = { r: 0, c: 1 }
  score.value = 0; over.value = false
  placeFood()
  timer = setInterval(step, 220)
}
function stop() { if (timer) clearInterval(timer) }
onLoad(() => start())
onUnload(() => stop())
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 34rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 24rpx; color: var(--c-title); margin: 8rpx 0; }
.board { width: 600rpx; height: 600rpx; display: grid; grid-template-columns: repeat(15, 1fr); gap: 1rpx; background: #6b8e23; padding: 4rpx; border-radius: 10rpx; }
.cell { background: #cfe8a8; border-radius: 3rpx; }
.cell.body { background: #2e7d32; }
.cell.head { background: #c62828; }
.cell.food { background: #f9a825; border-radius: 50%; }
.row { display: flex; gap: 20rpx; margin-top: 8rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 14rpx; font-size: 32rpx; padding: 0 36rpx; line-height: 70rpx; }
.restart { margin-top: 16rpx; padding: 0 50rpx; }
.over { margin-top: 12rpx; color: #c0392b; font-weight: 700; }
</style>
