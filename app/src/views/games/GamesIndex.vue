<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

const router = useRouter()

const games = [
  {
    name: '24点',
    desc: '加减乘除，凑出24',
    icon: '🧮',
    bg: 'bg-gradient-to-br from-mint-100 to-sky2-100',
    route: 'game-24point',
    tag: '数学',
  },
  {
    name: '2048',
    desc: '合并数字，挑战最高分',
    icon: '🔢',
    bg: 'bg-gradient-to-br from-butter-100 to-butter-200',
    route: 'game-2048',
    tag: '经典',
  },
  {
    name: '扫雷',
    desc: '逻辑推理，避开地雷',
    icon: '💣',
    bg: 'bg-gradient-to-br from-sky2-100 to-sky2-200',
    route: 'game-minesweeper',
    tag: '经典',
  },
  {
    name: '贪吃蛇',
    desc: '吃豆豆，越吃越长',
    icon: '🐍',
    bg: 'bg-gradient-to-br from-mint-100 to-mint-200',
    route: 'game-snake',
    tag: '经典',
  },
  {
    name: '井字棋',
    desc: '三子连线，谁与争锋',
    icon: '⭕',
    bg: 'bg-gradient-to-br from-sakura-100 to-sakura-200',
    route: 'game-tic-tac-toe',
    tag: '对战',
  },
  {
    name: '五子棋',
    desc: '黑白对弈，五子连珠',
    icon: '⚫',
    bg: 'bg-gradient-to-br from-cocoa-100 to-cocoa-200',
    route: 'game-gomoku',
    tag: '对战',
  },
  {
    name: '消消乐',
    desc: '消除方块，轻松解压',
    icon: '🧩',
    bg: 'bg-gradient-to-br from-sakura-100 to-butter-100',
    route: 'game-match3',
    tag: '休闲',
  },
  {
    name: '打地鼠',
    desc: '眼疾手快，反应测试',
    icon: '🔨',
    bg: 'bg-gradient-to-br from-mint-100 to-sakura-100',
    route: 'game-whack',
    tag: '反应',
  },
  {
    name: '数字华容道',
    desc: '滑动拼图，挑战智力',
    icon: '🧠',
    bg: 'bg-gradient-to-br from-sky2-100 to-mint-100',
    route: 'game-puzzle',
    tag: '益智',
  },
  {
    name: '俄罗斯方块',
    desc: '经典方块，消除得分',
    icon: '🎮',
    bg: 'bg-gradient-to-br from-sakura-100 to-sky2-100',
    route: 'game-tetris',
    tag: '经典',
  },
  {
    name: '飞机大战',
    desc: '驾驶战机，击落敌机',
    icon: '✈️',
    bg: 'bg-gradient-to-br from-sky2-100 to-mint-100',
    route: 'game-plane',
    tag: '动作',
  },
  {
    name: '极速摩托',
    desc: '切换车道，极限躲避',
    icon: '🏍️',
    bg: 'bg-gradient-to-br from-orange-100 to-sakura-100',
    route: 'game-motorcycle',
    tag: '竞速',
  },
  {
    name: '汽车躲避',
    desc: '左右闪避，来车不断',
    icon: '🚗',
    bg: 'bg-gradient-to-br from-sky2-100 to-butter-100',
    route: 'game-car-crash',
    tag: '动作',
  },
  {
    name: '数独',
    desc: '9x9 数字推理，锻炼逻辑',
    icon: '🔢',
    bg: 'bg-gradient-to-br from-butter-100 to-mint-100',
    route: 'game-sudoku',
    tag: '数字',
  },
  {
    name: '数字排序',
    desc: '按顺序点击数字，比比谁快',
    icon: '🚂',
    bg: 'bg-gradient-to-br from-mint-100 to-sky2-100',
    route: 'game-sequence',
    tag: '数字',
  },
  {
    name: '记忆翻牌',
    desc: '翻牌配对，考验记忆力',
    icon: '🃏',
    bg: 'bg-gradient-to-br from-sakura-100 to-butter-100',
    route: 'game-memory',
    tag: '益智',
  },
  {
    name: '图片拼图',
    desc: '15 数字滑块，还原有序',
    icon: '🧩',
    bg: 'bg-gradient-to-br from-sky2-100 to-sakura-100',
    route: 'game-slide-puzzle',
    tag: '益智',
  },
  {
    name: '颜色反应',
    desc: '斯特鲁普测试，挑战反应力',
    icon: '🎨',
    bg: 'bg-gradient-to-br from-rose-100 to-mint-100',
    route: 'game-color-match',
    tag: '益智',
  },
]

const gameCount = computed(() => games.length)

function goGame(route: string) {
  router.push({ name: route })
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🎮"
      title="小游戏合集"
      :description="`${gameCount}款经典小游戏，课间放松、摸鱼解压必备`"
      gradient="from-sakura-100 via-cream-50 to-mint-100"
      :status-text="`${gameCount}款游戏`"
      status-color="bg-sakura-100 text-sakura-600"
    />

    <!-- 游戏网格 -->
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
      <div
        v-for="g in games"
        :key="g.route"
        class="card-flat p-4 cursor-pointer hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95"
        @click="goGame(g.route)"
      >
        <div
          class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-3"
          :class="g.bg"
        >
          {{ g.icon }}
        </div>
        <div class="flex items-center justify-between">
          <h3 class="font-medium text-cocoa-800">{{ g.name }}</h3>
          <span
            v-if="g.tag"
            class="text-[10px] px-1.5 py-0.5 rounded-full bg-cream-100 text-cocoa-500"
          >
            {{ g.tag }}
          </span>
        </div>
        <p class="text-xs text-cocoa-400 mt-1">{{ g.desc }}</p>
      </div>
    </div>

    <!-- 提示 -->
    <div class="text-center text-xs text-cocoa-300 pt-2">
      💡 课间休息 5 分钟，放松一下再继续工作吧
    </div>
  </div>
</template>
