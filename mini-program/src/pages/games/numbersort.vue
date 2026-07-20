<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <view class="hd">
      <text class="title" :style="{ color: C.primary }">数字排序</text>
      <text class="best" :style="{ background: C.primary }">最佳 {{ best }}步</text>
    </view>

    <!-- 难度档 -->
    <view class="diff">
      <view
        v-for="d in diffs"
        :key="d.n"
        class="diff-i"
        :style="{ background: N === d.n ? C.primary : C.cell, color: N === d.n ? '#fff' : C.sub, borderColor: N === d.n ? C.primary : C.border }"
        @click="setDiff(d.n)"
      >{{ d.label }}格</view>
    </view>

    <!-- 顶部状态条 -->
    <view class="bar" :style="{ background: C.board, borderColor: C.border }">
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">步数</text>
        <text class="bar-v" :style="{ color: C.text }">{{ steps }}</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">计时</text>
        <text class="bar-v" :style="{ color: C.info }">{{ timeText }}</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">最少步</text>
        <text class="bar-v" :style="{ color: C.accent }">{{ best }}</text>
      </view>
    </view>

    <!-- 数字格子 -->
    <view
      class="board"
      :style="{ width: 'min(630rpx, 92vw)', gridTemplateColumns: `repeat(${cols}, 1fr)` }"
      @touchstart="ts"
      @touchend="te"
    >
      <view
        v-for="(n, i) in arr"
        :key="i"
        class="cell"
        :class="{ sel: sel === i, highlight: finishAnimIdx === i, done: finished }"
        :style="{
          background: finishAnimIdx === i ? C.accent : (sel === i ? C.primary : cellSorted(i) ? C.accent : C.cell),
          color: sel === i || cellSorted(i) || finishAnimIdx === i ? '#fff' : C.text,
          transform: sel === i ? 'scale(1.1)' : 'scale(1)',
          boxShadow: sel === i ? '0 6rpx 16rpx rgba(0,0,0,.3)' : 'none',
          borderColor: C.border
        }"
        @click="tap(i)"
      >{{ n }}</view>
    </view>

    <view class="row">
      <button class="btn" :style="{ background: C.primary }" @click="reset">换一题</button>
    </view>
    <view class="tip" :style="{ color: C.sub }">点两个相邻数字交换 · 也可左右滑动选格 · 排成升序</view>

    <view v-if="finished" class="mask">
      <view class="mask-c" :style="{ background: C.card }">
        <text class="mask-t" :style="{ color: C.text }">🎉 排序完成！</text>
        <text class="mask-s" :style="{ color: C.primary }">{{ steps }} 步 · {{ timeText }}</text>
        <text v-if="isNewRecord" class="mask-r" :style="{ color: C.danger }">★ 新纪录</text>
        <button class="btn" :style="{ background: C.primary }" @click="reset">再来一题</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { vibrate, playSound, destroySound, pickColors, fmtTime } from '../../common/game'

const C = computed(() => pickColors(theme.mode === 'dark'))

const diffs = [
  { n: 4, label: '4' },
  { n: 9, label: '9' },
  { n: 16, label: '16' },
]
const N = ref(9)

const arr = ref([])
const sel = ref(-1)
const steps = ref(0)
const startTs = ref(0)
const elapsed = ref(0)
const finished = ref(false)
const best = ref(0)
const isNewRecord = ref(false)
const finishAnimIdx = ref(-1)   // 完成动画当前高亮位置
let timer = null
let sx = 0, sy = 0
let animTimer = null

const timeText = computed(() => fmtTime(elapsed.value))
const cols = computed(() => N.value === 4 ? 2 : N.value === 9 ? 3 : 4)

function setDiff(n) {
  if (N.value === n) return
  N.value = n
  reset()
}

function readBest(n) {
  try { return uni.getStorageSync('game_best_numbersort_' + n) || 0 } catch (e) { return 0 }
}
function writeBest(n, v) {
  try { uni.setStorageSync('game_best_numbersort_' + n, v) } catch (e) {}
}

function gen() {
  const n = N.value
  const a = []
  for (let i = 1; i <= n; i++) a.push(i)
  // 充分打乱
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  if (isSorted(a)) {
    // 极少概率已排序，强制交换前两个
    ;[a[0], a[1]] = [a[1], a[0]]
  }
  arr.value = a
}

function isSorted(a) {
  for (let i = 0; i < a.length; i++) if (a[i] !== i + 1) return false
  return true
}

