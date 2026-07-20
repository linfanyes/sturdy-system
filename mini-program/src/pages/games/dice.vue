<template>
  <view class="page" :class="{ dark }" :style="pageStyle">
    <view class="hd">摇骰子比大小</view>
    <view class="status">
      <text class="chip">筹码 {{ chips }}</text>
      <text class="best">最高 {{ best }}</text>
    </view>

    <!-- 押注区 -->
    <view class="bet-area" v-if="!rolling && chips > 0">
      <view class="lab">押注类型</view>
      <view class="types">
        <view class="type" :class="{ on: betType === 'big' }" @click="setBetType('big')">
          <text class="t-name">大</text>
          <text class="t-sub">总点 ≥ 11 · 2×</text>
        </view>
        <view class="type" :class="{ on: betType === 'small' }" @click="setBetType('small')">
          <text class="t-name">小</text>
          <text class="t-sub">总点 &lt; 11 · 2×</text>
        </view>
        <view class="type" :class="{ on: betType === 'leopard' }" @click="setBetType('leopard')">
          <text class="t-name">豹子</text>
          <text class="t-sub">三颗相同 · 6×</text>
        </view>
      </view>
      <view class="lab">押注金额</view>
      <view class="amounts">
        <view v-for="a in amounts" :key="a" class="amount"
          :class="{ on: betAmount === a, dis: chips < a }"
          @click="setAmount(a)">{{ a }}</view>
      </view>
    </view>

    <!-- 摇骰区 -->
    <view class="arena">
      <view class="side">
        <view class="who">你 · {{ playerTotal || '-' }}</view>
        <view class="dice-row">
          <view v-for="(d, i) in playerDice" :key="'p'+i" class="dice" :class="{ rolling }">
            <view class="pip-grid">
              <view v-for="p in 9" :key="p" class="pip-cell">
                <view v-if="pipMap[d] && pipMap[d].includes(p - 1)" class="pip"></view>
              </view>
            </view>
          </view>
        </view>
      </view>
      <view class="vs">VS</view>
      <view class="side">
        <view class="who">AI · {{ aiTotal || '-' }}</view>
        <view class="dice-row">
          <view v-for="(d, i) in aiDice" :key="'a'+i" class="dice" :class="{ rolling }">
            <view class="pip-grid">
              <view v-for="p in 9" :key="p" class="pip-cell">
                <view v-if="pipMap[d] && pipMap[d].includes(p - 1)" class="pip"></view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <button v-if="!rolling && chips > 0" class="btn roll-btn" @click="roll">摇一摇 🎲</button>
    <view v-if="rolling" class="rolling-tip">摇晃中…</view>

    <view v-if="result" class="result" :class="result.type">
      <text class="r-main">{{ result.text }}</text>
      <text class="r-sub">{{ result.sub }}</text>
    </view>

    <!-- 历史 -->
    <view class="hist" v-if="history.length">
      <view class="hist-lab">最近 {{ history.length }} 局</view>
      <view class="hist-row">
        <view v-for="(h, i) in history" :key="i" class="hist-item" :class="h.win ? 'win' : 'lose'">
          <text class="hi-type">{{ h.outcome }}</text>
          <text class="hi-delta">{{ h.win ? '+' : '-' }}{{ h.delta }}</text>
        </view>
      </view>
    </view>

    <button v-if="chips <= 0" class="btn restart" @click="restart">游戏结束，重新开始</button>
    <view v-if="chips > 0" class="tip">提示：摇手机也能触发摇骰</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { useGame, vibrate, playSound, destroySound, pickColors, rand } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const colors = computed(() => pickColors(dark.value))
const pageStyle = computed(() => ({
  '--bg': colors.value.bg,
  '--board': colors.value.board,
  '--card': colors.value.card,
  '--cell': colors.value.cell,
  '--border': colors.value.border,
  '--text': colors.value.text,
  '--sub': colors.value.sub,
  '--primary': colors.value.primary,
  '--accent': colors.value.accent,
  '--danger': colors.value.danger,
}))

const { best, submitScore } = useGame('dice')

// 骰子点数对应的点阵位置（3x3 网格 0-8）
const pipMap = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

