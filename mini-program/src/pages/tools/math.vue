<template>
  <view class="page" :class="{ dark }">
    <view class="hd">口算生成</view>
    <view class="cfg">
      <view class="field"><text>题数</text><input type="number" v-model="count" /></view>
      <view class="field"><text>最大值</text><input type="number" v-model="max" /></view>
      <view class="ops">
        <view v-for="o in allOps" :key="o" class="op" :class="{ on: ops.includes(o) }" @click="toggleOp(o)">{{ o }}</view>
      </view>
    </view>
    <view class="row">
      <button class="btn" @click="gen">生成题目</button>
      <button class="btn ghost" @click="showAns = !showAns">{{ showAns ? '隐藏答案' : '显示答案' }}</button>
    </view>
    <view class="list" v-if="problems.length">
      <view v-for="(p, i) in problems" :key="i" class="item">
        <text class="no">{{ i + 1 }}.</text>
        <text class="q">{{ p.q }} = {{ showAns ? p.a : '？' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { theme } from '../../common/store'
const dark = theme.dark

const count = ref(10)
const max = ref(20)
const allOps = ['+', '-', '×', '÷']
const ops = ref(['+', '-'])
const showAns = ref(false)
const problems = ref([])

function toggleOp(o) {
  const i = ops.value.indexOf(o)
  if (i >= 0) { if (ops.value.length > 1) ops.value.splice(i, 1) } else ops.value.push(o)
}
function rnd(n) { return Math.floor(Math.random() * (n + 1)) }
function gen() {
  const list = []
  for (let i = 0; i < count.value; i++) {
    const op = ops.value[Math.floor(Math.random() * ops.value.length)]
    let a = rnd(max.value), b = rnd(max.value), q, ans
    if (op === '+') { ans = a + b; q = a + ' + ' + b }
    else if (op === '-') { if (b > a) [a, b] = [b, a]; ans = a - b; q = a + ' − ' + b }
    else if (op === '×') { a = rnd(Math.min(max.value, 9)); b = rnd(Math.min(max.value, 9)); ans = a * b; q = a + ' × ' + b }
    else { b = rnd(9) + 1; ans = rnd(max.value); a = ans * b; q = a + ' ÷ ' + b }
    list.push({ q, a: ans })
  }
  problems.value = list
  showAns.value = false
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; }
.cfg { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin: 20rpx 0; }
.field { display: flex; align-items: center; gap: 16rpx; margin-bottom: 16rpx; }
.field text { font-size: 26rpx; color: var(--c-accent); width: 100rpx; }
.field input { background: var(--c-card2); border-radius: 10rpx; padding: 10rpx 20rpx; width: 160rpx; font-size: 28rpx; height: 60rpx; min-height: 60rpx; line-height: 40rpx; box-sizing: border-box; color: var(--c-title); }
.ops { display: flex; gap: 16rpx; }
.op { width: 80rpx; height: 80rpx; border-radius: 14rpx; background: #f3e2c0; display: flex; align-items: center; justify-content: center; font-size: 36rpx; color: #bbb; }
.op.on { background: #e6a23c; color: #fff; }
.row { display: flex; gap: 20rpx; margin: 16rpx 0; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 50rpx; }
.btn.ghost { background: var(--c-card); color: var(--c-accent); border: 2rpx solid #e6a23c; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.item { display: flex; gap: 12rpx; padding: 12rpx 0; border-bottom: 1rpx solid var(--c-border); font-size: 30rpx; }
.no { color: var(--c-accent); font-weight: 700; }
</style>
