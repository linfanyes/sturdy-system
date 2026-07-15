<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Copy, Volume2, RotateCcw, Shuffle, Check, X, Star, Bookmark, Download, Printer } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const toast = useToastStore()

interface WordItem {
  en: string
  zh: string
  phonetic: string
}

const wordLists = [
  {
    name: '三年级上册',
    words: [
      { en: 'apple', zh: '苹果', phonetic: '/ˈæpl/' },
      { en: 'banana', zh: '香蕉', phonetic: '/bəˈnænə/' },
      { en: 'cat', zh: '猫', phonetic: '/kæt/' },
      { en: 'dog', zh: '狗', phonetic: '/dɒɡ/' },
      { en: 'egg', zh: '鸡蛋', phonetic: '/eɡ/' },
      { en: 'fish', zh: '鱼', phonetic: '/fɪʃ/' },
      { en: 'girl', zh: '女孩', phonetic: '/ɡɜːl/' },
      { en: 'hand', zh: '手', phonetic: '/hænd/' },
      { en: 'ice', zh: '冰', phonetic: '/aɪs/' },
      { en: 'juice', zh: '果汁', phonetic: '/dʒuːs/' },
      { en: 'kite', zh: '风筝', phonetic: '/kaɪt/' },
      { en: 'lion', zh: '狮子', phonetic: '/ˈlaɪən/' },
      { en: 'milk', zh: '牛奶', phonetic: '/mɪlk/' },
      { en: 'nose', zh: '鼻子', phonetic: '/nəʊz/' },
      { en: 'orange', zh: '橙子', phonetic: '/ˈɒrɪndʒ/' },
      { en: 'pig', zh: '猪', phonetic: '/pɪɡ/' },
      { en: 'queen', zh: '女王', phonetic: '/kwiːn/' },
      { en: 'rabbit', zh: '兔子', phonetic: '/ˈræbɪt/' },
      { en: 'sun', zh: '太阳', phonetic: '/sʌn/' },
      { en: 'tiger', zh: '老虎', phonetic: '/ˈtaɪɡə/' },
    ],
  },
  {
    name: '四年级上册',
    words: [
      { en: 'beautiful', zh: '美丽的', phonetic: '/ˈbjuːtɪfl/' },
      { en: 'computer', zh: '电脑', phonetic: '/kəmˈpjuːtə/' },
      { en: 'different', zh: '不同的', phonetic: '/ˈdɪfrənt/' },
      { en: 'elephant', zh: '大象', phonetic: '/ˈelɪfənt/' },
      { en: 'favorite', zh: '最喜欢的', phonetic: '/ˈfeɪvərɪt/' },
      { en: 'garden', zh: '花园', phonetic: '/ˈɡɑːdn/' },
      { en: 'hospital', zh: '医院', phonetic: '/ˈhɒspɪtl/' },
      { en: 'important', zh: '重要的', phonetic: '/ɪmˈpɔːtnt/' },
      { en: 'journey', zh: '旅程', phonetic: '/ˈdʒɜːni/' },
      { en: 'kitchen', zh: '厨房', phonetic: '/ˈkɪtʃɪn/' },
      { en: 'library', zh: '图书馆', phonetic: '/ˈlaɪbrəri/' },
      { en: 'morning', zh: '早晨', phonetic: '/ˈmɔːnɪŋ/' },
      { en: 'notebook', zh: '笔记本', phonetic: '/ˈnəʊtbʊk/' },
      { en: 'outside', zh: '外面', phonetic: '/ˌaʊtˈsaɪd/' },
      { en: 'picture', zh: '图画', phonetic: '/ˈpɪktʃə/' },
      { en: 'question', zh: '问题', phonetic: '/ˈkwestʃən/' },
      { en: 'rainbow', zh: '彩虹', phonetic: '/ˈreɪnbəʊ/' },
      { en: 'student', zh: '学生', phonetic: '/ˈstjuːdnt/' },
      { en: 'teacher', zh: '老师', phonetic: '/ˈtiːtʃə/' },
      { en: 'umbrella', zh: '雨伞', phonetic: '/ʌmˈbrelə/' },
    ],
  },
  {
    name: '五年级上册',
    words: [
      { en: 'adventure', zh: '冒险', phonetic: '/ədˈventʃə/' },
      { en: 'business', zh: '商业', phonetic: '/ˈbɪznəs/' },
      { en: 'celebrate', zh: '庆祝', phonetic: '/ˈselɪbreɪt/' },
      { en: 'decision', zh: '决定', phonetic: '/dɪˈsɪʒn/' },
      { en: 'education', zh: '教育', phonetic: '/ˌedʒuˈkeɪʃn/' },
      { en: 'fantastic', zh: '极好的', phonetic: '/fænˈtæstɪk/' },
      { en: 'government', zh: '政府', phonetic: '/ˈɡʌvənmənt/' },
      { en: 'happiness', zh: '幸福', phonetic: '/ˈhæpinəs/' },
      { en: 'imagine', zh: '想象', phonetic: '/ɪˈmædʒɪn/' },
      { en: 'journey', zh: '旅行', phonetic: '/ˈdʒɜːni/' },
      { en: 'knowledge', zh: '知识', phonetic: '/ˈnɒlɪdʒ/' },
      { en: 'language', zh: '语言', phonetic: '/ˈlæŋɡwɪdʒ/' },
      { en: 'mountain', zh: '山', phonetic: '/ˈmaʊntɪn/' },
      { en: 'natural', zh: '自然的', phonetic: '/ˈnætʃrəl/' },
      { en: 'opportunity', zh: '机会', phonetic: '/ˌɒpəˈtjuːnəti/' },
      { en: 'possible', zh: '可能的', phonetic: '/ˈpɒsəbl/' },
      { en: 'remember', zh: '记住', phonetic: '/rɪˈmembə/' },
      { en: 'science', zh: '科学', phonetic: '/ˈsaɪəns/' },
      { en: 'technology', zh: '技术', phonetic: '/tekˈnɒlədʒi/' },
      { en: 'understand', zh: '理解', phonetic: '/ˌʌndəˈstænd/' },
    ],
  },
]

