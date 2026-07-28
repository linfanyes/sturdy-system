<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, Gamepad2 } from 'lucide-vue-next'

const router = useRouter()

interface GameItem {
  name: string
  icon: string
  desc: string
  route: string
}

const games: GameItem[] = [
  { name: '24点', icon: '🧮', desc: '四张牌算出24', route: '/teacher/games/game24' },
  { name: '2048', icon: '🔢', desc: '合并数字到2048', route: '/teacher/games/game2048' },
  { name: '扫雷', icon: '💣', desc: '9×9经典扫雷', route: '/teacher/games/minesweeper' },
  { name: '贪吃蛇', icon: '🐍', desc: '吃食物变长', route: '/teacher/games/snake' },
  { name: '井字棋', icon: '⭕', desc: '三连获胜', route: '/teacher/games/ticTacToe' },
  { name: '五子棋', icon: '⚫', desc: '五子连珠', route: '/teacher/games/gomoku' },
  { name: '消消乐', icon: '🧩', desc: '三消游戏', route: '/teacher/games/match3' },
  { name: '打地鼠', icon: '🔨', desc: '30秒计分', route: '/teacher/games/whack' },
  { name: '数字华容道', icon: '🧠', desc: '15数字归位', route: '/teacher/games/puzzle15' },
  { name: '俄罗斯方块', icon: '🎮', desc: '消行得分', route: '/teacher/games/tetris' },
  { name: '飞机大战', icon: '✈️', desc: '射击敌机', route: '/teacher/games/plane' },
  { name: '极速摩托', icon: '🏍️', desc: '躲避障碍', route: '/teacher/games/motorcycle' },
  { name: '汽车躲避', icon: '🚗', desc: '避开来车', route: '/teacher/games/carCrash' },
  { name: '数独', icon: '🔢', desc: '9×9数独', route: '/teacher/games/sudoku' },
  { name: '数字排序', icon: '🚂', desc: '按序点击', route: '/teacher/games/numberSort' },
  { name: '记忆翻牌', icon: '🃏', desc: '找出对子', route: '/teacher/games/memory' },
  { name: '图片拼图', icon: '🧩', desc: '还原顺序', route: '/teacher/games/slidePuzzle' },
  { name: '颜色反应', icon: '🎨', desc: '选字的颜色', route: '/teacher/games/colorReact' },
  { name: '摇骰子', icon: '🎲', desc: '比大小赢筹码', route: '/teacher/games/dice' },
  { name: '别踩白块', icon: '⬛', desc: '点击黑块得分', route: '/teacher/games/tapBlack' },
  { name: '颜色匹配', icon: '🎯', desc: '选出最接近的目标色', route: '/teacher/games/colorMatching' },
  { name: '数字推盘', icon: '🔢', desc: '顺序/倒序/蛇形/螺旋', route: '/teacher/games/slidingPuzzle' },
  { name: '弹球打砖块', icon: '🧱', desc: '击碎所有砖块', route: '/teacher/games/breakout' },
  { name: '一笔画', icon: '✏️', desc: '从S画到E过所有格', route: '/teacher/games/oneTouch' },
  { name: '接金币', icon: '🪙', desc: '接金币躲炸弹', route: '/teacher/games/catchCoin' },
  { name: '像素鸟', icon: '🐦', desc: '穿越管道间隙', route: '/teacher/games/flappy' },
  { name: '跳一跳', icon: '🟠', desc: '蓄力跳到下个平台', route: '/teacher/games/jump' },
  // 学科小游戏
  { name: '成语填空', icon: '📜', desc: '填写成语缺字', route: '/teacher/games/idiom' },
  { name: '速算挑战', icon: '🔢', desc: '口算大比拼', route: '/teacher/games/speedMath' },
  { name: '单词拼写', icon: '🔤', desc: '拼写英文单词', route: '/teacher/games/spelling' },
  { name: '科学知识', icon: '🔬', desc: '科学知识问答', route: '/teacher/games/scienceQuiz' },
  { name: '人文地理', icon: '🌍', desc: '地理人文问答', route: '/teacher/games/geoQuiz' },
  // 创意型小游戏
  { name: '故事接龙', icon: '📖', desc: '一人一句编故事（创意写作）', route: '/teacher/games/storyChain' },
]

const cardColors = [
  'bg-butter-100 hover:bg-butter-300',
  'bg-mint-100 hover:bg-mint-300',
  'bg-sakura-100 hover:bg-sakura-300',
  'bg-sky2-100 hover:bg-sky2-300',
  'bg-cream-200 hover:bg-cream-300',
]

function go(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="space-y-6">
    <button
      class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm"
      @click="router.push('/teacher/games')"
    >
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Gamepad2 class="w-7 h-7 text-butter-500" /> 小游戏合集
    </h1>

    <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <button
        v-for="(g, i) in games"
        :key="g.route"
        class="bg-white rounded-2xl p-5 shadow-softer text-left transition-colors hover:shadow-soft"
        @click="go(g.route)"
      >
        <div
          class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3 transition-colors"
          :class="cardColors[i % cardColors.length]"
        >
          {{ g.icon }}
        </div>
        <div class="text-base font-semibold text-cocoa-900">{{ g.name }}</div>
        <div class="text-xs text-cocoa-500 mt-1">{{ g.desc }}</div>
      </button>
    </div>
  </div>
</template>
