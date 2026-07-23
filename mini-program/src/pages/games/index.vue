<template>
  <view class="page" :class="{ dark }">
    <view class="banner">🎮 小游戏合集</view>
    <view class="sub">共 {{ total }} 款 · 长按图标查看玩法</view>

    <view v-for="cat in cats" :key="cat.title" class="sec">
      <view class="sec-title">
        <text class="sec-icon">{{ cat.icon }}</text>
        <text>{{ cat.title }}</text>
        <text class="sec-cnt">{{ cat.items.length }}</text>
      </view>
      <view class="grid">
        <view
          v-for="g in cat.items"
          :key="g.path"
          class="cell"
          :style="{ background: g.bg || c.card, borderColor: g.bg ? g.bg : c.border }"
          @click="open(g.path)"
          @longpress="showInfo(g)"
        >
          <view class="ic">{{ g.icon }}</view>
          <view class="lb">{{ g.label }}</view>
          <view v-if="g.tag" class="tag" :class="g.tagType">{{ g.tag }}</view>
        </view>
      </view>
    </view>

    <!-- 玩法说明弹层 -->
    <view v-if="infoGame" class="mask" @click="infoGame = null">
      <view class="sheet" @click.stop>
        <view class="sh-ic">{{ infoGame.icon }}</view>
        <view class="sh-t">{{ infoGame.label }}</view>
        <view class="sh-desc">{{ infoGame.desc || '暂无说明' }}</view>
        <view class="sh-ctrl" v-if="infoGame.ctrl">
          <text class="sh-cl">操作：</text>
          <text class="sh-cr">{{ infoGame.ctrl }}</text>
        </view>
        <button class="sh-go" @click="open(infoGame.path); infoGame = null">开始游戏</button>
        <button class="sh-close" @click="infoGame = null">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { auth, theme } from '../../common/store'
import { pickColors } from '../../common/game'

const dark = computed(() => theme.mode === 'dark')
const c = computed(() => pickColors(dark.value))
const infoGame = ref(null)

