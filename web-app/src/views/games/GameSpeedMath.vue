<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-vue-next'

const router = useRouter()

const QUESTIONS = [
  { q: '34 + 27 = ?', a: '61', opts: ['51', '61', '71', '57'] },
  { q: '15 × 6 = ?', a: '90', opts: ['80', '90', '85', '100'] },
  { q: '96 ÷ 8 = ?', a: '12', opts: ['10', '11', '12', '13'] },
  { q: '125 - 48 = ?', a: '77', opts: ['77', '87', '73', '83'] },
  { q: '7 × 13 = ?', a: '91', opts: ['81', '91', '93', '87'] },
  { q: '200 ÷ 25 = ?', a: '8', opts: ['6', '7', '8', '9'] },
  { q: '56 + 89 = ?', a: '145', opts: ['135', '145', '155', '149'] },
  { q: '18 × 9 = ?', a: '162', opts: ['152', '162', '158', '172'] },
  { q: '360 ÷ 12 = ?', a: '30', opts: ['25', '28', '30', '32'] },
  { q: '999 + 1 = ?', a: '1000', opts: ['1000', '1001', '990', '1009'] },
]

const idx = ref(0)
const score = ref(0)
const finished = ref(false)
const feedback = ref<'correct' | 'wrong' | ''>('')
const animKey = ref(0)

const current = computed(() => QUESTIONS[idx.value])

function answer(opt: string) {
  if (feedback.value) return
  if (opt === current.value.a) { score.value++; feedback.value = 'correct' }
  else { feedback.value = 'wrong' }
  setTimeout(() => {
    feedback.value = ''
    if (idx.value + 1 >= QUESTIONS.length) finished.value = true
    else { idx.value++; animKey.value++ }
  }, 800)
}

function restart() {
  idx.value = 0; score.value = 0; finished.value = false
  feedback.value = ''; animKey.value++
}
</script>

<template>
  <div class="min-h-full flex flex-col items-center justify-center px-4 py-8">
    <div class="w-full max-w-lg">
      <div class="flex items-center gap-2 mb-6">
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500" @click="router.back()"><ArrowLeft class="w-5 h-5" /></button>
        <h1 class="text-xl font-bold text-cocoa-900">🔢 速算挑战</h1>
        <div class="flex-1" />
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500" @click="restart"><RefreshCw class="w-5 h-5" /></button>
      </div>

      <div v-if="!finished" class="bg-white rounded-2xl p-8 shadow-softer text-center" :key="animKey">
        <div class="text-xs text-cocoa-400 mb-3">第 {{ idx + 1 }} / {{ QUESTIONS.length }} 题</div>
        <div class="text-4xl font-bold text-cocoa-900 mb-8 py-4 tracking-wide">{{ current.q }}</div>
        <div class="grid grid-cols-2 gap-3">
          <button v-for="opt in current.opts" :key="opt"
            class="px-6 py-4 rounded-xl text-lg font-semibold border-2 transition-all duration-200"
            :class="feedback ? (opt === current.a ? 'border-green-400 bg-green-50 text-green-700' : 'border-cream-200 bg-cream-50 text-cocoa-400') : 'border-cream-200 hover:border-butter-400 hover:bg-cream-50 text-cocoa-700'"
            :disabled="!!feedback"
            @click="answer(opt)">{{ opt }}</button>
        </div>
        <div v-if="feedback === 'correct'" class="mt-4 text-green-600 font-semibold flex items-center justify-center gap-1"><Check class="w-5 h-5" /> 正确！</div>
        <div v-else-if="feedback === 'wrong'" class="mt-4 text-red-500 font-semibold flex items-center justify-center gap-1"><X class="w-5 h-5" /> 正确答案：{{ current.a }}</div>
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
