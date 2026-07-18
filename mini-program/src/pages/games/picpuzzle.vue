<template>
  <view class="page" :class="{ dark }">
    <view class="hd">图片拼图</view>
    <view class="status">{{ status }}</view>
    <view class="board">
      <view v-for="(e, i) in grid" :key="i" class="cell"
        :class="{ blank: e === 0 }" @click="tap(i)">
        <text v-if="e">{{ tiles[e - 1] }}</text>
      </view>
    </view>
    <button class="btn" @click="reset">换一张</button>
  </view>
</template>

<script setup>
import { ref, computed} from 'vue'
import { theme } from '../../common/store'
import { onLoad } from '@dcloudio/uni-app'
const dark = computed(() => theme.mode === 'dark')

const tiles = ['🍎','🍌','🍇','🍉','🍓','🍒','🥝','🍑']
const N = 3
const grid = ref([])
const status = ref('把水果拼回完整图片，空格在右下')

function gen() {
  let g = [...Array(N * N).keys()]
  do { for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [g[i], g[j]] = [g[j], g[i]] } } while (g[N * N - 1] !== 0 || solved(g))
  grid.value = g
  status.value = '把水果拼回完整图片，空格在右下'
}
function solved(g) { return g.every((v, i) => v === (i + 1) % (N * N)) }
function tap(i) {
  const g = grid.value
  const z = g.indexOf(0)
  const r1 = Math.floor(i / N), c1 = i % N
  const r2 = Math.floor(z / N), c2 = z % N
  if (Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1) {
    ;[g[i], g[z]] = [g[z], g[i]]
    grid.value = g.slice()
    if (solved(g)) status.value = '🎉 拼好啦！'
  }
}
function reset() { gen() }
onLoad(() => gen())
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 30rpx; display: flex; flex-direction: column; align-items: center; }
.hd { font-size: 36rpx; font-weight: 800; color: #a07b3b; }
.status { font-size: 24rpx; color: var(--c-title); margin: 12rpx 0; }
.board { width: 540rpx; height: 540rpx; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8rpx; background: #8a6d3b; padding: 8rpx; border-radius: 14rpx; }
.cell { background: #f3e2c0; border-radius: 10rpx; display: flex; align-items: center; justify-content: center; font-size: 80rpx; }
.cell.blank { background: #d9c9a3; }
.btn { margin-top: 22rpx; background: #e6a23c; color: #fff; border-radius: 40rpx; padding: 0 60rpx; }
</style>