const cats = [
  {
    title: '逻辑益智', icon: '🧠',
    items: [
      { label: '2048', icon: '🔢', path: '/pages/games/game2048', desc: '4×4 滑动合并相同数字到 2048', ctrl: '滑动方向 / 方向按钮 / 撤销', bg: '#ffe9c4' },
      { label: '数独', icon: '🔷', path: '/pages/games/sudoku', desc: '9×9 数独，3 档难度，笔记模式', ctrl: '点格子 → 数字盘', bg: '#d4ecff' },
      { label: '24 点', icon: '🧮', path: '/pages/games/game24', desc: '4 个数字用 +−×÷ 算出 24', ctrl: '点数字 → 点运算符', bg: '#ffe0e0' },
      { label: '井字棋', icon: '⭕', path: '/pages/games/tictactoe', desc: '3×3 三连，3 种模式（简单 AI / 大师 AI / 双人）', ctrl: '点格子落子', bg: '#e8f5e9' },
      { label: '五子棋', icon: '⚫', path: '/pages/games/gomoku', desc: '13×13 棋盘五连，AI 对战或双人', ctrl: '点交叉点落子', bg: '#f5e9d4' },
      { label: '记忆翻牌', icon: '🃏', path: '/pages/games/memory', desc: '3D 翻转配对，3 档难度 + 3 主题', ctrl: '点卡片翻面', bg: '#fce4ec' },
    ],
  },
  {
    title: '策略拼图', icon: '🧩',
    items: [
      { label: '消消乐', icon: '🟦', path: '/pages/games/match3', desc: '8×8 三消，炸弹 / 彩虹 / 关卡', ctrl: '点两个相邻方块交换', bg: '#fff3d6' },
      { label: '数字华容道', icon: '🚂', path: '/pages/games/puzzle15', desc: '3×3 / 4×4 / 5×5 滑动排序', ctrl: '点相邻块 / 滑动', bg: '#e0f7fa' },
      { label: '图片拼图', icon: '🖼️', path: '/pages/games/picpuzzle', desc: '6 种 emoji 图案切图还原', ctrl: '点相邻块 / 滑动', bg: '#f3e5f5' },
      { label: '颜色反应', icon: '🎨', path: '/pages/games/colorreact', desc: 'Stroop 测试，30 秒连击挑战', ctrl: '点对应墨色选项', bg: '#fff8e1' },
      { label: '数字排序', icon: '🔢', path: '/pages/games/numbersort', desc: '相邻交换排序到升序', ctrl: '点两个相邻格子', bg: '#e8eaf6' },
      { label: '扫雷', icon: '💣', path: '/pages/games/minesweeper', desc: '经典扫雷，首击保护，3 档难度', ctrl: '点击揭开 / 双击快速揭开 / 长按插旗', bg: '#efebe9' },
      { label: '一笔画', icon: '✏️', path: '/pages/games/onetouch', tag: '新', tagType: 'new', desc: '5 关递增，从起点画线经过所有格子到终点', ctrl: '滑动屏幕画线', bg: '#e3f2fd' },
      { label: '数字推盘', icon: '🎯', path: '/pages/games/slidepuzzle', tag: '新', tagType: 'new', desc: '顺序/倒序/蛇形/螺旋 4 种目标模式', ctrl: '点相邻块 / 滑动', bg: '#f1f8e9' },
    ],
  },
  {
    title: '动作反应', icon: '⚡',
    items: [
      { label: '贪吃蛇', icon: '🐍', path: '/pages/games/snake', desc: '纯滑动手势，速度档可调', ctrl: '滑动屏幕控制方向', bg: '#e8f5e9' },
      { label: '俄罗斯方块', icon: '🎮', path: '/pages/games/tetris', desc: '7 色方块 + Next 预览 + 落点预测', ctrl: '左右滑移动 / 上滑旋转 / 下滑软降 / 长按硬降', bg: '#e1f5fe' },
      { label: '飞机大战', icon: '✈️', path: '/pages/games/plane', desc: '火力升级 + Boss 关卡 + 3 命', ctrl: '滑动控制玩家位置', bg: '#e3f2fd' },
      { label: '极速摩托', icon: '🏍️', path: '/pages/games/moto', desc: '3 车道道路滚动，速度递增', ctrl: '左右滑切换车道', bg: '#fff3e0' },
      { label: '汽车躲避', icon: '🚗', path: '/pages/games/cardodge', desc: '4 车道高速公路 + 金币系统', ctrl: '左右滑切换车道', bg: '#ffebee' },
      { label: '打地鼠', icon: '🔨', path: '/pages/games/whack', desc: '9 洞同时多鼠 + 连击 + 金鼠', ctrl: '点地鼠打中', bg: '#fff8e1' },
      { label: '弹球打砖块', icon: '🧱', path: '/pages/games/breakout', tag: '新', tagType: 'new', desc: '滑动挡板反弹球，3 档难度', ctrl: '滑动屏幕控制挡板', bg: '#e0f2f1' },
      { label: '像素鸟', icon: '🐦', path: '/pages/games/flappy', tag: '新', tagType: 'new', desc: '点击跳跃穿过管道', ctrl: '点屏幕拍翅', bg: '#e1f5fe' },
      { label: '别踩白块', icon: '⬛', path: '/pages/games/tapblack', tag: '新', tagType: 'new', desc: '4 列下落，点黑块得分', ctrl: '点黑块', bg: '#fafafa' },
      { label: '跳一跳', icon: '🤸', path: '/pages/games/jump', tag: '新', tagType: 'new', desc: '长按蓄力跳到下一平台', ctrl: '长按蓄力，松手跳跃', bg: '#f3e5f5' },
      { label: '接金币', icon: '🪙', path: '/pages/games/catchcoin', tag: '新', tagType: 'new', desc: '左右移动接金币躲炸弹', ctrl: '滑动控制篮子', bg: '#fff8e1' },
    ],
  },
  {
    title: '休闲对抗', icon: '🎲',
    items: [
      { label: '摇骰子', icon: '🎲', path: '/pages/games/dice', tag: '新', tagType: 'new', desc: '押注大/小/豹子，摇手机或点按钮', ctrl: '摇手机 / 点按钮', bg: '#e8eaf6' },
      { label: '颜色匹配', icon: '🌈', path: '/pages/games/colormatch', tag: '新', tagType: 'new', desc: '30 秒找最接近目标色，连击 ×2', ctrl: '点对应色块', bg: '#fce4ec' },
    ],
  },
]

