<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Gamepad2, Flame, Trophy } from 'lucide-vue-next'

const router = useRouter()

// 骰子点数对应的点阵位置（3x3 网格 0-8）
const pipMap: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

// 游戏状态
const chips = ref(1000)
const betType = ref<'big' | 'small' | 'leopard'>('big')
const betAmount = ref(100)
const amounts = [100, 500, 1000]
const playerDice = ref([1, 1, 1])
const aiDice = ref([1, 1, 1])
const rolling = ref(false)
const result = ref<{ type: 'win' | 'lose'; text: string; sub: string } | null>(null)
const history = ref<{ outcome: string; win: boolean; delta: number; type: string }[]>([])
const best = ref(parseInt(localStorage.getItem('web_game_dice_highscore') || '1000'))
let rollTimer: ReturnType<typeof setInterval> | null = null

const playerTotal = computed(() => playerDice.value.reduce((a, b) => a + b, 0))
const aiTotal = computed(() => aiDice.value.reduce((a, b) => a + b, 0))

// 判断是否为豹子
const isLeopard = computed(() =>
  playerDice.value[0] === playerDice.value[1] &&
  playerDice.value[1] === playerDice.value[2]
)

function setBetType(t: 'big' | 'small' | 'leopard') {
  if (rolling.value) return
  betType.value = t
}

