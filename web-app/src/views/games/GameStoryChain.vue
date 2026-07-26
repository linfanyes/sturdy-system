<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, SendHorizonal, Lightbulb } from 'lucide-vue-next'

const router = useRouter()

const OPENINGS = [
  '在一个遥远的魔法森林里，有一只小兔子迷路了……',
  '小明今天早上发现书包里多了一封神秘的信……',
  '放学后，教室里突然传出奇怪的音乐声……',
  '一只小猫跳上了窗台，它的脖子上挂着一枚闪亮的钥匙……',
  '数学课上，老师出了一道谁也算不出的难题……',
]
const THEMES = ['友情', '勇气', '环保', '梦想', '奇幻', '科学', '历史', '未来']

const step = ref(1)
const story = ref<string[]>([])
const input = ref('')
const theme = ref('')
const currentOpening = ref(OPENINGS[Math.floor(Math.random() * OPENINGS.length)])
const showHint = ref(false)
const totalPlayers = ref(2)

function startGame() {
  story.value = [currentOpening.value]
  step.value = 1
  input.value = ''
  showHint.value = false
}

function submitLine() {
  if (!input.value.trim()) return
  story.value.push(input.value.trim())
  input.value = ''
  step.value++
  showHint.value = false
}

function restart() {
  currentOpening.value = OPENINGS[Math.floor(Math.random() * OPENINGS.length)]
  story.value = []
  step.value = 1
  input.value = ''
  showHint.value = false
  theme.value = ''
}

const isMyTurn = computed(() => {
  if (step.value === 1) return true
  const idx = (step.value - 1) % Math.max(totalPlayers.value, 1)
  return idx === 0
})
</script>

<template>
  <div class="min-h-full flex flex-col items-center px-4 py-6">
    <div class="w-full max-w-2xl">
      <div class="flex items-center gap-2 mb-4">
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500" @click="router.back()"><ArrowLeft class="w-5 h-5" /></button>
        <h1 class="text-xl font-bold text-cocoa-900">📖 故事接龙</h1>
        <div class="flex-1" />
        <button class="p-2 rounded-xl hover:bg-cream-200 text-cocoa-500" @click="restart"><RefreshCw class="w-5 h-5" /></button>
      </div>

      <div v-if="story.length === 0" class="bg-white rounded-2xl p-8 shadow-softer text-center space-y-4">
        <div class="text-5xl">📚</div>
        <h2 class="text-lg font-semibold text-cocoa-900">创意接龙，一人一句编故事</h2>
        <div class="flex flex-wrap justify-center gap-2">
          <span v-for="t in THEMES" :key="t"
            class="px-3 py-1 rounded-full text-sm cursor-pointer transition-colors"
            :class="theme === t ? 'bg-butter-500 text-white' : 'bg-cream-100 text-cocoa-600 hover:bg-cream-200'"
            @click="theme = t">{{ t }}</span>
        </div>
        <div class="flex items-center justify-center gap-3">
          <span class="text-sm text-cocoa-500">人数：</span>
          <button v-for="n in [2,3,4,5]" :key="n"
            class="w-8 h-8 rounded-full text-sm font-medium transition-colors"
            :class="totalPlayers === n ? 'bg-butter-500 text-white' : 'bg-cream-100 text-cocoa-600'"
            @click="totalPlayers = n">{{ n }}</button>
        </div>
        <button class="mt-4 px-8 py-3 rounded-xl bg-butter-500 text-white font-semibold hover:bg-butter-600" @click="startGame">开始接龙</button>
      </div>

      <div v-else class="space-y-4">
        <div class="bg-white rounded-2xl p-6 shadow-softer">
          <div class="flex items-center justify-between mb-3">
            <span class="text-xs text-cocoa-400 bg-cream-100 px-2 py-0.5 rounded">第 {{ story.length }} 句</span>
            <span v-if="theme" class="text-xs text-cocoa-400">主题：{{ theme }}</span>
          </div>
          <div class="space-y-3">
            <div v-for="(line, i) in story" :key="i"
              class="px-4 py-3 rounded-xl text-sm leading-relaxed"
              :class="i === 0 ? 'bg-butter-50 text-cocoa-700 italic' : i % 2 === 0 ? 'bg-mint-50 text-cocoa-800' : 'bg-sky2-50 text-cocoa-800'"
            >{{ line }}</div>
          </div>
        </div>

        <div class="bg-white rounded-2xl p-6 shadow-softer">
          <div class="flex items-center gap-2 mb-3">
            <div class="flex-1 h-px bg-cream-200" />
            <span class="text-xs text-cocoa-400 whitespace-nowrap">输入下一句</span>
            <div class="flex-1 h-px bg-cream-200" />
          </div>
          <div class="flex gap-2">
            <input v-model="input" class="flex-1 px-4 py-3 rounded-xl border-2 border-cream-200 focus:border-butter-400 focus:outline-none text-sm" placeholder="继续写故事…" @keyup.enter="submitLine" />
            <button class="px-4 py-3 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="!input.trim()" @click="submitLine">
              <SendHorizonal class="w-5 h-5" />
            </button>
          </div>
          <div class="flex items-center justify-between mt-2">
            <button class="text-xs text-cocoa-400 hover:text-cocoa-600 flex items-center gap-1" @click="showHint = !showHint">
              <Lightbulb class="w-3.5 h-3.5" /> 创作提示
            </button>
          </div>
          <div v-if="showHint" class="mt-2 p-3 rounded-xl bg-cream-50 text-xs text-cocoa-500 leading-relaxed">
            💡 试着加入一个新角色，或者设置一个悬念，或者描写一下场景中的声音、气味、颜色…
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
