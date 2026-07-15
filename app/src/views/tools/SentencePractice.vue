<script setup lang="ts">
import { ref, computed } from 'vue'
import { Copy, Volume2, RotateCcw, Check, X, Star, Shuffle, RefreshCw } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const toast = useToastStore()

interface Sentence {
  en: string
  zh: string
  answer: string
  hint: string
}

interface SentenceType {
  name: string
  examples: Sentence[]
}

const sentenceTypes = [
  {
    name: '一般现在时',
    examples: [
      { en: 'I ___ to school every day.', zh: '我每天___去学校。', answer: 'go', hint: '动词原形' },
      { en: 'She ___ English very well.', zh: '她英语___得很好。', answer: 'speaks', hint: '动词第三人称单数' },
      { en: 'They ___ football on weekends.', zh: '他们周末___足球。', answer: 'play', hint: '动词原形' },
      { en: 'He ___ early every morning.', zh: '他每天早上___得很早。', answer: 'gets up', hint: '动词短语' },
      { en: 'The sun ___ in the east.', zh: '太阳从东方___起。', answer: 'rises', hint: '动词第三人称单数' },
      { en: 'We ___ lunch at 12 o\'clock.', zh: '我们12点___午饭。', answer: 'have', hint: '动词原形' },
      { en: 'My mom ___ delicious food.', zh: '我妈妈___美味的食物。', answer: 'cooks', hint: '动词第三人称单数' },
      { en: 'Cats ___ fish.', zh: '猫___鱼。', answer: 'like', hint: '动词原形' },
    ],
  },
  {
    name: '一般过去时',
    examples: [
      { en: 'I ___ to the park yesterday.', zh: '我昨天___去了公园。', answer: 'went', hint: '动词过去式' },
      { en: 'She ___ a beautiful dress.', zh: '她___了一件漂亮的裙子。', answer: 'wore', hint: '动词过去式' },
      { en: 'They ___ football last Sunday.', zh: '他们上周日___了足球。', answer: 'played', hint: '动词过去式' },
      { en: 'He ___ his homework yesterday.', zh: '他昨天___了作业。', answer: 'did', hint: '动词过去式' },
      { en: 'We ___ a good time at the party.', zh: '我们在派对上___得很开心。', answer: 'had', hint: '动词过去式' },
      { en: 'My father ___ to work by bus.', zh: '我爸爸___公交车去上班。', answer: 'went', hint: '动词过去式' },
      { en: 'The children ___ songs together.', zh: '孩子们一起___了歌。', answer: 'sang', hint: '动词过去式' },
      { en: 'I ___ my grandparents last weekend.', zh: '我上周末___了祖父母。', answer: 'visited', hint: '动词过去式' },
    ],
  },
  {
    name: '一般将来时',
    examples: [
      { en: 'I ___ to Beijing tomorrow.', zh: '我明天___去北京。', answer: 'will go', hint: 'will + 动词原形' },
      { en: 'She ___ a new book next week.', zh: '她下周___一本新书。', answer: 'will buy', hint: 'will + 动词原形' },
      { en: 'They ___ a party this Saturday.', zh: '他们这周六___举办派对。', answer: 'will have', hint: 'will + 动词原形' },
      { en: 'We ___ English together.', zh: '我们___一起学英语。', answer: 'will learn', hint: 'will + 动词原形' },
      { en: 'He ___ his friends tomorrow.', zh: '他明天___拜访朋友。', answer: 'will visit', hint: 'will + 动词原形' },
      { en: 'The meeting ___ at 9 o\'clock.', zh: '会议___在9点开始。', answer: 'will start', hint: 'will + 动词原形' },
      { en: 'I ___ my homework tonight.', zh: '我今晚___做作业。', answer: 'will do', hint: 'will + 动词原形' },
      { en: 'We ___ to the cinema this weekend.', zh: '我们这周末___去看电影。', answer: 'will go', hint: 'will + 动词原形' },
    ],
  },
  {
    name: '现在进行时',
    examples: [
      { en: 'Look! She ___ a song.', zh: '看！她正在___歌。', answer: 'is singing', hint: 'be + doing' },
      { en: 'They ___ football now.', zh: '他们现在正在___足球。', answer: 'are playing', hint: 'be + doing' },
      { en: 'I ___ my homework.', zh: '我正在___作业。', answer: 'am doing', hint: 'be + doing' },
      { en: 'He ___ to music.', zh: '他正在___音乐。', answer: 'is listening', hint: 'be + doing' },
      { en: 'We ___ dinner.', zh: '我们正在___晚饭。', answer: 'are having', hint: 'be + doing' },
      { en: 'The children ___ games.', zh: '孩子们正在___游戏。', answer: 'are playing', hint: 'be + doing' },
      { en: 'My mom ___ in the kitchen.', zh: '我妈妈正在厨房___饭。', answer: 'is cooking', hint: 'be + doing' },
      { en: 'The bird ___ in the tree.', zh: '鸟儿正在树上___。', answer: 'is singing', hint: 'be + doing' },
    ],
  },
]

