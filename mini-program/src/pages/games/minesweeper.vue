<template>
  <view class="page" :class="{ dark }">
    <view class="hd">扫雷</view>
    <view class="status">💣 {{ mines }} · 标记 {{ flags }} · {{ status }}</view>
    <view class="board">
      <view v-for="(c, i) in cells" :key="i" class="cell"
        :class="{ open: c.open, mine: c.open && c.mine, flag: c.flag }"
        @click="reveal(i)" @longpress="flag(i)">
        <text v-if="c.flag">🚩</text>
        <text v-else-if="c.open && c.mine">💣</text>
        <text v-else-if="c.open && c.n">{{ c.n }}</text>
      </view>
    </view>
    <view class="tip">单击揭开方块，长按插旗</view>
    <button class="btn" @click="reset">重新开始</button>
  </view>
</template>

<script setup>
import { ref, computed} from 'vue'
import { theme } from '../../common/store'
import { onLoad } from '@dcloudio/uni-app'
const dark = computed(() => theme.mode === 'dark')

const R = 9, C = 9, mines = 10
const cells = ref([])
const flags = ref(0)
const status = ref('进行中')
let over = false

function gen() {
  const g = Array.from({ length: R * C }, () => ({ mine: false, n: 0, open: false, flag: false }))
  let placed = 0
  while (placed < mines) {
    const i = Math.floor(Math.random() * R * C)
    if (!g[i].mine) { g[i].mine = true; placed++ }
  }
  for (let i = 0; i < R * C; i++) {
    if (g[i].mine) continue
    let cnt = 0
    forNeighbors(i, (ni) => { if (g[ni].mine) cnt++ })
    g[i].n = cnt
  }
  cells.value = g
  flags.value = 0
  status.value = '进行中'
  over = false
}
function forNeighbors(i, cb) {
  const r = Math.floor(i / C), c = i % C
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue
    const nr = r + dr, nc = c + dc
    if (nr >= 0 && nr < R && nc >= 0 && nc < C) cb(nr * C + nc)
  }
}
function reveal(i) {
  if (over) return
  const c = cells.value[i]
  if (c.flag || c.open) return
  c.open = true
  if (c.mine) { status.value = '💥 踩雷了'; over = true; cells.value.forEach((x) => (x.open = true)); return }
  if (c.n === 0) flood(i)
  checkWin()
}
function flood(i) {
  forNeighbors(i, (ni) => {
    const c = cells.value[ni]
    if (!c.open && !c.mine && !c.flag) { c.open = true; if (c.n === 0) flood(ni) }
  })
}
function flag(i) {
  if (over) return
  const c = cells.value[i]
  if (c.open) return
  c.flag = !c.flag
  flags.value += c.flag ? 1 : -1
}
function checkWin() {
  const left = cells.value.filter((c) => !c.open && !c.mine).length
  if (left === 0) { status.value = '🎉 通关！'; over = true }
}
function reset() { gen() }
onLoad(() => gen())
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 24rpx; color: var(--c-title); margin: 8rpx 0; }
.board { width: 630rpx; display: grid; grid-template-columns: repeat(9, 1fr); gap: 4rpx; background: #8a6d3b; padding: 4rpx; border-radius: 10rpx; }
.cell { width: 62rpx; height: 62rpx; background: #e8dcc0; display: flex; align-items: center; justify-content: center; font-size: 26rpx; color: #2c3e50; }
.cell.open { background: #f7f1e3; }
.cell.mine { background: #e74c3c; }
.cell.flag { background: #f6c453; }
.tip { font-size: 22rpx; color: var(--c-sub); margin: 10rpx 0; }
.btn { margin-top: 8rpx; background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 60rpx; font-size: 26rpx; }
</style>
