<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <text>2048</text>
      <text class="score">分数 {{ score }}</text>
    </view>
    <view class="board"
      @touchstart="ts" @touchend="te">
      <view v-for="(c, i) in flat" :key="i" class="cell" :class="'v' + c">
        <text v-if="c">{{ c }}</text>
      </view>
    </view>
    <view class="row">
      <button class="btn" @click="move(3)">←</button>
      <button class="btn" @click="move(1)">↑</button>
      <button class="btn" @click="move(2)">↓</button>
      <button class="btn" @click="move(4)">→</button>
    </view>
    <button class="btn restart" @click="reset">重新开始</button>
    <view v-if="over" class="over">游戏结束，分数 {{ score }}</view>
  </view>
</template>

<script setup>
import { ref, computed} from 'vue'
import { theme } from '../../common/store'
import { onLoad } from '@dcloudio/uni-app'
const dark = computed(() => theme.mode === 'dark')

const size = 4
const board = ref([])
const score = ref(0)
const over = ref(false)
const flat = ref(Array(16).fill(0))
let sx = 0, sy = 0

function clone(b) { return b.map((r) => r.slice()) }
function init() {
  const b = Array.from({ length: size }, () => Array(size).fill(0))
  addRand(b); addRand(b)
  board.value = b
  sync()
}
function addRand(b) {
  const e = []
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (b[i][j] === 0) e.push([i, j])
  if (!e.length) return
  const [i, j] = e[Math.floor(Math.random() * e.length)]
  b[i][j] = Math.random() < 0.9 ? 2 : 4
}
function sync() {
  const f = []
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) f.push(board.value[i][j])
  flat.value = f
}
// dir: 1 up,2 down,3 left,4 right
function move(dir) {
  if (over.value) return
  const b = clone(board.value)
  let gained = 0
  const getLine = (i) => {
    if (dir === 3) return b[i]
    if (dir === 4) return b[i].slice().reverse()
    if (dir === 1) return b.map((r) => r[i])
    return b.map((r) => r[i]).reverse()
  }
  const setLine = (i, line) => {
    if (dir === 3) b[i] = line
    else if (dir === 4) b[i] = line.reverse()
    else if (dir === 1) for (let k = 0; k < size; k++) b[k][i] = line[k]
    else for (let k = 0; k < size; k++) b[size - 1 - k][i] = line[k]
  }
  const compress = (line) => {
    let arr = line.filter((x) => x)
    for (let k = 0; k < arr.length - 1; k++) {
      if (arr[k] === arr[k + 1]) { arr[k] *= 2; gained += arr[k]; arr.splice(k + 1, 1) }
    }
    while (arr.length < size) arr.push(0)
    return arr
  }
  for (let i = 0; i < size; i++) setLine(i, compress(getLine(i)))
  const changed = JSON.stringify(b) !== JSON.stringify(board.value)
  board.value = b
  sync()
  if (changed) { score.value += gained; addRand(board.value); sync(); checkOver() }
}
function checkOver() {
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) if (board.value[i][j] === 0) return
  for (let i = 0; i < size; i++) for (let j = 0; j < size; j++) {
    const v = board.value[i][j]
    if (j < size - 1 && board.value[i][j + 1] === v) return
    if (i < size - 1 && board.value[i + 1][j] === v) return
  }
  over.value = true
}
function ts(e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY }
function te(e) {
  const dx = e.changedTouches[0].clientX - sx
  const dy = e.changedTouches[0].clientY - sy
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 4 : 3)
  else move(dy > 0 ? 2 : 1)
}
function reset() {
  score.value = 0; over.value = false; init()
}
onLoad(() => reset())
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 30rpx; display: flex; flex-direction: column; align-items: center; }
.hd { width: 560rpx; display: flex; justify-content: space-between; font-size: 40rpx; font-weight: 800; color: #a07b3b; }
.score { font-size: 26rpx; color: #fff; background: #e6a23c; padding: 6rpx 18rpx; border-radius: 20rpx; align-self: center; }
.board { width: 560rpx; height: 560rpx; margin: 20rpx 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12rpx; background: #bbada0; padding: 12rpx; border-radius: 16rpx; }
.cell { background: #cdc1b4; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; font-size: 48rpx; font-weight: 700; color: #4a3f35; }
.cell.v2 { background: #eee4da; } .cell.v4 { background: #ede0c8; } .cell.v8 { background: #f2b179; color: #fff; }
.cell.v16 { background: #f59563; color: #fff; } .cell.v32 { background: #f67c5f; color: #fff; } .cell.v64 { background: #f65e3b; color: #fff; }
.cell.v128 { background: #edcf72; color: #fff; } .cell.v256 { background: #edcc61; color: #fff; } .cell.v512 { background: #edc850; color: #fff; }
.cell.v1024 { background: #edc53f; color: #fff; font-size: 36rpx; } .cell.v2048 { background: #edc22e; color: #fff; font-size: 34rpx; }
.row { display: flex; gap: 16rpx; }
.btn { background: #e6a23c; color: #fff; border-radius: 14rpx; font-size: 36rpx; padding: 0 30rpx; line-height: 70rpx; }
.restart { margin-top: 20rpx; padding: 0 50rpx; }
.over { margin-top: 16rpx; color: #c0392b; font-weight: 700; }
</style>
