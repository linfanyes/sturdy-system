<template>
  <view class="page" :class="{ dark }">
    <view class="hd">竖式计算练习</view>
    <view class="cfg">
      <view class="field-label">运算类型</view>
      <picker :range="opLabels" @change="e => opIndex = e.detail.value">
        <view class="picker">{{ opLabels[opIndex] }}</view>
      </picker>
      <view class="field-label">数字位数</view>
      <picker :range="digitLabels" @change="e => digitIndex = e.detail.value">
        <view class="picker">{{ digitLabels[digitIndex] }}</view>
      </picker>
      <view class="field-label">题目数量</view>
      <picker :range="countOpts" @change="e => countIndex = e.detail.value">
        <view class="picker">{{ countOpts[countIndex] }} 题</view>
      </picker>
    </view>
    <view class="row">
      <button class="btn" @click="gen">生成题目</button>
      <button class="btn ghost" @click="showAns = !showAns">{{ showAns ? '隐藏答案' : '显示答案' }}</button>
    </view>
    <view v-if="list.length" class="grid">
      <view v-for="(q, i) in list" :key="i" class="cell">
        <view class="vc">
          <text class="n">{{ q.a }}</text>
          <view class="rline"><text class="op">{{ q.op }}</text><text class="n">{{ q.b }}</text></view>
          <view class="bar"></view>
          <text v-if="showAns" class="ans">{{ q.ans }}</text>
          <text v-else class="blank">____</text>
        </view>
        <text class="idx">第 {{ i + 1 }} 题</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { theme } from '../../common/store'
const dark = theme.dark

const ops = ['addition', 'subtraction', 'multiplication', 'division']
const opLabels = ['加法(含进位)', '减法(含退位)', '乘法(一位×多位)', '除法(多位÷一位)']
const opIndex = ref(0)
const digitLabels = ['两位数', '三位数', '四位数']
const digitIndex = ref(0)
const countOpts = [5, 10, 20, 30]
const countIndex = ref(1)
const showAns = ref(false)
const list = ref([])

function rndRange(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }

function gen() {
  const op = ops[opIndex.value]
  const digit = [2, 3, 4][digitIndex.value]
  const count = countOpts[countIndex.value]
  const maxVal = Math.pow(10, digit) - 1
  const minVal = Math.pow(10, digit - 1)
  const arr = []
  for (let i = 0; i < count; i++) {
    let a, b, ans, sym
    if (op === 'addition') { a = rndRange(minVal, maxVal); b = rndRange(minVal, maxVal); ans = a + b; sym = '+' }
    else if (op === 'subtraction') { a = rndRange(minVal, maxVal); b = rndRange(minVal, a); ans = a - b; sym = '−' }
    else if (op === 'multiplication') { a = rndRange(10, maxVal); b = rndRange(2, 9); ans = a * b; sym = '×' }
    else { b = rndRange(2, 9); ans = rndRange(10, 99); a = b * ans; sym = '÷' }
    arr.push({ a, b, ans, op: sym })
  }
  list.value = arr
  showAns.value = false
}
gen()
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; }
.cfg { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; margin: 20rpx 0; }
.field-label { font-size: 26rpx; color: var(--c-accent); margin: 10rpx 0; }
.picker { background: var(--c-card2); border-radius: 10rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); min-height: 72rpx; line-height: 40rpx; box-sizing: border-box; }
.row { display: flex; gap: 20rpx; margin: 16rpx 0; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 40rpx; flex: 1; }
.btn.ghost { background: var(--c-card); color: var(--c-accent); border: 2rpx solid #e6a23c; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; margin-top: 10rpx; }
.cell { background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.vc { display: flex; flex-direction: column; align-items: flex-end; font-family: monospace; font-size: 40rpx; color: var(--c-title); }
.rline { display: flex; align-items: center; gap: 10rpx; }
.op { color: var(--c-accent); }
.bar { width: 100%; height: 3rpx; background: var(--c-title); margin-top: 8rpx; }
.ans { color: #07c160; font-weight: 800; margin-top: 6rpx; }
.blank { color: var(--c-sub); margin-top: 6rpx; }
.idx { display: block; text-align: center; font-size: 22rpx; color: var(--c-sub); margin-top: 10rpx; }
</style>