const selectedType = ref(sentenceTypes[0])
const currentIndex = ref(0)
const userAnswer = ref('')
const showResult = ref(false)
const showHint = ref(false)
const results = ref<{ isCorrect: boolean; user: string; correctAnswer: string }[]>([])
const isShuffled = ref(false)
const shuffledExamples = ref<Sentence[]>([])

const currentSentence = computed(() => {
  const examples = isShuffled.value ? shuffledExamples.value : selectedType.value.examples
  return examples[currentIndex.value]
})

const progress = computed(() => {
  const examples = isShuffled.value ? shuffledExamples.value : selectedType.value.examples
  return ((currentIndex.value + 1) / examples.length) * 100
})

const correctCount = computed(() => results.value.filter(r => r.isCorrect).length)
const wrongCount = computed(() => results.value.filter(r => !r.isCorrect).length)

function shuffleExamples() {
  shuffledExamples.value = [...selectedType.value.examples].sort(() => Math.random() - 0.5)
}

function toggleShuffle() {
  isShuffled.value = !isShuffled.value
  if (isShuffled.value) {
    shuffleExamples()
  }
  reset()
}

function checkAnswer() {
  if (!userAnswer.value.trim()) {
    toast.warning('请输入答案')
    return
  }
  const correct = userAnswer.value.trim().toLowerCase() === currentSentence.value.answer.toLowerCase()
  showResult.value = true
  results.value.push({ isCorrect: correct, user: userAnswer.value, correctAnswer: currentSentence.value.answer })
}

function nextSentence() {
  const examples = isShuffled.value ? shuffledExamples.value : selectedType.value.examples
  if (currentIndex.value < examples.length - 1) {
    currentIndex.value++
    userAnswer.value = ''
    showResult.value = false
    showHint.value = false
  }
}

function prevSentence() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    userAnswer.value = ''
    showResult.value = false
    showHint.value = false
  }
}

function playAudio(text: string) {
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  speechSynthesis.speak(utterance)
}

function copySentence() {
  const fullSentence = currentSentence.value.en.replace('___', currentSentence.value.answer)
  const text = `${fullSentence}\n${currentSentence.value.zh}`
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制'),
    () => toast.error('复制失败'),
  )
}

function reset() {
  currentIndex.value = 0
  userAnswer.value = ''
  showResult.value = false
  showHint.value = false
  results.value = []
}