function setAmount(a: number) {
  if (rolling.value) return
  if (chips.value < a) return
  betAmount.value = a
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function roll() {
  if (rolling.value || chips.value <= 0) return
  if (chips.value < betAmount.value) return
  rolling.value = true
  result.value = null

  // 动画：每 50ms 切换点数，共 10 次
  let ticks = 0
  rollTimer = setInterval(() => {
    playerDice.value = [rand(1, 6), rand(1, 6), rand(1, 6)]
    aiDice.value = [rand(1, 6), rand(1, 6), rand(1, 6)]
    ticks++
    if (ticks >= 10) {
      if (rollTimer) {
        clearInterval(rollTimer)
        rollTimer = null
      }
      finalize()
    }
  }, 50)
}

function finalize() {
  // 真实结果
  playerDice.value = [rand(1, 6), rand(1, 6), rand(1, 6)]
  aiDice.value = [rand(1, 6), rand(1, 6), rand(1, 6)]
  rolling.value = false

  const pTotal = playerTotal.value
  const aTotal = aiTotal.value
  const leopard = isLeopard.value
  const outcome = leopard ? '豹子' : (pTotal >= 11 ? '大' : '小')

  let win = false
  let payout = 0

  if (leopard && betType.value === 'leopard') {
    win = true
    payout = betAmount.value * 6
  } else if (!leopard) {
    if (betType.value === 'big' && pTotal >= 11) {
      win = true
      payout = betAmount.value * 2
    } else if (betType.value === 'small' && pTotal < 11) {
      win = true
      payout = betAmount.value * 2
    }
  }

  // 玩家总点 > AI 总点：奖励 +50%
  if (win && pTotal > aTotal) {
    payout = Math.floor(payout * 1.5)
  }

  const delta = win ? payout - betAmount.value : -betAmount.value
  chips.value += delta
  if (chips.value > best.value) {
    best.value = chips.value
    localStorage.setItem('web_game_dice_highscore', String(chips.value))
  }

  history.value.unshift({ outcome, win, delta: Math.abs(delta), type: betType.value })
  if (history.value.length > 5) history.value = history.value.slice(0, 5)

  if (win) {
    result.value = { type: 'win', text: outcome + ' 赢！', sub: '+' + delta + ' 筹码' }
  } else {
    result.value = { type: 'lose', text: '开 ' + outcome, sub: delta + ' 筹码' }
  }

  if (chips.value <= 0) {
    chips.value = 0
  }
}

function restart() {
  chips.value = 1000
  result.value = null
  history.value = []
  playerDice.value = [1, 1, 1]
  aiDice.value = [1, 1, 1]
  betType.value = 'big'
  betAmount.value = 100
}

const betTypeLabel = computed(() => {
  const map: Record<string, string> = { big: '大', small: '小', leopard: '豹子' }
  return map[betType.value] || ''
})

onMounted(() => {
  // 恢复最高分
  best.value = parseInt(localStorage.getItem('web_game_dice_highscore') || '1000')
})
</script>

<template>
  <div class="space-y-4">
    <!-- 返回按钮 -->
    <button
      class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm"
      @click="router.push('/teacher/games')"
    >
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <!-- 标题 -->
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Dice class="w-6 h-6 text-sakura-500" /> 摇骰子比大小
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <!-- 状态栏 -->
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <span class="inline-flex items-center gap-1 text-cocoa-700 font-semibold">
            <Flame class="w-4 h-4 text-sakura-500" />
            <span class="text-cocoa-900">{{ chips }}</span>
          </span>
        </div>
        <span class="inline-flex items-center gap-1 text-cocoa-500 text-sm">
          <Trophy class="w-4 h-4 text-butter-500" />
          最高 {{ best }}
        </span>
      </div>

      <!-- 押注区 -->
      <div v-if="!rolling && chips > 0" class="w-full space-y-3 animate-fadeIn">
        <!-- 押注类型 -->
        <div>
          <p class="text-xs text-cocoa-500 mb-1.5 font-medium">押注类型</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              class="py-2.5 rounded-xl text-center transition-all"
              :class="betType === 'big'
                ? 'bg-sakura-500 text-white shadow-soft'
                : 'bg-cream-100 text-cocoa-700 hover:bg-cream-200'"
              @click="setBetType('big')"
            >
              <div class="text-sm font-bold">大</div>
              <div class="text-[10px] opacity-80">总点 ≥ 11 · 2×</div>
            </button>
            <button
              class="py-2.5 rounded-xl text-center transition-all"
              :class="betType === 'small'
                ? 'bg-sky2-500 text-white shadow-soft'
                : 'bg-cream-100 text-cocoa-700 hover:bg-cream-200'"
              @click="setBetType('small')"
            >
              <div class="text-sm font-bold">小</div>
              <div class="text-[10px] opacity-80">总点 &lt; 11 · 2×</div>
            </button>
            <button
              class="py-2.5 rounded-xl text-center transition-all"
              :class="betType === 'leopard'
                ? 'bg-mint-500 text-white shadow-soft'
                : 'bg-cream-100 text-cocoa-700 hover:bg-cream-200'"
              @click="setBetType('leopard')"
            >
              <div class="text-sm font-bold">豹子</div>
              <div class="text-[10px] opacity-80">三颗相同 · 6×</div>
            </button>
          </div>
        </div>

        <!-- 押注金额 -->
        <div>
          <p class="text-xs text-cocoa-500 mb-1.5 font-medium">押注金额</p>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="a in amounts"
              :key="a"
              class="py-2.5 rounded-xl text-center font-bold text-sm transition-all"
              :class="[
                betAmount === a
                  ? 'bg-butter-500 text-white shadow-soft'
                  : chips < a
                    ? 'bg-cream-50 text-cocoa-300 cursor-not-allowed'
                    : 'bg-cream-100 text-cocoa-700 hover:bg-cream-200'
              ]"
              :disabled="chips < a"
              @click="setAmount(a)"
            >
              {{ a }}
            </button>
          </div>
        </div>
      </div>

      <!-- 对战区 -->
      <div class="w-full flex items-center justify-center gap-3 py-4">
        <!-- 玩家骰子 -->
        <div class="flex-1 flex flex-col items-center gap-2">
          <span class="text-xs font-medium text-cocoa-500">
            你 · {{ rolling ? '…' : playerTotal }}
          </span>
          <div class="flex gap-2">
            <div
              v-for="(d, i) in playerDice"
              :key="'p' + i"
              class="w-[72px] h-[72px] rounded-xl p-2 box-border shadow-softer"
              :class="[
                rolling ? 'bg-cream-50 animate-[spin_0.5s_linear_infinite]' : 'bg-cream-100',
                result?.type === 'win' ? 'ring-2 ring-mint-400' : ''
              ]"
            >
              <div class="grid grid-cols-3 grid-rows-3 w-full h-full">
                <div
                  v-for="p in 9"
                  :key="p"
                  class="flex items-center justify-center"
                >
                  <div
                    v-if="pipMap[d]?.includes(p - 1)"
                    class="w-[10px] h-[10px] rounded-full"
                    :class="result?.type === 'win' ? 'bg-mint-500' : 'bg-sakura-500'"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- VS -->
        <div class="flex-shrink-0">
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold"
            :class="rolling ? 'bg-cream-200 text-cocoa-400' : 'bg-butter-500 text-white shadow-pop'"
          >
            VS
          </div>
        </div>

        <!-- AI 骰子 -->
        <div class="flex-1 flex flex-col items-center gap-2">
          <span class="text-xs font-medium text-cocoa-500">
            AI · {{ rolling ? '…' : aiTotal }}
          </span>
          <div class="flex gap-2">
            <div
              v-for="(d, i) in aiDice"
              :key="'a' + i"
              class="w-[72px] h-[72px] rounded-xl p-2 box-border shadow-softer"
              :class="[
                rolling ? 'bg-cream-50 animate-[spin_0.5s_linear_infinite]' : 'bg-cream-100',
                result?.type === 'lose' ? 'ring-2 ring-sakura-400' : ''
              ]"
            >
              <div class="grid grid-cols-3 grid-rows-3 w-full h-full">
                <div
                  v-for="p in 9"
                  :key="p"
                  class="flex items-center justify-center"
                >
                  <div
                    v-if="pipMap[d]?.includes(p - 1)"
                    class="w-[10px] h-[10px] rounded-full"
                    :class="result?.type === 'lose' ? 'bg-sakura-400' : 'bg-cocoa-400'"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 摇骰按钮 -->
      <button
        v-if="!rolling && chips > 0"
        class="px-8 py-3 rounded-2xl font-bold text-white shadow-pop transition-all active:scale-95 inline-flex items-center gap-2"
        :class="chips < betAmount ? 'bg-cocoa-300 cursor-not-allowed' : 'bg-butter-500 hover:bg-butter-600'"
        :disabled="chips < betAmount"
        @click="roll"
      >
        <Dice class="w-5 h-5" /> 摇骰子
      </button>

      <!-- 摇晃提示 -->
      <div v-if="rolling" class="text-sm text-cocoa-500 animate-bouncey inline-flex items-center gap-2">
        <Dice class="w-5 h-5 text-butter-500 animate-wiggle" /> 摇晃中…
      </div>

      <!-- 结果 -->
      <div
        v-if="result && !rolling"
        class="w-full px-4 py-3 rounded-xl flex flex-col items-center animate-fadeIn"
        :class="result.type === 'win' ? 'bg-mint-50' : 'bg-sakura-50'"
      >
        <span
          class="text-lg font-extrabold"
          :class="result.type === 'win' ? 'text-mint-600' : 'text-sakura-600'"
        >
          {{ result.text }}
        </span>
        <span class="text-xs mt-0.5" :class="result.type === 'win' ? 'text-mint-500' : 'text-sakura-500'">
          {{ result.sub }}
        </span>
      </div>

      <!-- 历史记录 -->
      <div v-if="history.length" class="w-full">
        <p class="text-xs text-cocoa-400 mb-1.5 font-medium">最近 {{ history.length }} 局</p>
        <div class="flex gap-1.5 flex-wrap">
          <div
            v-for="(h, i) in history"
            :key="i"
            class="flex-1 min-w-[72px] py-1.5 rounded-lg flex flex-col items-center text-xs"
            :class="h.win ? 'bg-mint-50 text-mint-600' : 'bg-sakura-50 text-sakura-600'"
          >
            <span class="font-bold">{{ h.outcome }}</span>
            <span class="text-[10px] mt-0.5 opacity-80">{{ h.win ? '+' : '-' }}{{ h.delta }}</span>
          </div>
        </div>
      </div>

      <!-- 游戏结束 -->
      <div v-if="chips <= 0" class="flex flex-col items-center gap-3 animate-fadeIn">
        <div class="text-sakura-600 font-bold text-lg">筹码耗尽，游戏结束</div>
        <button
          class="px-6 py-2.5 rounded-xl bg-sakura-500 text-white font-bold hover:bg-sakura-600 transition-all shadow-soft"
          @click="restart"
        >
          重新开始
        </button>
      </div>
    </div>
  </div>
</template>
