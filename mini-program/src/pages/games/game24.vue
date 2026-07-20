<template>
  <view class="page" :style="{ background: c.bg, color: c.text }">
    <!-- 顶部状态条 -->
    <view class="top-bar">
      <view class="title">24 点</view>
      <view class="stats">
        <view class="stat">
          <text class="label">计时</text>
          <text class="val">{{ fmtTime(elapsed) }}</text>
        </view>
        <view class="stat">
          <text class="label">连胜</text>
          <text class="val" :style="{ color: streak >= 3 ? c.accent : c.text }">{{ streak }}</text>
        </view>
        <view class="stat">
          <text class="label">最高</text>
          <text class="val">{{ best }}</text>
        </view>
      </view>
    </view>

    <!-- 难度切换 -->
    <view class="diff-row">
      <view
        v-for="d in diffs"
        :key="d.key"
        class="diff"
        :style="diff === d.key ? { background: c.primary, color: '#fff' } : { background: c.cell, color: c.sub }"
        @click="changeDiff(d.key)"
      >{{ d.label }}</view>
    </view>

    <!-- 状态文本 -->
    <view class="status" :style="{ color: c.sub }">{{ status }}</view>

    <!-- 数字卡片 -->
    <view class="vals">
      <view
        v-for="card in vals"
        :key="card.id"
        class="chip"
        :class="{ sel: sel === card.id, used: card.used }"
        :style="cardStyle(card)"
        @click="tapVal(card.id)"
      >{{ card.v }}</view>
    </view>

    <!-- 运算符 -->
    <view class="ops">
      <view
        v-for="o in ops"
        :key="o"
        class="op"
        :class="{ on: op === o }"
        :style="op === o ? { background: c.primary, color: '#fff' } : { background: c.cell, color: c.text }"
        @click="tapOp(o)"
      >{{ o }}</view>
    </view>

    <!-- 操作 -->
    <view class="btn-row">
      <button class="btn" :style="{ background: c.info, color: '#fff' }" @click="undo">撤销</button>
      <button class="btn" :style="{ background: c.purple, color: '#fff' }" @click="showAns">看答案</button>
      <button class="btn" :style="{ background: c.primary, color: '#fff' }" @click="reset">换一组</button>
    </view>

    <view v-if="ans" class="ans" :style="{ color: c.accent }">一种解：{{ ans }}</view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { pickColors, vibrate, playSound, destroySound, fmtTime, useGame } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const c = computed(() => pickColors(dark.value))
const { best, submitScore } = useGame('game24')

const diffs = [
  { key: 'easy', label: '1-10 简单', max: 10, power: false },
  { key: 'std', label: '1-13 标准', max: 13, power: false },
  { key: 'master', label: '大师 含乘方', max: 13, power: true },
]
const diff = ref('std')

const ops = ['+', '-', '×', '÷']
const vals = ref([]) // [{id, v, expr, used}]
const sel = ref(null)
const op = ref(null)
const status = ref('点数字 → 点运算符 → 点另一个数字')
const ans = ref('')
const elapsed = ref(0)
const streak = ref(0)
let uid = 0
let startedAt = 0
let timer = null

/** 启动计时 */
function startTimer() {
  stopTimer()
  startedAt = Date.now() - elapsed.value
  timer = setInterval(() => { elapsed.value = Date.now() - startedAt }, 500)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

/** 卡片选中样式 */
function cardStyle(card) {
  const isSel = sel.value === card.id
  return {
    background: card.used ? c.value.cellAlt : (isSel ? c.value.primary : c.value.card),
    color: isSel ? '#fff' : c.value.text,
    transform: isSel ? 'scale(1.05)' : 'scale(1)',
    boxShadow: isSel ? '0 6rpx 18rpx rgba(0,0,0,0.2)' : 'none',
  }
}

/** 生成一组新数字（保证有解） */
function gen() {
  const cfg = diffs.find((d) => d.key === diff.value)
  let a
  for (let tries = 0; tries < 60; tries++) {
    a = [randN(cfg.max), randN(cfg.max), randN(cfg.max), randN(cfg.max)]
    if (solvable(a, cfg.power)) break
  }
  vals.value = a.map((v) => ({ id: uid++, v, expr: String(v), used: false }))
  sel.value = null
  op.value = null
  ans.value = ''
  status.value = '点数字 → 点运算符 → 点另一个数字'
  elapsed.value = 0
  startTimer()
}
function randN(max) { return Math.floor(Math.random() * max) + 1 }

/** 点击数字 */
function tapVal(id) {
  const card = vals.value.find((x) => x.id === id)
  if (!card || card.used) return
  playSound('tap')

  if (sel.value === null) {
    sel.value = id
    return
  }
  if (op.value === null) {
    // 切换选中
    sel.value = id
    return
  }
  if (sel.value === id) {
    sel.value = null
    op.value = null
    return
  }
  // 计算
  const A = vals.value.find((x) => x.id === sel.value)
  const B = vals.value.find((x) => x.id === id)
  if (!A || !B) return

  let r, expr
  const sym = op.value
  if (sym === '+') { r = A.v + B.v; expr = `(${A.expr}+${B.expr})` }
  else if (sym === '-') { r = A.v - B.v; expr = `(${A.expr}-${B.expr})` }
  else if (sym === '×') { r = A.v * B.v; expr = `(${A.expr}×${B.expr})` }
  else {
    if (B.v === 0 || A.v % B.v !== 0) {
      status.value = '不能整除，换种算法'
      playSound('fail')
      vibrate('short')
      return
    }
    r = A.v / B.v
    expr = `(${A.expr}÷${B.expr})`
  }

  // 通过校验，保存历史用于 undo
  pushHistory()

  A.used = true
  B.used = true
  vals.value.push({ id: uid++, v: r, expr, used: false })
  sel.value = null
  op.value = null
  playSound('hit')
  vibrate('short')

  // 检查结束
  const alive = vals.value.filter((x) => !x.used)
  if (alive.length === 1) {
    stopTimer()
    if (alive[0].v === 24) {
      status.value = `🎉 算出 24！耗时 ${fmtTime(elapsed.value)}`
      streak.value++
      if (streak.value >= 3) {
        playSound('win')
        vibrate('long')
      } else {
        playSound('win')
        vibrate('short')
      }
      submitScore(streak.value)
    } else {
      status.value = `结果是 ${alive[0].v}，没凑成 24，换一组吧`
      streak.value = 0
      playSound('fail')
      vibrate('long')
    }
  }
}

/** 点击运算符 */
function tapOp(o) {
  if (sel.value === null) {
    status.value = '先选一个数字'
    return
  }
  op.value = o
  playSound('tap')
}

/** undo 历史栈 */
const history = ref([])
function pushHistory() {
  history.value.push(vals.value.map((x) => ({ ...x })))
  if (history.value.length > 20) history.value.shift()
}
function popHistory() {
  if (history.value.length) {
    vals.value = history.value.pop()
    sel.value = null
    op.value = null
  }
}
function undo() {
  if (!history.value.length) return
  popHistory()
  playSound('tap')
}

/** 是否可解 */
function solvable(a, power) {
  const f = (arr, exprs) => {
    if (arr.length === 1) return Math.abs(arr[0] - 24) < 1e-6
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue
        const rest = arr.filter((_, k) => k !== i && k !== j)
        const x = arr[i], y = arr[j]
        if (f([...rest, x + y])) return true
        if (f([...rest, x - y])) return true
        if (f([...rest, y - x])) return true
        if (f([...rest, x * y])) return true
        if (y !== 0 && x % y === 0 && f([...rest, x / y])) return true
        if (x !== 0 && y % x === 0 && f([...rest, y / x])) return true
        if (power && f([...rest, Math.pow(x, y)])) return true
      }
    }
    return false
  }
  return f(a, a.map(String))
}

