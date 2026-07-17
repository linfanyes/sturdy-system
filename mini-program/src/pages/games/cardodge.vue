<template>
  <view class="page">
    <view class="hd">汽车躲避</view>
    <view class="status">得分 {{ score }} · {{ status }}</view>
    <view class="board" @touchstart="ts" @touchend="te">
      <view v-for="(c, i) in cells" :key="i" class="cell" :class="c"></view>
    </view>
    <view class="row">
      <button class="btn" @click="move(-1)">←</button>
      <button class="btn" @click="move(1)">→</button>
    </view>
    <button class="btn restart" @click="start">重新开始</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'

const ROWS = 12, LANES = 3
const player = ref(1)
const cars = ref([])
const score = ref(0)
const over = ref(false)
const status = ref('点击左右切换车道躲避来车')
let timer = null
let sx = 0

const cells = computed(() => {
  const arr = Array(ROWS * LANES).fill('')
  cars.value.forEach((o) => { if (o.r >= 0 && o.r < ROWS) arr[o.r * LANES + o.lane] = 'car' })
  arr[(ROWS - 1) * LANES + player.value] = 'me'
  return arr
})
function step() {
  cars.value = cars.value.map((o) => ({ ...o, r: o.r + 1 })).filter((o) => o.r < ROWS)
  if (cars.value.some((o) => o.r === ROWS - 1 && o.lane === player.value)) {
    over.value = true; status.value = '💥 撞车了'; clearInterval(timer); return
  }
  if (Math.random() < 0.45) cars.value.push({ r: 0, lane: Math.floor(Math.random() * LANES) })
  score.value++
}
function move(d) { const n = player.value + d; if (n >= 0 && n < LANES) player.value = n }
function ts(e) { sx = e.touches[0].clientX }
function te(e) {
  const dx = e.changedTouches[0].clientX - sx
  if (Math.abs(dx) < 20) return
  move(dx > 0 ? 1 : -1)
}
function start() {
  if (timer) clearInterval(timer)
  player.value = 1; cars.value = []; score.value = 0; over.value = false; status.value = '点击左右切换车道躲避来车'
  timer = setInterval(step, 240)
}
function stop() { if (timer) clearInterval(timer) }
onLoad(() => start())
onUnload(() => stop())
</script>

<style scoped>
.page { padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 34rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 24rpx; color: #4a3f35; margin: 8rpx 0; }
.board { width: 360rpx; height: 600rpx; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4rpx; background: #34495e; padding: 4rpx; border-radius: 10rpx; }
.cell { background: #455a64; border-radius: 4rpx; }
.cell.car { background: #e74c3c; border-radius: 8rpx; }
.cell.me { background: #2ecc71; border-radius: 8rpx; }
.row { display: flex; gap: 30rpx; margin-top: 16rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 14rpx; font-size: 32rpx; padding: 0 40rpx; line-height: 70rpx; }
.restart { margin-top: 12rpx; padding: 0 50rpx; }
</style>
