<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <view class="hd">
      <text class="title" :style="{ color: C.primary }">图片拼图</text>
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
      >{{ d.label }}</view>
      <view class="diff-i swap" :style="{ background: C.cell, color: C.sub, borderColor: C.border }" @click="nextPic">换图 🔄</view>
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
        <text class="bar-l" :style="{ color: C.sub }">图样</text>
        <text class="bar-v big-emoji" :style="{ color: C.text }">{{ curPic }}</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">原图</text>
        <text class="bar-v" :style="{ color: C.accent }" @click="showPreview = !showPreview">{{ showPreview ? '隐藏' : '显示' }}</text>
      </view>
    </view>

    <!-- 原图预览 -->
    <view v-if="showPreview" class="preview" :style="{ background: C.cell, borderColor: C.border }">
      <text class="preview-emoji">{{ curPic }}</text>
    </view>

    <!-- 拼图棋盘 -->
    <view
      class="board"
      :style="{ background: C.board, borderColor: C.border, width: 'min(630rpx, 92vw)', height: 'min(630rpx, 92vw)' }"
      @touchstart="ts"
      @touchend="te"
    >
      <view
        v-for="(p, i) in pieces"
        :key="p.id"
        class="cell"
        :class="{ blank: p.id === 0, done: finished }"
        :style="cellStyle(p)"
        @click="tap(i)"
      >
        <view v-if="p.id !== 0" class="slice">
          <text class="emoji" :style="emojiStyle(p)">{{ curPic }}</text>
        </view>
      </view>
    </view>

    <view class="row">
      <button class="btn" :style="{ background: C.primary }" @click="reset">重新开始</button>
    </view>
    <view class="tip" :style="{ color: C.sub }">点击相邻切片滑入空格 · 也可滑动 · 把图拼回原样</view>

    <view v-if="finished" class="mask">
      <view class="mask-c" :style="{ background: C.card }">
        <text class="mask-t" :style="{ color: C.text }">🎉 拼好啦！</text>
        <text class="mask-pic">{{ curPic }}</text>
        <text class="mask-s" :style="{ color: C.primary }">{{ steps }} 步 · {{ timeText }}</text>
        <text v-if="isNewRecord" class="mask-r" :style="{ color: C.danger }">★ 新纪录</text>
        <button class="btn" :style="{ background: C.primary }" @click="reset">再来一局</button>
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

const PICS = ['🍎', '🌸', '🐼', '🚗', '⭐', '🌈']
const diffs = [
  { n: 3, label: '3×3' },
  { n: 4, label: '4×4' },
  { n: 5, label: '5×5' },
]
const N = ref(4)
const picIdx = ref(0)
const curPic = computed(() => PICS[picIdx.value])

// 每块结构 {id, sr, sc, r, c}：sr,sc 是切片在原图中的位置；r,c 是当前在棋盘上的位置
const pieces = ref([])
const steps = ref(0)
const startTs = ref(0)
const elapsed = ref(0)
const finished = ref(false)
const showPreview = ref(true)
const best = ref(0)
const isNewRecord = ref(false)
let timer = null
let sx = 0, sy = 0

const timeText = computed(() => fmtTime(elapsed.value))

function setDiff(n) {
  if (N.value === n) return
  N.value = n
  reset()
}
function nextPic() {
  picIdx.value = (picIdx.value + 1) % PICS.length
  reset()
}

function readBest(n, picIdx) {
  try { return uni.getStorageSync(`game_best_picpuzzle_${n}_${picIdx}`) || 0 } catch (e) { return 0 }
}
function writeBest(n, picIdx, v) {
  try { uni.setStorageSync(`game_best_picpuzzle_${n}_${picIdx}`, v) } catch (e) {}
}

// 生成可解局面：从已解决态做随机有效滑动
function gen() {
  const n = N.value
  const arr = []
  for (let i = 1; i < n * n; i++) {
    const sr = Math.floor((i - 1) / n)
    const sc = (i - 1) % n
    arr.push({ id: i, sr, sc, r: sr, c: sc })
  }
  // 空格在右下
  arr.push({ id: 0, sr: n - 1, sc: n - 1, r: n - 1, c: n - 1 })
  let blank = arr[n * n - 1]
  const moves = n * n * 20
  let lastDir = -1
  for (let k = 0; k < moves; k++) {
    const dirs = []
    if (blank.r > 0) dirs.push(0)
    if (blank.r < n - 1) dirs.push(1)
    if (blank.c > 0) dirs.push(2)
    if (blank.c < n - 1) dirs.push(3)
    const opp = lastDir ^ 1
    const filtered = dirs.filter((d) => d !== opp)
    const d = filtered[Math.floor(Math.random() * filtered.length)]
    let tr = blank.r, tc = blank.c
    if (d === 0) tr--
    else if (d === 1) tr++
    else if (d === 2) tc--
    else tc++
    const target = arr.find((p) => p.r === tr && p.c === tc)
    target.r = blank.r; target.c = blank.c
    blank.r = tr; blank.c = tc
    lastDir = d
  }
  // 若回到已解决态，再多走一次有效移动
  if (isSolved(arr)) {
    const above = arr.find((p) => p.r === blank.r - 1 && p.c === blank.c)
    const left = arr.find((p) => p.r === blank.r && p.c === blank.c - 1)
    const t = above || left
    if (t) {
      const tr = t.r, tc = t.c
      t.r = blank.r; t.c = blank.c
      blank.r = tr; blank.c = tc
    }
  }
  pieces.value = arr
}

