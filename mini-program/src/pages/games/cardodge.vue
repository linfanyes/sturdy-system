<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <!-- 顶部状态条 -->
    <view class="topbar">
      <view class="stat"><text class="lbl">分数</text><text class="val">{{ score }}</text></view>
      <view class="stat"><text class="lbl">最高</text><text class="val best">{{ best }}</text></view>
      <view class="stat"><text class="lbl">金币</text><text class="val">🪙 {{ coins }}</text></view>
      <view class="stat"><text class="lbl">速度</text><text class="val">{{ speedLevel }}</text></view>
    </view>

    <!-- 高速公路 + 滑动控制 -->
    <view
      class="board"
      :style="{ background: dark ? '#1a1f2e' : '#3a3f4a' }"
      @touchstart="ts"
      @touchend="te"
    >
      <!-- 道路标线（虚线滚动） -->
      <view class="lane-marks" :style="{ animationDuration: animDuration + 'ms' }">
        <view v-for="i in 10" :key="i" class="dash" :style="{ top: (i - 1) * 150 + 'rpx' }"></view>
      </view>

      <!-- 对向来车 / 玩家 / 金币 -->
      <view
        v-for="(c, i) in cells"
        :key="i"
        class="cell"
        :class="c.type"
      >
        <text v-if="c.type === 'player'" class="emoji">🚗</text>
        <text v-else-if="c.type === 'car'" class="emoji flip">{{ c.emoji }}</text>
        <text v-else-if="c.type === 'coin'" class="emoji coin">🪙</text>
      </view>

      <!-- 暂停遮罩 -->
      <view v-if="paused && !over" class="mask" @click="togglePause">
        <text class="pause-ico">⏸</text>
        <text class="pause-tip">点击继续</text>
      </view>
    </view>

    <view class="ctrl">
      <button class="btn pause" @click="togglePause">{{ paused ? '继续' : '暂停' }}</button>
      <button class="btn restart" @click="start">重新开始</button>
    </view>
    <text class="hint">左右滑动切换车道 · 收集金币 🪙</text>

    <!-- 死亡画面 -->
    <view v-if="over" class="over-mask">
      <view class="over-card" :style="{ background: C.card }">
        <text class="over-title">💥 撞车了</text>
        <view class="over-row"><text>本局得分</text><text class="num">{{ score }}</text></view>
        <view class="over-row"><text>最高分</text><text class="num best">{{ best }}</text></view>
        <view class="over-row"><text>收集金币</text><text class="num">🪙 {{ coins }}</text></view>
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
  vibrate, playSound, destroySound, pickColors, useGame, rand,
} from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const C = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('cardodge')

// 4 车道高速公路
const ROWS = 14, LANES = 4
const CAR_EMOJIS = ['🚙', '🚕', '🚐']

// 状态
const player = ref(1) // 玩家车道（0..3）
const cars = ref([]) // { r, lane, emoji, isCoin }
const score = ref(0)
const coins = ref(0)
const over = ref(false)
const paused = ref(false)
let timer = null

// 速度：每 800 分提升一档（280ms → 100ms 下限）
const interval = computed(() => {
  const lv = Math.floor(score.value / 800)
  return Math.max(100, 280 - lv * 20)
})
const speedLevel = computed(() => Math.floor(score.value / 800) + 1)
const animDuration = computed(() => Math.max(300, interval.value * 6))

// 渲染：玩家 / 对向来车 / 金币
const cells = computed(() => {
  const arr = Array(ROWS * LANES).fill(0).map(() => ({ type: '', emoji: '' }))
  cars.value.forEach((o) => {
    if (o.r >= 0 && o.r < ROWS) {
      arr[o.r * LANES + o.lane] = {
        type: o.isCoin ? 'coin' : 'car',
        emoji: o.emoji,
      }
    }
  })
  arr[(ROWS - 1) * LANES + player.value] = { type: 'player', emoji: '' }
  return arr
})

function step() {
  if (over.value || paused.value) return
  // 障碍下移（来车朝下，玩家位于底部，相对运动）
  cars.value = cars.value.map((o) => ({ ...o, r: o.r + 1 })).filter((o) => o.r < ROWS)
  // 碰撞：车撞玩家（玩家在底部）
  const hit = cars.value.find((o) => o.r === ROWS - 1 && o.lane === player.value)
  if (hit) {
    if (hit.isCoin) {
      // 金币：吃掉 +50 分
      cars.value = cars.value.filter((o) => o !== hit)
      score.value += 50
      coins.value++
      playSound('hit')
      vibrate('short')
    } else {
      // 撞车
      gameOver()
      return
    }
  }
  // 生成新对向来车
  if (Math.random() < 0.5) {
    const lane = rand(0, LANES - 1)
    if (!cars.value.some((o) => o.r === 0 && o.lane === lane)) {
      // 保证可通过：同行不超过 LANES-1 个
      const rowCnt = cars.value.filter((o) => o.r === 0).length
      if (rowCnt < LANES - 1) {
        cars.value.push({
          r: 0, lane,
          emoji: CAR_EMOJIS[rand(0, CAR_EMOJIS.length - 1)],
          isCoin: false,
        })
      }
    }
  }
  // 生成金币（约 10% 概率）
  if (Math.random() < 0.1) {
    const lane = rand(0, LANES - 1)
    if (!cars.value.some((o) => o.r === 0 && o.lane === lane)) {
      cars.value.push({ r: 0, lane, emoji: '', isCoin: true })
    }
  }
  score.value++
  // 每 800 分升级 + 音效
  if (score.value > 0 && score.value % 800 === 0) {
    playSound('win')
  }
  scheduleNext()
}

