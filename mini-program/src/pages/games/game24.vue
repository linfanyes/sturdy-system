<template>
  <view class="page">
    <view class="hd">24点</view>
    <view class="status">{{ status }}</view>
    <view class="vals">
      <view v-for="c in vals" :key="c.id" class="chip" :class="{ sel: sel === c.id }" @click="tapVal(c.id)">{{ c.v }}</view>
    </view>
    <view class="ops">
      <view v-for="o in ops" :key="o" class="op" :class="{ on: op === o }" @click="tapOp(o)">{{ o }}</view>
    </view>
    <view class="row">
      <button class="btn" @click="undo">撤销</button>
      <button class="btn" @click="showAns">看答案</button>
      <button class="btn" @click="reset">换一组</button>
    </view>
    <view v-if="ans" class="ans">一种解：{{ ans }}</view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'

const ops = ['+', '-', '×', '÷']
const vals = ref([])
const sel = ref(null)
const op = ref(null)
const status = ref('点数字 → 点运算符 → 点另一个数字合并，凑成 24')
const ans = ref('')
let uid = 0

function rnd() { return Math.floor(Math.random() * 13) + 1 }
function gen() {
  let a = [rnd(), rnd(), rnd(), rnd()]
  if (!solvable(a)) a = [rnd(), rnd(), rnd(), rnd()]
  vals.value = a.map((v) => ({ id: uid++, v }))
  sel.value = null; op.value = null; ans.value = ''
  status.value = '点数字 → 点运算符 → 点另一个数字合并，凑成 24'
}
function tapVal(id) {
  if (sel.value === null) { sel.value = id; return }
  if (op.value === null) { sel.value = id; return }
  // 计算
  const A = vals.value.find((x) => x.id === sel.value)
  const B = vals.value.find((x) => x.id === id)
  if (!A || !B || A.id === B.id) { sel.value = id; return }
  let r
  if (op.value === '+') r = A.v + B.v
  else if (op.value === '-') r = A.v - B.v
  else if (op.value === '×') r = A.v * B.v
  else { if (B.v === 0 || A.v % B.v !== 0) { status.value = '不能整除，换种算法'; return } r = A.v / B.v }
  const rest = vals.value.filter((x) => x.id !== A.id && x.id !== B.id)
  rest.push({ id: uid++, v: r })
  vals.value = rest
  sel.value = null; op.value = null
  if (vals.value.length === 1) {
    if (vals.value[0].v === 24) status.value = '🎉 算出 24！'
    else status.value = '结果是 ' + vals.value[0].v + '，没凑成，换一组吧'
  }
}
function tapOp(o) { if (sel.value !== null) op.value = o }
function undo() { gen() }
function solvable(a) {
  const f = (arr) => {
    if (arr.length === 1) return Math.abs(arr[0] - 24) < 1e-6
    for (let i = 0; i < arr.length; i++) for (let j = 0; j < arr.length; j++) {
      if (i === j) continue
      const rest = arr.filter((_, k) => k !== i && k !== j)
      const x = arr[i], y = arr[j]
      if (f([...rest, x + y])) return true
      if (f([...rest, x - y])) return true
      if (f([...rest, x * y])) return true
      if (y !== 0 && x % y === 0 && f([...rest, x / y])) return true
    }
    return false
  }
  return f(a)
}
function showAns() {
  const a = vals.value.map((x) => x.v)
  const s = solveExpr(a)
  ans.value = s || '当前局面无解，换一组'
}
function solveExpr(a) {
  const f = (arr, expr) => {
    if (arr.length === 1) return Math.abs(arr[0] - 24) < 1e-6 ? expr[0] : null
    for (let i = 0; i < arr.length; i++) for (let j = 0; j < arr.length; j++) {
      if (i === j) continue
      const rest = arr.filter((_, k) => k !== i && k !== j)
      const re = expr.filter((_, k) => k !== i && k !== j)
      const x = arr[i], y = arr[j], xe = expr[i], ye = expr[j]
      const cases = [['+', x + y, '(' + xe + '+' + ye + ')'], ['-', x - y, '(' + xe + '-' + ye + ')'], ['×', x * y, '(' + xe + '×' + ye + ')']]
      if (y !== 0 && x % y === 0) cases.push(['÷', x / y, '(' + xe + '÷' + ye + ')'])
      for (const [, v, e] of cases) {
        const r = f([...rest, v], [...re, e])
        if (r) return r
      }
    }
    return null
  }
  return f(a, a.map(String))
}
function reset() { gen() }
onLoad(() => gen())
</script>

<style scoped>
.page { padding: 30rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 24rpx; color: #4a3f35; margin: 12rpx 0; text-align: center; }
.vals { display: flex; gap: 18rpx; margin: 16rpx 0; }
.chip { width: 110rpx; height: 110rpx; background: #e6a23c; color: #fff; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 700; }
.chip.sel { outline: 6rpx solid #a07b3b; }
.ops { display: flex; gap: 20rpx; margin: 10rpx 0; }
.op { width: 90rpx; height: 90rpx; background: #f3e2c0; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 44rpx; }
.op.on { background: #a07b3b; color: #fff; }
.row { display: flex; gap: 16rpx; margin-top: 16rpx; }
.btn { background: #a07b3b; color: #fff; border-radius: 40rpx; padding: 0 30rpx; font-size: 24rpx; }
.ans { margin-top: 16rpx; color: #2c7d3f; font-size: 26rpx; }
</style>
