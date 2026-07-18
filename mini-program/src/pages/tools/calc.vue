<template>
  <view class="page" :class="{ dark }">
    <view class="hd">课堂计算器</view>
    <view class="screen">
      <view class="expr">{{ expr || '0' }}</view>
      <view class="res">{{ display }}</view>
    </view>
    <view class="keys">
      <view v-for="k in keys" :key="k" class="key" :class="k.cls" @click="press(k.v)">{{ k.t }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const expr = ref('')
const cur = ref('0')
const op = ref(null)
const prev = ref(null)
const display = computed(() => cur.value)

const keys = [
  { t: 'C', v: 'C', cls: 'fn' }, { t: '⌫', v: 'B', cls: 'fn' }, { t: '±', v: 'N', cls: 'fn' }, { t: '÷', v: '/', cls: 'op' },
  { t: '7', v: '7' }, { t: '8', v: '8' }, { t: '9', v: '9' }, { t: '×', v: '*', cls: 'op' },
  { t: '4', v: '4' }, { t: '5', v: '5' }, { t: '6', v: '6' }, { t: '−', v: '-', cls: 'op' },
  { t: '1', v: '1' }, { t: '2', v: '2' }, { t: '3', v: '3' }, { t: '+', v: '+', cls: 'op' },
  { t: '0', v: '0' }, { t: '.', v: '.' }, { t: '%', v: '%', cls: 'fn' }, { t: '=', v: '=', cls: 'eq' },
]

function compute(a, b, o) {
  a = parseFloat(a); b = parseFloat(b)
  if (o === '+') return a + b
  if (o === '-') return a - b
  if (o === '*') return a * b
  if (o === '/') return b === 0 ? '错误' : a / b
  return b
}
function press(v) {
  if (v === 'C') { expr.value = ''; cur.value = '0'; op.value = null; prev.value = null; return }
  if (v === 'B') { cur.value = cur.value.length > 1 ? cur.value.slice(0, -1) : '0'; return }
  if (v === 'N') { cur.value = String(parseFloat(cur.value) * -1); return }
  if (v === '%') {
    const n = parseFloat(cur.value)
    if (!isNaN(n)) cur.value = String(n / 100)
    return
  }
  if (['+', '-', '*', '/'].includes(v)) {
    if (op.value !== null && prev.value !== null) {
      const r = compute(prev.value, cur.value, op.value)
      prev.value = String(r); cur.value = '0'; expr.value = prev.value + ' ' + v + ' '
    } else {
      prev.value = cur.value; expr.value = cur.value + ' ' + v + ' '
    }
    op.value = v
    return
  }
  if (v === '=') {
    if (op.value !== null && prev.value !== null) {
      const r = compute(prev.value, cur.value, op.value)
      expr.value = expr.value + cur.value + ' ='
      cur.value = String(r); op.value = null; prev.value = null
    }
    return
  }
  // 数字/小数点
  if (cur.value === '0' && v !== '.') cur.value = v
  else if (v === '.' && cur.value.includes('.')) return
  else cur.value += v
}
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 32rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 16rpx; }
.screen { background: #2c3e50; border-radius: 16rpx; padding: 24rpx; min-height: 160rpx; display: flex; flex-direction: column; justify-content: flex-end; align-items: flex-end; }
.expr { color: #95a5a6; font-size: 28rpx; }
.res { color: #fff; font-size: 64rpx; font-weight: 700; }
.keys { margin-top: 20rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 16rpx; }
.key { background: var(--c-card); border-radius: 16rpx; height: 110rpx; display: flex; align-items: center; justify-content: center; font-size: 44rpx; color: var(--c-title); }
.key.zero { grid-column: span 2; }
.key.op { background: #f3e2c0; color: #a07b3b; font-weight: 700; }
.key.eq { background: #e6a23c; color: #fff; font-weight: 700; }
.key.fn { background: var(--c-card2); color: var(--c-sub); }
</style>
