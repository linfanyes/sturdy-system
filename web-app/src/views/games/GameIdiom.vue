<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-vue-next'

const router = useRouter()

const QUESTIONS = [
  { q: '画蛇添（  ）', a: '足', opts: ['足', '脚', '尾', '爪'] },
  { q: '守株待（  ）', a: '兔', opts: ['兔', '猪', '鹿', '鸟'] },
  { q: '亡（  ）补牢', a: '羊', opts: ['羊', '牛', '马', '狗'] },
  { q: '掩耳（  ）铃', a: '盗', opts: ['盗', '偷', '响', '敲'] },
  { q: '刻舟求（  ）', a: '剑', opts: ['剑', '刀', '箭', '枪'] },
  { q: '叶公好（  ）', a: '龙', opts: ['龙', '虎', '凤', '马'] },
  { q: '对（  ）弹琴', a: '牛', opts: ['牛', '马', '猪', '狗'] },
  { q: '胸有成（  ）', a: '竹', opts: ['竹', '树', '花', '林'] },
  { q: '画龙点（  ）', a: '睛', opts: ['睛', '眼', '目', '珠'] },
  { q: '狐假（  ）威', a: '虎', opts: ['虎', '狮', '狼', '豹'] },
]

const idx = ref(0)
const score = ref(0)
const finished = ref(false)
const feedback = ref<'correct' | 'wrong' | ''>('')
const animKey = ref(0)

const current = computed(() => QUESTIONS[idx.value])
const totalQ = computed(() => QUESTIONS.length)

function answer(opt: string) {
  if (feedback.value) return
  if (opt === current.value.a) {
    score.value++
    feedback.value = 'correct'
  } else {
    feedback.value = 'wrong'
  }
  setTimeout(() => {
    feedback.value = ''
    if (idx.value + 1 >= QUESTIONS.length) {
      finished.value = true
    } else {
      idx.value++
      animKey.value++
    }
  }, 800)
}

function restart() {
  idx.value = 0
  score.value = 0
  finished.value = false
  feedback.value = ''
  animKey.value++
}
</script>

<template>
  <div class="min-h-full flex flex-col items-center justify-center px-4 py-8">
    <div class="w-full max-w-lg">
      <div class="flex items-center gap-2 mb-6">
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500 transition-colors" @click="router.back()"><ArrowLeft class="w-5 h-5" /></button>
        <h1 class="text-xl font-bold text-cocoa-900">📜 成语填空</h1>
        <div class="flex-1" />
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500" @click="restart"><RefreshCw class="w-5 h-5" /></button>
      </div>

      <div v-if="!finished" class="bg-surface rounded-2xl p-8 shadow-softer text-center" :key="animKey">
        <div class="text-xs text-cocoa-400 mb-3">第 {{ idx + 1 }} / {{ totalQ }} 题</div>
        <div class="text-3xl font-bold text-cocoa-900 mb-6 tracking-wider leading-relaxed">{{ current.q }}</div>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="opt in current.opts" :key="opt"
            class="px-6 py-4 rounded-xl text-lg font-semibold border-2 transition-all duration-200"
            :class="feedback ? (opt === current.a ? 'border-green-400 bg-green-50 text-green-700' : 'border-cream-200 bg-cream-50 text-cocoa-400') : 'border-cream-200 hover:border-butter-400 hover:bg-cream-50 text-cocoa-700'"
            :disabled="!!feedback"
            @click="answer(opt)"
          >{{ opt }}</button>
        </div>
        <div v-if="feedback === 'correct'" class="mt-4 text-green-600 font-semibold flex items-center justify-center gap-1"><Check class="w-5 h-5" /> 正确！</div>
        <div v-else-if="feedback === 'wrong'" class="mt-4 text-red-500 font-semibold flex items-center justify-center gap-1"><X class="w-5 h-5" /> 正确答案：{{ current.a }}</div>
      </div>

      <div v-else class="bg-surface rounded-2xl p-8 shadow-softer text-center">
        <div class="text-5xl mb-4">🎉</div>
        <div class="text-2xl font-bold text-cocoa-900 mb-2">完成！</div>
        <div class="text-lg text-cocoa-500 mb-6">{{ score }} / {{ totalQ }} 正确</div>
        <div class="text-sm text-cocoa-400 mb-6">{{ score === totalQ ? '太棒了，全对！' : score >= totalQ * 0.7 ? '不错，继续加油！' : '再练一次吧！' }}</div>
        <button class="px-6 py-3 rounded-xl bg-butter-500 text-white font-semibold hover:bg-butter-600 transition-colors" @click="restart">再来一次</button>
      </div>
    </div>
  </div>
</template>
