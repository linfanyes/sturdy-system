<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Gamepad2, Trophy } from 'lucide-vue-next'
import { fetchGameScores } from '@/api/games'

const router = useRouter()
const scores = ref<any[]>([])
const showBoard = ref(false)

interface GameItem {
  name: string
  icon: string
  desc: string
  route: string
  category: string
}

/** 加载当前教师的所有游戏最佳成绩（失败静默，榜单仅作为增强功能） */
async function loadScores() {
  try {
    scores.value = await fetchGameScores()
  } catch {
    scores.value = []
  }
}
onMounted(loadScores)

/** 各游戏在榜单中的显示名（与 games 数组对齐，未命中回退 gameKey） */
function scoreName(s: any): string {
  return s.gameName || s.gameKey || '未知游戏'
}

const GAME_CATEGORIES: { label: string; icon: string }[] = [
  { label: '益智类', icon: '🧠' },
  { label: '棋牌类', icon: '♟️' },
  { label: '动作类', icon: '🎮' },
  { label: '学科类', icon: '📚' },
  { label: '创意类', icon: '💡' },
]

const games: GameItem[] = [
  // 益智类
  { name: '24点', icon: '🧮', desc: '四张牌算出24', route: '/teacher/games/game24', category: '益智类' },
  { name: '2048', icon: '🔢', desc: '合并数字到2048', route: '/teacher/games/game2048', category: '益智类' },
  { name: '扫雷', icon: '💣', desc: '9×9经典扫雷', route: '/teacher/games/minesweeper', category: '益智类' },
  { name: '数独', icon: '🔢', desc: '9×9数独', route: '/teacher/games/sudoku', category: '益智类' },
  { name: '数字华容道', icon: '🧠', desc: '15数字归位', route: '/teacher/games/puzzle15', category: '益智类' },
  { name: '数字排序', icon: '🚂', desc: '按序点击', route: '/teacher/games/numberSort', category: '益智类' },
  { name: '数字推盘', icon: '🔢', desc: '顺序/倒序/蛇形/螺旋', route: '/teacher/games/slidingPuzzle', category: '益智类' },
  { name: '记忆翻牌', icon: '🃏', desc: '找出对子', route: '/teacher/games/memory', category: '益智类' },
  { name: '图片拼图', icon: '🧩', desc: '还原顺序', route: '/teacher/games/slidePuzzle', category: '益智类' },
  { name: '一笔画', icon: '✏️', desc: '从S画到E过所有格', route: '/teacher/games/onetouch', category: '益智类' },
  { name: '颜色反应', icon: '🎨', desc: '选字的颜色', route: '/teacher/games/colorReact', category: '益智类' },
  { name: '颜色匹配', icon: '🎯', desc: '选出最接近的目标色', route: '/teacher/games/colormatch', category: '益智类' },
  { name: '消消乐', icon: '🧩', desc: '三消游戏', route: '/teacher/games/match3', category: '益智类' },
  // 棋牌类
  { name: '井字棋', icon: '⭕', desc: '三连获胜', route: '/teacher/games/ticTacToe', category: '棋牌类' },
  { name: '五子棋', icon: '⚫', desc: '五子连珠', route: '/teacher/games/gomoku', category: '棋牌类' },
  { name: '摇骰子', icon: '🎲', desc: '比大小赢筹码', route: '/teacher/games/dice', category: '棋牌类' },
  // 动作类
  { name: '贪吃蛇', icon: '🐍', desc: '吃食物变长', route: '/teacher/games/snake', category: '动作类' },
  { name: '俄罗斯方块', icon: '🎮', desc: '消行得分', route: '/teacher/games/tetris', category: '动作类' },
  { name: '飞机大战', icon: '✈️', desc: '射击敌机', route: '/teacher/games/plane', category: '动作类' },
  { name: '极速摩托', icon: '🏍️', desc: '躲避障碍', route: '/teacher/games/motorcycle', category: '动作类' },
  { name: '汽车躲避', icon: '🚗', desc: '避开来车', route: '/teacher/games/carCrash', category: '动作类' },
  { name: '打地鼠', icon: '🔨', desc: '30秒计分', route: '/teacher/games/whack', category: '动作类' },
  { name: '别踩白块', icon: '⬛', desc: '点击黑块得分', route: '/teacher/games/tapblack', category: '动作类' },
  { name: '弹球打砖块', icon: '🧱', desc: '击碎所有砖块', route: '/teacher/games/breakout', category: '动作类' },
  { name: '接金币', icon: '🪙', desc: '接金币躲炸弹', route: '/teacher/games/catchcoin', category: '动作类' },
  { name: '像素鸟', icon: '🐦', desc: '穿越管道间隙', route: '/teacher/games/flappy', category: '动作类' },
  { name: '跳一跳', icon: '🟠', desc: '蓄力跳到下个平台', route: '/teacher/games/jump', category: '动作类' },
  // 学科类
  { name: '成语填空', icon: '📜', desc: '填写成语缺字', route: '/teacher/games/idiom', category: '学科类' },
  { name: '速算挑战', icon: '🔢', desc: '口算大比拼', route: '/teacher/games/speedMath', category: '学科类' },
  { name: '单词拼写', icon: '🔤', desc: '拼写英文单词', route: '/teacher/games/spelling', category: '学科类' },
  { name: '科学知识', icon: '🔬', desc: '科学知识问答', route: '/teacher/games/scienceQuiz', category: '学科类' },
  { name: '人文地理', icon: '🌍', desc: '地理人文问答', route: '/teacher/games/geoQuiz', category: '学科类' },
  // 创意类
  { name: '故事接龙', icon: '📖', desc: '一人一句编故事（创意写作）', route: '/teacher/games/storyChain', category: '创意类' },
]

