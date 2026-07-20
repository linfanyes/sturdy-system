<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <view class="hd">
      <text class="title" :style="{ color: C.primary }">颜色反应</text>
      <text class="best" :style="{ background: C.primary }">最高 {{ best }}</text>
    </view>

    <!-- 顶部状态条 -->
    <view class="bar" :style="{ background: C.board, borderColor: C.border }">
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">分数</text>
        <text class="bar-v" :style="{ color: C.primary }">{{ score }}</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">连击</text>
        <text class="bar-v" :style="{ color: combo >= 5 ? C.danger : combo >= 3 ? C.accent : C.text }">x{{ combo }}</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">倍率</text>
        <text class="bar-v" :style="{ color: C.info }">{{ multiplier }}x</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">剩余</text>
        <text class="bar-v" :style="{ color: timeLeft <= 5 ? C.danger : C.text }">{{ timeLeft }}s</text>
      </view>
    </view>

    <!-- 进度条 -->
    <view class="progress" :style="{ background: C.cell }">
      <view class="progress-fill" :style="{ width: (timeLeft / 30 * 100) + '%', background: timeLeft <= 5 ? C.danger : C.accent }"></view>
    </view>

    <view v-if="!started" class="intro">
      <text class="intro-t" :style="{ color: C.text }">看字选颜色</text>
      <text class="intro-d" :style="{ color: C.sub }">字写"红"，墨水可能不是红</text>
      <text class="intro-d" :style="{ color: C.sub }">请点击墨水颜色，不是字义</text>
      <text class="intro-d" :style="{ color: C.sub }">连对 3 次 ×2，连对 5 次 ×3</text>
      <text class="intro-d" :style="{ color: C.sub }">每 10 秒难度上升，选项变多</text>
      <button class="btn big" :style="{ background: C.primary }" @click="start">开始</button>
      <text class="intro-best" :style="{ color: C.sub }">历史最高 {{ best }} 分</text>
    </view>

    <view v-else class="game">
      <view v-if="lastReact" class="react" :style="{ color: lastReact > 0 ? C.accent : C.danger }">
        +{{ lastReact > 0 ? lastGain : 0 }} · {{ lastReactMs }}ms
      </view>

      <!-- Stroop 字 -->
      <view class="word" :style="{ color: ink }">{{ word }}</view>
      <text class="hint" :style="{ color: C.sub }">点墨水颜色（不是字义）</text>

      <!-- 选项 -->
      <view class="opts" :style="{ gridTemplateColumns: `repeat(${optCols}, 1fr)` }">
        <view
          v-for="(o, i) in opts"
          :key="i"
          class="opt"
          :style="{ background: o.c }"
          @click="choose(o)"
        >{{ o.name }}</view>
      </view>
    </view>

    <view v-if="ended" class="mask">
      <view class="mask-c" :style="{ background: C.card }">
        <text class="mask-t" :style="{ color: C.text }">⏰ 时间到</text>
        <text class="mask-s" :style="{ color: C.primary }">得分 {{ score }}</text>
        <text class="mask-s2" :style="{ color: C.sub }">最快反应 {{ fastestReact }}ms</text>
        <text v-if="isNewRecord" class="mask-r" :style="{ color: C.danger }">★ 新纪录</text>
        <button class="btn" :style="{ background: C.primary }" @click="start">再来一次</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onUnload, onHide } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { useGame, vibrate, playSound, destroySound, pickColors, shuffle } from '../../common/game'

const C = computed(() => pickColors(theme.mode === 'dark'))
const { best, isNewRecord, submitScore } = useGame('colorreact')

// 6 种颜色（难度递增时用全 6 个）
const NAMES = ['红', '蓝', '绿', '黄', '紫', '橙']
const COLS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22']

const started = ref(false)
const ended = ref(false)
const score = ref(0)
const combo = ref(0)
const timeLeft = ref(30)
const word = ref('')
const ink = ref('#000')
const opts = ref([])
const lastReact = ref(0)        // 1 正确 -1 错误 0 无
const lastGain = ref(0)
const lastReactMs = ref(0)
const fastestReact = ref(0)
const elapsedSec = ref(0)
let answer = -1
let timer = null
let roundStartTs = 0

const multiplier = computed(() => {
  if (combo.value >= 5) return 3
  if (combo.value >= 3) return 2
  return 1
})

// 难度递增：每 10 秒加一个选项，从 4 加到 6
const optCount = computed(() => {
  if (elapsedSec.value >= 20) return 6
  if (elapsedSec.value >= 10) return 5
  return 4
})
const optCols = computed(() => optCount.value <= 4 ? 2 : 3)

