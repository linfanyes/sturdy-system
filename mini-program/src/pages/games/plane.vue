<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <!-- 顶部状态条 -->
    <view class="topbar">
      <view class="stat"><text class="lbl">分数</text><text class="val">{{ score }}</text></view>
      <view class="stat"><text class="lbl">最高</text><text class="val best">{{ best }}</text></view>
      <view class="stat"><text class="lbl">火力</text><text class="val">{{ firePower }}</text></view>
      <view class="stat"><text class="lbl">生命</text><text class="val">{{ lives }}</text></view>
    </view>

    <!-- 战场 + 滑动控制 -->
    <view
      class="board"
      :style="{ background: dark ? '#0b1d3a' : '#b3d5ff' }"
      @touchstart="ts"
      @touchmove="tm"
      @touchend="te"
    >
      <view
        v-for="(c, i) in cells"
        :key="i"
        class="cell"
        :class="c.type"
      >
        <text v-if="c.type === 'me'" class="emoji" :class="{ inv: invincible }">✈️</text>
        <text v-else-if="c.type === 'enemy'" class="emoji flip">✈️</text>
        <text v-else-if="c.type === 'boss'" class="emoji boss">🛩️</text>
        <text v-else-if="c.type === 'bullet'" class="bullet">•</text>
        <text v-else-if="c.type === 'boom'" class="emoji boom">💥</text>
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
    <text class="hint">滑动屏幕控制飞机移动</text>

    <!-- 死亡画面 -->
    <view v-if="over" class="over-mask">
      <view class="over-card" :style="{ background: C.card }">
        <text class="over-title">飞机坠毁</text>
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
  vibrate, playSound, destroySound, pickColors, useGame, rand, clamp,
} from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const C = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('plane')

// 棋盘
const COLS = 9, ROWS = 12

// 状态
const me = ref(4)
const enemies = ref([]) // { r, c, hp, isBoss }
const bullets = ref([]) // { r, c }
const booms = ref([]) // { r, c, t }
const score = ref(0)
const lives = ref(3)
const firePower = ref(1)
const over = ref(false)
const paused = ref(false)
const invincible = ref(false)
let timer = null
let lastShot = 0
let invincibleTimer = null
let stepCount = 0
let bossCount = 0 // 已击杀 boss 数

// 渲染
const cells = computed(() => {
  const arr = Array(ROWS * COLS).fill(0).map(() => ({ type: '' }))
  bullets.value.forEach((b) => {
    if (b.r >= 0 && b.r < ROWS) arr[b.r * COLS + b.c].type = 'bullet'
  })
  booms.value.forEach((b) => {
    if (b.r >= 0 && b.r < ROWS) arr[b.r * COLS + b.c].type = 'boom'
  })
  enemies.value.forEach((e) => {
    if (e.r >= 0 && e.r < ROWS) arr[e.r * COLS + e.c].type = e.isBoss ? 'boss' : 'enemy'
  })
  // 玩家在最底行
  arr[(ROWS - 1) * COLS + me.value].type = 'me'
  return arr
})

function spawnEnemy() {
  const c = rand(0, COLS - 1)
  // 避免与现有顶行敌机重叠
  if (enemies.value.some((e) => e.r === 0 && e.c === c)) return
  enemies.value.push({ r: 0, c, hp: 1, isBoss: false })
}

function spawnBoss() {
  // Boss 在顶部居中
  const c = Math.floor(COLS / 2)
  enemies.value.push({ r: 0, c, hp: 10, isBoss: true })
  bossCount++
  playSound('win')
  vibrate('long')
}

function step() {
  if (over.value || paused.value) return
  stepCount++
  // 子弹上移
  bullets.value = bullets.value
    .map((b) => ({ ...b, r: b.r - 1 }))
    .filter((b) => b.r >= 0)
  // 敌机下移（普通每帧 1，boss 每 6 帧 1）
  enemies.value = enemies.value.map((e) => ({
    ...e,
    r: e.isBoss ? (stepCount % 6 === 0 ? e.r + 1 : e.r) : e.r + 1,
  }))
  // 边界处理：超出底部
  const reached = enemies.value.filter((e) => e.r >= ROWS - 1)
  enemies.value = enemies.value.filter((e) => e.r < ROWS - 1)
  if (reached.length && !invincible.value) {
    // 敌机到达底线 = 撞玩家
    hurt()
  }
  // 自动开火（300ms 冷却）
  const now = Date.now()
  if (now - lastShot >= 300) {
    fire()
    lastShot = now
  }
  // 子弹命中
  const hitB = new Set(), hitE = new Set()
  bullets.value.forEach((b, bi) => {
    enemies.value.forEach((e, ei) => {
      if (e.r === b.r && e.c === b.c) { hitB.add(bi); hitE.add(ei) }
    })
  })
  if (hitE.size) {
    bullets.value = bullets.value.filter((_, i) => !hitB.has(i))
    hitE.forEach((ei) => {
      const e = enemies.value[ei]
      if (!e) return
      e.hp--
      if (e.hp <= 0) {
        booms.value.push({ r: e.r, c: e.c, t: Date.now() })
        score.value += e.isBoss ? 500 : 10
        playSound('hit')
        vibrate('short')
        // 火力升级：每 500 分 +1（上限 3）
        const want = Math.min(3, 1 + Math.floor(score.value / 500))
        if (want > firePower.value) {
          firePower.value = want
          playSound('win')
        }
      } else {
        // Boss 受击不消失
        playSound('tap')
      }
    })
    enemies.value = enemies.value.filter((e, i) => !(hitE.has(i) && e.hp <= 0))
  }
  // 检查 boss 出现：每 3000 分
  const wantBoss = Math.floor(score.value / 3000)
  if (wantBoss > bossCount && !enemies.value.some((e) => e.isBoss)) {
    spawnBoss()
  }
  // 清理过期爆炸（200ms 后消失）
  const now2 = Date.now()
  booms.value = booms.value.filter((b) => now2 - b.t < 200)
  // 普通敌机生成
  if (Math.random() < 0.35 && enemies.value.filter((e) => !e.isBoss).length < 5) {
    spawnEnemy()
  }
}

