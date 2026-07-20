<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <!-- 顶部状态条 -->
    <view class="topbar">
      <view class="stat"><text class="lbl">分数</text><text class="val">{{ score }}</text></view>
      <view class="stat"><text class="lbl">最高</text><text class="val best">{{ best }}</text></view>
      <view class="stat"><text class="lbl">连击</text><text class="val" :class="{ combo: comboOn }">×{{ combo }}</text></view>
      <view class="stat"><text class="lbl">倒计时</text><text class="val" :class="{ low: time <= 5 }">{{ time }}s</text></view>
    </view>

    <!-- 9 个洞 -->
    <view class="board">
      <view
        v-for="(m, i) in moles"
        :key="i"
        class="hole"
        :class="{ up: m.state === 'up', hit: m.state === 'hit', gold: m.gold }"
        @click="hit(i)"
      >
        <view class="mound" :style="{ background: dark ? '#3a2a1a' : '#a1887f' }"></view>
        <view class="hole-inner"></view>
        <text v-if="m.state === 'up'" class="mole-emoji" :class="{ gold: m.gold }">{{ m.gold ? '🌟' : '🐹' }}</text>
        <text v-else-if="m.state === 'hit'" class="mole-emoji boom">💥</text>
      </view>
    </view>

    <view class="ctrl">
      <button class="btn pause" @click="togglePause" v-if="time > 0 && !over">{{ paused ? '继续' : '暂停' }}</button>
      <button class="btn start" @click="start">{{ over || time === 0 ? '开始' : '重新开始' }}</button>
    </view>
    <text class="hint">点击地鼠得分 · 🌟金鼠 +5 · 连击 3 次双倍</text>

    <!-- 死亡画面 -->
    <view v-if="over" class="over-mask">
      <view class="over-card" :style="{ background: C.card }">
        <text class="over-title">⏰ 时间到</text>
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
  vibrate, playSound, destroySound, pickColors, useGame, rand,
} from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const C = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('whack')

// 9 个洞
const moles = ref(Array.from({ length: 9 }, () => ({ state: 'down', gold: false, hitAt: 0 })))
const score = ref(0)
const time = ref(0)
const combo = ref(0)
const over = ref(false)
const paused = ref(false)
let tickTimer = null
let spawnTimer = null
let cleanupTimer = null

const comboOn = computed(() => combo.value >= 3)

// 随机生成 1-3 只地鼠
function spawnMoles() {
  if (over.value || paused.value || time.value <= 0) return
  // 清掉所有仍 up 的（避免堆积）
  moles.value.forEach((m) => {
    if (m.state === 'up') m.state = 'down'
  })
  const count = rand(1, 3)
  // 随机选 count 个不同的洞
  const idxs = []
  while (idxs.length < count) {
    const i = rand(0, 8)
    if (!idxs.includes(i)) idxs.push(i)
  }
  idxs.forEach((i) => {
    // 5% 概率出金鼠
    const gold = Math.random() < 0.05
    moles.value[i] = { state: 'up', gold, hitAt: 0 }
  })
  // 自动隐藏（800-1500ms 后未被打到的地鼠缩回）
  const hideDelay = rand(800, 1500)
  if (spawnTimer) clearTimeout(spawnTimer)
  spawnTimer = setTimeout(() => {
    moles.value.forEach((m) => {
      if (m.state === 'up') m.state = 'down'
    })
    spawnTimer = null
    // 间隔 200-500ms 再生成
    const nextDelay = rand(200, 500)
    cleanupTimer = setTimeout(() => {
      cleanupTimer = null
      if (!over.value && !paused.value && time.value > 0) spawnMoles()
    }, nextDelay)
  }, hideDelay)
}

function hit(i) {
  if (over.value || paused.value || time.value <= 0) return
  const m = moles.value[i]
  if (m.state !== 'up') return
  m.state = 'hit'
  m.hitAt = Date.now()
  combo.value++
  // 连击 3 次 → 分数 ×2
  const base = m.gold ? 5 : 1
  const gained = combo.value >= 3 ? base * 2 : base
  score.value += gained
  playSound('hit')
  vibrate('short')
  // 200ms 后变回 down
  setTimeout(() => {
    if (moles.value[i] && moles.value[i].state === 'hit') {
      moles.value[i].state = 'down'
      moles.value[i].gold = false
    }
  }, 200)
}

function start() {
  if (tickTimer) clearInterval(tickTimer)
  if (spawnTimer) clearTimeout(spawnTimer)
  if (cleanupTimer) clearTimeout(cleanupTimer)
  moles.value = Array.from({ length: 9 }, () => ({ state: 'down', gold: false, hitAt: 0 }))
  score.value = 0
  combo.value = 0
  time.value = 30
  over.value = false
  paused.value = false
  isNewRecord.value = false
  tickTimer = setInterval(() => {
    if (over.value || paused.value) return
    time.value--
    if (time.value <= 0) {
      gameOver()
    }
  }, 1000)
  // 第一波地鼠
  setTimeout(() => spawnMoles(), 500)
}

