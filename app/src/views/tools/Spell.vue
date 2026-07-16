<script setup lang="ts">
// 英语单词拼写听写工具：内置三~六年级词库，支持听写、看中文拼英文、看英文写中文三种模式，可调语速并自动批改
import { ref, computed, onUnmounted, watch } from 'vue'
import { Play, Pause, Square, RotateCcw, Volume2, Gauge, Check, X, Copy } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const toast = useToastStore()

interface WordItem {
  word: string
  phonetic: string
  meaning: string
  sentence: string
}
interface WordGroup {
  grade: string
  words: WordItem[]
}

// ============ 内置词库（按年级分组，每级 20 词） ============
const wordLibrary: WordGroup[] = [
  {
    grade: '三年级',
    words: [
      { word: 'apple', phonetic: '/ˈæpl/', meaning: '苹果', sentence: 'I eat an apple every day.' },
      { word: 'book', phonetic: '/bʊk/', meaning: '书', sentence: 'This is my book.' },
      { word: 'cat', phonetic: '/kæt/', meaning: '猫', sentence: 'The cat is on the sofa.' },
      { word: 'dog', phonetic: '/dɒɡ/', meaning: '狗', sentence: 'My dog likes to run.' },
      { word: 'egg', phonetic: '/eɡ/', meaning: '鸡蛋', sentence: 'I have an egg for breakfast.' },
      { word: 'fish', phonetic: '/fɪʃ/', meaning: '鱼', sentence: 'The fish swims in the water.' },
      { word: 'girl', phonetic: '/ɡɜːl/', meaning: '女孩', sentence: 'The girl is reading.' },
      { word: 'hand', phonetic: '/hænd/', meaning: '手', sentence: 'Wash your hands before lunch.' },
      { word: 'ice', phonetic: '/aɪs/', meaning: '冰', sentence: 'The ice is very cold.' },
      { word: 'juice', phonetic: '/dʒuːs/', meaning: '果汁', sentence: 'I like orange juice.' },
      { word: 'kite', phonetic: '/kaɪt/', meaning: '风筝', sentence: 'We fly a kite in spring.' },
      { word: 'lion', phonetic: '/ˈlaɪən/', meaning: '狮子', sentence: 'The lion is the king of the jungle.' },
      { word: 'milk', phonetic: '/mɪlk/', meaning: '牛奶', sentence: 'I drink milk every morning.' },
      { word: 'nose', phonetic: '/nəʊz/', meaning: '鼻子', sentence: 'Touch your nose.' },
      { word: 'orange', phonetic: '/ˈɒrɪndʒ/', meaning: '橙子', sentence: 'The orange is sweet.' },
      { word: 'pen', phonetic: '/pen/', meaning: '钢笔', sentence: 'I write with a pen.' },
      { word: 'red', phonetic: '/red/', meaning: '红色', sentence: 'The apple is red.' },
      { word: 'sun', phonetic: '/sʌn/', meaning: '太阳', sentence: 'The sun is bright.' },
      { word: 'tree', phonetic: '/triː/', meaning: '树', sentence: 'There is a big tree in the park.' },
      { word: 'water', phonetic: '/ˈwɔːtə/', meaning: '水', sentence: 'Please give me some water.' },
    ],
  },
  {
    grade: '四年级',
    words: [
      { word: 'banana', phonetic: '/bəˈnɑːnə/', meaning: '香蕉', sentence: 'Monkeys love bananas.' },
      { word: 'classroom', phonetic: '/ˈklɑːsruːm/', meaning: '教室', sentence: 'Our classroom is clean.' },
      { word: 'dinner', phonetic: '/ˈdɪnə/', meaning: '晚饭', sentence: "What's for dinner?" },
      { word: 'friend', phonetic: '/frend/', meaning: '朋友', sentence: 'She is my best friend.' },
      { word: 'garden', phonetic: '/ˈɡɑːdn/', meaning: '花园', sentence: 'The garden has many flowers.' },
      { word: 'happy', phonetic: '/ˈhæpi/', meaning: '快乐的', sentence: 'I am happy today.' },
      { word: 'homework', phonetic: '/ˈhəʊmwɜːk/', meaning: '家庭作业', sentence: 'I do my homework after school.' },
      { word: 'jump', phonetic: '/dʒʌmp/', meaning: '跳', sentence: 'The rabbit can jump high.' },
      { word: 'kitchen', phonetic: '/ˈkɪtʃɪn/', meaning: '厨房', sentence: 'Mom is cooking in the kitchen.' },
      { word: 'library', phonetic: '/ˈlaɪbrəri/', meaning: '图书馆', sentence: 'I borrow books from the library.' },
      { word: 'monkey', phonetic: '/ˈmʌŋki/', meaning: '猴子', sentence: 'The monkey is on the tree.' },
      { word: 'nurse', phonetic: '/nɜːs/', meaning: '护士', sentence: 'The nurse is kind.' },
      { word: 'pencil', phonetic: '/ˈpensl/', meaning: '铅笔', sentence: 'My pencil is broken.' },
      { word: 'window', phonetic: '/ˈwɪndəʊ/', meaning: '窗户', sentence: 'Please open the window.' },
      { word: 'yellow', phonetic: '/ˈjeləʊ/', meaning: '黄色', sentence: 'The banana is yellow.' },
      { word: 'zoo', phonetic: '/zuː/', meaning: '动物园', sentence: "Let's go to the zoo." },
      { word: 'breakfast', phonetic: '/ˈbrekfəst/', meaning: '早餐', sentence: 'I have bread for breakfast.' },
      { word: 'computer', phonetic: '/kəmˈpjuːtə/', meaning: '电脑', sentence: 'I play games on the computer.' },
      { word: 'doctor', phonetic: '/ˈdɒktə/', meaning: '医生', sentence: 'The doctor helps sick people.' },
      { word: 'river', phonetic: '/ˈrɪvə/', meaning: '河流', sentence: 'The river is long.' },
    ],
  },
  {
    grade: '五年级',
    words: [
      { word: 'holiday', phonetic: '/ˈhɒlədeɪ/', meaning: '假日', sentence: 'We travel on holidays.' },
      { word: 'mountain', phonetic: '/ˈmaʊntən/', meaning: '山', sentence: 'The mountain is very high.' },
      { word: 'beautiful', phonetic: '/ˈbjuːtɪfl/', meaning: '美丽的', sentence: 'What a beautiful flower!' },
      { word: 'yesterday', phonetic: '/ˈjestədeɪ/', meaning: '昨天', sentence: 'It rained yesterday.' },
      { word: 'tomorrow', phonetic: '/təˈmɒrəʊ/', meaning: '明天', sentence: 'We will have a test tomorrow.' },
      { word: 'weather', phonetic: '/ˈweðə/', meaning: '天气', sentence: 'The weather is nice today.' },
      { word: 'umbrella', phonetic: '/ʌmˈbrelə/', meaning: '雨伞', sentence: "Take an umbrella, it's raining." },
      { word: 'hospital', phonetic: '/ˈhɒspɪtl/', meaning: '医院', sentence: 'He works in a hospital.' },
      { word: 'cinema', phonetic: '/ˈsɪnəmə/', meaning: '电影院', sentence: 'We watch movies at the cinema.' },
      { word: 'subject', phonetic: '/ˈsʌbdʒɪkt/', meaning: '科目', sentence: 'Math is my favorite subject.' },
      { word: 'science', phonetic: '/ˈsaɪəns/', meaning: '科学', sentence: 'I like science class.' },
      { word: 'history', phonetic: '/ˈhɪstri/', meaning: '历史', sentence: 'We learn about history.' },
      { word: 'festival', phonetic: '/ˈfestɪvl/', meaning: '节日', sentence: 'Spring Festival is my favorite.' },
      { word: 'family', phonetic: '/ˈfæməli/', meaning: '家庭', sentence: 'I love my family.' },
      { word: 'exercise', phonetic: '/ˈeksəsaɪz/', meaning: '锻炼', sentence: 'Exercise is good for health.' },
      { word: 'forest', phonetic: '/ˈfɒrɪst/', meaning: '森林', sentence: 'The forest is full of trees.' },
      { word: 'planet', phonetic: '/ˈplænɪt/', meaning: '行星', sentence: 'The Earth is a planet.' },
      { word: 'healthy', phonetic: '/ˈhelθi/', meaning: '健康的', sentence: 'Eat healthy food.' },
      { word: 'airport', phonetic: '/ˈeəpɔːt/', meaning: '机场', sentence: 'We met at the airport.' },
      { word: 'bridge', phonetic: '/brɪdʒ/', meaning: '桥', sentence: 'The bridge is over the river.' },
    ],
  },
  {
    grade: '六年级',
    words: [
      { word: 'environment', phonetic: '/ɪnˈvaɪrənmənt/', meaning: '环境', sentence: 'We should protect the environment.' },
      { word: 'technology', phonetic: '/tekˈnɒlədʒi/', meaning: '技术', sentence: 'Technology changes our life.' },
      { word: 'adventure', phonetic: '/ədˈventʃə/', meaning: '冒险', sentence: 'The book is about an adventure.' },
      { word: 'experience', phonetic: '/ɪkˈspɪəriəns/', meaning: '经历', sentence: 'It was a great experience.' },
      { word: 'knowledge', phonetic: '/ˈnɒlɪdʒ/', meaning: '知识', sentence: 'Knowledge is power.' },
      { word: 'future', phonetic: '/ˈfjuːtʃə/', meaning: '未来', sentence: 'What will the future be like?' },
      { word: 'society', phonetic: '/səˈsaɪəti/', meaning: '社会', sentence: 'We live in a modern society.' },
      { word: 'decision', phonetic: '/dɪˈsɪʒn/', meaning: '决定', sentence: "It's a difficult decision." },
      { word: 'communication', phonetic: '/kəˌmjuːnɪˈkeɪʃn/', meaning: '交流', sentence: 'Good communication is important.' },
      { word: 'education', phonetic: '/ˌedʒuˈkeɪʃn/', meaning: '教育', sentence: 'Education opens doors.' },
      { word: 'imagination', phonetic: '/ɪˌmædʒɪˈneɪʃn/', meaning: '想象力', sentence: 'Use your imagination.' },
      { word: 'tradition', phonetic: '/trəˈdɪʃn/', meaning: '传统', sentence: 'This is a Chinese tradition.' },
      { word: 'invention', phonetic: '/ɪnˈvenʃn/', meaning: '发明', sentence: 'The wheel is a great invention.' },
      { word: 'dangerous', phonetic: '/ˈdeɪndʒərəs/', meaning: '危险的', sentence: "It's dangerous to play with fire." },
      { word: 'delicious', phonetic: '/dɪˈlɪʃəs/', meaning: '美味的', sentence: 'The cake is delicious.' },
      { word: 'interesting', phonetic: '/ˈɪntrəstɪŋ/', meaning: '有趣的', sentence: 'The book is very interesting.' },
      { word: 'wonderful', phonetic: '/ˈwʌndəfl/', meaning: '精彩的', sentence: 'We had a wonderful time.' },
      { word: 'different', phonetic: '/ˈdɪfrənt/', meaning: '不同的', sentence: 'We are different but equal.' },
      { word: 'important', phonetic: '/ɪmˈpɔːtnt/', meaning: '重要的', sentence: 'Family is important to me.' },
      { word: 'favorite', phonetic: '/ˈfeɪvərɪt/', meaning: '最爱的', sentence: 'Blue is my favorite color.' },
    ],
  },
]

