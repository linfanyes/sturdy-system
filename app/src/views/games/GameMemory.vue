<!-- 记忆翻牌游戏：翻开两张卡片，相同则保留，不同则 0.8 秒后翻回，全部配对即胜利 -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RotateCcw, Clock, Footprints, Trophy } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

type Difficulty = '简单' | '中等' | '困难'
const config: Record<Difficulty, { rows: number; cols: number; pairs: number }> = {
  简单: { rows: 3, cols: 4, pairs: 6 },
  中等: { rows: 4, cols: 4, pairs: 8 },
  困难: { rows: 4, cols: 6, pairs: 12 },
}

const emojis = ['🍎', '🍐', '🍌', '🍇', '🍓', '🍑', '🥝', '🍍', '🥭', '🍒', '🍋', '🥥']

type Card = { id: number; emoji: string; flipped: boolean; matched: boolean }

const difficulty = ref<Difficulty>('简单')
const cards = ref<Card[]>([])
const flipped = ref<number[]>([])
const moves = ref(0)
const time = ref(0)
const isPlaying = ref(false)
const isWon = ref(false)
let timer: number | null = null
let lockTimer: number | null = null

const currentConfig = computed(() => config[difficulty.value])
const matchedCount = computed(() => cards.value.filter(c => c.matched).length / 2)

function buildDeck(d: Difficulty): Card[] {
  const cfg = config[d]
  const selected = emojis.slice(0, cfg.pairs)
  const deck = [...selected, ...selected].map((emoji, i) => ({
    id: i,
    emoji,
    flipped: false,
    matched: false,
  }))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

function startGame(d?: Difficulty) {
  if (d) difficulty.value = d
  stopTimer()
  if (lockTimer) {
    clearTimeout(lockTimer)
    lockTimer = null
  }
  cards.value = buildDeck(difficulty.value)
  flipped.value = []
  moves.value = 0
  time.value = 0
  isPlaying.value = false
  isWon.value = false
}

function flipCard(index: number) {
  if (isWon.value) return
  const card = cards.value[index]
  if (card.flipped || card.matched) return
  if (flipped.value.length >= 2) return

  if (!isPlaying.value) {
    isPlaying.value = true
    startTimer()
  }

  card.flipped = true
  flipped.value.push(index)

  if (flipped.value.length === 2) {
    moves.value++
    const [a, b] = flipped.value
    if (cards.value[a].emoji === cards.value[b].emoji) {
      cards.value[a].matched = true
      cards.value[b].matched = true
      flipped.value = []
      if (cards.value.every(c => c.matched)) {
        isWon.value = true
        isPlaying.value = false
        stopTimer()
      }
    } else {
      lockTimer = window.setTimeout(() => {
        cards.value[a].flipped = false
        cards.value[b].flipped = false
        flipped.value = []
      }, 800)
    }
  }
}

function getCardClass(card: Card): string {
  if (card.matched) {
    return 'bg-mint-300 scale-95 opacity-70'
  }
  if (card.flipped) {
    return 'bg-white shadow-md'
  }
  return 'bg-gradient-to-br from-purple-400 to-purple-500 text-white shadow-pop hover:brightness-105 active:scale-95'
}

function startTimer() {
  stopTimer()
  timer = window.setInterval(() => {
    time.value++
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`
}

onMounted(() => {
  startGame('简单')
})

onUnmounted(() => {
  stopTimer()
  if (lockTimer) clearTimeout(lockTimer)
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🃏"
      title="记忆翻牌"
      description="翻开卡片找出相同的配对，考验记忆力"
      gradient="from-sakura-100 via-cream-50 to-purple-100"
      status-text="记忆挑战"
      status-color="bg-sakura-100 text-sakura-500"
      :back-to="'games'"
    />

    <!-- 难度选择 -->
    <div class="flex justify-center gap-2 flex-wrap">
      <button
        v-for="d in (['简单', '中等', '困难'] as const)"
        :key="d"
        class="btn-pill text-sm"
        :class="difficulty === d ? 'bg-gradient-to-br from-sakura-400 to-sakura-500 text-cocoa-900 shadow-pop' : 'bg-cocoa-900/5 text-cocoa-900 hover:bg-cocoa-900/10'"
        @click="startGame(d)"
      >
        {{ d }} {{ config[d].rows }}x{{ config[d].cols }}
      </button>
    </div>

    <!-- 信息面板 -->
    <div class="grid grid-cols-3 gap-3">
      <div class="card-flat p-3 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Footprints :size="12" /> 步数
        </div>
        <div class="text-xl font-bold text-cocoa-900 font-number">{{ moves }}</div>
      </div>
      <div class="card-flat p-3 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Clock :size="12" /> 用时
        </div>
        <div class="text-xl font-bold text-cocoa-900 font-number">{{ formatTime(time) }}</div>
      </div>
      <div class="card-flat p-3 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" /> 配对
        </div>
        <div class="text-xl font-bold text-sakura-500 font-number">{{ matchedCount }}/{{ currentConfig.pairs }}</div>
      </div>
    </div>

    <!-- 卡片网格 -->
    <div class="flex justify-center">
      <div class="relative">
        <div
          class="grid gap-2 sm:gap-3"
          :style="{
            gridTemplateColumns: `repeat(${currentConfig.cols}, minmax(0, 1fr))`,
            width: 'min(92vw, 480px)',
          }"
        >
          <button
            v-for="(card, index) in cards"
            :key="card.id"
            class="aspect-square rounded-xl flex items-center justify-center text-2xl sm:text-3xl transition-all duration-300 select-none"
            :class="getCardClass(card)"
            @click="flipCard(index)"
          >
            <span v-if="card.flipped || card.matched">{{ card.emoji }}</span>
            <span v-else>❓</span>
          </button>
        </div>

        <!-- 胜利遮罩 -->
        <div
          v-if="isWon"
          class="absolute inset-0 bg-sakura-500/85 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🎉</div>
          <div class="text-2xl font-bold text-white mb-1">胜利！</div>
          <div class="text-sm text-white/90 mb-1">用时 {{ moves }} 步</div>
          <div class="text-sm text-white/90 mb-4">{{ time }} 秒</div>
          <button class="btn-primary" @click="startGame()">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button class="btn-secondary" @click="startGame()">
        <RotateCcw :size="16" />
        重新开始
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 翻开两张相同卡片即可配对，不同则翻回</p>
    </div>
  </div>
</template>
