<template>
  <view class="page" :style="{ background: C.bg, color: C.text }">
    <view class="hd">
      <text class="title" :style="{ color: C.primary }">消消乐</text>
      <text class="best" :style="{ background: C.primary }">最高 {{ best }}</text>
    </view>

    <!-- 顶部状态条 -->
    <view class="bar" :style="{ background: C.board, borderColor: C.border }">
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">分数</text>
        <text class="bar-v" :style="{ color: C.primary }">{{ score }}</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">关卡</text>
        <text class="bar-v" :style="{ color: C.accent }">{{ level }}</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">目标</text>
        <text class="bar-v" :style="{ color: C.info }">{{ goal }}</text>
      </view>
      <view class="bar-i">
        <text class="bar-l" :style="{ color: C.sub }">步数</text>
        <text class="bar-v" :style="{ color: stepsLeft <= 5 ? C.danger : C.text }">{{ stepsLeft }}</text>
      </view>
    </view>

    <view v-if="comboShow" class="combo" :style="{ color: C.danger }">{{ comboText }}</view>

    <!-- 棋盘 -->
    <view class="board" :style="{ background: C.board, borderColor: C.border }">
      <view
        v-for="(c, i) in grid"
        :key="i"
        class="cell"
        :class="{ sel: sel === i, fading: c === -1, bomb: cellType[i] === 'bomb', rainbow: cellType[i] === 'rainbow' }"
        :style="{ background: c === -1 ? 'transparent' : colorOf(c), transform: sel === i ? 'scale(0.9)' : 'scale(1)', boxShadow: sel === i ? '0 4rpx 12rpx rgba(0,0,0,.35)' : 'none' }"
        @click="tap(i)"
      >
        <text v-if="cellType[i] === 'bomb'" class="glyph">💣</text>
        <text v-else-if="cellType[i] === 'rainbow'" class="glyph">🌈</text>
      </view>
    </view>

    <view v-if="over" class="mask">
      <view class="mask-c" :style="{ background: C.card }">
        <text class="mask-t" :style="{ color: C.text }">{{ win ? '🎉 通关！' : '步数用尽' }}</text>
        <text class="mask-s" :style="{ color: C.primary }">分数 {{ score }}</text>
        <text v-if="isNewRecord" class="mask-r" :style="{ color: C.danger }">★ 新纪录</text>
        <button class="btn" :style="{ background: C.primary }" @click="reset">{{ win ? '下一关' : '重新开始' }}</button>
      </view>
    </view>

    <view class="row">
      <button class="btn" :style="{ background: C.primary }" @click="reset">重新开始</button>
    </view>
    <view class="tip" :style="{ color: C.sub }">点两个相邻方块交换 · 4连出炸弹 · 5连出彩虹</view>
  </view>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { useGame, vibrate, playSound, destroySound, pickColors } from '../../common/game'

const C = computed(() => pickColors(theme.mode === 'dark'))
const { best, isNewRecord, submitScore } = useGame('match3')

const N = 8          // 8×8 网格
const K = 6          // 6 种颜色
// 鲜艳易区分的 6 色（light 模式），dark 模式略调亮
const PAL_LIGHT = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22']
const PAL_DARK = ['#ff6b6b', '#5dade2', '#52d68a', '#f7d154', '#bb8fce', '#f0a060']

const grid = ref([])         // 每格颜色索引 0~K-1，-1 表示消除中
const cellType = ref([])     // '' | 'bomb' | 'rainbow'
const sel = ref(-1)
const score = ref(0)
const level = ref(1)
const stepsLeft = ref(20)
const over = ref(false)
const win = ref(false)
const comboShow = ref(false)
let comboTimer = null
let resolving = false

const goal = computed(() => {
  // 100 / 300 / 600 / 1000 / 1500 ... 每关递增
  const bases = [100, 300, 600, 1000, 1500]
  return level.value <= bases.length ? bases[level.value - 1] : 1500 + (level.value - 5) * 600
})

function colorOf(c) {
  return (theme.mode === 'dark' ? PAL_DARK : PAL_LIGHT)[c]
}
function rnd() { return Math.floor(Math.random() * K) }
function idx(r, c) { return r * N + c }

// 生成无初始消除的盘面
function genBoard() {
  let g
  let tries = 0
  do {
    g = Array.from({ length: N * N }, () => rnd())
    tries++
  } while (findMatches(g).some((x) => x) && tries < 50)
  return g
}

function findMatches(g) {
  const m = Array(N * N).fill(false)
  // 横向 3+ 连
  for (let r = 0; r < N; r++) {
    let run = 1
    for (let c = 1; c <= N; c++) {
      if (c < N && g[idx(r, c)] === g[idx(r, c - 1)] && g[idx(r, c)] !== -1) run++
      else {
        if (run >= 3) for (let k = c - run; k < c; k++) m[idx(r, k)] = true
        run = 1
      }
    }
  }
  // 纵向 3+ 连
  for (let c = 0; c < N; c++) {
    let run = 1
    for (let r = 1; r <= N; r++) {
      if (r < N && g[idx(r, c)] === g[idx(r - 1, c)] && g[idx(r, c)] !== -1) run++
      else {
        if (run >= 3) for (let k = r - run; k < r; k++) m[idx(k, c)] = true
        run = 1
      }
    }
  }
  return m
}