const grades = wordLibrary.map((g) => g.grade)
const modes = [
  { label: '听写模式', value: 'dictation' as const },
  { label: '看中文拼英文', value: 'cn2en' as const },
  { label: '看英文写中文', value: 'en2cn' as const },
]
const counts = [10, 15, 20]
const rateOptions = [0.6, 0.8, 1.0]

const grade = ref(grades[0])
const mode = ref<'dictation' | 'cn2en' | 'en2cn'>('dictation')
const count = ref(10)
const rate = ref(0.8)

type Status = 'idle' | 'running' | 'paused' | 'finished'
const status = ref<Status>('idle')

interface QuizItem {
  word: WordItem
  userAnswer: string
}
const quizList = ref<QuizItem[]>([])
const currentIndex = ref(0)
const graded = ref(false)
let timer: number | null = null

const currentGradeWords = computed(() => {
  const g = wordLibrary.find((x) => x.grade === grade.value)
  return g ? g.words : []
})

const currentQuizItem = computed(() => quizList.value[currentIndex.value] || null)
const total = computed(() => quizList.value.length)
const progress = computed(() => (total.value ? ((currentIndex.value + 1) / total.value) * 100 : 0))

const correctCount = computed(() => {
  if (!graded.value) return 0
  return quizList.value.filter((_, i) => isCorrect(i)).length
})

