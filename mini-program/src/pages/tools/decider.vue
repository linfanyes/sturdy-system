<template>
  <view class="page" :class="{ dark }">
    <view class="hd">随机决定器</view>
    <view class="tabs">
      <view v-for="t in tabs" :key="t.k" class="tab" :class="{ on: tab === t.k }" @click="tab = t.k">{{ t.n }}</view>
    </view>

    <view v-if="tab === 'dice'" class="box">
      <view class="dice" @click="rollDice"><text class="pip">{{ dice }}</text></view>
      <button class="btn" @click="rollDice">掷骰子</button>
      <view class="meta">已掷 {{ diceCount }} 次</view>
    </view>

    <view v-if="tab === 'coin'" class="box">
      <view class="coin" :class="coinFace === '正面' ? 'front' : 'back'" @click="flipCoin">
        <text class="coin-text">{{ coinFace }}</text>
      </view>
      <button class="btn" @click="flipCoin">抛硬币</button>
      <view class="stats">
        <view class="stat">正面 <text class="num front-n">{{ coinStats.front }}</text></view>
        <view class="stat">反面 <text class="num back-n">{{ coinStats.back }}</text></view>
        <view class="stat reset" @click="resetCoinStats">清零</view>
      </view>
    </view>

    <view v-if="tab === 'wheel'" class="box">
      <view class="wheel" :style="{ transform: 'rotate(' + rot + 'deg)' }">
        <view v-for="(s, i) in wheelSegs" :key="i" class="seg" :style="segStyle(i)">{{ s }}</view>
      </view>
      <button class="btn" @click="spin">转动转盘</button>
    </view>

    <view v-if="tab === 'draw'" class="box">
      <textarea class="ta" v-model="optsText" :placeholder="ph" />
      <view class="result" v-if="drawResult">{{ drawResult }}</view>
      <button class="btn" @click="draw">抽签</button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const tabs = [
  { k: 'dice', n: '🎲 骰子' },
  { k: 'coin', n: '🪙 硬币' },
  { k: 'wheel', n: '🎡 转盘' },
  { k: 'draw', n: '🎰 抽签' },
]
const tab = ref('dice')

/* 骰子 */
const dice = ref(6)
let diceTimer = null
const diceCount = ref(0)
function rollDice() {
  if (diceTimer) clearInterval(diceTimer)
  diceTimer = setInterval(() => { dice.value = Math.floor(Math.random() * 6) + 1 }, 80)
  setTimeout(() => { clearInterval(diceTimer); dice.value = Math.floor(Math.random() * 6) + 1; diceCount.value++; uni.vibrateShort({ fail() {} }) }, 900)
}

/* 硬币 */
const coinFace = ref('正面')
const coinStats = ref({ front: 0, back: 0 })
let coinTimer = null
function flipCoin() {
  if (coinTimer) clearInterval(coinTimer)
  coinTimer = setInterval(() => { coinFace.value = Math.random() < 0.5 ? '正面' : '反面' }, 60)
  setTimeout(() => {
    clearInterval(coinTimer)
    const r = Math.random() < 0.5 ? '正面' : '反面'
    coinFace.value = r
    if (r === '正面') coinStats.value.front++ ; else coinStats.value.back++
    coinStats.value = { ...coinStats.value }
    uni.vibrateShort({ fail() {} })
  }, 900)
}
function resetCoinStats() {
  coinStats.value = { front: 0, back: 0 }
  uni.showToast({ title: '已清零', icon: 'none' })
}

/* 转盘 */
const optsText = ref('')
const ph = '选项一行一个\n如：\n去图书馆\n去操场\n自习'
const opts = computed(() => optsText.value.split('\n').map((s) => s.trim()).filter(Boolean))
const segColors = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e']
const wheelSegs = computed(() => opts.value.length ? opts.value : ['A', 'B', 'C', 'D'])
const rot = ref(0)
function segStyle(i) {
  const n = wheelSegs.value.length
  const step = 360 / n
  return {
    background: segColors[i % segColors.length],
    transform: `rotate(${i * step}deg)`,
    height: '50%',
    transformOrigin: 'bottom center',
    position: 'absolute',
    left: '50%',
    width: '40rpx',
    marginLeft: '-20rpx',
  }
}
function spin() {
  const n = wheelSegs.value.length
  const step = 360 / n
  const idx = Math.floor(Math.random() * n)
  const target = 360 * 5 + (360 - idx * step - step / 2)
  rot.value = target
  setTimeout(() => { uni.showToast({ title: '结果：' + wheelSegs.value[idx], icon: 'none' }) }, 2600)
}

/* 抽签 */
const drawResult = ref('')
function draw() {
  if (!opts.value.length) { uni.showToast({ title: '请先输入选项', icon: 'none' }); return }
  drawResult.value = opts.value[Math.floor(Math.random() * opts.value.length)]
}
</script>

<style scoped>
.page { padding: 30rpx; display: flex; flex-direction: column; align-items: center; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); }
.tabs { display: flex; flex-wrap: wrap; gap: 16rpx; margin: 20rpx 0; justify-content: center; }
.tab { background: var(--c-card); border-radius: 40rpx; padding: 12rpx 26rpx; font-size: 24rpx; color: var(--c-accent); }
.tab.on { background: #e6a23c; color: #fff; }
.box { display: flex; flex-direction: column; align-items: center; margin-top: 30rpx; }
.dice { width: 200rpx; height: 200rpx; background: var(--c-card); border-radius: 30rpx; display: flex; align-items: center; justify-content: center; box-shadow: 0 6rpx 20rpx var(--c-shadow); margin-bottom: 24rpx; }
.pip { font-size: 120rpx; font-weight: 800; color: #e6a23c; }
.meta { font-size: 24rpx; color: var(--c-sub); margin-top: 14rpx; }
.coin { width: 200rpx; height: 200rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 6rpx 20rpx var(--c-shadow); margin-bottom: 24rpx; transition: transform .3s; }
.coin.front { background: linear-gradient(135deg, #f6d365, #e6a23c); }
.coin.back { background: linear-gradient(135deg, #a1c4fd, #409eff); }
.coin-text { font-size: 56rpx; font-weight: 800; color: #fff; }
.stats { display: flex; align-items: center; gap: 30rpx; margin-top: 16rpx; font-size: 28rpx; color: var(--c-title); }
.num { font-weight: 800; }
.front-n { color: #e6a23c; }
.back-n { color: #409eff; }
.reset { color: var(--c-sub); font-size: 24rpx; }
.wheel { width: 400rpx; height: 400rpx; border-radius: 50%; position: relative; overflow: hidden; margin-bottom: 24rpx; background: var(--c-card2); transition: transform 2.4s cubic-bezier(.17,.67,.3,1); border: 8rpx solid var(--c-accent); }
.seg { display: flex; align-items: flex-start; justify-content: center; padding-top: 20rpx; font-size: 24rpx; color: #fff; }
.btn { background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 60rpx; margin-top: 10rpx; }
.ta { width: 560rpx; height: 240rpx; background: var(--c-card); border-radius: 16rpx; padding: 16rpx; font-size: 28rpx; color: var(--c-title); box-sizing: border-box; }
.result { margin: 20rpx 0; font-size: 44rpx; font-weight: 800; color: #e6a23c; }
</style>
