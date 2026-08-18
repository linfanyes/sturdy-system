<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">口算生成</view>
    <view class="sub">随机生成加减乘除口算题</view>

    <!-- 配置 -->
    <view class="form">
      <view class="form-row">
        <text class="form-lb">运算类型</text>
        <picker :range="opOptions" :value="opIdx" @change="opIdx = +$event.detail.value">
          <view class="form-pk">{{ opOptions[opIdx] }}</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-lb">最小值</text>
        <input v-model.number="config.min" class="form-ipt" type="number" maxlength="3" />
      </view>
      <view class="form-row">
        <text class="form-lb">最大值</text>
        <input v-model.number="config.max" class="form-ipt" type="number" maxlength="3" />
      </view>
      <view class="form-row">
        <text class="form-lb">题目数量</text>
        <picker :range="countOptions" :value="countIdx" @change="countIdx = +$event.detail.value">
          <view class="form-pk">{{ countOptions[countIdx] }} 题</view>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-lb">显示答案</text>
        <switch :checked="config.showAnswer" @change="config.showAnswer = $event.detail.value" color="var(--c-primary)" />
      </view>
    </view>

    <button class="btn" @click="generate">生成题目</button>

    <!-- 题目列表 -->
    <view v-if="questions.length" class="list">
      <view v-for="(q, i) in questions" :key="i" class="item">
        <text class="idx">{{ i + 1 }}.</text>
        <text class="expr">{{ q.expr }}=</text>
        <text v-if="config.showAnswer" class="ans">{{ q.answer }}</text>
        <text v-else class="blank">&nbsp;&nbsp;&nbsp;</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { theme } from '../../common/store'

const opOptions = ['加法', '减法', '乘法', '除法', '混合']
const countOptions = [10, 20, 30, 50]
const opIdx = ref(0)
const countIdx = ref(1)
const config = reactive({
  min: 1,
  max: 20,
  showAnswer: false,
})
const questions = ref([])

function randInt(lo, hi) {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo
}

function genOne(op) {
  const lo = Math.min(config.min, config.max)
  const hi = Math.max(config.min, config.max)
  const realOp = op === 4 ? randInt(0, 3) : op
  let a = randInt(lo, hi)
  let b = randInt(lo, hi)
  let expr = ''
  let answer = 0
  if (realOp === 0) {
    expr = `${a} + ${b}`
    answer = a + b
  } else if (realOp === 1) {
    if (a < b) [a, b] = [b, a]
    expr = `${a} - ${b}`
    answer = a - b
  } else if (realOp === 2) {
    expr = `${a} × ${b}`
    answer = a * b
  } else {
    if (b === 0) b = 1
    const divisor = b
    const quotient = Math.max(1, Math.floor(a / divisor))
    const dividend = divisor * quotient
    expr = `${dividend} ÷ ${divisor}`
    answer = quotient
  }
  return { expr, answer }
}

function generate() {
  const n = Math.max(1, Math.min(200, countOptions[countIdx.value] || 20))
  questions.value = Array.from({ length: n }, () => genOne(opIdx.value))
}

onMounted(generate)
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; margin-bottom: 24rpx; }
.form { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 24rpx; }
.form-row { display: flex; align-items: center; margin-bottom: 16rpx; }
.form-row:last-child { margin-bottom: 0; }
.form-lb { width: 140rpx; font-size: 26rpx; color: var(--c-sub); }
.form-ipt { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.form-pk { flex: 1; background: var(--c-input); border-radius: 10rpx; padding: 14rpx 20rpx; font-size: 26rpx; }
.btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; font-size: 28rpx; padding: 16rpx; margin-bottom: 24rpx; }
.list { display: flex; flex-wrap: wrap; gap: 16rpx; }
.item { display: flex; align-items: center; background: var(--c-card); border-radius: 10rpx; padding: 14rpx 20rpx; min-width: 45%; }
.idx { font-size: 22rpx; color: var(--c-sub); width: 50rpx; }
.expr { font-size: 28rpx; color: var(--c-text); font-family: monospace; }
.ans { font-size: 28rpx; color: #07c160; font-weight: 600; margin-left: 12rpx; }
.blank { display: inline-block; width: 60rpx; border-bottom: 2rpx solid var(--c-sub); margin-left: 12rpx; }
</style>