const cardColors = [
  'bg-butter-100 hover:bg-butter-300',
  'bg-mint-100 hover:bg-mint-300',
  'bg-sakura-100 hover:bg-sakura-300',
  'bg-sky2-100 hover:bg-sky2-300',
  'bg-cream-200 hover:bg-cream-300',
]

function gamesByCategory(cat: string): GameItem[] {
  return games.filter(g => g.category === cat)
}

function go(route: string) {
  router.push(route)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Gamepad2 class="w-7 h-7 text-butter-500" /> 小游戏合集
      </h1>
      <button
        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-butter-100 text-cocoa-700 hover:bg-butter-200 transition-colors text-sm font-medium"
        @click="showBoard = !showBoard"
      >
        <Trophy class="w-4 h-4" /> {{ showBoard ? '收起榜单' : '我的得分榜' }}
      </button>
    </div>

    <!-- 得分榜 -->
    <div v-if="showBoard" class="bg-surface rounded-2xl p-5 shadow-softer">
      <h2 class="text-base font-semibold text-cocoa-900 mb-3 flex items-center gap-2">
        <Trophy class="w-5 h-5 text-butter-500" /> 游戏最佳成绩
      </h2>
      <div v-if="scores.length === 0" class="text-sm text-cocoa-400 py-4 text-center">
        暂无成绩记录，去玩一局并刷新即可上榜 🎮
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-cocoa-400 border-b border-cream-200">
              <th class="py-2 pr-4 font-medium">游戏</th>
              <th class="py-2 pr-4 font-medium">最佳分</th>
              <th class="py-2 pr-4 font-medium">最近分</th>
              <th class="py-2 font-medium">游玩次数</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(s, i) in scores" :key="s.id" class="border-b border-cream-100">
              <td class="py-2 pr-4 text-cocoa-800">
                <span class="inline-flex items-center gap-2">
                  <span class="text-butter-500 font-semibold w-5">{{ i + 1 }}</span>
                  {{ scoreName(s) }}
                </span>
              </td>
              <td class="py-2 pr-4 font-semibold text-cocoa-900">{{ s.bestScore }}</td>
              <td class="py-2 pr-4 text-cocoa-600">{{ s.lastScore }}</td>
              <td class="py-2 text-cocoa-600">{{ s.playCount }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-for="cat in GAME_CATEGORIES" :key="cat.label" class="space-y-3">
      <div class="flex items-center gap-2">
        <span class="text-2xl">{{ cat.icon }}</span>
        <h2 class="text-lg font-semibold text-cocoa-900">{{ cat.label }}</h2>
        <div class="flex-1 h-px bg-cream-200"></div>
        <span class="text-xs text-cocoa-400">{{ gamesByCategory(cat.label).length }} 款</span>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <button
          v-for="(g, i) in gamesByCategory(cat.label)"
          :key="g.route"
          class="bg-surface rounded-2xl p-5 shadow-softer text-left transition-colors hover:shadow-soft"
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
  </div>
</template>
