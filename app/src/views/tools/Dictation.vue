<!--
  Dictation.vue
  汉字听写工具：内置三/四/五年级常用词语库，支持自定义词库，
  使用浏览器 speechSynthesis 依次朗读词语（可调语速），学生默写后可对照答案。
-->
<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue'
import { Play, Pause, Square, RotateCcw, Eye, EyeOff, Volume2, Gauge } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const toast = useToastStore()

interface WordGroup {
  grade: string
  words: string[]
}

// ============ 内置词库 ============
const wordLibrary: WordGroup[] = [
  {
    grade: '三年级',
    words: [
      '春暖花开', '阳光明媚', '专心致志', '助人为乐', '坚持不懈',
      '兴高采烈', '五颜六色', '鸟语花香', '风景如画', '欢声笑语',
      '校园', '教室', '同学', '老师', '课本',
      '读书', '写字', '思考', '回答', '认真',
    ],
  },
  {
    grade: '四年级',
    words: [
      '山清水秀', '万紫千红', '翩翩起舞', '生机勃勃', '美不胜收',
      '流连忘返', '心旷神怡', '赏心悦目', '诗情画意', '绿树成荫',
      '田野', '小溪', '蝴蝶', '蜻蜓', '稻谷',
      '丰收', '果园', '菜地', '池塘', '农舍',
    ],
  },
  {
    grade: '五年级',
    words: [
      '磅礴大气', '气象万千', '波澜壮阔', '锦绣河山', '崇山峻岭',
      '悬崖峭壁', '峰峦雄伟', '漫山遍野', '郁郁葱葱', '苍翠欲滴',
      '丝绸之路', '兵马俑', '甲骨文', '青铜器', '指南针',
      '造纸术', '印刷术', '火药', '长城', '故宫',
    ],
  },
]

// ============ 词库选择 ============
const sourceType = ref<'preset' | 'custom'>('preset')
const selectedGrade = ref<string>(wordLibrary[0].grade)
const customText = ref('')

const activeWords = computed<string[]>(() => {
  if (sourceType.value === 'custom') {
    return customText.value
      .split('\n')
      .map((w) => w.trim())
      .filter(Boolean)
  }
  const group = wordLibrary.find((g) => g.grade === selectedGrade.value)
  return group ? group.words : []
})

watch(sourceType, () => {
  stopDictation()
})

watch(selectedGrade, () => {
  stopDictation()
})

// ============ 听写状态 ============
type Status = 'idle' | 'running' | 'paused' | 'finished'
const status = ref<Status>('idle')
const currentIndex = ref(0)
const rate = ref<number>(0.8)
const rateOptions = [0.6, 0.8, 1.0]
let timer: number | null = null
let currentUtterance: SpeechSynthesisUtterance | null = null

const total = computed(() => activeWords.value.length)
const currentWord = computed(() => activeWords.value[currentIndex.value] || '')
const progress = computed(() => (total.value ? ((currentIndex.value + 1) / total.value) * 100 : 0))

// 学生默写区
const studentInput = ref('')
// 答案对照
const showAnswer = ref(false)

function speakWord(word: string) {
  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'zh-CN'
    utterance.rate = rate.value
    currentUtterance = utterance
    window.speechSynthesis.speak(utterance)
  } catch {
    toast.error('朗读功能不可用')
  }
}

function startDictation() {
  if (!activeWords.value.length) {
    toast.warning('请先选择或输入词语')
    return
  }
  if (sourceType.value === 'custom' && customText.value.trim().split('\n').filter((l) => l.trim()).length === 0) {
    toast.warning('请在自定义词库中输入词语，每行一个')
    return
  }
  resetState(false)
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
  speakWord(currentWord.value)
  // 间隔 3 秒后朗读下一个
  timer = window.setTimeout(() => {
    if (status.value !== 'running') return
    currentIndex.value++
    if (currentIndex.value >= total.value) {
      finishDictation()
    } else {
      speakCurrent()
    }
  }, 3000)
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
  // 重新朗读当前词，再继续
  speakWord(currentWord.value)
  timer = window.setTimeout(() => {
    if (status.value !== 'running') return
    currentIndex.value++
    if (currentIndex.value >= total.value) {
      finishDictation()
    } else {
      speakCurrent()
    }
  }, 3000)
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
  currentUtterance = null
}

