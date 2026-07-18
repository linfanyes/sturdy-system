<template>
  <view class="page" :class="{ dark }">
    <view class="hd">数字排序</view>
    <view class="status">{{ status }}</view>
    <view class="board">
      <view v-for="(n, i) in arr" :key="i" class="cell"
        :class="{ sel: sel === i }" @click="tap(i)">{{ n }}</view>
    </view>
    <button class="btn" @click="reset">换一题</button>
  </view>
</template>

<script setup>
import { ref, computed} from 'vue'
import { theme } from '../../common/store'
import { onLoad } from '@dcloudio/uni-app'
const dark = computed(() => theme.mode === 'dark')

const N = 9
const arr = ref([])
const sel = ref(-1)
const status = ref('点两个数字交换，排成升序')

function gen() {
  const a = [...Array(N).keys()].map((x) => x + 1)
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }
  // 保证不是已排好
  if (a.every((v, i) => v === i + 1)) [a[0], a[1]] = [a[1], a[0]]
  arr.value = a
  sel.value = -1
  status.value = '点两个数字交换，排成升序'
}
function tap(i) {
  if (sel.value === -1) { sel.value = i; return }
  if (sel.value === i) { sel.value = -1; return }
  const a = arr.value.slice()
  [a[sel.value], a[i]] = [a[i], a[sel.value]]
  arr.value = a
  sel.value = -1
  if (a.every((v, idx) => v === idx + 1)) status.value = '🎉 排序正确！'
}
function reset() { gen() }
onLoad(() => gen())
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 30rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 26rpx; color: var(--c-title); margin: 12rpx 0; }
.board { width: 630rpx; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.cell { height: 130rpx; background: #e6a23c; color: #fff; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 48rpx; font-weight: 700; }
.cell.sel { background: #a07b3b; outline: 4rpx solid #fff; }
.btn { margin-top: 24rpx; background: #a07b3b; color: #fff; border-radius: 40rpx; padding: 0 60rpx; }
</style>