// 当前格是否处于已排好位置（用于显示绿色）
function cellSorted(i) {
  return arr.value[i] === i + 1
}

function tap(i) {
  if (finished.value) return
  if (sel.value === -1) {
    sel.value = i
    playSound('tap')
    vibrate('short')
    return
  }
  if (sel.value === i) { sel.value = -1; return }
  // 只允许相邻交换
  if (Math.abs(sel.value - i) !== 1) {
    sel.value = i
    playSound('tap')
    vibrate('short')
    return
  }
  const a = arr.value.slice()
  ;[a[sel.value], a[i]] = [a[i], a[sel.value]]
  arr.value = a
  steps.value++
  playSound('tap')
  vibrate('short')
  sel.value = -1
  if (isSorted(a)) onFinish()
}

// 滑动选格：左滑选上一个，右滑选下一个
function ts(e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function te(e) {
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) < 24 || Math.abs(dy) > Math.abs(dx)) return
  if (sel.value === -1) {
    // 没选中时，滑动选中第一个或最后一个
    sel.value = dx < 0 ? 0 : N.value - 1
  } else {
    if (dx < 0) sel.value = Math.max(0, sel.value - 1)
    else sel.value = Math.min(N.value - 1, sel.value + 1)
  }
  playSound('tap')
  vibrate('short')
}

function onFinish() {
  finished.value = true
  stopTimer()
  playSound('win')
  vibrate('long')
  // 完成动画：数字依次绿色高亮
  let k = 0
  animTimer = setInterval(() => {
    finishAnimIdx.value = k
    k++
    if (k >= N.value) {
      clearInterval(animTimer)
      animTimer = null
      finishAnimIdx.value = -1
    }
  }, 80)
  // 提交最少步数
  const n = N.value
  const prev = readBest(n)
  if (!prev || steps.value < prev) {
    writeBest(n, steps.value)
    best.value = steps.value
    isNewRecord.value = true
  } else {
    isNewRecord.value = false
  }
}

function startTimer() {
  stopTimer()
  startTs.value = Date.now()
  elapsed.value = 0
  timer = setInterval(() => { elapsed.value = Date.now() - startTs.value }, 500)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

function reset() {
  if (animTimer) { clearInterval(animTimer); animTimer = null }
  finished.value = false
  isNewRecord.value = false
  finishAnimIdx.value = -1
  steps.value = 0
  sel.value = -1
  best.value = readBest(N.value)
  gen()
  startTimer()
}

onLoad(() => reset())
onUnload(() => { stopTimer(); if (animTimer) clearInterval(animTimer); destroySound() })
onHide(() => stopTimer())
onUnmounted(() => stopTimer())
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 40rpx; font-weight: 800; }
.best { font-size: 22rpx; color: #fff; padding: 6rpx 18rpx; border-radius: 20rpx; }

.diff { display: flex; gap: 12rpx; margin-bottom: 12rpx; }
.diff-i { padding: 8rpx 22rpx; border-radius: 30rpx; border: 2rpx solid; font-size: 24rpx; font-weight: 600; }

.bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; padding: 14rpx 18rpx; border-radius: 14rpx; border: 2rpx solid; margin-bottom: 18rpx; }
.bar-i { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-l { font-size: 20rpx; }
.bar-v { font-size: 32rpx; font-weight: 800; margin-top: 4rpx; }

.board { display: grid; gap: 14rpx; }
.cell { height: 130rpx; border-radius: 14rpx; border: 2rpx solid; display: flex; align-items: center; justify-content: center; font-size: 48rpx; font-weight: 700; transition: transform 0.15s, background 0.25s, box-shadow 0.18s; }
.cell.highlight { animation: pulse 0.3s; }
.cell.done { animation: pulse 0.3s; }
@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.08); } 100% { transform: scale(1); } }

.row { display: flex; gap: 16rpx; margin-top: 20rpx; }
.btn { color: #fff; border-radius: 40rpx; padding: 0 50rpx; font-size: 28rpx; line-height: 70rpx; }
.tip { font-size: 22rpx; margin-top: 12rpx; text-align: center; }

.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 10; }
.mask-c { width: 480rpx; padding: 40rpx; border-radius: 18rpx; display: flex; flex-direction: column; align-items: center; }
.mask-t { font-size: 36rpx; font-weight: 800; }
.mask-s { font-size: 30rpx; margin-top: 12rpx; }
.mask-r { font-size: 24rpx; margin-top: 8rpx; }
.mask-c .btn { margin-top: 22rpx; }
</style>
