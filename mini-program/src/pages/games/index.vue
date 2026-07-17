<template>
  <view class="page">
    <view class="banner">🎮 小游戏合集</view>
    <view v-for="cat in cats" :key="cat.title" class="sec">
      <view class="sec-title">{{ cat.title }}</view>
      <view class="grid">
        <view v-for="g in cat.items" :key="g.path" class="cell" @click="open(g.path)">
          <view class="ic">{{ g.icon }}</view>
          <view class="lb">{{ g.label }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'
import { auth } from '../../common/store'

const cats = [
  {
    title: '逻辑益智',
    items: [
      { label: '2048', icon: '🔢', path: '/pages/games/game2048' },
      { label: '数独', icon: '🔢', path: '/pages/games/sudoku' },
      { label: '24点', icon: '🧮', path: '/pages/games/game24' },
      { label: '井字棋', icon: '⭕', path: '/pages/games/tictactoe' },
      { label: '五子棋', icon: '⚫', path: '/pages/games/gomoku' },
      { label: '消消乐', icon: '🧩', path: '/pages/games/match3' },
      { label: '记忆翻牌', icon: '🃏', path: '/pages/games/memory' },
      { label: '数字华容道', icon: '🧠', path: '/pages/games/puzzle15' },
      { label: '图片拼图', icon: '🧩', path: '/pages/games/picpuzzle' },
      { label: '颜色反应', icon: '🎨', path: '/pages/games/colorreact' },
      { label: '数字排序', icon: '🚂', path: '/pages/games/numbersort' },
      { label: '扫雷', icon: '💣', path: '/pages/games/minesweeper' },
    ],
  },
  {
    title: '动作反应',
    items: [
      { label: '贪吃蛇', icon: '🐍', path: '/pages/games/snake' },
      { label: '俄罗斯方块', icon: '🎮', path: '/pages/games/tetris' },
      { label: '飞机大战', icon: '✈️', path: '/pages/games/plane' },
      { label: '极速摩托', icon: '🏍️', path: '/pages/games/moto' },
      { label: '汽车躲避', icon: '🚗', path: '/pages/games/cardodge' },
      { label: '打地鼠', icon: '🔨', path: '/pages/games/whack' },
    ],
  },
]

function open(p) {
  uni.navigateTo({ url: p })
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { padding: 30rpx; }
.banner { font-size: 40rpx; font-weight: 800; color: #a07b3b; text-align: center; margin-bottom: 24rpx; }
.sec { margin-bottom: 30rpx; }
.sec-title { font-size: 28rpx; font-weight: 700; color: #a07b3b; margin-bottom: 16rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.cell { background: #fff; border-radius: 20rpx; padding: 28rpx 6rpx; display: flex; flex-direction: column; align-items: center; }
.ic { font-size: 52rpx; }
.lb { margin-top: 10rpx; color: #4a3f35; font-size: 24rpx; }
</style>