const wrongList = computed(() => {
  if (!graded.value) return []
  return quizList.value
    .map((q, i) => ({ q, i }))
    .filter(({ i }) => !isCorrect(i))
})

function isCorrect(idx: number): boolean {
  const item = quizList.value[idx]
  if (!item) return false
  const user = (item.userAnswer || '').trim()
  if (!user) return false
  if (mode.value === 'en2cn') {
    return item.word.meaning.includes(user) || user.includes(item.word.meaning)
  }
  return user.toLowerCase() === item.word.word.toLowerCase()
}

function buildQuiz() {
  const pool = [...currentGradeWords.value]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const n = Math.min(count.value, pool.length)
  quizList.value = pool.slice(0, n).map((w) => ({ word: w, userAnswer: '' }))
  currentIndex.value = 0
  graded.value = false
}

function speakWord(word: string) {
  try {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(word)
    u.lang = 'en-US'
    u.rate = rate.value
    window.speechSynthesis.speak(u)
  } catch {
    toast.error('朗读功能不可用')
  }
}

function startDictation() {
  stopDictation()
  buildQuiz()
  status.value = 'running'
  currentIndex.value = 0
  speakCurrent()
}

function speakCurrent() {
  if (status.value !== 'running') return
  if (currentIndex.value >= total.value) {
    finishDictation()
    return
  }
  const item = currentQuizItem.value
  if (!item) return
  speakWord(item.word.word)
  timer = window.setTimeout(() => {
    if (status.value !== 'running') return
    currentIndex.value++
    if (currentIndex.value >= total.value) {
      finishDictation()
    } else {
      speakCurrent()
    }
  }, 5000)
}

