<template>
  <view class="page" :style="{ background: c.bg, color: c.text }">
    <!-- 顶部状态条 -->
    <view class="top-bar">
      <view class="title">记忆翻牌</view>
      <view class="stats">
        <view class="stat">
          <text class="label">步数</text>
          <text class="val">{{ steps }}</text>
        </view>
        <view class="stat">
          <text class="label">计时</text>
          <text class="val">{{ fmtTime(elapsed) }}</text>
        </view>
        <view class="stat">
          <text class="label">最少步数</text>
          <text class="val">{{ bestDisplay }}</text>
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

    <!-- 主题切换 -->
    <view class="theme-row">
      <view
        v-for="t in themes"
        :key="t.key"
        class="theme"
        :style="cardTheme === t.key ? { background: c.purple, color: '#fff' } : { background: c.cell, color: c.sub }"
        @click="changeTheme(t.key)"
      >{{ t.label }}</view>
    </view>

    <view class="status" :style="{ color: c.sub }">配对 {{ matched }}/{{ totalPairs }}</view>

    <!-- 翻牌板 -->
    <view class="board" :style="{ gridTemplateColumns: 'repeat(' + cols + ', 1fr)' }">
      <view
        v-for="(card, i) in cards"
        :key="i"
        class="card"
        :class="{ flipped: card.open || card.done, done: card.done }"
        @click="flip(i)"
      >
        <view class="inner">
          <view class="back" :style="{ background: c.primary }"></view>
          <view class="front" :style="{ background: c.card }">
            <text class="face">{{ card.face }}</text>
          </view>
        </view>
      </view>
    </view>

    <button class="btn" :style="{ background: c.primary, color: '#fff' }" @click="reset">重新开始</button>

    <view v-if="over" class="over" :style="{ color: c.accent }">🎉 全部配对！步数 {{ steps }} · 用时 {{ fmtTime(elapsed) }}</view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { pickColors, vibrate, playSound, destroySound, fmtTime, shuffle, useGame } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const c = computed(() => pickColors(dark.value))
const { best, submitScore } = useGame('memory')

