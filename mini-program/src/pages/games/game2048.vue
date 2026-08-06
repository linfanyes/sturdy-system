<template>
  <view class="page" :style="{ background: c.bg, color: c.text }">
    <!-- 顶部状态条 -->
    <view class="top-bar">
      <view class="title">2048</view>
      <view class="scores">
        <view class="score-box">
          <text class="label">当前</text>
          <text class="val">{{ score }}</text>
        </view>
        <view class="score-box best">
          <text class="label">最高</text>
          <text class="val">{{ best }}</text>
        </view>
      </view>
    </view>

    <!-- 难度切换 -->
    <view class="diff-row">
      <view
        v-for="d in diffs"
        :key="d.size"
        class="diff"
        :class="{ on: size === d.size }"
        :style="size === d.size ? { background: c.primary, color: '#fff' } : { background: c.cell, color: c.sub }"
        @click="changeDiff(d.size)"
      >{{ d.label }}</view>
    </view>

    <!-- 棋盘 -->
    <view
      class="board"
      :style="{ background: c.board, width: boardW, height: boardW, gridTemplateColumns: 'repeat(' + size + ', 1fr)' }"
      @touchstart="ts"
      @touchend="te"
    >
      <view
        v-for="(cell, i) in flat"
        :key="i"
        class="cell"
        :style="{ background: c.cellAlt }"
      >
        <view
          v-if="cell.v"
          class="tile"
          :class="{ merged: cell.merged }"
          :style="tileStyle(cell.v)"
        >{{ cell.v }}</view>
      </view>
    </view>

    <!-- 操作区 -->
    <view class="ctrl">
      <view class="dpad">
        <view class="dpad-btn" :style="{ background: c.cell }" @click="move(1)">↑</view>
        <view class="dpad-row">
          <view class="dpad-btn" :style="{ background: c.cell }" @click="move(3)">←</view>
          <view class="dpad-btn" :style="{ background: c.cell }" @click="move(2)">↓</view>
          <view class="dpad-btn" :style="{ background: c.cell }" @click="move(4)">→</view>
        </view>
      </view>
    </view>

    <view class="btn-row">
      <button class="btn" :style="{ background: c.info, color: '#fff' }" @click="undo">撤销 ({{ history.length }})</button>
      <button class="btn" :style="{ background: c.primary, color: '#fff' }" @click="reset">重新开始</button>
    </view>

    <view v-if="over" class="over" :style="{ color: c.danger }">
      <text>游戏结束！分数 {{ score }}</text>
      <text v-if="isNewRecord" class="new-rec" :style="{ color: c.accent }">🎉 新纪录</text>
    </view>
  </view>
</template>

<script setup>
/**
 * 2048 —— 核心状态机已提升到 @gardener/shared/games/game2048。
 * 本文件保留：响应式桥接、合并动画计时、音效、撤销UI。
 * 合并/滑动/死局检测/undo 全部委托给 shared Game2048 实例。
 */
import { ref, computed } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { Game2048 } from '@gardener/shared/games/game2048'
import { theme } from '../../common/store'
import { pickColors, useGame, vibrate, playSound, destroySound } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const c = computed(() => pickColors(dark.value))
const { best, isNewRecord, submitScore } = useGame('2048')

const diffs = [
  { size: 4, label: '4×4 经典' },
  { size: 5, label: '5×5 大师' },
]
const size = ref(4)

// shared 状态机（size 不可动态变，diff 切换时重建）
let machine = new Game2048({ size: 4 })

// 响应式镜像（保持模板 API 不变）
const board = ref(cloneBoard(machine.board))
const score = ref(0)
const over = ref(false)
const history = ref([])
const flat = ref(syncFlat(machine))
let sx = 0, sy = 0

const boardW = computed(() => size.value === 4 ? 'min(630rpx, 92vw)' : 'min(700rpx, 94vw)')