function nextType() {
  const idx = sentenceTypes.indexOf(selectedType.value)
  if (idx < sentenceTypes.length - 1) {
    selectedType.value = sentenceTypes[idx + 1]
    reset()
    if (isShuffled.value) shuffleExamples()
  }
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    
    <section class="card-soft p-5 bg-gradient-to-br from-mint-100 via-sky2-100 to-sakura-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-300 to-sky2-300 flex items-center justify-center text-2xl shadow-softer">
          ✨
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">英语句型练习</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            练习小学常见英语句型，包括一般现在时、一般过去时、一般将来时和现在进行时。
          </p>
        </div>
      </div>
    </section>
    
    <section class="card-flat p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-[200px]">
          <label class="text-xs text-cocoa-500 ml-1">选择句型</label>
          <select
            v-model="selectedType"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
          >
            <option v-for="type in sentenceTypes" :key="type.name" :value="type">
              {{ type.name }} ({{ type.examples.length }}题)
            </option>
          </select>
        </div>
        <button
          class="btn-ghost !px-3 !py-2 flex items-center gap-1"
          :class="isShuffled ? 'bg-mint-100 text-mint-600' : ''"
          @click="toggleShuffle"
        >
          <Shuffle :size="14" /> 随机
        </button>
        <button
          class="btn-ghost !px-3 !py-2 flex items-center gap-1"
          @click="reset"
        >
          <RotateCcw :size="14" /> 重置
        </button>
      </div>
    </section>
    
    <div class="card-flat p-1">
      <div class="h-1.5 bg-cream-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-mint-300 to-sky2-300 transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <div class="flex items-center justify-between mt-1.5 px-1">
        <span class="text-xs text-cocoa-500">
          {{ currentIndex + 1 }} / {{ isShuffled ? shuffledExamples.length : selectedType.examples.length }}
        </span>
        <div class="flex items-center gap-3 text-xs">
          <span class="flex items-center gap-1 text-mint-500">
            <Check :size="12" /> {{ correctCount }}
          </span>
          <span class="flex items-center gap-1 text-sakura-500">
            <X :size="12" /> {{ wrongCount }}
          </span>
        </div>
      </div>
    </div>
    
    <section class="card-flat p-6">
      <div class="text-center">
        <div class="text-sm text-cocoa-500 mb-4">{{ selectedType.name }}</div>
        
        <div class="text-2xl text-cocoa-900 mb-4 p-4 bg-cream-50 rounded-2xl">
          {{ currentSentence?.en }}
        </div>
        
        <div class="text-xl text-cocoa-600 mb-6">
          {{ currentSentence?.zh }}
        </div>
        
        <div v-if="showHint" class="text-sm text-butter-600 mb-4 flex items-center justify-center gap-2">
          <Star :size="14" /> 提示：{{ currentSentence?.hint }}
        </div>
        
        <div v-if="!showResult" class="flex flex-col items-center gap-3">
          <input
            v-model="userAnswer"
            type="text"
            placeholder="请输入正确答案..."
            class="w-full max-w-xs card-flat px-4 py-3 text-lg text-center"
            @keydown.enter="checkAnswer"
          />
          <div class="flex gap-2">
            <button
              class="btn-secondary px-4 py-2 text-sm"
              @click="showHint = !showHint"
            >
              {{ showHint ? '隐藏提示' : '显示提示' }}
            </button>
            <button
              class="btn-primary px-6 py-2"
              :disabled="!userAnswer.trim()"
              @click="checkAnswer"
            >
              检查答案
            </button>
          </div>
        </div>
        
        <div v-else class="space-y-3">
          <div
            class="text-xl font-bold"
            :class="results[results.length - 1]?.isCorrect ? 'text-mint-500' : 'text-sakura-500'"
          >
            {{ results[results.length - 1]?.isCorrect ? '✅ 正确！' : '❌ 错误' }}
          </div>
          <div class="text-lg text-cocoa-800">
            正确答案: <span class="font-bold">{{ currentSentence?.answer }}</span>
          </div>
          <div v-if="!results[results.length - 1]?.isCorrect" class="text-sm text-cocoa-500">
            你的答案: {{ userAnswer }}
          </div>
          <div class="flex gap-2 justify-center">
            <button
              class="btn-secondary px-4 py-2 text-sm"
              @click="playAudio(currentSentence?.en.replace('___', currentSentence?.answer) || '')"
            >
              <Volume2 :size="14" /> 听发音
            </button>
            <button
              class="btn-secondary px-4 py-2 text-sm"
              @click="copySentence"
            >
              <Copy :size="14" /> 复制
            </button>
          </div>
        </div>
      </div>
    </section>
    
    <section class="flex items-center justify-center gap-4">
      <button
        class="btn-secondary px-4 py-2"
        :disabled="currentIndex === 0"
        @click="prevSentence"
      >
        上一题
      </button>
      <button
        class="btn-primary px-6 py-2"
        :disabled="currentIndex >= (isShuffled ? shuffledExamples.length : selectedType.examples.length) - 1"
        @click="nextSentence"
      >
        {{ currentIndex >= (isShuffled ? shuffledExamples.length : selectedType.examples.length) - 1 ? '已完成' : '下一题' }}
      </button>
      <button
        class="btn-ghost px-4 py-2"
        :disabled="sentenceTypes.indexOf(selectedType) >= sentenceTypes.length - 1"
        @click="nextType"
      >
        下一个句型 →
      </button>
    </section>
    
    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：可以点击"显示提示"获取帮助，完成后可以切换到其他句型继续练习
    </div>
  </div>
</template>
