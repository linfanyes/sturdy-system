<template>
  <view class="page">
    <view class="hd">倒计时</view>
    <view class="display">{{ mm }}:{{ ss }}</view>
    <view class="set" v-if="!running">
      <view class="field"><text>分</text><input type="number" v-model="min" /></view>
      <view class="field"><text>秒</text><input type="number" v-model="sec" /></view>
    </view>
    <view class="row">
      <button class="btn" @click="toggle">{{ running ? '暂停' : '开始' }}</button>
      <button class="btn ghost" @click="reset">重置</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'

const total = ref(0)
const left = ref(0)
const running = ref(false)
const min = ref(5)
const sec = ref(0)
let timer = null

const mm = computed(() => String(Math.floor(left.value / 60)).padStart(2, '0'))
const ss = computed(() => String(left.value % 60).padStart(2, '0'))

function toggle() {
  if (running.value) { clearInterval(timer); running.value = false; return }
  if (left.value <= 0) left.value = min.value * 60 + sec.value
  if (left.value <= 0) return
  running.value = true
  timer = setInterval(() => {
    left.value--
    if (left.value <= 0) {
      clearInterval(timer); running.value = false
      uni.vibrateLong()
      uni.showToast({ title: '时间到！', icon: 'none' })
    }
  }, 1000)
}
function reset() { if (timer) clearInterval(timer); running.value = false; left.value = min.value * 60 + sec.value }
function stop() { if (timer) clearInterval(timer) }
onLoad(() => { left.value = min.value * 60 + sec.value })
onUnload(() => stop())
</script>

<style scoped>
.page { padding: 40rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; }
.display { font-size: 140rpx; font-weight: 800; color: #e6a23c; margin: 40rpx 0; font-variant-numeric: tabular-nums; }
.set { display: flex; gap: 30rpx; }
.field { display: flex; align-items: center; gap: 10rpx; background: #fff; border-radius: 14rpx; padding: 10rpx 20rpx; }
.field input { width: 90rpx; text-align: center; font-size: 40rpx; }
.row { display: flex; gap: 20rpx; margin-top: 40rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 60rpx; }
.btn.ghost { background: #fff; color: #a07b3b; border: 2rpx solid #e6a23c; }
</style>