const chips = ref(1000)
const betType = ref('big') // big / small / leopard
const betAmount = ref(100)
const amounts = [100, 500, 1000]
const playerDice = ref([1, 1, 1])
const aiDice = ref([1, 1, 1])
const rolling = ref(false)
const result = ref(null)
const history = ref([])
let rollTimer = null
let lastShake = 0

const playerTotal = computed(() => playerDice.value.reduce((a, b) => a + b, 0))
const aiTotal = computed(() => aiDice.value.reduce((a, b) => a + b, 0))

function setBetType(t) { betType.value = t }
function setAmount(a) { if (chips.value >= a) { betAmount.value = a; playSound('tap') } }

// 摇骰
function roll() {
  if (rolling.value || chips.value <= 0) return
  if (chips.value < betAmount.value) {
    uni.showToast({ title: '筹码不足', icon: 'none' })
    return
  }
  rolling.value = true
  result.value = null
  playSound('tap')
  // 0.5s 动画：每 50ms 切换点数
  let ticks = 0
  rollTimer = setInterval(() => {
    playerDice.value = [rand(1, 6), rand(1, 6), rand(1, 6)]
    aiDice.value = [rand(1, 6), rand(1, 6), rand(1, 6)]
    ticks++
    if (ticks >= 10) {
      clearInterval(rollTimer)
      rollTimer = null
      finalize()
    }
  }, 50)
}

function finalize() {
  // 真实结果
  playerDice.value = [rand(1, 6), rand(1, 6), rand(1, 6)]
  aiDice.value = [rand(1, 6), rand(1, 6), rand(1, 6)]
  rolling.value = false

  const pTotal = playerTotal.value
  const aTotal = aiTotal.value
  const isLeopard = playerDice.value[0] === playerDice.value[1] &&
                    playerDice.value[1] === playerDice.value[2]
  const outcome = isLeopard ? '豹子' : (pTotal >= 11 ? '大' : '小')

  let win = false
  let payout = 0
  if (isLeopard && betType.value === 'leopard') {
    win = true
    payout = betAmount.value * 6
  } else if (!isLeopard) {
    if (betType.value === 'big' && pTotal >= 11) { win = true; payout = betAmount.value * 2 }
    else if (betType.value === 'small' && pTotal < 11) { win = true; payout = betAmount.value * 2 }
  }
  // 玩家总点 > AI 总点：奖励 +50%
  if (win && pTotal > aTotal) payout = Math.floor(payout * 1.5)

  const delta = win ? (payout - betAmount.value) : -betAmount.value
  chips.value += delta
  if (chips.value > best.value) submitScore(chips.value)

  history.value.unshift({ outcome, win, delta: Math.abs(delta), type: betType.value })
  if (history.value.length > 5) history.value = history.value.slice(0, 5)

  if (win) {
    if (isLeopard) { playSound('win'); vibrate('long') }
    else { playSound('hit'); vibrate('short') }
    result.value = { type: 'win', text: '🎉 ' + outcome + ' 赢', sub: '+' + delta + ' 筹码' }
  } else {
    playSound('fail')
    vibrate('short')
    result.value = { type: 'lose', text: '💀 开 ' + outcome, sub: delta + ' 筹码' }
  }

  if (chips.value <= 0) {
    chips.value = 0
    setTimeout(() => uni.showToast({ title: '游戏结束', icon: 'none' }), 300)
  }
}

function restart() {
  chips.value = 1000
  result.value = null
  history.value = []
  playerDice.value = [1, 1, 1]
  aiDice.value = [1, 1, 1]
}

// 摇手机检测
function onAccel(res) {
  const now = Date.now()
  if (now - lastShake < 1500) return
  const mag = Math.abs(res.x || 0) + Math.abs(res.y || 0) + Math.abs(res.z || 0)
  if (mag > 3) {
    lastShake = now
    roll()
  }
}

onLoad(() => {
  try { uni.startAccelerometer({ interval: 'normal' }) } catch (e) {}
  try { uni.onAccelerometerChange(onAccel) } catch (e) {}
})

onUnload(() => {
  if (rollTimer) clearInterval(rollTimer)
  try { uni.stopAccelerometer() } catch (e) {}
  try { uni.offAccelerometerChange && uni.offAccelerometerChange(onAccel) } catch (e) {}
  destroySound()
})

