<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-vue-next'

const router = useRouter()
const QUESTIONS = [
  { q: '太阳系中最大的行星是哪个？', a: '木星', opts: ['土星', '木星', '海王星', '地球'] },
  { q: '水在标准大气压下多少度沸腾？', a: '100°C', opts: ['90°C', '100°C', '80°C', '110°C'] },
  { q: '人体中最长的骨骼是哪个？', a: '股骨', opts: ['胫骨', '肱骨', '股骨', '脊柱'] },
  { q: '植物光合作用需要吸收什么气体？', a: '二氧化碳', opts: ['氧气', '氮气', '二氧化碳', '氢气'] },
  { q: '地球表面大约多少被水覆盖？', a: '71%', opts: ['51%', '61%', '71%', '81%'] },
  { q: '声音在真空中能传播吗？', a: '不能', opts: ['能', '不能', '看情况', '有时能'] },
  { q: '电的单位"伏特"是用来测量什么？', a: '电压', opts: ['电流', '电阻', '电压', '功率'] },
  { q: '月球绕地球一周大约需要多少天？', a: '约27天', opts: ['约7天', '约14天', '约27天', '约30天'] },
  { q: '人的心脏有几个腔室？', a: '4个', opts: ['2个', '3个', '4个', '5个'] },
  { q: '沙子和盐的混合物能用什么方法分离？', a: '过滤+蒸发', opts: ['磁选', '过滤+蒸发', '蒸馏', '沉降'] },
]
const idx = ref(0); const score = ref(0); const finished = ref(false)
const feedback = ref<'correct'|'wrong'|''>(''); const animKey = ref(0)
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
function restart() { idx.value=0; score.value=0; finished.value=false; feedback.value=''; animKey.value++ }
</script>
<template>
  <div class="min-h-full flex flex-col items-center justify-center px-4 py-8">
    <div class="w-full max-w-lg">
      <div class="flex items-center gap-2 mb-6">
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500" @click="router.back()"><ArrowLeft class="w-5 h-5" /></button>
        <h1 class="text-xl font-bold text-cocoa-900">🔬 科学知识</h1><div class="flex-1" />
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500" @click="restart"><RefreshCw class="w-5 h-5" /></button>
      </div>
      <div v-if="!finished" class="bg-surface rounded-2xl p-8 shadow-softer" :key="animKey">
        <div class="text-xs text-cocoa-400 mb-3">第 {{ idx+1 }} / {{ QUESTIONS.length }} 题</div>
        <div class="text-lg font-semibold text-cocoa-900 mb-6 leading-relaxed">{{ current.q }}</div>
        <div class="space-y-2">
          <button v-for="opt in current.opts" :key="opt"
            class="w-full px-6 py-4 rounded-xl text-base font-medium border-2 text-left transition-all duration-200"
            :class="feedback ? (opt===current.a ? 'border-green-400 bg-green-50 text-green-700' : 'border-cream-200 bg-cream-50 text-cocoa-400') : 'border-cream-200 hover:border-butter-400 hover:bg-cream-50 text-cocoa-700'"
            :disabled="!!feedback" @click="answer(opt)">{{ opt }}</button>
        </div>
        <div v-if="feedback==='correct'" class="mt-4 text-green-600 font-semibold flex items-center justify-center gap-1"><Check class="w-5 h-5" /> 正确！</div>
        <div v-else-if="feedback==='wrong'" class="mt-4 text-red-500 font-semibold flex items-center justify-center gap-1"><X class="w-5 h-5" /> 正确答案：{{ current.a }}</div>
      </div>
      <div v-else class="bg-surface rounded-2xl p-8 shadow-softer text-center">
        <div class="text-5xl mb-4">🎉</div>
        <div class="text-2xl font-bold text-cocoa-900 mb-2">完成！</div>
        <div class="text-lg text-cocoa-500 mb-6">{{ score }} / {{ QUESTIONS.length }} 正确</div>
        <button class="px-6 py-3 rounded-xl bg-butter-500 text-white font-semibold hover:bg-butter-600" @click="restart">再来一次</button>
      </div>
    </div>
  </div>
</template>
