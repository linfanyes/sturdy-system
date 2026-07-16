<!-- 颜色反应游戏(斯特鲁普测试)：显示一个颜色字但用另一种颜色渲染，点击字本身的颜色而非字面意思 -->
<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { RotateCcw, Trophy, Clock, Zap } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

type ColorKey = '红' | '黄' | '蓝' | '绿' | '紫' | '橙'

// 字的渲染颜色（text-* 类）
const textColorMap: Record<ColorKey, string> = {
  红: 'text-rose-500',
  黄: 'text-amber-500',
  蓝: 'text-blue-500',
  绿: 'text-emerald-500',
  紫: 'text-purple-500',
  橙: 'text-orange-500',
}

// 选项按钮背景色
const bgColorMap: Record<ColorKey, string> = {
  红: 'bg-rose-500 text-white hover:brightness-105',
  黄: 'bg-amber-400 text-cocoa-900 hover:brightness-105',
  蓝: 'bg-blue-500 text-white hover:brightness-105',
  绿: 'bg-emerald-500 text-white hover:brightness-105',
  紫: 'bg-purple-500 text-white hover:brightness-105',
  橙: 'bg-orange-500 text-white hover:brightness-105',
}

const colorKeys = Object.keys(textColorMap) as ColorKey[]

const TOTAL_QUESTIONS = 20
const QUESTION_TIME = 3 // 秒

const word = ref<ColorKey>('红') // 显示的字（字面意思）
const displayColor = ref<ColorKey>('蓝') // 字的渲染颜色（正确答案）
const options = ref<ColorKey[]>([])
const currentIndex = ref(0)
const score = ref(0)
const countdown = ref(QUESTION_TIME)
const isPlaying = ref(false)
const isFinished = ref(false)
const reactionTimes = ref<number[]>([])
let questionStartTime = 0
let timer: number | null = null

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function generateQuestion() {
  // 字面与渲染颜色不同
  const w = pickRandom(colorKeys)
  let dc = pickRandom(colorKeys)
  while (dc === w) dc = pickRandom(colorKeys)
  word.value = w
  displayColor.value = dc
  // 4 个选项包含正确答案(渲染颜色)
  const wrong = colorKeys.filter(c => c !== dc)
  const opts = shuffle([...shuffle(wrong).slice(0, 3), dc])
  options.value = opts
  countdown.value = QUESTION_TIME
  questionStartTime = Date.now()
}

function startTimer() {
  stopTimer()
  timer = window.setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      answer(null)
    }
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function answer(choice: ColorKey | null) {
  if (!isPlaying.value) return
  stopTimer()
  const rt = Date.now() - questionStartTime
  reactionTimes.value.push(rt)
  if (choice === displayColor.value) {
    score.value++
  } else {
    score.value = Math.max(0, score.value - 1)
  }
  currentIndex.value++
  if (currentIndex.value >= TOTAL_QUESTIONS) {
    isPlaying.value = false
    isFinished.value = true
  } else {
    generateQuestion()
    startTimer()
  }
}

function startGame() {
  stopTimer()
  score.value = 0
  currentIndex.value = 0
  reactionTimes.value = []
  isPlaying.value = true
  isFinished.value = false
  generateQuestion()
  startTimer()
}

const avgReaction = computed(() => {
  if (reactionTimes.value.length === 0) return 0
  const sum = reactionTimes.value.reduce((a, b) => a + b, 0)
  return Math.round(sum / reactionTimes.value.length / 10) / 100 // 秒，保留 2 位
})

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="🎨"
      title="颜色反应"
      description="点击字本身的颜色，而非字面意思！"
      gradient="from-orange-100 via-cream-50 to-sky2-100"
      status-text="反应训练"
      status-color="bg-orange-100 text-orange-600"
      :back-to="'games'"
    />

    <!-- 信息面板 -->
    <div class="grid grid-cols-3 gap-3">
      <div class="card-flat p-3 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Zap :size="12" /> 题号
        </div>
        <div class="text-xl font-bold text-cocoa-900 font-number">
          {{ isFinished ? TOTAL_QUESTIONS : (isPlaying ? currentIndex + 1 : 0) }}/{{ TOTAL_QUESTIONS }}
        </div>
      </div>
      <div class="card-flat p-3 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Trophy :size="12" /> 得分
        </div>
        <div class="text-xl font-bold text-cocoa-900 font-number">{{ score }}</div>
      </div>
      <div class="card-flat p-3 text-center">
        <div class="flex items-center justify-center gap-1.5 text-xs text-cocoa-500 mb-1">
          <Clock :size="12" /> 倒计时
        </div>
        <div class="text-xl font-bold font-number" :class="countdown <= 1 ? 'text-rose-500' : 'text-cocoa-900'">
          {{ countdown }}s
        </div>
      </div>
    </div>

    <!-- 游戏区 -->
    <div class="flex justify-center">
      <div class="relative w-full max-w-md">
        <div class="card-flat p-6 sm:p-8 min-h-[300px] flex flex-col items-center justify-center">
          <!-- 未开始 -->
          <div v-if="!isPlaying && !isFinished" class="text-center space-y-4">
            <div class="text-5xl">🎨</div>
            <div class="text-lg font-bold text-cocoa-900">颜色反应测试</div>
            <p class="text-sm text-cocoa-600 leading-relaxed">
              屏幕显示一个"颜色字"（如"红"字），<br />
              但用另一种颜色渲染（如蓝色），<br />
              你需要点击 <b>字的颜色</b>，而非字面意思。
            </p>
            <button class="btn-primary" @click="startGame">
              <Zap :size="16" />
              开始游戏
            </button>
          </div>

          <!-- 游戏中 -->
          <div v-else-if="isPlaying" class="w-full flex flex-col items-center gap-6">
            <div class="text-sm text-cocoa-500">点击 <b class="text-cocoa-700">字的颜色</b></div>
            <div class="text-7xl sm:text-8xl font-bold" :class="textColorMap[displayColor]">
              {{ word }}
            </div>
            <div class="grid grid-cols-2 gap-3 w-full max-w-xs">
              <button
                v-for="opt in options"
                :key="opt"
                class="btn-pill py-4 text-lg font-bold"
                :class="bgColorMap[opt]"
                @click="answer(opt)"
              >
                {{ opt }}
              </button>
            </div>
          </div>

          <!-- 完成 -->
          <div v-else class="text-center space-y-3">
            <div class="text-5xl">🏆</div>
            <div class="text-2xl font-bold text-cocoa-900">完成！</div>
            <div class="text-sm text-cocoa-600">总分：<span class="font-bold text-butter-600">{{ score }}</span> / {{ TOTAL_QUESTIONS }}</div>
            <div class="text-sm text-cocoa-600">平均反应：<span class="font-bold text-mint-500">{{ avgReaction.toFixed(2) }}</span> 秒</div>
            <button class="btn-primary" @click="startGame">
              <RotateCcw :size="16" />
              再来一局
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作提示 -->
    <div class="text-center text-xs text-cocoa-400 space-y-1">
      <p>💡 每题 3 秒，答对 +1 分，答错或超时 -1 分（最低 0）</p>
    </div>
  </div>
</template>