function gameOver() {
  over.value = true
  if (tickTimer) { clearInterval(tickTimer); tickTimer = null }
  if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null }
  if (cleanupTimer) { clearTimeout(cleanupTimer); cleanupTimer = null }
  // 全部缩回
  moles.value.forEach((m) => { m.state = 'down' })
  vibrate('long')
  playSound('fail')
  submitScore(score.value)
}

function togglePause() {
  if (over.value || time.value <= 0) return
  paused.value = !paused.value
  playSound('tap')
  if (paused.value) {
    // 暂停时清理待生成定时器
    if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null }
    if (cleanupTimer) { clearTimeout(cleanupTimer); cleanupTimer = null }
  } else {
    // 恢复时若没有待生成的地鼠，启动下一波
    if (!spawnTimer && !cleanupTimer && !moles.value.some((m) => m.state === 'up')) {
      setTimeout(() => spawnMoles(), 200)
    }
  }
}

onLoad(() => {})
onShow(() => {
  // 从后台恢复时若处于游戏中且非暂停，重启地鼠循环
  if (!over.value && !paused.value && time.value > 0 && !spawnTimer && !cleanupTimer) {
    setTimeout(() => spawnMoles(), 200)
  }
})
onHide(() => {
  if (!over.value && time.value > 0) {
    paused.value = true
    if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null }
    if (cleanupTimer) { clearTimeout(cleanupTimer); cleanupTimer = null }
  }
})
onUnload(() => {
  if (tickTimer) clearInterval(tickTimer)
  if (spawnTimer) clearTimeout(spawnTimer)
  if (cleanupTimer) clearTimeout(cleanupTimer)
  destroySound()
})
onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
  if (spawnTimer) clearTimeout(spawnTimer)
  if (cleanupTimer) clearTimeout(cleanupTimer)
})
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }

.topbar { width: min(630rpx, 92vw); display: flex; gap: 10rpx; margin-bottom: 24rpx; }
.stat { flex: 1; background: rgba(0,0,0,.04); border-radius: 12rpx; padding: 12rpx 0; display: flex; flex-direction: column; align-items: center; }
.stat .lbl { font-size: 20rpx; opacity: .6; }
.stat .val { font-size: 32rpx; font-weight: 700; margin-top: 2rpx; transition: all .2s; }
.stat .val.best { color: #e6a23c; }
.stat .val.low { color: #e64340; animation: blink 0.5s linear infinite; }
.stat .val.combo { color: #e6a23c; transform: scale(1.15); }
@keyframes blink { 50% { opacity: .4; } }

.board {
  width: min(630rpx, 92vw);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 20rpx;
}
.hole {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  display: flex; align-items: flex-end; justify-content: center;
  cursor: pointer;
}
.mound {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 50%;
  border-radius: 50% 50% 0 0 / 80% 80% 0 0;
  box-shadow: inset 0 -8rpx 16rpx rgba(0,0,0,.2);
}
.hole-inner {
  position: absolute;
  bottom: 40%;
  left: 10%; right: 10%;
  height: 30%;
  background: rgba(0,0,0,.5);
  border-radius: 50%;
  z-index: 1;
}
.mole-emoji {
  position: absolute;
  bottom: 8%;
  font-size: 70rpx;
  z-index: 2;
  opacity: 0;
  transform: translateY(20rpx);
  transition: transform .15s ease-out, opacity .15s ease-out;
}
.hole.up .mole-emoji {
  opacity: 1;
  transform: translateY(0);
}
.hole.hit .mole-emoji {
  opacity: 1;
  transform: translateY(0) scale(1.3);
}
.mole-emoji.gold { filter: drop-shadow(0 0 8rpx rgba(255,200,0,.9)); }
.mole-emoji.boom { font-size: 80rpx; }

.ctrl { display: flex; gap: 16rpx; margin-top: 28rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 14rpx; font-size: 28rpx; padding: 0 36rpx; line-height: 72rpx; }
.btn.pause { background: #409eff; }
.btn.start { background: #07c160; }
.btn.restart { background: #e6a23c; padding: 0 50rpx; }
.hint { font-size: 22rpx; opacity: .55; margin-top: 16rpx; text-align: center; }

.over-mask {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 100;
}
.over-card { width: 520rpx; padding: 36rpx; border-radius: 20rpx; display: flex; flex-direction: column; align-items: center; }
.over-title { font-size: 38rpx; font-weight: 800; color: #e6a23c; margin-bottom: 20rpx; }
.over-row { width: 100%; display: flex; justify-content: space-between; padding: 10rpx 0; font-size: 26rpx; }
.over-row .num { font-weight: 700; }
.over-row .num.best { color: #e6a23c; }
.new-record { color: #e6a23c; font-weight: 700; margin: 10rpx 0; font-size: 28rpx; }
</style>