function fire() {
  if (over.value || paused.value) return
  // 火力 1：中心
  // 火力 2：左右偏移
  // 火力 3：左中右散射
  const offsets = firePower.value === 1 ? [0] : firePower.value === 2 ? [-1, 1] : [-1, 0, 1]
  offsets.forEach((o) => {
    const c = me.value + o
    if (c >= 0 && c < COLS) bullets.value.push({ r: ROWS - 2, c })
  })
}

function hurt() {
  if (invincible.value) return
  lives.value--
  vibrate('long')
  playSound('fail')
  invincible.value = true
  invincibleTimer = setTimeout(() => { invincible.value = false }, 1000)
  if (lives.value <= 0) gameOver()
}

function gameOver() {
  over.value = true
  paused.value = false
  if (timer) { clearInterval(timer); timer = null }
  if (invincibleTimer) { clearTimeout(invincibleTimer); invincibleTimer = null }
  vibrate('long')
  playSound('fail')
  submitScore(score.value)
}

// 触摸：手指跟随
function ts(e) {
  // 立即移动一次
  movePlayer(e.touches[0].clientX)
}
function tm(e) {
  if (over.value || paused.value) return
  movePlayer(e.touches[0].clientX)
}
function te() {}

// 缓存棋盘实际渲染信息（用 selectorQuery 取真实 px 边界）
const boardInfo = { left: 0, width: 0 }
function movePlayer(clientX) {
  if (over.value || paused.value) return
  if (!boardInfo.width) return
  const rel = clientX - boardInfo.left
  const col = Math.floor(rel / (boardInfo.width / COLS))
  const clamped = clamp(col, 0, COLS - 1)
  if (clamped !== me.value) me.value = clamped
}
function refreshBoardInfo() {
  uni.createSelectorQuery()
    .select('.board')
    .boundingClientRect((r) => {
      if (r) { boardInfo.left = r.left; boardInfo.width = r.width }
    })
    .exec()
}

function togglePause() {
  if (over.value) return
  paused.value = !paused.value
  playSound('tap')
  if (!paused.value) {
    lastShot = 0
    scheduleNext()
  } else if (timer) { clearInterval(timer); timer = null }
}

function scheduleNext() {
  if (timer) clearInterval(timer)
  if (over.value || paused.value) return
  timer = setInterval(step, 90)
}

function start() {
  if (timer) clearInterval(timer)
  if (invincibleTimer) clearTimeout(invincibleTimer)
  me.value = Math.floor(COLS / 2)
  enemies.value = []
  bullets.value = []
  booms.value = []
  score.value = 0
  lives.value = 3
  firePower.value = 1
  over.value = false
  paused.value = false
  invincible.value = false
  bossCount = 0
  stepCount = 0
  lastShot = 0
  isNewRecord.value = false
  refreshBoardInfo()
  scheduleNext()
}

onLoad(() => {
  // 等 DOM 渲染完成
  setTimeout(() => { refreshBoardInfo(); start() }, 50)
})
onShow(() => {
  refreshBoardInfo()
  if (!over.value && !paused.value && !timer) scheduleNext()
})
onHide(() => {
  if (!over.value && !paused.value) paused.value = true
  if (timer) { clearInterval(timer); timer = null }
})
onUnload(() => {
  if (timer) clearInterval(timer)
  if (invincibleTimer) clearTimeout(invincibleTimer)
  timer = null
  destroySound()
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (invincibleTimer) clearTimeout(invincibleTimer)
})
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; display: flex; flex-direction: column; align-items: center; box-sizing: border-box; }

.topbar { width: min(630rpx, 92vw); display: flex; gap: 10rpx; margin-bottom: 14rpx; }
.stat { flex: 1; background: rgba(0,0,0,.04); border-radius: 12rpx; padding: 10rpx 0; display: flex; flex-direction: column; align-items: center; }
.stat .lbl { font-size: 20rpx; opacity: .6; }
.stat .val { font-size: 30rpx; font-weight: 700; margin-top: 2rpx; }
.stat .val.best { color: #e6a23c; }

.board {
  position: relative;
  width: min(540rpx, 88vw);
  height: calc(min(540rpx, 88vw) * 12 / 9);
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(12, 1fr);
  gap: 1rpx;
  padding: 4rpx;
  border-radius: 10rpx;
  border: 2rpx solid rgba(255,255,255,.1);
}
.cell { display: flex; align-items: center; justify-content: center; position: relative; }
.emoji { font-size: 36rpx; line-height: 1; }
.emoji.flip { transform: rotate(180deg); }
.emoji.boss { font-size: 50rpx; filter: drop-shadow(0 0 6rpx rgba(255,0,0,.6)); }
.emoji.inv { opacity: .35; animation: blink .15s linear infinite; }
@keyframes blink {
  0%, 100% { opacity: .35; }
  50% { opacity: 1; }
}
.bullet { font-size: 50rpx; color: #f1c40f; line-height: 1; font-weight: 900; text-shadow: 0 0 8rpx #f39c12; }
.emoji.boom { font-size: 40rpx; }

.mask {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.6);
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border-radius: 10rpx; z-index: 5;
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