const TILE_COLORS = {
  2: { bg: '#eee4da', fg: '#3a3a3a' },
  4: { bg: '#ede0c8', fg: '#3a3a3a' },
  8: { bg: '#f2b179', fg: '#fff' },
  16: { bg: '#f59563', fg: '#fff' },
  32: { bg: '#f67c5f', fg: '#fff' },
  64: { bg: '#f65e3b', fg: '#fff' },
  128: { bg: '#edcf72', fg: '#fff' },
  256: { bg: '#edcc61', fg: '#fff' },
  512: { bg: '#edc850', fg: '#fff' },
  1024: { bg: '#edc53f', fg: '#fff' },
  2048: { bg: '#edc22e', fg: '#fff' },
  4096: { bg: '#9b59b6', fg: '#fff' },
  8192: { bg: '#7d3c98', fg: '#fff' },
}
function tileStyle(v) {
  const t = TILE_COLORS[v] || { bg: '#5b2c6f', fg: '#fff' }
  return {
    background: t.bg,
    color: t.fg,
    fontSize: v >= 1024 ? '34rpx' : v >= 128 ? '40rpx' : '48rpx',
  }
}

function cloneBoard(b) { return b.map((r) => r.slice()) }
function syncFlat(m) {
  const N = m.size
  const arr = []
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++)
      arr.push({ v: m.board[i][j], merged: m.lastMerged.has(i * N + j) })
  return arr
}
function reSyncAll() {
  board.value = cloneBoard(machine.board)
  score.value = machine.score
  over.value = machine.over
  history.value = machine.historyList.slice()
  flat.value = syncFlat(machine)
}

/** 滑动方向（与 shared Game2048 对齐） */
function move(dir) {
  if (machine.over) return
  const res = machine.move(dir)
  if (!res.moved) return
  reSyncAll()
  if (res.gained > 0) { playSound('hit'); vibrate('short') }
  else playSound('tap')
  if (res.over) { playSound('fail'); vibrate('long'); submitScore(score.value) }
  // 合并动画：120ms 后清除 merged 标记
  if (res.mergedCells.size) {
    setTimeout(() => { machine.clearMerged(); flat.value = syncFlat(machine) }, 120)
  }
}

function undo() {
  if (!history.value.length || machine.over) return
  if (machine.undo()) { reSyncAll(); playSound('tap') }
}

function ts(e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function te(e) {
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left')
  else move(dy > 0 ? 'down' : 'up')
}

function changeDiff(s) {
  if (s === size.value) return
  size.value = s
  machine = new Game2048({ size: s })
  init()
}

function init() {
  machine.reset()
  reSyncAll()
  isNewRecord.value = false
}

function reset() { init() }

onLoad(() => init())
onUnload(() => { machine.clearHistory(); destroySound() })
</script>

<style scoped>
.page { min-height: 100vh; padding: 24rpx; display: flex; flex-direction: column; align-items: center; }
.top-bar { width: min(630rpx, 92vw); display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.title { font-size: 44rpx; font-weight: 800; }
.scores { display: flex; gap: 12rpx; }
.score-box { padding: 8rpx 18rpx; border-radius: 14rpx; display: flex; flex-direction: column; align-items: center; min-width: 120rpx; }
.score-box.best { background: rgba(230, 162, 60, 0.18); }
.label { font-size: 20rpx; opacity: 0.7; }
.val { font-size: 30rpx; font-weight: 700; }
.diff-row { display: flex; gap: 14rpx; margin-bottom: 16rpx; }
.diff { padding: 10rpx 22rpx; border-radius: 30rpx; font-size: 24rpx; }
.board { padding: 12rpx; border-radius: 18rpx; display: grid; gap: 12rpx; }
.cell { border-radius: 10rpx; display: flex; align-items: center; justify-content: center; }
.tile { width: 100%; height: 100%; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; font-weight: 800; transition: transform 0.1s ease; }
.tile.merged { transform: scale(1.12); }
.ctrl { margin-top: 22rpx; }
.dpad { display: flex; flex-direction: column; align-items: center; gap: 10rpx; }
.dpad-row { display: flex; gap: 10rpx; }
.dpad-btn { width: 90rpx; height: 90rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 38rpx; font-weight: 700; }
.btn-row { display: flex; gap: 18rpx; margin-top: 22rpx; }
.btn { border-radius: 40rpx; padding: 0 40rpx; font-size: 26rpx; line-height: 70rpx; }
.over { margin-top: 18rpx; font-size: 28rpx; font-weight: 700; display: flex; flex-direction: column; align-items: center; gap: 6rpx; }
.new-rec { font-size: 24rpx; }
</style>
