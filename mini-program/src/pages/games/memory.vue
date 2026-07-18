<template>
  <view class="page" :class="{ dark }">
    <view class="hd">记忆翻牌</view>
    <view class="status">步数 {{ steps }} · 配对 {{ matched }}/8</view>
    <view class="board">
      <view v-for="(c, i) in cards" :key="i" class="cell"
        :class="{ open: c.open || c.done, done: c.done }"
        @click="flip(i)">
        <text v-if="c.open || c.done">{{ c.face }}</text>
      </view>
    </view>
    <button class="btn" @click="reset">重新开始</button>
  </view>
</template>

<script setup>
import { ref, computed} from 'vue'
import { theme } from '../../common/store'
import { onLoad } from '@dcloudio/uni-app'
const dark = computed(() => theme.mode === 'dark')

const faces = ['🍎','🍌','🍇','🍉','🍓','🍒','🥝','🍑']
const cards = ref([])
const steps = ref(0)
const matched = ref(0)
let first = -1
let lock = false

function gen() {
  let deck = [...faces, ...faces].map((f, i) => ({ face: f, id: Math.floor(i / 2), open: false, done: false }))
  for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [deck[i], deck[j]] = [deck[j], deck[i]] }
  cards.value = deck
  steps.value = 0; matched.value = 0; first = -1; lock = false
}
function flip(i) {
  if (lock) return
  const c = cards.value[i]
  if (c.open || c.done) return
  c.open = true
  if (first === -1) { first = i; return }
  steps.value++
  if (cards.value[first].id === c.id) {
    cards.value[first].done = true; c.done = true
    matched.value++
    first = -1
    if (matched.value === 8) uni.showToast({ title: '全部配对！', icon: 'success' })
  } else {
    lock = true
    const f = first
    setTimeout(() => { cards.value[f].open = false; c.open = false; lock = false; first = -1 }, 700)
  }
}
function reset() { gen() }
onLoad(() => gen())
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 30rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 26rpx; color: var(--c-title); margin: 12rpx 0; }
.board { width: 600rpx; display: grid; grid-template-columns: repeat(4, 1fr); gap: 14rpx; }
.cell { width: 130rpx; height: 130rpx; background: #c9a86a; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 56rpx; }
.cell.open { background: #fff; }
.cell.done { background: #d8efd0; }
.btn { margin-top: 24rpx; background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 60rpx; }
</style>