function scheduleNext() {
  if (timer) clearTimeout(timer)
  if (over.value || paused.value) return
  timer = setTimeout(() => { step() }, interval.value)
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

// 滑动切换车道
let sx = 0
function ts(e) { sx = e.touches[0].clientX }
function te(e) {
  if (over.value || paused.value) return
  const dx = e.changedTouches[0].clientX - sx
  if (Math.abs(dx) < 20) return
  const d = dx > 0 ? 1 : -1
  const n = player.value + d
  if (n >= 0 && n < LANES) {
    player.value = n
    playSound('tap')
    vibrate('short')
  }
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
  player.value = Math.floor(LANES / 2) - 1
  cars.value = []
  score.value = 0
  coins.value = 0
  over.value = false
  paused.value = false
  isNewRecord.value = false
  scheduleNext()
}

onLoad(() => start())
onShow(() => {
  if (!over.value && !paused.value && !timer) scheduleNext()
})
onHide(() => {
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
})
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }

.topbar { width: min(630rpx, 92vw); display: flex; gap: 8rpx; margin-bottom: 14rpx; }
.stat { flex: 1; background: rgba(0,0,0,.04); border-radius: 12rpx; padding: 10rpx 0; display: flex; flex-direction: column; align-items: center; }
.stat .lbl { font-size: 20rpx; opacity: .6; }
.stat .val { font-size: 28rpx; font-weight: 700; margin-top: 2rpx; }
.stat .val.best { color: #e6a23c; }

.board {
  position: relative;
  width: min(560rpx, 92vw);
  height: min(640rpx, 92vh);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(14, 1fr);
  gap: 2rpx;
  padding: 6rpx;
  border-radius: 12rpx;
  border: 4rpx solid #555;
  overflow: hidden;
}

/* 道路标线滚动（虚线） */
.lane-marks {
  position: absolute;
  top: 0; bottom: 0;
  /* 在每两个车道之间画虚线 */
  left: 25%; width: 50%;
  z-index: 0;
  animation: scroll linear infinite;
}
.dash {
  position: absolute;
  width: 6rpx;
  height: 30rpx;
  background: rgba(255,255,255,.7);
  border-radius: 4rpx;
  left: 0;
}
.dash:nth-child(odd) { left: 50%; }
@keyframes scroll {
  0% { transform: translateY(-150rpx); }
  100% { transform: translateY(0); }
}

.cell { display: flex; align-items: center; justify-content: center; position: relative; z-index: 1; }
.emoji { font-size: 36rpx; line-height: 1; }
.emoji.flip { transform: rotate(180deg); }
.emoji.coin {
  animation: coin-spin 1.5s linear infinite;
  filter: drop-shadow(0 0 6rpx rgba(255,200,0,.8));
}
@keyframes coin-spin {
  0%, 100% { transform: rotateY(0); }
  50% { transform: rotateY(180deg); }
}
.cell.player .emoji { filter: drop-shadow(0 0 6rpx rgba(0,255,100,.6)); }

.mask {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.6);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border-radius: 12rpx; z-index: 5;
}
.pause-ico { font-size: 80rpx; color: #fff; }
.pause-tip { color: #fff; font-size: 24rpx; margin-top: 10rpx; }

.ctrl { display: flex; gap: 16rpx; margin-top: 18rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 14rpx; font-size: 26rpx; padding: 0 28rpx; line-height: 64rpx; }
.btn.pause { background: #409eff; }
.btn.restart { background: #e6a23c; }
.hint { font-size: 22rpx; opacity: .55; margin-top: 12rpx; }

.over-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.over-card { width: 520rpx; padding: 36rpx; border-radius: 20rpx; display: flex; flex-direction: column; align-items: center; }
.over-title { font-size: 38rpx; font-weight: 800; color: #e64340; margin-bottom: 20rpx; }
.over-row { width: 100%; display: flex; justify-content: space-between; padding: 10rpx 0; font-size: 26rpx; }
.over-row .num { font-weight: 700; }
.over-row .num.best { color: #e6a23c; }
.new-record { color: #e6a23c; font-weight: 700; margin: 10rpx 0; font-size: 28rpx; }
</style>