function isSolved(arr) {
  const n = N.value
  for (const p of arr) {
    if (p.id === 0) continue
    if (p.r !== p.sr || p.c !== p.sc) return false
  }
  return true
}

function cellStyle(p) {
  const n = N.value
  const size = `calc((min(630rpx, 92vw) - ${(n + 1) * 4}rpx) / ${n})`
  const gap = 4
  const left = `calc(4rpx + ${p.c} * (${size} + ${gap}rpx))`
  const top = `calc(4rpx + ${p.r} * (${size} + ${gap}rpx))`
  return {
    width: size,
    height: size,
    transform: `translate(${left}, ${top})`,
    background: p.id === 0 ? 'transparent' : C.value.card,
    borderColor: C.value.border,
  }
}

// 每片内部：emoji 渲染为 N 倍大小（覆盖整个棋盘），再用负偏移定位到该切片
function emojiStyle(p) {
  const n = N.value
  const size = `calc((min(630rpx, 92vw) - ${(n + 1) * 4}rpx) / ${n})`
  return {
    fontSize: `calc(${size} * ${n})`,
    transform: `translate(calc(-${p.sc} * ${size}), calc(-${p.sr} * ${size}))`,
  }
}

function tap(i) {
  if (finished.value) return
  const p = pieces.value[i]
  if (!p || p.id === 0) return
  const blank = pieces.value.find((x) => x.id === 0)
  if ((Math.abs(p.r - blank.r) + Math.abs(p.c - blank.c)) !== 1) return
  const tr = p.r, tc = p.c
  p.r = blank.r; p.c = blank.c
  blank.r = tr; blank.c = tc
  pieces.value = pieces.value.slice()
  steps.value++
  playSound('tap')
  vibrate('short')
  if (isSolved(pieces.value)) onFinish()
}

function move(dir) {
  if (finished.value) return
  const blank = pieces.value.find((x) => x.id === 0)
  let tr = blank.r, tc = blank.c
  if (dir === 0) tr--
  else if (dir === 1) tr++
  else if (dir === 2) tc--
  else tc++
  if (tr < 0 || tr >= N.value || tc < 0 || tc >= N.value) return
  const target = pieces.value.find((p) => p.r === tr && p.c === tc)
  if (!target) return
  target.r = blank.r; target.c = blank.c
  blank.r = tr; blank.c = tc
  pieces.value = pieces.value.slice()
  steps.value++
  playSound('tap')
  vibrate('short')
  if (isSolved(pieces.value)) onFinish()
}

function ts(e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function te(e) {
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 3 : 2)
  else move(dy > 0 ? 1 : 0)
}

function onFinish() {
  finished.value = true
  stopTimer()
  playSound('win')
  vibrate('long')
  const n = N.value
  const prev = readBest(n, picIdx.value)
  if (!prev || steps.value < prev) {
    writeBest(n, picIdx.value, steps.value)
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
  finished.value = false
  isNewRecord.value = false
  steps.value = 0
  best.value = readBest(N.value, picIdx.value)
  gen()
  startTimer()
}

onLoad(() => reset())
onUnload(() => { stopTimer(); destroySound() })
onHide(() => stopTimer())
onUnmounted(() => stopTimer())
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 40rpx; font-weight: 800; }
.best { font-size: 22rpx; color: #fff; padding: 6rpx 18rpx; border-radius: 20rpx; }

.diff { display: flex; gap: 10rpx; margin-bottom: 12rpx; flex-wrap: wrap; justify-content: center; }
.diff-i { padding: 8rpx 18rpx; border-radius: 30rpx; border: 2rpx solid; font-size: 24rpx; font-weight: 600; }
.diff-i.swap { font-size: 22rpx; }

.bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; padding: 14rpx 14rpx; border-radius: 14rpx; border: 2rpx solid; margin-bottom: 14rpx; }
.bar-i { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-l { font-size: 20rpx; }
.bar-v { font-size: 30rpx; font-weight: 800; margin-top: 4rpx; }
.big-emoji { font-size: 38rpx; }

.preview { width: 160rpx; height: 160rpx; border-radius: 14rpx; border: 2rpx solid; display: flex; align-items: center; justify-content: center; margin-bottom: 14rpx; }
.preview-emoji { font-size: 110rpx; line-height: 1; }

.board { position: relative; border-radius: 14rpx; border: 2rpx solid; padding: 0; }
.cell { position: absolute; top: 0; left: 0; border-radius: 8rpx; border: 2rpx solid; transition: transform 0.15s ease, background 0.3s; overflow: hidden; box-sizing: border-box; }
.cell.blank { background: transparent !important; border-color: transparent !important; }
.cell.done { border-color: #2ecc71; }
.slice { position: relative; overflow: hidden; }
.emoji { position: absolute; top: 0; left: 0; line-height: 1; }

.row { display: flex; gap: 16rpx; margin-top: 18rpx; }
.btn { color: #fff; border-radius: 40rpx; padding: 0 50rpx; font-size: 28rpx; line-height: 70rpx; }
.tip { font-size: 22rpx; margin-top: 12rpx; text-align: center; }

.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 10; }
.mask-c { width: 500rpx; padding: 40rpx; border-radius: 18rpx; display: flex; flex-direction: column; align-items: center; }
.mask-t { font-size: 36rpx; font-weight: 800; }
.mask-pic { font-size: 120rpx; margin: 12rpx 0; line-height: 1; }
.mask-s { font-size: 30rpx; }
.mask-r { font-size: 24rpx; margin-top: 8rpx; }
.mask-c .btn { margin-top: 22rpx; }
</style>