const diffs = [
  { key: 'easy', label: '4×4 八对', cols: 4, rows: 4, pairs: 8 },
  { key: 'mid', label: '6×4 十二对', cols: 6, rows: 4, pairs: 12 },
  { key: 'hard', label: '6×6 十八对', cols: 6, rows: 6, pairs: 18 },
]
const themes = [
  { key: 'fruit', label: '水果', faces: ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🥝', '🍑', '🍍', '🥭', '🍐', '🍋', '🍊', '🥥', '🍈', '🫐', '🍅', '🥑'] },
  { key: 'animal', label: '动物', faces: ['🐶', '🐱', '🐰', '🐯', '🦁', '🐼', '🐨', '🦊', '🐸', '🐵', '🐔', '🐧', '🦄', '🐝', '🦋', '🐢', '🐙', '🦕'] },
  { key: 'emoji', label: '表情', faces: ['😀', '😍', '🤣', '😎', '😭', '😡', '😱', '🤔', '😴', '🥳', '😇', '🤩', '🥶', '🤯', '🤠', '👻', '🤖', '💩'] },
]
const diff = ref('easy')
const cardTheme = ref('fruit')

const cols = computed(() => diffs.find((d) => d.key === diff.value).cols)
const pairs = computed(() => diffs.find((d) => d.key === diff.value).pairs)
const totalPairs = computed(() => pairs.value)

const cards = ref([]) // [{face, id, open, done}]
const steps = ref(0)
const matched = ref(0)
const elapsed = ref(0)
const over = ref(false)
let first = -1
let lock = false
let startedAt = 0
let timer = null

/** 启动计时 */
function startTimer() {
  stopTimer()
  startedAt = Date.now()
  elapsed.value = 0
  timer = setInterval(() => { elapsed.value = Date.now() - startedAt }, 500)
}
function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

/** 生成牌堆 */
function gen() {
  const t = themes.find((x) => x.key === cardTheme.value)
  const faces = t.faces.slice(0, pairs.value)
  const deck = shuffle([...faces, ...faces]).map((f, i) => ({
    face: f,
    id: Math.floor(i / 2),
    open: false,
    done: false,
  }))
  cards.value = deck
  steps.value = 0
  matched.value = 0
  over.value = false
  first = -1
  lock = false
  startTimer()
}

/** 翻牌 */
function flip(i) {
  if (lock) return
  const card = cards.value[i]
  if (card.open || card.done) return
  card.open = true
  playSound('tap')

  if (first === -1) {
    first = i
    return
  }
  steps.value++
  const a = cards.value[first]
  const b = card
  if (a.id === b.id) {
    // 配对成功
    a.done = true; b.done = true
    matched.value++
    first = -1
    playSound('hit')
    vibrate('short')
    if (matched.value === pairs.value) {
      stopTimer()
      over.value = true
      playSound('win')
      vibrate('long')
      // 提交最少步数纪录：useGame 内部按 score>prev 判定新纪录，故存负数（步数越小越好）
      submitScore(-steps.value)
    }
  } else {
    lock = true
    const f = first
    setTimeout(() => {
      cards.value[f].open = false
      b.open = false
      lock = false
      first = -1
    }, 700)
  }
}

/** best 转换显示：内部存负数（越小越好），显示正数 */
const bestDisplay = computed(() => (best.value ? Math.abs(best.value) : '-'))

function changeDiff(k) {
  if (k === diff.value) return
  diff.value = k
  reset()
}
function changeTheme(k) {
  if (k === cardTheme.value) return
  cardTheme.value = k
  reset()
}
function reset() { gen() }

onLoad(() => gen())
onUnload(() => { stopTimer(); destroySound() })
onUnmounted(() => stopTimer())
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; display: flex; flex-direction: column; align-items: center; }
.top-bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 10rpx; }
.title { font-size: 38rpx; font-weight: 800; }
.stats { display: flex; gap: 10rpx; }
.stat { padding: 6rpx 12rpx; border-radius: 12rpx; display: flex; flex-direction: column; align-items: center; background: rgba(230, 162, 60, 0.12); min-width: 90rpx; }
.label { font-size: 18rpx; opacity: 0.7; }
.val { font-size: 26rpx; font-weight: 700; }
.diff-row { display: flex; gap: 10rpx; margin: 10rpx 0 6rpx; flex-wrap: wrap; justify-content: center; }
.theme-row { display: flex; gap: 10rpx; margin: 4rpx 0 10rpx; flex-wrap: wrap; justify-content: center; }
.diff, .theme { padding: 8rpx 20rpx; border-radius: 26rpx; font-size: 22rpx; }
.status { font-size: 24rpx; margin-bottom: 14rpx; }
.board { width: min(630rpx, 94vw); display: grid; gap: 12rpx; }
.card { perspective: 800rpx; aspect-ratio: 1 / 1; }
.inner { position: relative; width: 100%; height: 100%; transition: transform 0.5s ease; transform-style: preserve-3d; }
.card.flipped .inner { transform: rotateY(180deg); }
.back, .front { position: absolute; left: 0; top: 0; width: 100%; height: 100%; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.back { background-image: linear-gradient(135deg, rgba(255,255,255,0.18), rgba(0,0,0,0.05)); }
.front { transform: rotateY(180deg); }
.face { font-size: 56rpx; }
.card.done .front { box-shadow: 0 0 0 4rpx rgba(7,193,96,0.6) inset; }
.btn { margin-top: 22rpx; border-radius: 40rpx; padding: 0 60rpx; font-size: 26rpx; line-height: 70rpx; }
.over { margin-top: 16rpx; font-size: 28rpx; font-weight: 700; text-align: center; }
</style>
