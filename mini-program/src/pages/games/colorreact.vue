<template>
  <view class="page">
    <view class="hd">颜色反应（Stroop）</view>
    <view class="status">得分 {{ score }} · 剩余 {{ time }}s</view>
    <view class="word" :style="{ color: ink }">{{ word }}</view>
    <view class="opts">
      <view v-for="(o, i) in opts" :key="i" class="opt" :style="{ background: o.c }" @click="choose(o)">{{ o.name }}</view>
    </view>
    <button class="btn" @click="start" v-if="time === 0">开始</button>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'

const names = ['红', '蓝', '绿', '黄']
const cols = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f']
const word = ref('')
const ink = ref('#000')
const opts = ref([])
const score = ref(0)
const time = ref(0)
let timer = null
let answer = -1

function round() {
  const wi = Math.floor(Math.random() * 4)
  const ci = Math.floor(Math.random() * 4)
  word.value = names[wi]
  ink.value = cols[ci]
  answer = ci
  // 选项打乱
  const order = [0, 1, 2, 3]
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]] }
  opts.value = order.map((k) => ({ name: names[k], c: cols[k] }))
}
function choose(o) {
  if (time.value === 0) return
  const pick = opts.value.indexOf(o)
  if (pick === answer) score.value += 1
  else score.value = Math.max(0, score.value - 1)
  round()
}
function start() {
  score.value = 0; time.value = 30; round()
  timer = setInterval(() => {
    time.value--
    if (time.value <= 0) { clearInterval(timer); uni.showToast({ title: '得分 ' + score.value, icon: 'none' }) }
  }, 1000)
}
function stop() { if (timer) clearInterval(timer) }
onLoad(() => { time.value = 0 })
onUnload(() => stop())
</script>

<style scoped>
.page { padding: 30rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 34rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 26rpx; color: #4a3f35; margin: 12rpx 0; }
.word { font-size: 120rpx; font-weight: 800; margin: 30rpx 0; }
.opts { width: 600rpx; display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; }
.opt { height: 140rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 48rpx; font-weight: 800; color: #fff; text-shadow: 0 2rpx 4rpx rgba(0,0,0,.3); }
.btn { margin-top: 30rpx; background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 70rpx; }
</style>
