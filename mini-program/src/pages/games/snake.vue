<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <!-- 顶部状态条 -->
    <view class="topbar">
      <view class="stat"><text class="lbl">分数</text><text class="val">{{ score }}</text></view>
      <view class="stat"><text class="lbl">最高</text><text class="val best">{{ best }}</text></view>
      <view class="stat"><text class="lbl">长度</text><text class="val">{{ snake.length }}</text></view>
    </view>

    <!-- 速度档 -->
    <view class="speed-bar">
      <text class="speed-lbl">速度</text>
      <view
        v-for="s in speeds"
        :key="s.key"
        class="speed-item"
        :class="{ on: speedKey === s.key }"
        @click="setSpeed(s.key)"
      >{{ s.label }}</view>
    </view>

    <!-- 棋盘 + 滑动手势 -->
    <view
      class="board"
      :style="{ background: C.board, borderColor: C.border }"
      @touchstart="ts"
      @touchend="te"
      @touchmove="tm"
    >
      <view
        v-for="(c, i) in cells"
        :key="i"
        class="cell"
        :class="c.type"
        :style="cellStyle(c)"
      >
        <text v-if="c.type === 'food'" class="food-emoji">🍎</text>
      </view>

      <!-- 暂停遮罩 -->
      <view v-if="paused && !over" class="mask" @click="togglePause">
        <text class="pause-ico">⏸</text>
        <text class="pause-tip">点击继续</text>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="ctrl">
      <button class="btn pause" @click="togglePause">{{ paused ? '继续' : '暂停' }}</button>
      <button class="btn restart" @click="start">重新开始</button>
    </view>
    <text class="hint">滑动屏幕控制方向</text>

    <!-- 死亡画面 -->
    <view v-if="over" class="over-mask">
      <view class="over-card" :style="{ background: C.card }">
        <text class="over-title">游戏结束</text>
        <view class="over-row"><text>本局得分</text><text class="num">{{ score }}</text></view>
        <view class="over-row"><text>最高分</text><text class="num best">{{ best }}</text></view>
        <view v-if="isNewRecord" class="new-record">🏆 新纪录！</view>
        <button class="btn restart" @click="start">再来一局</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { theme } from '../../common/store'
import { onLoad, onUnload, onHide, onShow } from '@dcloudio/uni-app'
import {
  vibrate, playSound, destroySound, pickColors, useGame,
} from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const C = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('snake')

// 棋盘配置
const N = 15
const speeds = [
  { key: 'slow', label: '慢', base: 280 },
  { key: 'mid', label: '中', base: 200 },
  { key: 'fast', label: '快', base: 130 },
]
const speedKey = ref('mid')
const MIN_INTERVAL = 80

// 状态
const snake = ref([])
const dir = ref({ r: 0, c: 1 })
const nextDir = ref({ r: 0, c: 1 })
const food = ref({ r: 2, c: 2 })
const score = ref(0)
const over = ref(false)
const paused = ref(false)
let timer = null
let ate = 0 // 累计吃到的食物数（用于难度递增）

// 触摸
let sx = 0, sy = 0, lastDir = ''

// 当前实际帧间隔（受难度影响）
const interval = computed(() => {
  const base = speeds.find((s) => s.key === speedKey.value).base
  // 每吃 5 个食物 -10ms，下限 MIN_INTERVAL
  const reduce = Math.floor(ate / 5) * 10
  return Math.max(MIN_INTERVAL, base - reduce)
})

// 渲染单元
const cells = computed(() => {
  const arr = Array(N * N).fill(0).map(() => ({ type: '' }))
  snake.value.forEach((s, i) => {
    arr[s.r * N + s.c] = { type: i === 0 ? 'head' : 'body', idx: i }
  })
  arr[food.value.r * N + food.c] = { type: 'food' }
  return arr
})

function cellStyle(c) {
  if (c.type === 'head') {
    // 蛇头：深色渐变
    return { background: `linear-gradient(135deg, ${C.value.snakeHead}, ${C.value.primary})` }
  }
  if (c.type === 'body') {
    // 蛇身：浅色渐变
    const ratio = c.idx / Math.max(snake.value.length, 1)
    return { background: `linear-gradient(135deg, ${C.value.snake}, ${C.value.accent})`, opacity: 0.55 + 0.45 * (1 - ratio) }
  }
  return {}
}

function placeFood() {
  let p
  do {
    p = { r: Math.floor(Math.random() * N), c: Math.floor(Math.random() * N) }
  } while (snake.value.some((s) => s.r === p.r && s.c === p.c))
  food.value = p
}

function step() {
  if (over.value || paused.value) return
  // 应用待生效方向（避免 180 度反向）
  dir.value = nextDir.value
  const head = snake.value[0]
  const nr = head.r + dir.value.r
  const nc = head.c + dir.value.c
  if (nr < 0 || nr >= N || nc < 0 || nc >= N ||
      snake.value.some((s) => s.r === nr && s.c === nc)) {
    gameOver()
    return
  }
  const ns = [{ r: nr, c: nc }, ...snake.value]
  if (nr === food.value.r && nc === food.value.c) {
    score.value++
    ate++
    playSound('hit')
    vibrate('short')
    placeFood()
    // 难度递增：每 5 个食物提示
    if (ate % 5 === 0) {
      playSound('win')
    }
    // 重置定时器（速度变化）
    scheduleNext()
  } else {
    ns.pop()
  }
  snake.value = ns
}

function scheduleNext() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    step()
    scheduleNext()
  }, interval.value)
}