function finishDictation() {
  status.value = 'finished'
  if (timer !== null) {
    clearTimeout(timer)
    timer = null
  }
  toast.success('听写已完成，请对照答案检查')
}

function replayCurrent() {
  if (status.value === 'idle' || status.value === 'finished') return
  speakWord(currentWord.value)
}

function resetState(clearInput = true) {
  stopDictation()
  currentIndex.value = 0
  showAnswer.value = false
  if (clearInput) studentInput.value = ''
}

function restart() {
  resetState(true)
  toast.info('已重置，可重新开始听写')
}

// 组件卸载时清理 speechSynthesis，避免页面离开后仍在朗读
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

    <section class="card-soft p-5 bg-gradient-to-br from-rose-100 via-pink-50 to-cream-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-2xl shadow-softer">
          🎧
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">汉字听写</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            语文听写好帮手：自动朗读词语、可调语速，支持自定义词库，听写完毕一键对照答案。
          </p>
        </div>
      </div>
    </section>

    <!-- 词库选择 -->
    <section class="card-flat p-4">
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex gap-2">
          <button
            class="btn-ghost !px-3 !py-2 text-sm"
            :class="sourceType === 'preset' ? 'bg-rose-100 text-rose-600' : ''"
            @click="sourceType = 'preset'"
          >
            内置词库
          </button>
          <button
            class="btn-ghost !px-3 !py-2 text-sm"
            :class="sourceType === 'custom' ? 'bg-rose-100 text-rose-600' : ''"
            @click="sourceType = 'custom'"
          >
            自定义词库
          </button>
        </div>
        <div v-if="sourceType === 'preset'" class="flex-1 min-w-[180px]">
          <label class="text-xs text-cocoa-500 ml-1">年级</label>
          <select
            v-model="selectedGrade"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
            :disabled="status === 'running' || status === 'paused'"
          >
            <option v-for="g in wordLibrary" :key="g.grade" :value="g.grade">
              {{ g.grade }} ({{ g.words.length }} 词)
            </option>
          </select>
        </div>
        <div v-else class="flex-1 min-w-[180px] text-xs text-cocoa-500 ml-1">
          共 {{ activeWords.length }} 个词
        </div>
      </div>

      <!-- 自定义词库 textarea -->
      <div v-if="sourceType === 'custom'" class="mt-3">
        <label class="text-xs text-cocoa-500 ml-1">自定义词库（每行一个词）</label>
        <textarea
          v-model="customText"
          rows="5"
          placeholder="每行一个词，例如：&#10;春暖花开&#10;阳光明媚&#10;专心致志"
          class="w-full mt-1 card-flat px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300 rounded-xl"
          :disabled="status === 'running' || status === 'paused'"
        />
      </div>
    </section>

    <!-- 听写控制 -->
    <section class="card-flat p-5">
      <!-- 进度条 -->
      <div class="mb-4">
        <div class="flex items-center justify-between text-xs text-cocoa-500 mb-1.5">
          <span>
            进度：第
            <span class="text-rose-600 font-semibold text-base mx-1">{{ Math.min(currentIndex + 1, total || 1) }}</span>
            / {{ total || 0 }} 个
          </span>
          <span v-if="status === 'running'" class="flex items-center gap-1 text-rose-500">
            <Volume2 :size="12" class="animate-pulse" /> 朗读中
          </span>
          <span v-else-if="status === 'paused'" class="text-amber-500">已暂停</span>
          <span v-else-if="status === 'finished'" class="text-emerald-500">已完成</span>
          <span v-else>未开始</span>
        </div>
        <div class="h-2 bg-cream-100 rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-300"
            :style="{ width: `${progress}%` }"
          />
        </div>
      </div>

      <!-- 当前朗读的词（仅 finished 时隐藏） -->
      <div v-if="status !== 'idle'" class="text-center mb-4">
        <div v-if="status === 'finished'" class="text-cocoa-600 text-sm">
          🎉 全部 {{ total }} 个词已朗读完毕
        </div>
        <div v-else>
          <div class="text-xs text-cocoa-400 mb-1">正在朗读</div>
          <div class="text-3xl font-bold text-rose-600 font-serif">
            {{ currentWord || '—' }}
          </div>
        </div>
      </div>

      <!-- 语速调节 -->
      <div class="flex items-center justify-center gap-3 mb-4">
        <Gauge :size="14" class="text-cocoa-400" />
        <span class="text-xs text-cocoa-500">语速</span>
        <div class="flex gap-1">
          <button
            v-for="r in rateOptions"
            :key="r"
            class="px-3 py-1 rounded-lg text-xs transition-colors"
            :class="rate === r ? 'bg-rose-500 text-white' : 'bg-cream-100 text-cocoa-600 hover:bg-cream-200'"
            :disabled="status === 'running'"
            @click="rate = r"
          >
            {{ r.toFixed(1) }}x
          </button>
        </div>
      </div>

      <!-- 控制按钮 -->
      <div class="flex items-center justify-center gap-2 flex-wrap">
        <button
          v-if="status === 'idle' || status === 'finished'"
          class="btn-primary px-6 py-2 flex items-center gap-1.5"
          @click="startDictation"
        >
          <Play :size="16" /> 开始听写
        </button>
        <button
          v-if="status === 'running'"
          class="btn-secondary px-5 py-2 flex items-center gap-1.5"
          @click="pauseDictation"
        >
          <Pause :size="16" /> 暂停
        </button>
        <button
          v-if="status === 'paused'"
          class="btn-primary px-5 py-2 flex items-center gap-1.5"
          @click="resumeDictation"
        >
          <Play :size="16" /> 继续
        </button>
        <button
          v-if="status === 'running' || status === 'paused'"
          class="btn-secondary px-5 py-2 flex items-center gap-1.5"
          @click="stopDictation"
        >
          <Square :size="14" /> 停止
        </button>
        <button
          v-if="status === 'running' || status === 'paused'"
          class="btn-ghost !px-3 !py-2 flex items-center gap-1.5 text-sm"
          @click="replayCurrent"
        >
          <RotateCcw :size="14" /> 重听本词
        </button>
        <button
          v-if="status !== 'idle'"
          class="btn-ghost !px-3 !py-2 flex items-center gap-1.5 text-sm"
          @click="restart"
        >
          <RotateCcw :size="14" /> 重新开始
        </button>
      </div>
    </section>

    <!-- 学生默写区 -->
    <section class="card-flat p-5">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-medium text-cocoa-900">学生默写区</h3>
        <span class="text-xs text-cocoa-400">按行对应，每个词一行</span>
      </div>
      <textarea
        v-model="studentInput"
        rows="8"
        placeholder="学生在此默写词语，每个词占一行..."
        class="w-full card-flat px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-rose-300 rounded-xl"
      />
      <div class="flex items-center justify-between mt-3 flex-wrap gap-2">
        <span class="text-xs text-cocoa-500">
          已默写 {{ studentInput.split('\n').filter((l) => l.trim()).length }} 个词
        </span>
        <div class="flex gap-2">
          <button
            class="btn-ghost !px-3 !py-1.5 text-xs flex items-center gap-1"
            :class="showAnswer ? 'bg-rose-100 text-rose-600' : ''"
            @click="showAnswer = !showAnswer"
          >
            <Eye v-if="!showAnswer" :size="12" />
            <EyeOff v-else :size="12" />
            {{ showAnswer ? '隐藏答案' : '对照答案' }}
          </button>
          <button
            class="btn-ghost !px-3 !py-1.5 text-xs"
            @click="studentInput = ''"
          >
            清空默写
          </button>
        </div>
      </div>

      <!-- 答案对照 -->
      <div v-if="showAnswer" class="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200">
        <div class="text-xs text-rose-600 font-medium mb-2">原词列表</div>
        <div class="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
          <div
            v-for="(word, idx) in activeWords"
            :key="idx"
            class="text-xs px-2 py-1.5 rounded-lg bg-white text-cocoa-700 border border-rose-100 flex items-center gap-1"
          >
            <span class="text-rose-400 shrink-0">{{ idx + 1 }}.</span>
            <span class="font-serif">{{ word }}</span>
          </div>
        </div>
      </div>
    </section>

    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：建议每词间隔 3 秒，如需更慢可调节语速；听写完成后点击"对照答案"自检
    </div>
  </div>
</template>