interface WordList {
  name: string
  words: WordItem[]
}

const selectedList = ref(wordLists[0])
const currentIndex = ref(0)
const showAnswer = ref(false)
const mode = ref<'flashcard' | 'quiz'>('flashcard')
const shuffledWords = ref<WordItem[]>([])
const quizResults = ref<{ word: WordItem; correct: boolean; userAnswer: string }[]>([])
const bookmarks = ref<string[]>([])
const isShuffled = ref(false)
const quizInput = ref('')

const currentWord = computed(() => {
  const words = isShuffled.value ? shuffledWords.value : selectedList.value.words
  return words[currentIndex.value]
})

const progress = computed(() => {
  const words = isShuffled.value ? shuffledWords.value : selectedList.value.words
  return ((currentIndex.value + 1) / words.length) * 100
})

const correctCount = computed(() => quizResults.value.filter(r => r.correct).length)
const wrongCount = computed(() => quizResults.value.filter(r => !r.correct).length)

watch(selectedList, () => {
  currentIndex.value = 0
  showAnswer.value = false
  quizResults.value = []
  if (isShuffled.value) shuffleWords()
})

watch(isShuffled, (val) => {
  if (val) {
    shuffleWords()
  }
  currentIndex.value = 0
  showAnswer.value = false
  quizResults.value = []
})

function shuffleWords() {
  shuffledWords.value = [...selectedList.value.words].sort(() => Math.random() - 0.5)
}

function toggleAnswer() {
  showAnswer.value = !showAnswer.value
}

function nextWord() {
  const words = isShuffled.value ? shuffledWords.value : selectedList.value.words
  if (currentIndex.value < words.length - 1) {
    currentIndex.value++
    showAnswer.value = false
  }
}

function prevWord() {
  if (currentIndex.value > 0) {
    currentIndex.value--
    showAnswer.value = false
  }
}

function goToIndex(index: number) {
  currentIndex.value = index
  showAnswer.value = false
}

function playAudio() {
  if (!currentWord.value) return
  const utterance = new SpeechSynthesisUtterance(currentWord.value.en)
  utterance.lang = 'en-US'
  speechSynthesis.speak(utterance)
}

function toggleBookmark() {
  if (!currentWord.value) return
  const word = currentWord.value.en
  const idx = bookmarks.value.indexOf(word)
  if (idx >= 0) {
    bookmarks.value.splice(idx, 1)
    toast.success('已取消收藏')
  } else {
    bookmarks.value.push(word)
    toast.success('已收藏')
  }
}

