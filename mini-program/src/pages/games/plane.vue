<template>
  <view class="page">
    <view class="hd">飞机大战</view>
    <view class="status">分数 {{ score }} · ❤️ {{ lives }}</view>
    <view class="board" @touchstart="ts" @touchend="te">
      <view v-for="(c, i) in cells" :key="i" class="cell" :class="c"></view>
    </view>
    <view class="row">
      <button class="btn" @click="move(-1)">←</button>
      <button class="btn" @click="move(1)">→</button>
    </view>
    <button class="btn restart" @click="start">重新开始</button>
    <view v-if="over" class="over">游戏结束，分数 {{ score }}</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'

const COLS = 9, ROWS = 12
const me = ref(4)
const enemies = ref([])
const bullets = ref([])
const score = ref(0)
const lives = ref(3)
const over = ref(false)
let timer = null
let sx = 0

const cells = computed(() => {
  const arr = Array(ROWS * COLS).fill('')
  bullets.value.forEach((b) => { if (b.r >= 0 && b.r < ROWS) arr[b.r * COLS + b.c] = 'bullet' })
  enemies.value.forEach((e) => { if (e.r >= 0 && e.r < ROWS) arr[e.r * COLS + e.c] = 'enemy' })
  arr[(ROWS - 1) * COLS + me.value] = 'me'
  return arr
})
function step() {
  if (over.value) return
  // 子弹上移
  bullets.value = bullets.value.map((b) => ({ ...b, r: b.r - 1 })).filter((b) => b.r >= 0)
  // 敌机下移（每两帧）
  enemies.value = enemies.value.map((e) => ({ ...e, r: e.r + 1 }))
  // 发射
  bullets.value.push({ r: ROWS - 2, c: me.value })
  // 碰撞：子弹打敌机
  const hit = new Set()
  bullets.value.forEach((b, bi) => {
    enemies.value.forEach((e, ei) => { if (e.r === b.r && e.c === b.c) { hit.add(bi); hit.add(ei) } })
  })
  if (hit.size) {
    bullets.value = bullets.value.filter((_, i) => !hit.has(i))
    enemies.value = enemies.value.filter((_, i) => !hit.has(i))
    score.value += 10
  }
  // 敌机到达底部
  const reached = enemies.value.some((e) => e.r >= ROWS - 1)
  if (reached) {
    enemies.value = enemies.value.filter((e) => e.r < ROWS - 1)
    lives.value--
    if (lives.value <= 0) { over.value = true; clearInterval(timer); return }
  }
  if (Math.random() < 0.5) enemies.value.push({ r: 0, c: Math.floor(Math.random() * COLS) })
}
function move(d) { const n = me.value + d; if (n >= 0 && n < COLS) me.value = n }
function ts(e) { sx = e.touches[0].clientX }
function te(e) { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) >= 20) move(dx > 0 ? 1 : -1) }
function start() {
  if (timer) clearInterval(timer)
  me.value = 4; enemies.value = []; bullets.value = []; score.value = 0; lives.value = 3; over.value = false
  timer = setInterval(step, 180)
}
function stop() { if (timer) clearInterval(timer) }
onLoad(() => start())
onUnload(() => stop())
</script>

<style scoped>
.page { padding: 16rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 34rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 24rpx; color: #4a3f35; margin: 6rpx 0; }
.board { width: 540rpx; height: 720rpx; display: grid; grid-template-columns: repeat(9, 1fr); gap: 2rpx; background: #0b1d3a; padding: 4rpx; border-radius: 8rpx; }
.cell { background: #0b1d3a; border-radius: 2rpx; }
.cell.me { background: #2ecc71; border-radius: 6rpx; }
.cell.enemy { background: #e74c3c; border-radius: 50%; }
.cell.bullet { background: #f1c40f; border-radius: 50%; }
.row { display: flex; gap: 30rpx; margin-top: 12rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 12rpx; font-size: 30rpx; padding: 0 40rpx; line-height: 70rpx; }
.restart { margin-top: 10rpx; padding: 0 50rpx; }
.over { margin-top: 10rpx; color: #c0392b; font-weight: 700; }
</style>