onHide(() => {
  if (rollTimer) { clearInterval(rollTimer); rollTimer = null; rolling.value = false }
})
</script>

<style scoped>
.page { background: var(--bg); min-height: 100vh; color: var(--text); padding: 30rpx; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--primary); }
.status { display: flex; gap: 30rpx; font-size: 26rpx; color: var(--sub); margin: 12rpx 0; }
.chip { color: var(--primary); font-weight: 700; }
.best { color: var(--sub); }

.bet-area { width: min(630rpx, 92vw); margin-top: 10rpx; }
.lab { font-size: 24rpx; color: var(--sub); margin: 16rpx 0 8rpx; }
.types { display: flex; gap: 12rpx; }
.type { flex: 1; background: var(--card); border: 2rpx solid var(--border); border-radius: 14rpx; padding: 16rpx 8rpx; display: flex; flex-direction: column; align-items: center; }
.type.on { background: var(--primary); border-color: var(--primary); }
.type.on .t-name, .type.on .t-sub { color: #fff; }
.t-name { font-size: 32rpx; font-weight: 800; color: var(--text); }
.t-sub { font-size: 20rpx; color: var(--sub); margin-top: 4rpx; }

.amounts { display: flex; gap: 12rpx; }
.amount { flex: 1; text-align: center; background: var(--card); border: 2rpx solid var(--border); border-radius: 30rpx; padding: 14rpx 0; font-size: 28rpx; color: var(--text); }
.amount.on { background: var(--accent); border-color: var(--accent); color: #fff; }
.amount.dis { opacity: .4; }

.arena { width: min(630rpx, 92vw); margin: 24rpx 0; display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.side { flex: 1; display: flex; flex-direction: column; align-items: center; }
.who { font-size: 24rpx; color: var(--sub); margin-bottom: 10rpx; }
.dice-row { display: flex; gap: 10rpx; }
.dice { width: 90rpx; height: 90rpx; background: var(--card); border: 2rpx solid var(--border); border-radius: 14rpx; padding: 8rpx; box-sizing: border-box; }
.dice.rolling { animation: spin 0.5s linear infinite; }
@keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
.pip-grid { width: 100%; height: 100%; display: grid; grid-template-columns: repeat(3, 1fr); grid-template-rows: repeat(3, 1fr); }
.pip-cell { display: flex; align-items: center; justify-content: center; }
.pip { width: 14rpx; height: 14rpx; border-radius: 50%; background: var(--danger); }
.vs { font-size: 30rpx; font-weight: 800; color: var(--primary); }

.btn { background: var(--primary); color: #fff; border-radius: 40rpx; padding: 0 60rpx; font-size: 30rpx; line-height: 80rpx; }
.roll-btn { margin-top: 8rpx; }
.restart { margin-top: 20rpx; background: var(--danger); }
.rolling-tip { color: var(--sub); font-size: 26rpx; margin-top: 24rpx; }

.result { margin-top: 20rpx; padding: 16rpx 30rpx; border-radius: 16rpx; display: flex; flex-direction: column; align-items: center; }
.result.win { background: rgba(7, 193, 96, .15); }
.result.lose { background: rgba(230, 67, 64, .15); }
.r-main { font-size: 36rpx; font-weight: 800; }
.result.win .r-main { color: var(--accent); }
.result.lose .r-main { color: var(--danger); }
.r-sub { font-size: 24rpx; color: var(--sub); margin-top: 4rpx; }

.hist { width: min(630rpx, 92vw); margin-top: 24rpx; }
.hist-lab { font-size: 22rpx; color: var(--sub); margin-bottom: 8rpx; }
.hist-row { display: flex; gap: 10rpx; flex-wrap: wrap; }
.hist-item { flex: 1; min-width: 100rpx; padding: 10rpx 0; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; font-size: 22rpx; }
.hist-item.win { background: rgba(7, 193, 96, .12); color: var(--accent); }
.hist-item.lose { background: rgba(230, 67, 64, .12); color: var(--danger); }
.hi-type { font-weight: 700; }
.hi-delta { font-size: 20rpx; margin-top: 2rpx; }
.tip { margin-top: 20rpx; font-size: 22rpx; color: var(--sub); }
</style>