function gameOver() {
  over.value = true
  paused.value = false
  if (timer) clearTimeout(timer)
  timer = null
  vibrate('long')
  playSound('fail')
  submitScore(score.value)
}

function setDir(r, c) {
  // 禁止反向
  if (dir.value.r === -r && dir.value.c === -c) return
  nextDir.value = { r, c }
}

// 滑动手势
function ts(e) {
  const t = e.touches[0]
  sx = t.clientX
  sy = t.clientY
  lastDir = ''
}
function tm(e) {
  // 滑动过程中即时响应，避免单次滑动只换一次方向
  const t = e.touches[0]
  const dx = t.clientX - sx
  const dy = t.clientY - sy
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
  let d = ''
  if (Math.abs(dx) > Math.abs(dy)) d = dx > 0 ? 'R' : 'L'
  else d = dy > 0 ? 'D' : 'U'
  if (d === lastDir) return
  lastDir = d
  if (d === 'L') setDir(0, -1)
  else if (d === 'R') setDir(0, 1)
  else if (d === 'U') setDir(-1, 0)
  else if (d === 'D') setDir(1, 0)
  // 重置起点，便于连续转向
  sx = t.clientX
  sy = t.clientY
}
function te() {
  lastDir = ''
}

function setSpeed(k) {
  if (over.value) return
  speedKey.value = k
  playSound('tap')
}

function togglePause() {
  if (over.value) return
  paused.value = !paused.value
  playSound('tap')
  if (!paused.value) scheduleNext()
  else if (timer) { clearTimeout(timer); timer = null }
}

function start() {
  if (timer) clearTimeout(timer)
  snake.value = [{ r: 7, c: 7 }, { r: 7, c: 6 }, { r: 7, c: 5 }]
  dir.value = { r: 0, c: 1 }
  nextDir.value = { r: 0, c: 1 }
  score.value = 0
  ate = 0
  over.value = false
  paused.value = false
  isNewRecord.value = false
  placeFood()
  scheduleNext()
}

onLoad(() => start())
onShow(() => {
  // 自动恢复时若曾暂停则保持暂停
  if (!over.value && !paused.value && !timer && snake.value.length) {
    scheduleNext()
  }
})
onHide(() => {
  // 自动暂停
  if (!over.value && !paused.value) paused.value = true
  if (timer) { clearTimeout(timer); timer = null }
})
onUnload(() => {
  if (timer) clearTimeout(timer)
  timer = null
  destroySound()
})
onUnmounted(() => {
  if (timer) clearTimeout(timer)
  timer = null
})
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }

.topbar { width: min(630rpx, 92vw); display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.stat { flex: 1; background: rgba(0,0,0,.04); border-radius: 14rpx; padding: 14rpx 0; display: flex; flex-direction: column; align-items: center; }
.stat .lbl { font-size: 22rpx; opacity: .6; }
.stat .val { font-size: 36rpx; font-weight: 700; margin-top: 4rpx; }
.stat .val.best { color: #e6a23c; }

.speed-bar { width: min(630rpx, 92vw); display: flex; align-items: center; gap: 12rpx; margin-bottom: 16rpx; }
.speed-lbl { font-size: 24rpx; opacity: .7; margin-right: 8rpx; }
.speed-item { flex: 1; text-align: center; padding: 10rpx 0; border-radius: 12rpx; font-size: 26rpx; background: rgba(0,0,0,.05); }
.speed-item.on { background: #e6a23c; color: #fff; font-weight: 700; }

.board {
  position: relative;
  width: min(630rpx, 92vw);
  height: min(630rpx, 92vw);
  display: grid;
  grid-template-columns: repeat(15, 1fr);
  grid-template-rows: repeat(15, 1fr);
  gap: 2rpx;
  padding: 8rpx;
  border-radius: 14rpx;
  border: 2rpx solid;
}
.cell { background: transparent; border-radius: 6rpx; transition: background .1s; }
.cell.head { border-radius: 8rpx; box-shadow: 0 0 6rpx rgba(0,0,0,.2) inset; }
.cell.body { border-radius: 6rpx; }
.cell.food { display: flex; align-items: center; justify-content: center; }
.food-emoji {
  font-size: 26rpx;
  filter: drop-shadow(0 0 4rpx rgba(230,67,64,.8));
  animation: pulse 1s infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}

.mask {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.55);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border-radius: 14rpx;
  z-index: 5;
}
.pause-ico { font-size: 90rpx; color: #fff; }
.pause-tip { color: #fff; font-size: 26rpx; margin-top: 12rpx; }

.ctrl { display: flex; gap: 20rpx; margin-top: 24rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 16rpx; font-size: 28rpx; padding: 0 36rpx; line-height: 72rpx; }
.btn.pause { background: #409eff; }
.btn.restart { background: #e6a23c; }
.hint { font-size: 22rpx; opacity: .55; margin-top: 16rpx; }

.over-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.over-card { width: 540rpx; padding: 40rpx; border-radius: 20rpx; display: flex; flex-direction: column; align-items: center; }
.over-title { font-size: 40rpx; font-weight: 800; color: #e64340; margin-bottom: 24rpx; }
.over-row { width: 100%; display: flex; justify-content: space-between; padding: 12rpx 0; font-size: 28rpx; }
.over-row .num { font-weight: 700; }
.over-row .num.best { color: #e6a23c; }
.new-record { color: #e6a23c; font-weight: 700; margin: 12rpx 0; font-size: 30rpx; }
</style>