function pauseDictation() {
  if (status.value !== 'running') return
  status.value = 'paused'
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* noop */
  }
}

function resumeDictation() {
  if (status.value !== 'paused') return
  status.value = 'running'
  const item = currentQuizItem.value
  if (item) speakWord(item.word.word)
  timer = window.setTimeout(() => {
    if (status.value !== 'running') return
    currentIndex.value++
    if (currentIndex.value >= total.value) {
      finishDictation()
    } else {
      speakCurrent()
    }
  }, 5000)
}

function stopDictation() {
  status.value = 'idle'
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* noop */
  }
}

function finishDictation() {
  status.value = 'finished'
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  toast.success('听写已完成，可继续补充答案后批改')
}

function replayCurrent() {
  if (status.value === 'idle' || status.value === 'finished') return
  const item = currentQuizItem.value
  if (item) speakWord(item.word.word)
}

function startPractice() {
  stopDictation()
  buildQuiz()
}

function gradeAll() {
  const unanswered = quizList.value.filter((q) => !q.userAnswer.trim()).length
  if (unanswered > 0) {
    toast.warning(`还有 ${unanswered} 题未作答`)
    return
  }
  graded.value = true
  stopDictation()
  toast.success(`批改完成，正确 ${correctCount.value}/${quizList.value.length}`)
}

function copyWrongList() {
  if (!wrongList.value.length) return
  const text = wrongList.value
    .map(({ q }, idx) => {
      const parts = [`【错题${idx + 1}】`]
      parts.push(`单词：${q.word.word} ${q.word.phonetic}`)
      parts.push(`中文：${q.word.meaning}`)
      if (mode.value === 'en2cn') {
        parts.push(`你的答案：${q.userAnswer || '未作答'}`)
      } else {
        parts.push(`你的拼写：${q.userAnswer || '未作答'}`)
      }
      parts.push(`例句：${q.word.sentence}`)
      return parts.join('\n')
    })
    .join('\n\n')
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制错题'),
    () => toast.error('复制失败'),
  )
}

function reset() {
  stopDictation()
  quizList.value = []
  currentIndex.value = 0
  graded.value = false
}

watch(grade, () => reset())
watch(mode, () => reset())