function round() {
  const k = optCount.value
  // 从前 k 个里随机抽
  const wi = Math.floor(Math.random() * k)
  let ci = Math.floor(Math.random() * k)
  // 50% 概率让 ink != word 增加难度
  if (Math.random() < 0.7 && k > 1) {
    while (ci === wi) ci = Math.floor(Math.random() * k)
  }
  word.value = NAMES[wi]
  ink.value = COLS[ci]
  answer = ci
  // 选项打乱
  const order = shuffle([...Array(k).keys()])
  opts.value = order.map((idx) => ({ name: NAMES[idx], c: COLS[idx], k: idx }))
  roundStartTs = Date.now()
}

function choose(o) {
  if (ended.value) return
  const reactMs = Date.now() - roundStartTs
  if (o.k === answer) {
    combo.value++
    const gain = 1 * multiplier.value
    score.value += gain
    lastGain.value = gain
    lastReact.value = 1
    lastReactMs.value = reactMs
    if (!fastestReact.value || reactMs < fastestReact.value) fastestReact.value = reactMs
    playSound('hit')
    vibrate('short')
  } else {
    combo.value = 0
    score.value = Math.max(0, score.value - 1)
    lastReact.value = -1
    lastGain.value = 0
    lastReactMs.value = reactMs
    playSound('fail')
    vibrate('long')
  }
  // 0.4s 后清除反应提示并进入下一题
  setTimeout(() => { lastReact.value = 0 }, 400)
  round()
}

function start() {
  started.value = true
  ended.value = false
  score.value = 0
  combo.value = 0
  timeLeft.value = 30
  elapsedSec.value = 0
  fastestReact.value = 0
  isNewRecord.value = false
  round()
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    timeLeft.value--
    elapsedSec.value++
    // 每 10 秒提示难度上升（仅当选项数会变化时）
    if (elapsedSec.value === 10 || elapsedSec.value === 20) {
      // 难度变化的下一题生效
      round()
    }
    if (timeLeft.value <= 0) {
      clearInterval(timer)
      timer = null
      ended.value = true
      submitScore(score.value)
      playSound('win')
      vibrate('long')
    }
  }, 1000)
}

function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

onLoad(() => { started.value = false; ended.value = false })
onUnload(() => { stopTimer(); destroySound() })
onHide(() => stopTimer())
onUnmounted(() => stopTimer())
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 40rpx; font-weight: 800; }
.best { font-size: 22rpx; color: #fff; padding: 6rpx 18rpx; border-radius: 20rpx; }

.bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; padding: 14rpx 14rpx; border-radius: 14rpx; border: 2rpx solid; margin-bottom: 8rpx; }
.bar-i { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-l { font-size: 20rpx; }
.bar-v { font-size: 30rpx; font-weight: 800; margin-top: 4rpx; }

.progress { width: min(630rpx, 92vw); height: 8rpx; border-radius: 4rpx; overflow: hidden; margin-bottom: 18rpx; }
.progress-fill { height: 100%; transition: width 0.4s linear, background 0.3s; }

.intro { display: flex; flex-direction: column; align-items: center; padding-top: 60rpx; }
.intro-t { font-size: 44rpx; font-weight: 800; margin-bottom: 16rpx; }
.intro-d { font-size: 26rpx; margin: 4rpx 0; }
.intro-best { font-size: 24rpx; margin-top: 20rpx; }

.game { display: flex; flex-direction: column; align-items: center; width: 100%; }
.react { font-size: 30rpx; font-weight: 800; margin-bottom: 14rpx; height: 36rpx; }
.word { font-size: 130rpx; font-weight: 900; margin: 14rpx 0; line-height: 1; text-shadow: 0 4rpx 8rpx rgba(0,0,0,.15); }
.hint { font-size: 22rpx; margin-bottom: 24rpx; }

.opts { width: min(630rpx, 92vw); display: grid; gap: 16rpx; }
.opt { height: 130rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 800; color: #fff; text-shadow: 0 2rpx 4rpx rgba(0,0,0,.35); transition: transform 0.12s; }
.opt:active { transform: scale(0.94); }

.btn { color: #fff; border-radius: 40rpx; padding: 0 50rpx; font-size: 28rpx; line-height: 70rpx; }
.btn.big { margin-top: 40rpx; padding: 0 80rpx; font-size: 32rpx; line-height: 88rpx; }

.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 10; }
.mask-c { width: 480rpx; padding: 40rpx; border-radius: 18rpx; display: flex; flex-direction: column; align-items: center; }
.mask-t { font-size: 36rpx; font-weight: 800; }
.mask-s { font-size: 32rpx; margin-top: 12rpx; font-weight: 700; }
.mask-s2 { font-size: 24rpx; margin-top: 6rpx; }
.mask-r { font-size: 24rpx; margin-top: 8rpx; }
.mask-c .btn { margin-top: 22rpx; }
</style>