function isBookmarked(word: string) {
  return bookmarks.value.includes(word)
}

function copyWord() {
  if (!currentWord.value) return
  const text = `${currentWord.value.en} ${currentWord.value.phonetic} ${currentWord.value.zh}`
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制'),
    () => toast.error('复制失败'),
  )
}

function resetQuiz() {
  quizResults.value = []
  currentIndex.value = 0
  showAnswer.value = false
}

function submitQuizAnswer(answer: string) {
  if (!currentWord.value) return
  const correct = answer.trim().toLowerCase() === currentWord.value.en.toLowerCase()
  quizResults.value.push({ word: currentWord.value, correct, userAnswer: answer })
  showAnswer.value = true
}

function exportWords() {
  const text = selectedList.value.words.map(w => `${w.en}\t${w.phonetic}\t${w.zh}`).join('\n')
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${selectedList.value.name}单词表.txt`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('已导出')
}

function printWords() {
  const printContent = document.getElementById('word-card-print')
  if (!printContent) return
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    toast.error('无法打开打印窗口')
    return
  }
  printWindow.document.write(`
    <html><head><style>
      body { font-family: 'Microsoft YaHei', sans-serif; padding: 40px; }
      .card { border: 1px solid #ddd; border-radius: 12px; padding: 20px; margin-bottom: 15px; }
      .en { font-size: 24px; font-weight: bold; color: #333; }
      .phonetic { font-size: 14px; color: #666; margin-top: 5px; }
      .zh { font-size: 16px; color: #444; margin-top: 8px; }
    </style></head><body>
  `)
  printContent.querySelectorAll('.print-card').forEach(card => {
    printWindow.document.write(card.outerHTML)
  })
  printWindow.document.write('</body></html>')
  printWindow.document.close()
  printWindow.print()
}

function reset() {
  currentIndex.value = 0
  showAnswer.value = false
  quizResults.value = []
  isShuffled.value = false
  mode.value = 'flashcard'
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    
    <section class="card-soft p-5 bg-gradient-to-br from-sky2-100 via-mint-100 to-butter-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky2-300 to-mint-300 flex items-center justify-center text-2xl shadow-softer">
          📚
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">英语单词卡片</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            包含小学各年级英语单词，支持闪卡模式和测验模式，帮助学生记忆单词。
          </p>
        </div>
      </div>
    </section>
    
    <section class="card-flat p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex-1 min-w-[200px]">
          <label class="text-xs text-cocoa-500 ml-1">选择年级</label>
          <select
            v-model="selectedList"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
          >
            <option v-for="list in wordLists" :key="list.name" :value="list">
              {{ list.name }} ({{ list.words.length }}个单词)
            </option>
          </select>
        </div>
        <div class="flex gap-2">
          <button
            class="btn-ghost !px-3 !py-2"
            :class="mode === 'flashcard' ? 'bg-sky2-100 text-sky2-600' : ''"
            @click="mode = 'flashcard'; resetQuiz()"
          >
            闪卡模式
          </button>
          <button
            class="btn-ghost !px-3 !py-2"
            :class="mode === 'quiz' ? 'bg-sakura-100 text-sakura-600' : ''"
            @click="mode = 'quiz'; resetQuiz()"
          >
            测验模式
          </button>
        </div>
        <button
          class="btn-ghost !px-3 !py-2 flex items-center gap-1"
          :class="isShuffled ? 'bg-mint-100 text-mint-600' : ''"
          @click="isShuffled = !isShuffled"
        >
          <Shuffle :size="14" /> 随机
        </button>
      </div>
    </section>
    
    <div class="card-flat p-1">
      <div class="h-1.5 bg-cream-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-sky2-300 to-mint-300 transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>
      <div class="flex items-center justify-between mt-1.5 px-1">
        <span class="text-xs text-cocoa-500">
          {{ currentIndex + 1 }} / {{ isShuffled ? shuffledWords.length : selectedList.words.length }}
        </span>
        <div v-if="mode === 'quiz' && quizResults.length" class="flex items-center gap-3 text-xs">
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
      <div
        id="word-card-print"
        class="text-center"
        @click="mode === 'flashcard' && toggleAnswer()"
      >
        <div
          v-if="mode === 'flashcard'"
          class="print-card border border-butter-200 rounded-3xl p-8 bg-gradient-to-br from-sky2-50 to-mint-50 cursor-pointer transition-all hover:shadow-md"
        >
          <div class="flex items-center justify-between mb-6">
            <button
              class="p-2 rounded-full hover:bg-white/60 transition-colors"
              @click.stop="toggleBookmark"
            >
              <Bookmark :size="20" :class="isBookmarked(currentWord?.en || '') ? 'text-butter-500 fill-butter-500' : 'text-cocoa-400'" />
            </button>
            <button
              class="p-2 rounded-full hover:bg-white/60 transition-colors"
              @click.stop="playAudio"
            >
              <Volume2 :size="20" class="text-mint-500" />
            </button>
            <button
              class="p-2 rounded-full hover:bg-white/60 transition-colors"
              @click.stop="copyWord"
            >
              <Copy :size="20" class="text-cocoa-400" />
            </button>
          </div>
          
          <div v-if="!showAnswer">
            <div class="text-5xl font-bold text-cocoa-900 mb-3">{{ currentWord?.en }}</div>
            <div class="text-xl text-cocoa-500">{{ currentWord?.phonetic }}</div>
            <div class="text-sm text-cocoa-400 mt-4">点击卡片查看中文释义</div>
          </div>
          <div v-else>
            <div class="text-5xl font-bold text-cocoa-900 mb-3">{{ currentWord?.en }}</div>
            <div class="text-xl text-cocoa-500 mb-4">{{ currentWord?.phonetic }}</div>
            <div class="text-3xl text-sky2-600">{{ currentWord?.zh }}</div>
          </div>
        </div>
        
        <div
          v-else
          class="print-card border border-butter-200 rounded-3xl p-8 bg-gradient-to-br from-sakura-50 to-butter-50"
        >
          <div class="text-xl text-cocoa-600 mb-6">请写出 "{{ currentWord?.zh }}" 的英文单词</div>
          <input
            v-if="!showAnswer"
            v-model="quizInput"
            type="text"
            placeholder="输入英文单词..."
            class="w-full max-w-xs card-flat px-4 py-3 text-lg text-center"
            @keydown.enter="submitQuizAnswer(quizInput)"
          />
          <div v-else>
            <div
              class="text-5xl font-bold mb-3"
              :class="quizResults[quizResults.length - 1]?.correct ? 'text-mint-500' : 'text-sakura-500'"
            >
              {{ currentWord?.en }}
            </div>
            <div v-if="!quizResults[quizResults.length - 1]?.correct" class="text-lg text-cocoa-600">
              你的答案: {{ quizResults[quizResults.length - 1]?.userAnswer || '未作答' }}
            </div>
          </div>
          <button
            v-if="!showAnswer"
            class="btn-primary mt-4 px-8"
            @click="submitQuizAnswer(quizInput)"
          >
            提交答案
          </button>
        </div>
      </div>
    </section>
    
    <section class="flex items-center justify-center gap-4">
      <button
        class="btn-secondary px-4 py-2"
        :disabled="currentIndex === 0"
        @click="prevWord"
      >
        上一个
      </button>
      <button
        class="btn-primary px-6 py-2"
        :disabled="currentIndex >= (isShuffled ? shuffledWords.length : selectedList.words.length) - 1"
        @click="nextWord"
      >
        {{ currentIndex >= (isShuffled ? shuffledWords.length : selectedList.words.length) - 1 ? '已完成' : '下一个' }}
      </button>
    </section>
    
    <section class="flex items-center justify-center gap-4 flex-wrap">
      <button
        class="btn-ghost !px-3 !py-1.5 text-xs"
        @click="exportWords"
      >
        <Download :size="12" /> 导出单词表
      </button>
      <button
        class="btn-ghost !px-3 !py-1.5 text-xs"
        @click="printWords"
      >
        <Printer :size="12" /> 打印
      </button>
      <button
        class="btn-ghost !px-3 !py-1.5 text-xs"
        @click="reset"
      >
        <RotateCcw :size="12" /> 重置
      </button>
    </section>
    
    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：点击喇叭图标可以听单词发音，收藏重要单词便于复习
    </div>
  </div>
</template>
