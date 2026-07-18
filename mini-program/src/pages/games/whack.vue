<template>
  <view class="page" :class="{ dark }">
    <view class="hd">打地鼠</view>
    <view class="status">得分 {{ score }} · 剩余 {{ time }}s</view>
    <view class="board">
      <view v-for="(m, i) in moles" :key="i" class="cell" :class="{ up: m }" @click="hit(i)">
        <text v-if="m">🐹</text>
      </view>
    </view>
    <button class="btn" @click="start" v-if="time === 0">开始</button>
  </view>
</template>

<script setup>
import { ref, computed} from 'vue'
import { theme } from '../../common/store'
import { onLoad, onUnload } from '@dcloudio/uni-app'
const dark = computed(() => theme.mode === 'dark')

const moles = ref(Array(9).fill(false))
const score = ref(0)
const time = ref(0)
let t1 = null, t2 = null
let active = -1

function spawn() {
  if (active >= 0) moles.value[active] = false
  const i = Math.floor(Math.random() * 9)
  active = i
  moles.value[i] = true
  setTimeout(() => { if (moles.value[i]) { moles.value[i] = false; active = -1 } }, 800)
}
function hit(i) {
  if (time.value === 0 || !moles.value[i]) return
  moles.value[i] = false; active = -1; score.value++
}
function start() {
  score.value = 0; time.value = 30
  moles.value = Array(9).fill(false)
  t1 = setInterval(spawn, 700)
  t2 = setInterval(() => {
    time.value--
    if (time.value <= 0) {
      clearInterval(t1); clearInterval(t2)
      uni.showToast({ title: '得分 ' + score.value, icon: 'none' })
    }
  }, 1000)
}
function stop() { if (t1) clearInterval(t1); if (t2) clearInterval(t2) }
onLoad(() => { time.value = 0 })
onUnload(() => stop())
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 30rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 34rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 26rpx; color: var(--c-title); margin: 12rpx 0; }
.board { width: 600rpx; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.cell { height: 170rpx; background: #8d6e63; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 80rpx; opacity: .5; }
.cell.up { background: #a1887f; opacity: 1; }
.btn { margin-top: 30rpx; background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 70rpx; }
</style>