// 计算每段连续段长度，用于特殊块判定
function runLengths(g) {
  const horiz = [] // {r, c0, len, color}
  for (let r = 0; r < N; r++) {
    let run = 1
    for (let c = 1; c <= N; c++) {
      if (c < N && g[idx(r, c)] === g[idx(r, c - 1)] && g[idx(r, c)] !== -1) run++
      else {
        if (run >= 3) horiz.push({ r, c0: c - run, len: run, color: g[idx(r, c - 1)] })
        run = 1
      }
    }
  }
  const vert = []
  for (let c = 0; c < N; c++) {
    let run = 1
    for (let r = 1; r <= N; r++) {
      if (r < N && g[idx(r, c)] === g[idx(r - 1, c)] && g[idx(r, c)] !== -1) run++
      else {
        if (run >= 3) vert.push({ c, r0: r - run, len: run, color: g[idx(r - 1, c)] })
        run = 1
      }
    }
  }
  return { horiz, vert }
}

// 处理消除链
async function resolve() {
  resolving = true
  let totalCleared = 0
  let chain = 0
  while (true) {
    const g = grid.value.slice()
    const m = findMatches(g)
    if (!m.some((x) => x)) break
    chain++
    // 计算特殊块生成
    const { horiz, vert } = runLengths(g)
    const specials = [] // {idx, type}
    for (const h of horiz) {
      if (h.len >= 5) specials.push({ idx: idx(h.r, h.c0), type: 'rainbow' })
      else if (h.len >= 4) specials.push({ idx: idx(h.r, h.c0), type: 'bomb' })
    }
    for (const v of vert) {
      if (v.len >= 5) specials.push({ idx: idx(v.r0, v.c), type: 'rainbow' })
      else if (v.len >= 4) specials.push({ idx: idx(v.r0, v.c), type: 'bomb' })
    }

    // 标记消除
    const cleared = m.filter((x) => x).length
    totalCleared += cleared
    for (let i = 0; i < m.length; i++) if (m[i]) g[i] = -1
    grid.value = g.slice()
    playSound('hit')
    vibrate('short')
    await wait(200) // 淡出动画

    // 应用炸弹（炸 3×3）和彩虹（消同色全部）
    let g2 = grid.value.slice()
    const types = cellType.value.slice()
    let bombBlast = new Set()
    for (let i = 0; i < m.length; i++) {
      if (m[i] && types[i] === 'bomb') {
        const r = Math.floor(i / N), c = i % N
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc
          if (nr >= 0 && nr < N && nc >= 0 && nc < N) bombBlast.add(idx(nr, nc))
        }
      }
    }
    // 彩虹消同色：从 5+ 连段收集颜色，再炸掉所有该色块
    const mColors = new Set()
    for (const h of horiz) if (h.len >= 5) mColors.add(h.color)
    for (const v of vert) if (v.len >= 5) mColors.add(v.color)
    for (let i = 0; i < N * N; i++) {
      if (!m[i] && g2[i] !== -1 && mColors.has(g2[i])) bombBlast.add(i)
    }
    if (bombBlast.size) {
      bombBlast.forEach((i) => { g2[i] = -1 })
      totalCleared += bombBlast.size
      grid.value = g2.slice()
      playSound('hit')
      vibrate('short')
      await wait(180)
    }

    // 下落 + 顶部补充
    const g3 = grid.value.slice()
    const t3 = cellType.value.slice()
    for (let c = 0; c < N; c++) {
      const col = []
      const colT = []
      for (let r = N - 1; r >= 0; r--) {
        const i = idx(r, c)
        if (g3[i] !== -1) { col.push(g3[i]); colT.push(t3[i]) }
      }
      while (col.length < N) { col.push(rnd()); colT.push('') }
      for (let r = N - 1, k = 0; r >= 0; r--, k++) {
        g3[idx(r, c)] = col[k]
        t3[idx(r, c)] = colT[k]
      }
    }
    // 放置新生成的特殊块（覆盖对应位置）
    for (const sp of specials) {
      // 只在仍是普通块（未被消除链覆盖）时放置
      if (g3[sp.idx] !== -1) {
        g3[sp.idx] = rnd()
        t3[sp.idx] = sp.type
      }
    }
    grid.value = g3
    cellType.value = t3
    await wait(300) // 下落动画

    // 连击计分：分数 = 消除数 × 10 × 连击数
    const gained = totalCleared * 10 * chain
    score.value += gained
    showCombo(chain)
  }
  resolving = false
  checkLevelStatus()
}

function showCombo(n) {
  if (n < 2) return
  comboShow.value = true
  comboText.value = `Combo x${n}!`
  if (comboTimer) clearTimeout(comboTimer)
  comboTimer = setTimeout(() => { comboShow.value = false }, 800)
}
const comboText = ref('')

function wait(ms) { return new Promise((r) => setTimeout(r, ms)) }

