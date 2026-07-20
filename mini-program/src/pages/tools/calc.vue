<template>
  <view class="page" :class="{ dark }">
    <view class="hd">课堂计算器</view>
    <view class="screen">
      <view class="expr">{{ expr || '0' }}</view>
      <view class="res">{{ display }}</view>
    </view>
    <view class="keys">
      <view v-for="k in keys" :key="k.t" class="key" :class="k.cls" @click="press(k.v)">{{ k.t }}</view>
    </view>

    <!-- 历史记录 -->
    <view class="hist">
      <view class="hist-hd">
        <text class="hist-t">📜 历史（{{ history.length }}）</text>
        <text v-if="history.length" class="hist-clr" @click="clearHistory">清空</text>
      </view>
      <scroll-view scroll-y class="hist-list">
        <view v-for="(h, i) in history" :key="i" class="hist-item" @click="reuse(h)">
          <text class="hist-expr">{{ h.expr }}</text>
          <text class="hist-res">= {{ h.res }}</text>
        </view>
        <view v-if="!history.length" class="hist-empty">暂无历史，按 = 后自动保存</view>
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { theme, auth } from '../../common/store'

const dark = computed(() => theme.mode === 'dark')
const uid = computed(() => (auth.user && auth.user.id) || 'anon')
const HK = () => 'calc_hist_' + uid.value
const MAX_HIST = 20

const expr = ref('')
const cur = ref('0')
const op = ref(null)
const prev = ref(null)
const display = computed(() => cur.value)
const history = ref([])

function loadHistory() {
  try {
    const raw = uni.getStorageSync(HK())
    history.value = raw ? JSON.parse(raw) : []
  } catch (e) {
    history.value = []
  }
}
function saveHistory() {
  uni.setStorageSync(HK(), JSON.stringify(history.value.slice(0, MAX_HIST)))
}
loadHistory()

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

function opSym(o) {
  return { '+': '+', '-': '−', '*': '×', '/': '÷' }[o] || o
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
      prev.value = String(r); cur.value = '0'; expr.value = prev.value + ' ' + opSym(v) + ' '
    } else {
      prev.value = cur.value; expr.value = cur.value + ' ' + opSym(v) + ' '
    }
    op.value = v
    return
  }
  if (v === '=') {
    if (op.value !== null && prev.value !== null) {
      const r = compute(prev.value, cur.value, op.value)
      const fullExpr = expr.value + cur.value
      // 加入历史
      if (r !== '错误' && fullExpr.trim()) {
        history.value.unshift({ expr: fullExpr.trim(), res: String(r) })
        if (history.value.length > MAX_HIST) history.value = history.value.slice(0, MAX_HIST)
        saveHistory()
      }
      expr.value = fullExpr + ' ='
      cur.value = String(r); op.value = null; prev.value = null
    }
    return
  }
  // 数字/小数点
  if (cur.value === '0' && v !== '.') cur.value = v
  else if (v === '.' && cur.value.includes('.')) return
  else cur.value += v
}

function reuse(h) {
  // 复用历史表达式：把结果填入当前输入
  cur.value = h.res
  expr.value = ''
  op.value = null
  prev.value = null
  uni.showToast({ title: '已载入结果', icon: 'none' })
}

function clearHistory() {
  uni.showModal({
    title: '清空历史',
    content: '确定清空所有计算历史？',
    success: (r) => {
      if (r.confirm) {
        history.value = []
        saveHistory()
        uni.showToast({ title: '已清空', icon: 'none' })
      }
    },
  })
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

/* 历史记录 */
.hist { margin-top: 24rpx; background: var(--c-card); border-radius: 16rpx; padding: 20rpx; }
.hist-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12rpx; }
.hist-t { font-size: 26rpx; font-weight: 700; color: var(--c-title); }
.hist-clr { font-size: 22rpx; color: var(--c-danger); }
.hist-list { max-height: 360rpx; }
.hist-item { padding: 14rpx 0; border-bottom: 1rpx solid var(--c-border); display: flex; justify-content: space-between; align-items: center; gap: 12rpx; }
.hist-item:active { opacity: 0.6; }
.hist-expr { flex: 1; font-size: 24rpx; color: var(--c-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hist-res { font-size: 28rpx; font-weight: 700; color: var(--c-accent); }
.hist-empty { padding: 30rpx 0; text-align: center; color: var(--c-sub); font-size: 22rpx; }
</style>