const total = computed(() => cats.reduce((s, c) => s + c.items.length, 0))

function open(p) {
  uni.navigateTo({ url: p })
}
function showInfo(g) {
  infoGame.value = g
  uni.vibrateShort && uni.vibrateShort({ type: 'light' })
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { background: var(--c-bg); min-height: 100vh; color: var(--c-text); padding: 30rpx; }
.banner { font-size: 44rpx; font-weight: 800; color: #a07b3b; text-align: center; margin-bottom: 8rpx; }
.sub { font-size: 22rpx; color: var(--c-sub); text-align: center; margin-bottom: 30rpx; }
.sec { margin-bottom: 36rpx; }
.sec-title { font-size: 30rpx; font-weight: 700; color: #a07b3b; margin-bottom: 18rpx; display: flex; align-items: center; gap: 12rpx; }
.sec-icon { font-size: 32rpx; }
.sec-cnt { font-size: 22rpx; color: var(--c-sub); background: var(--c-card); padding: 2rpx 16rpx; border-radius: 18rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.cell { background: var(--c-card); border: 1px solid var(--c-border); border-radius: 20rpx; padding: 28rpx 6rpx; display: flex; flex-direction: column; align-items: center; position: relative; transition: transform 0.12s, box-shadow 0.12s; }
.cell:active { transform: scale(0.94); box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.1); }
.ic { font-size: 56rpx; line-height: 1; }
.lb { margin-top: 12rpx; color: var(--c-title); font-size: 24rpx; font-weight: 600; }
.tag { position: absolute; top: 8rpx; right: 8rpx; font-size: 18rpx; padding: 2rpx 10rpx; border-radius: 10rpx; color: #fff; font-weight: 700; }
.tag.new { background: #e64340; }
.tag.hot { background: #e6a23c; }

/* 玩法说明弹层 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; z-index: 100; padding: 40rpx; box-sizing: border-box; }
.sheet { width: 100%; max-width: 560rpx; background: var(--c-card); border-radius: 24rpx; padding: 40rpx 30rpx 30rpx; box-sizing: border-box; }
.sh-ic { font-size: 80rpx; text-align: center; }
.sh-t { font-size: 34rpx; font-weight: 700; color: var(--c-title); text-align: center; margin-top: 12rpx; }
.sh-desc { font-size: 26rpx; color: var(--c-text); line-height: 1.7; margin-top: 18rpx; padding: 18rpx 20rpx; background: var(--c-card2, #f5f5f5); border-radius: 14rpx; }
.sh-ctrl { font-size: 24rpx; color: var(--c-sub); margin-top: 14rpx; }
.sh-cl { color: var(--c-primary); }
.sh-cr { margin-left: 8rpx; }
.sh-go { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 30rpx; margin-top: 22rpx; height: 84rpx; line-height: 84rpx; }
.sh-close { background: transparent; color: var(--c-sub); border: 1px solid var(--c-border); border-radius: 50rpx; font-size: 28rpx; margin-top: 14rpx; height: 76rpx; line-height: 76rpx; }

/* 暗色模式 */
.dark .banner { color: #f0a64a; }
.dark .sec-title { color: #f0a64a; }
.dark .cell { background: #2a2a2a !important; border-color: #404040; }
.dark .sh-desc { background: #1f1f1f; }
</style>