function checkLevelStatus() {
  if (score.value >= goal.value) {
    win.value = true
    over.value = true
    submitScore(score.value)
    playSound('win')
    vibrate('long')
  } else if (stepsLeft.value <= 0) {
    win.value = false
    over.value = true
    submitScore(score.value)
    playSound('fail')
    vibrate('long')
  }
}

function tap(i) {
  if (over.value || resolving) return
  if (sel.value === -1) { sel.value = i; playSound('tap'); return }
  if (sel.value === i) { sel.value = -1; return }
  const r1 = Math.floor(sel.value / N), c1 = sel.value % N
  const r2 = Math.floor(i / N), c2 = i % N
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) { sel.value = i; playSound('tap'); return }

  const g = grid.value.slice()
  const t = cellType.value.slice()
  // 交换
  ;[g[sel.value], g[i]] = [g[i], g[sel.value]]
  ;[t[sel.value], t[i]] = [t[i], t[sel.value]]

  // 特殊块触发：彩虹 + 任意 → 消该色全部
  if (t[i] === 'rainbow' || t[sel.value] === 'rainbow') {
    const rainbowAt = t[i] === 'rainbow' ? i : sel.value
    const otherAt = rainbowAt === i ? sel.value : i
    const color = g[otherAt]
    grid.value = g
    cellType.value = t
    // 把该色彩虹和所有该色块标记消除
    const g2 = grid.value.slice()
    for (let k = 0; k < N * N; k++) if (g2[k] === color) g2[k] = -1
    g2[rainbowAt] = -1
    grid.value = g2
    sel.value = -1
    stepsLeft.value--
    playSound('hit')
    vibrate('short')
    resolve()
    return
  }

  if (!findMatches(g).some((x) => x)) {
    sel.value = -1
    return
  }
  grid.value = g
  cellType.value = t
  sel.value = -1
  stepsLeft.value--
  resolve()
}

function reset() {
  if (win.value) {
    // 进入下一关，保留分数，步数补满
    level.value++
    stepsLeft.value = 20
    over.value = false
    win.value = false
    grid.value = genBoard()
    cellType.value = Array(N * N).fill('')
    sel.value = -1
  } else {
    level.value = 1
    score.value = 0
    stepsLeft.value = 20
    over.value = false
    win.value = false
    grid.value = genBoard()
    cellType.value = Array(N * N).fill('')
    sel.value = -1
    isNewRecord.value = false
  }
}

onLoad(() => reset())
onUnload(() => {
  if (comboTimer) clearTimeout(comboTimer)
  destroySound()
})
onUnmounted(() => {
  if (comboTimer) clearTimeout(comboTimer)
})
</script>

<style scoped>
.page { min-height: 100vh; padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.title { font-size: 40rpx; font-weight: 800; }
.best { font-size: 22rpx; color: #fff; padding: 6rpx 18rpx; border-radius: 20rpx; }

.bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; padding: 14rpx 18rpx; border-radius: 14rpx; border: 2rpx solid; margin-bottom: 14rpx; }
.bar-i { display: flex; flex-direction: column; align-items: center; flex: 1; }
.bar-l { font-size: 20rpx; }
.bar-v { font-size: 32rpx; font-weight: 800; margin-top: 4rpx; }

.combo { position: absolute; top: 320rpx; left: 0; right: 0; text-align: center; font-size: 60rpx; font-weight: 900; text-shadow: 0 4rpx 12rpx rgba(0,0,0,.4); z-index: 5; animation: pop 0.4s; }
@keyframes pop { 0% { transform: scale(0.3); opacity: 0; } 60% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); } }

.board { width: min(630rpx, 92vw); height: min(630rpx, 92vw); display: grid; grid-template-columns: repeat(8, 1fr); grid-template-rows: repeat(8, 1fr); gap: 4rpx; padding: 6rpx; border-radius: 12rpx; border: 2rpx solid; }
.cell { border-radius: 8rpx; display: flex; align-items: center; justify-content: center; transition: transform 0.18s, opacity 0.2s, box-shadow 0.18s; }
.cell.fading { opacity: 0; transform: scale(0.3); }
.cell.bomb, .cell.rainbow { font-size: 0; }
.glyph { font-size: 28rpx; line-height: 1; }

.row { display: flex; gap: 16rpx; margin-top: 18rpx; }
.btn { color: #fff; border-radius: 40rpx; padding: 0 50rpx; font-size: 28rpx; line-height: 70rpx; }
.tip { font-size: 22rpx; margin-top: 12rpx; }

.mask { position: fixed; left: 0; right: 0; top: 0; bottom: 0; background: rgba(0,0,0,.55); display: flex; align-items: center; justify-content: center; z-index: 10; }
.mask-c { width: 480rpx; padding: 40rpx; border-radius: 18rpx; display: flex; flex-direction: column; align-items: center; }
.mask-t { font-size: 36rpx; font-weight: 800; }
.mask-s { font-size: 30rpx; margin-top: 12rpx; }
.mask-r { font-size: 24rpx; margin-top: 8rpx; }
.mask-c .btn { margin-top: 22rpx; }
</style>