/** 看答案：穷举求解返回完整算式 */
function showAns() {
  const cfg = diffs.find((d) => d.key === diff.value)
  const alive = vals.value.filter((x) => !x.used)
  const a = alive.map((x) => x.v)
  const s = solveExpr(a, cfg.power)
  ans.value = s || '当前局面无解，换一组吧'
  playSound('tap')
}
function solveExpr(a, power) {
  const f = (arr, exprs) => {
    if (arr.length === 1) return Math.abs(arr[0] - 24) < 1e-6 ? exprs[0] : null
    for (let i = 0; i < arr.length; i++) {
      for (let j = 0; j < arr.length; j++) {
        if (i === j) continue
        const rest = arr.filter((_, k) => k !== i && k !== j)
        const re = exprs.filter((_, k) => k !== i && k !== j)
        const x = arr[i], y = arr[j], xe = exprs[i], ye = exprs[j]
        const cases = [
          [x + y, `(${xe}+${ye})`],
          [x - y, `(${xe}-${ye})`],
          [y - x, `(${ye}-${xe})`],
          [x * y, `(${xe}×${ye})`],
        ]
        if (y !== 0 && x % y === 0) cases.push([x / y, `(${xe}÷${ye})`])
        if (x !== 0 && y % x === 0) cases.push([y / x, `(${ye}÷${xe})`])
        if (power) cases.push([Math.pow(x, y), `(${xe}^${ye})`])
        for (const [v, e] of cases) {
          const r = f([...rest, v], [...re, e])
          if (r) return r
        }
      }
    }
    return null
  }
  return f(a, a.map(String))
}

function changeDiff(k) {
  if (k === diff.value) return
  diff.value = k
  streak.value = 0
  reset()
}
function reset() {
  history.value = []
  streak.value = streak.value // 不重置连胜（同难度连续做对累计）
  gen()
}

onLoad(() => gen())
onUnload(() => { stopTimer(); destroySound() })
onUnmounted(() => stopTimer())
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; display: flex; flex-direction: column; align-items: center; }
.top-bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 40rpx; font-weight: 800; }
.stats { display: flex; gap: 12rpx; }
.stat { padding: 6rpx 14rpx; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; background: rgba(230, 162, 60, 0.12); min-width: 90rpx; }
.label { font-size: 20rpx; opacity: 0.7; }
.val { font-size: 26rpx; font-weight: 700; }
.diff-row { display: flex; gap: 12rpx; margin: 12rpx 0; flex-wrap: wrap; justify-content: center; }
.diff { padding: 8rpx 22rpx; border-radius: 26rpx; font-size: 22rpx; }
.status { font-size: 24rpx; text-align: center; margin: 8rpx 0 16rpx; }
.vals { display: flex; gap: 18rpx; margin: 12rpx 0; flex-wrap: wrap; justify-content: center; }
.chip { width: 120rpx; height: 120rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; font-size: 48rpx; font-weight: 700; transition: transform 0.15s ease, box-shadow 0.15s ease; }
.chip.used { opacity: 0.3; transform: scale(0.85) !important; box-shadow: none !important; }
.ops { display: flex; gap: 20rpx; margin: 14rpx 0; }
.op { width: 90rpx; height: 90rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 700; }
.btn-row { display: flex; gap: 14rpx; margin-top: 18rpx; flex-wrap: wrap; justify-content: center; }
.btn { border-radius: 40rpx; padding: 0 30rpx; font-size: 24rpx; line-height: 70rpx; }
.ans { margin-top: 16rpx; font-size: 28rpx; font-weight: 600; text-align: center; padding: 0 20rpx; }
</style>
