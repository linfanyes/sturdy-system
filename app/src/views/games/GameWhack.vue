<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Play, RotateCcw, Trophy, Zap, Timer, Target } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

type MoleType = 'normal' | 'golden' | null

interface Hole {
  id: number
  mole: MoleType
  hit: boolean
}

const GAME_DURATION = 30 // 秒
const GRID_SIZE = 9

const holes = ref<Hole[]>(
  Array.from({ length: GRID_SIZE }, (_, i) => ({
    id: i,
    mole: null,
    hit: false,
  }))
)

const score = ref(0)
const bestScore = ref(0)
const timeLeft = ref(GAME_DURATION)
const level = ref(1)
const isPlaying = ref(false)
const gameOver = ref(false)

let moleTimer: number | null = null
let countdownTimer: number | null = null

// 地鼠出现时间随等级缩短
const moleAppearTime = computed(() => {
  const base = 1200
  const min = 400
  return Math.max(min, base - (level.value - 1) * 100)
})

// 地鼠生成间隔
const moleInterval = computed(() => {
  const base = 900
  const min = 350
  return Math.max(min, base - (level.value - 1) * 70)
})

function startGame() {
  score.value = 0
  timeLeft.value = GAME_DURATION
  level.value = 1
  gameOver.value = false
  isPlaying.value = true

  holes.value.forEach(h => {
    h.mole = null
    h.hit = false
  })

  startMoleSpawning()
  startCountdown()
}

function resetGame() {
  stopMoleSpawning()
  stopCountdown()
  score.value = 0
  timeLeft.value = GAME_DURATION
  level.value = 1
  gameOver.value = false
  isPlaying.value = false

  holes.value.forEach(h => {
    h.mole = null
    h.hit = false
  })
}

function startMoleSpawning() {
  stopMoleSpawning()
  spawnMole()
  moleTimer = window.setInterval(spawnMole, moleInterval.value)
}

function stopMoleSpawning() {
  if (moleTimer) {
    clearInterval(moleTimer)
    moleTimer = null
  }
}

function spawnMole() {
  const emptyHoles = holes.value.filter(h => h.mole === null)
  if (emptyHoles.length === 0) return

  const randomHole = emptyHoles[Math.floor(Math.random() * emptyHoles.length)]
  // 15% 概率金色地鼠
  randomHole.mole = Math.random() < 0.15 ? 'golden' : 'normal'

  // 地鼠自动消失
  setTimeout(() => {
    if (randomHole.mole) {
      randomHole.mole = null
      randomHole.hit = false
    }
  }, moleAppearTime.value)
}

function startCountdown() {
  stopCountdown()
  countdownTimer = window.setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) {
      endGame()
    }
  }, 1000)
}

function stopCountdown() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

function endGame() {
  stopMoleSpawning()
  stopCountdown()
  isPlaying.value = false
  gameOver.value = true

  if (score.value > bestScore.value) {
    bestScore.value = score.value
    localStorage.setItem('whack-best', String(bestScore.value))
  }
}

function whackMole(hole: Hole) {
  if (!isPlaying.value || !hole.mole) return

  const points = hole.mole === 'golden' ? 3 : 1
  score.value += points
  hole.hit = true

  // 更新等级（每10分升一级）
  const newLevel = Math.floor(score.value / 10) + 1
  if (newLevel > level.value) {
    level.value = newLevel
    // 重新设置生成速度
    stopMoleSpawning()
    startMoleSpawning()
  }

  // 打击后地鼠消失
  setTimeout(() => {
    hole.mole = null
    hole.hit = false
  }, 200)
}

onMounted(() => {
  const saved = localStorage.getItem('whack-best')
  if (saved) bestScore.value = parseInt(saved, 10)
})