onUnmounted(() => {
  if (timer !== null) clearTimeout(timer)
  try {
    window.speechSynthesis.cancel()
  } catch {
    /* noop */
  }
})
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />

    <section class="card-soft p-5 bg-gradient-to-br from-sky2-100 via-mint-100 to-butter-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky2-300 to-mint-300 flex items-center justify-center text-2xl shadow-softer">
          ✏️
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">单词拼写</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            内置三~六年级词库，支持听写、看中文拼英文、看英文写中文三种模式，自动批改并收集错题。
          </p>
        </div>
      </div>
    </section>

    <section class="card-flat p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">年级</label>
          <select
            v-model="grade"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
            :disabled="status === 'running' || status === 'paused'"
          >
            <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">模式</label>
          <select
            v-model="mode"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
            :disabled="status === 'running' || status === 'paused'"
          >
            <option v-for="m in modes" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">题量</label>
          <select
            v-model="count"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
            :disabled="status === 'running' || status === 'paused'"
          >
            <option v-for="c in counts" :key="c" :value="c">{{ c }} 词</option>
          </select>
        </div>
      </div>
      <div class="mt-4">
        <button
          v-if="mode === 'dictation'"
          class="btn-primary flex items-center gap-2"
          :disabled="status === 'running'"
          @click="startDictation"
        >
          <Play :size="16" /> 开始听写
        </button>
        <button
          v-else
          class="btn-primary flex items-center gap-2"
          @click="startPractice"
        >
          <Play :size="16" /> 开始练习
        </button>
      </div>
    </section>

    <!-- 听写控制台 -->
    <section
      v-if="mode === 'dictation' && quizList.length && status !== 'idle'"
      class="card-flat p-5"
    >
      <div class="mb-4">
        <div class="flex items-center justify-between text-xs text-cocoa-500 mb-1.5">
          <span>
            进度：第
            <span class="text-sky2-600 font-semibold text-base mx-1">{{ Math.min(currentIndex + 1, total || 1) }}</span>
            / {{ total || 0 }} 个
          </span>
          <span v-if="status === 'running'" class="flex items-center gap-1 text-sky2-500">
            <Volume2 :size="12" class="animate-pulse" /> 朗读中
          </span>
          <span v-else-if="status === 'paused'" class="text-amber-500">已暂停</span>
          <span v-else-if="status === 'finished'" class="text-mint-500">已朗读完毕</span>
        </div>
        <div class="h-2 bg-cream-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-sky2-400 to-sky2-600 transition-all duration-300"
            :style="{ width: `${progress}%` }"
          />
        </div>
      </div>

      <div class="text-center mb-4">
        <div v-if="status === 'finished'" class="text-cocoa-600 text-sm">
          🎉 全部 {{ total }} 个单词已朗读完毕，可继续补充答案后批改
        </div>
        <div v-else>
          <div class="text-xs text-cocoa-400 mb-1">正在朗读第 {{ currentIndex + 1 }} 个单词</div>
          <button
            class="w-14 h-14 rounded-full bg-sky2-100 hover:bg-sky2-200 transition flex items-center justify-center text-2xl"
            @click="replayCurrent"
          >
            🔊
          </button>
          <p class="text-xs text-cocoa-400 mt-2">点击图标可重听当前单词</p>
        </div>
      </div>

      <div class="flex items-center justify-center gap-2 flex-wrap">
        <button
          v-if="status === 'running'"
          class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
          @click="pauseDictation"
        >
          <Pause :size="14" /> 暂停
        </button>
        <button
          v-if="status === 'paused'"
          class="btn-primary flex items-center gap-1 !px-3 !py-2 text-sm"
          @click="resumeDictation"
        >
          <Play :size="14" /> 继续
        </button>
        <button
          v-if="status === 'running' || status === 'paused'"
          class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
          @click="stopDictation"
        >
          <Square :size="14" /> 停止
        </button>
        <div class="flex items-center gap-1 text-xs text-cocoa-500 ml-2">
          <Gauge :size="14" /> 语速
          <button
            v-for="r in rateOptions"
            :key="r"
            class="px-2 py-1 rounded-lg transition"
            :class="rate === r ? 'bg-sky2-100 text-sky2-600' : 'hover:bg-cream-100'"
            @click="rate = r"
          >
            {{ r.toFixed(1) }}
          </button>
        </div>
      </div>
    </section>

    <!-- 答题区 -->
    <template v-if="quizList.length">
      <section class="card-flat p-4 flex items-center gap-2 flex-wrap">
        <button
          v-if="!graded"
          class="btn-primary flex items-center gap-2 !py-2"
          @click="gradeAll"
        >
          <Check :size="16" /> 批改
        </button>
        <div v-else class="flex items-center gap-3">
          <span class="text-sm text-cocoa-600">正确</span>
          <span class="text-2xl font-bold text-sky2-600">{{ correctCount }} / {{ quizList.length }}</span>
        </div>
        <button
          v-if="graded && wrongList.length"
          class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
          @click="copyWrongList"
        >
          <Copy :size="12" /> 复制错题
        </button>
        <button
          class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
          @click="reset"
        >
          <RotateCcw :size="14" /> 重置
        </button>
      </section>

      <section class="space-y-3">
        <div
          v-for="(item, qi) in quizList"
          :key="qi"
          class="card-flat p-4 transition"
          :class="mode === 'dictation' && status !== 'idle' && status !== 'finished' && qi === currentIndex ? 'ring-2 ring-sky2-300' : ''"
        >
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="flex-1 min-w-0">
              <span class="text-xs text-sky2-600 font-medium">第 {{ qi + 1 }} 题</span>
              <p v-if="mode === 'dictation'" class="text-sm text-cocoa-700 mt-1 flex items-center gap-1">
                <Volume2 :size="14" class="text-cocoa-400" />
                <button
                  class="text-sky2-600 hover:underline"
                  @click="speakWord(item.word.word)"
                >
                  朗读单词
                </button>
              </p>
              <p v-else-if="mode === 'cn2en'" class="text-sm text-cocoa-800 mt-1">
                中文：{{ item.word.meaning }}
              </p>
              <p v-else class="text-sm text-cocoa-800 mt-1">
                <span class="font-medium">{{ item.word.word }}</span>
                <span class="text-cocoa-400 ml-2">{{ item.word.phonetic }}</span>
              </p>
            </div>
            <span
              v-if="graded"
              class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
              :class="isCorrect(qi) ? 'bg-mint-100 text-mint-600' : 'bg-sakura-100 text-sakura-600'"
            >
              <Check v-if="isCorrect(qi)" :size="14" />
              <X v-else :size="14" />
            </span>
          </div>
          <input
            v-model="item.userAnswer"
            type="text"
            :disabled="graded"
            :placeholder="mode === 'dictation' ? '请输入听到的英文单词...' : (mode === 'en2cn' ? '请输入中文意思...' : '请输入英文单词...')"
            class="w-full card-flat px-4 py-2.5 text-sm"
            :class="graded ? (isCorrect(qi) ? '!border-mint-400 !bg-mint-50' : '!border-sakura-400 !bg-sakura-50') : ''"
          />
          <div v-if="graded && !isCorrect(qi)" class="mt-2 text-xs text-cocoa-600">
            <span class="text-cocoa-500">正确答案：</span>
            <span v-if="mode === 'en2cn'" class="text-mint-600 font-medium">{{ item.word.meaning }}</span>
            <span v-else class="text-mint-600 font-medium">{{ item.word.word }} {{ item.word.phonetic }}</span>
          </div>
          <div v-if="graded" class="mt-1 text-xs text-cocoa-500">
            例句：{{ item.word.sentence }}
          </div>
        </div>
      </section>

      <!-- 错题列表 -->
      <section
        v-if="graded && wrongList.length"
        class="card-soft p-5 bg-gradient-to-br from-sakura-50 to-cream-50"
      >
        <div class="flex items-center justify-between mb-3">
          <h3 class="title-display text-lg flex items-center gap-2">
            <X :size="18" class="text-sakura-500" /> 错题列表
            <span class="text-sm text-cocoa-400">({{ wrongList.length }} 词)</span>
          </h3>
          <button
            class="btn-ghost flex items-center gap-1 !px-3 !py-1.5 text-xs"
            @click="copyWrongList"
          >
            <Copy :size="12" /> 复制错题
          </button>
        </div>
        <div class="space-y-2">
          <div
            v-for="({ q }, wi) in wrongList"
            :key="wi"
            class="card-flat p-3 text-sm"
          >
            <div class="flex items-center gap-2">
              <span class="font-medium text-cocoa-800">{{ q.word.word }}</span>
              <span class="text-cocoa-400 text-xs">{{ q.word.phonetic }}</span>
              <span class="text-cocoa-600 text-xs">{{ q.word.meaning }}</span>
            </div>
            <div class="mt-1.5 flex items-center gap-3 text-xs">
              <span class="text-sakura-500">你的答案：{{ q.userAnswer || '未作答' }}</span>
              <span class="text-mint-600">正确：{{ mode === 'en2cn' ? q.word.meaning : q.word.word }}</span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <section
      v-else-if="status === 'idle'"
      class="card-soft p-8 text-center text-cocoa-400"
    >
      <Volume2 :size="36" class="mx-auto mb-2 opacity-40" />
      <p class="text-sm">选择年级、模式、题量后点击「开始听写」或「开始练习」</p>
      <p class="text-xs mt-1">听写模式自动朗读单词，其余模式手动作答，批改后自动收集错题</p>
    </section>
  </div>
</template>
