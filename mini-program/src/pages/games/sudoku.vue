<template>
  <view class="page">
    <view class="hd">数独</view>
    <view class="status">{{ status }}</view>
    <view class="board">
      <view v-for="(c, i) in show" :key="i"
        class="cell"
        :class="{ fixed: puzzle[i] !== 0, sel: sel === i, bad: bad[i] }"
        @click="pick(i)">
        <text v-if="c">{{ c }}</text>
      </view>
    </view>
    <view class="pad">
      <view v-for="n in 9" :key="n" class="num" @click="fill(n)">{{ n }}</view>
      <view class="num erase" @click="fill(0)">⌫</view>
    </view>
    <view class="row">
      <button class="btn" @click="check">检查</button>
      <button class="btn" @click="reset">新题</button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const SOL = [
  [5,3,4,6,7,8,9,1,2],[6,7,2,1,9,5,3,4,8],[1,9,8,3,4,2,5,6,7],
  [8,5,9,7,6,1,4,2,3],[4,2,6,8,5,3,7,9,1],[7,1,3,9,2,4,8,5,6],
  [9,6,1,5,3,7,2,8,4],[2,8,7,4,1,9,6,3,5],[3,4,5,2,8,6,1,7,9],
]
const puzzle = ref(Array(81).fill(0))
const show = ref(Array(81).fill(0))
const bad = ref(Array(81).fill(false))
const sel = ref(-1)
const status = ref('点击空格，再用数字键盘填写')

function gen() {
  const p = Array(81).fill(0)
  for (let i = 0; i < 81; i++) p[i] = SOL[Math.floor(i / 9)][i % 9]
  // 随机挖空 45 个
  const idx = [...Array(81).keys()]
  for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]] }
  idx.slice(0, 45).forEach((i) => (p[i] = 0))
  puzzle.value = p
  show.value = p.slice()
  bad.value = Array(81).fill(false)
  sel.value = -1
  status.value = '新题已生成'
}
function pick(i) {
  if (puzzle.value[i] !== 0) return
  sel.value = i
}
function fill(n) {
  if (sel.value < 0 || puzzle.value[sel.value] !== 0) return
  show.value[sel.value] = n
  bad.value[sel.value] = false
}
function check() {
  let ok = true
  for (let i = 0; i < 81; i++) {
    const v = show.value[i]
    const sv = SOL[Math.floor(i / 9)][i % 9]
    const wrong = v !== sv
    bad.value[i] = wrong
    if (wrong) ok = false
  }
  status.value = ok ? '🎉 全部正确！' : '有错误，红格需修改'
}
function reset() { gen() }
onLoad(() => gen())
</script>

<style scoped>
.page { padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 24rpx; color: #4a3f35; margin: 8rpx 0; }
.board { width: 630rpx; height: 630rpx; display: grid; grid-template-columns: repeat(9, 1fr); gap: 1rpx; background: #8a6d3b; padding: 4rpx; border-radius: 10rpx; }
.cell { background: #fff; display: flex; align-items: center; justify-content: center; font-size: 32rpx; color: #2c3e50; }
.cell.fixed { background: #f3e2c0; font-weight: 700; }
.cell.sel { background: #ffe9a8; }
.cell.bad { color: #c0392b; }
.pad { width: 630rpx; display: grid; grid-template-columns: repeat(5, 1fr); gap: 12rpx; margin-top: 16rpx; }
.num { background: #e6a23c; color: #fff; border-radius: 12rpx; text-align: center; line-height: 80rpx; font-size: 34rpx; }
.num.erase { background: #b0a08a; }
.row { display: flex; gap: 20rpx; margin-top: 16rpx; }
.btn { background: #a07b3b; color: #fff; border-radius: 40rpx; padding: 0 50rpx; font-size: 26rpx; }
</style>