onUnmounted(() => {
  stopMoleSpawning()
  stopCountdown()
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🔨"
      title="打地鼠"
      description="眼疾手快，锤爆地鼠！金色地鼠3分哦~"
      gradient="from-mint-100 via-cream-50 to-sakura-100"
      status-text="反应测试"
      status-color="bg-mint-100 text-mint-600"
      :back-to="'games'"
    />

    <!-- 分数面板 -->
    <div class="grid grid-cols-3 gap-3">
      <div class="card-soft p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Zap :size="12" />
          当前分数
        </div>
        <div class="text-xl sm:text-2xl font-bold text-cocoa-900 font-number">{{ score }}</div>
      </div>
      <div class="card-soft p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Timer :size="12" />
          剩余时间
        </div>
        <div
          class="text-xl sm:text-2xl font-bold font-number"
          :class="timeLeft <= 10 ? 'text-sakura-500' : 'text-cocoa-900'"
        >
          {{ timeLeft }}s
        </div>
      </div>
      <div class="card-soft p-3 sm:p-4 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" />
          最高分
        </div>
        <div class="text-xl sm:text-2xl font-bold text-mint-600 font-number">{{ bestScore }}</div>
      </div>
    </div>

    <!-- 等级显示 -->
    <div class="flex justify-center">
      <div class="chip text-xs px-3 py-1.5 bg-butter-100 text-butter-700">
        <Target :size="12" class="inline mr-1" />
        等级 {{ level }} · 地鼠出现时间 {{ moleAppearTime }}ms
      </div>
    </div>

    <!-- 游戏面板 -->
    <div class="flex justify-center">
      <div class="relative">
        <div class="card-soft p-4 sm:p-6 bg-gradient-to-br from-mint-100/60 to-sakura-100/60">
          <div class="grid grid-cols-3 gap-3 sm:gap-4">
            <div
              v-for="hole in holes"
              :key="hole.id"
              class="relative w-20 h-20 sm:w-24 sm:h-24 cursor-pointer select-none"
              @click="whackMole(hole)"
            >
              <!-- 地洞 -->
              <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-8 sm:h-10 bg-cocoa-800/80 rounded-full shadow-inner" />
              <div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-[90%] h-6 sm:h-8 bg-cocoa-900/90 rounded-full" />

              <!-- 地鼠 -->
              <div
                v-if="hole.mole"
                class="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 transition-all duration-200 ease-out mole-popup"
                :class="{ 'mole-hit': hole.hit }"
              >
                <div
                  class="w-14 h-14 sm:w-16 sm:h-16 rounded-t-full flex items-center justify-center text-3xl sm:text-4xl shadow-lg"
                  :class="hole.mole === 'golden' ? 'bg-gradient-to-b from-yellow-300 to-yellow-500' : 'bg-gradient-to-b from-amber-600 to-amber-800'"
                >
                  {{ hole.mole === 'golden' ? '🌟' : '🐹' }}
                </div>
              </div>

              <!-- 打击特效 -->
              <div
                v-if="hole.hit"
                class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold animate-ping pointer-events-none"
                :class="hole.mole === 'golden' ? 'text-yellow-500' : 'text-sakura-500'"
              >
                +{{ hole.mole === 'golden' ? 3 : 1 }}
              </div>
            </div>
          </div>
        </div>

        <!-- 游戏结束遮罩 -->
        <div
          v-if="gameOver"
          class="absolute inset-0 bg-cocoa-900/60 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🎯</div>
          <div class="text-2xl font-bold text-white mb-1">时间到！</div>
          <div class="text-sm text-white/80 mb-1">得分：{{ score }}</div>
          <div v-if="score >= bestScore && score > 0" class="text-sm text-yellow-300 mb-4">
            🏆 新纪录！
          </div>
          <div v-else class="mb-4"></div>
          <button class="btn-primary" @click="startGame">
            <RotateCcw :size="16" />
            再来一局
          </button>
        </div>

        <!-- 未开始遮罩 -->
        <div
          v-if="!isPlaying && !gameOver"
          class="absolute inset-0 bg-cocoa-900/40 rounded-3xl flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div class="text-4xl mb-2">🔨</div>
          <div class="text-xl font-bold text-white mb-1">准备好了吗？</div>
          <div class="text-sm text-white/80 mb-4">30秒内尽可能多地打地鼠</div>
          <button class="btn-primary" @click="startGame">
            <Play :size="16" />
            开始游戏
          </button>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="flex justify-center gap-3">
      <button v-if="isPlaying" class="btn-secondary" @click="resetGame">
        <RotateCcw :size="16" />
        重置
      </button>
      <button v-else-if="gameOver" class="btn-mint" @click="startGame">
        <Play :size="16" />
        再来一局
      </button>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 点击地鼠得分，普通地鼠 1 分，金色地鼠 3 分</p>
      <p>每 10 分升一级，地鼠出现速度会越来越快！</p>
    </div>
  </div>
</template>

<style scoped>
.mole-popup {
  animation: popUp 0.2s ease-out;
}

@keyframes popUp {
  0% {
    transform: translateX(-50%) translateY(100%);
    opacity: 0;
  }
  100% {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }
}

.mole-hit {
  animation: hitShake 0.2s ease-out;
}

@keyframes hitShake {
  0%,
  100% {
    transform: translateX(-50%) translateY(0) scale(1);
  }
  50% {
    transform: translateX(-50%) translateY(-5px) scale(0.9);
  }
}
</style>
