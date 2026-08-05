<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Check, X } from 'lucide-vue-next'

const router = useRouter()
const QUESTIONS = [
  { q: '中国最长的河流是哪条？', a: '长江', opts: ['黄河', '长江', '珠江', '淮河'] },
  { q: '世界上面积最大的国家是？', a: '俄罗斯', opts: ['中国', '美国', '俄罗斯', '加拿大'] },
  { q: '"日光城"指的是哪个城市？', a: '拉萨', opts: ['昆明', '拉萨', '三亚', '兰州'] },
  { q: '泰山位于哪个省？', a: '山东', opts: ['河北', '山西', '山东', '河南'] },
  { q: '世界上最高的山峰是？', a: '珠穆朗玛峰', opts: ['乔戈里峰', '干城章嘉峰', '珠穆朗玛峰', '洛子峰'] },
  { q: '中国的"五岳"中，哪座山位于湖南？', a: '衡山', opts: ['华山', '泰山', '衡山', '嵩山'] },
  { q: '四大文明古国不包括以下哪个？', a: '古罗马', opts: ['古埃及', '古巴比伦', '古罗马', '古印度'] },
  { q: '世界第一大河是？', a: '尼罗河', opts: ['亚马逊河', '长江', '尼罗河', '密西西比河'] },
  { q: '"丝绸之路"的起点是哪个城市？', a: '西安', opts: ['北京', '西安', '洛阳', '兰州'] },
  { q: '中国最大的岛屿是？', a: '台湾岛', opts: ['海南岛', '台湾岛', '崇明岛', '舟山岛'] },
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
        <h1 class="text-xl font-bold text-cocoa-900">🌍 人文地理</h1><div class="flex-1" />
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
