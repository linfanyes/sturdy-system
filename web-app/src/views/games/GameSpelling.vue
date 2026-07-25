<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-vue-next'

const router = useRouter()

const QUESTIONS = [
  { word: 'apple', hint: '苹果' },
  { word: 'banana', hint: '香蕉' },
  { word: 'school', hint: '学校' },
  { word: 'teacher', hint: '老师' },
  { word: 'student', hint: '学生' },
  { word: 'family', hint: '家庭' },
  { word: 'friend', hint: '朋友' },
  { word: 'animal', hint: '动物' },
  { word: 'flower', hint: '花' },
  { word: 'garden', hint: '花园' },
]

const idx = ref(0)
const input = ref('')
const score = ref(0)
const finished = ref(false)
const feedback = ref<'correct' | 'wrong' | ''>('')
const animKey = ref(0)

const current = computed(() => QUESTIONS[idx.value])

function check() {
  if (feedback.value || !input.value.trim()) return
  if (input.value.trim().toLowerCase() === current.value.word) {
    score.value++
    feedback.value = 'correct'
  } else {
    feedback.value = 'wrong'
  }
  setTimeout(() => {
    feedback.value = ''
    input.value = ''
    if (idx.value + 1 >= QUESTIONS.length) finished.value = true
    else { idx.value++; animKey.value++ }
  }, 1200)
}

function restart() {
  idx.value = 0; score.value = 0; finished.value = false
  feedback.value = ''; input.value = ''; animKey.value++
}
</script>

<template>
  <div class="min-h-full flex flex-col items-center justify-center px-4 py-8">
    <div class="w-full max-w-lg">
      <div class="flex items-center gap-2 mb-6">
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500" @click="router.back()"><ArrowLeft class="w-5 h-5" /></button>
        <h1 class="text-xl font-bold text-cocoa-900">🔤 单词拼写</h1>
        <div class="flex-1" />
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500" @click="restart"><RefreshCw class="w-5 h-5" /></button>
      </div>

      <div v-if="!finished" class="bg-white rounded-2xl p-8 shadow-softer" :key="animKey">
        <div class="text-xs text-cocoa-400 mb-3">第 {{ idx + 1 }} / {{ QUESTIONS.length }} 题</div>
        <div class="text-center mb-6">
          <div class="text-lg text-cocoa-500 mb-2">请拼写以下单词</div>
          <div class="text-3xl font-bold text-cocoa-900">{{ current.hint }}</div>
        </div>
        <div class="flex gap-2">
          <input v-model="input" class="flex-1 px-4 py-3 rounded-xl border-2 text-center text-xl font-mono focus:outline-none" :class="feedback ? (feedback === 'correct' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : 'border-cream-200 focus:border-butter-400'" placeholder="输入英文单词" :disabled="!!feedback" @keyup.enter="check" />
          <button class="px-5 py-3 rounded-xl bg-butter-500 text-white font-semibold hover:bg-butter-600 disabled:opacity-60" :disabled="!input.trim() || !!feedback" @click="check">确认</button>
        </div>
        <div v-if="feedback === 'correct'" class="mt-4 text-green-600 font-semibold flex items-center justify-center gap-1"><Check class="w-5 h-5" /> 正确！</div>
        <div v-else-if="feedback === 'wrong'" class="mt-4 text-red-500 font-semibold flex items-center justify-center gap-1"><X class="w-5 h-5" /> 正确答案：{{ current.word }}</div>
      </div>

      <div v-else class="bg-white rounded-2xl p-8 shadow-softer text-center">
        <div class="text-5xl mb-4">🎉</div>
        <div class="text-2xl font-bold text-cocoa-900 mb-2">完成！</div>
        <div class="text-lg text-cocoa-500 mb-6">{{ score }} / {{ QUESTIONS.length }} 正确</div>
        <button class="px-6 py-3 rounded-xl bg-butter-500 text-white font-semibold hover:bg-butter-600" @click="restart">再来一次</button>
      </div>
    </div>
  </div>
</template>
