<script setup lang="ts">
// 英语爽文工具：AI 生成有趣简单的英语短文/故事，激发小学生阅读兴趣，支持朗读、生词表与中文翻译
import { ref, onUnmounted } from 'vue'
import { Sparkles, RefreshCw, Volume2, Square, Eye, EyeOff, Copy, BookOpen, Lightbulb } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import { useAIStore } from '../../stores/ai'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import MarkdownView from '../../components/common/MarkdownView.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'

const toast = useToastStore()
const ai = useAIStore()

interface StoryWord {
  word: string
  meaning: string
}
interface StoryResult {
  title: string
  story: string
  words: StoryWord[]
  translation: string
  moral: string
}

const types = ['冒险故事', '校园趣事', '奇幻魔法', '动物寓言', '科幻未来', '搞笑幽默']
const grades = ['三年级', '四年级', '五年级', '六年级']
const lengthOptions = [
  { label: '短篇 (~150词)', value: 'short', words: 150 },
  { label: '中篇 (~250词)', value: 'medium', words: 250 },
  { label: '长篇 (~400词)', value: 'long', words: 400 },
]

const type = ref(types[0])
const grade = ref(grades[0])
const length = ref<'short' | 'medium' | 'long'>('short')
const theme = ref('')

const generating = ref(false)
const result = ref<StoryResult | null>(null)
const showChinese = ref(false)

const isPlayingStory = ref(false)
let stopRequested = false

function speakText(text: string, rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = rate
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

async function playStory() {
  if (!result.value) return
  if (isPlayingStory.value) {
    stopRequested = true
    speechSynthesis.cancel()
    isPlayingStory.value = false
    return
  }
  speechSynthesis.cancel()
  isPlayingStory.value = true
  stopRequested = false
  await speakText(result.value.story, 0.9)
  isPlayingStory.value = false
}

function speakWord(word: string) {
  speechSynthesis.cancel()
  isPlayingStory.value = false
  stopRequested = true
  const u = new SpeechSynthesisUtterance(word)
  u.lang = 'en-US'
  u.rate = 0.9
  speechSynthesis.speak(u)
}

function buildPrompt() {
  const lengthMeta = lengthOptions.find((l) => l.value === length.value) || lengthOptions[0]
  const sys =
    '你是一位擅长为小学生创作英语故事的作家。请根据用户给定的类型、年级、篇幅和主题，创作一篇有趣、简单、适合该年级学生阅读的英语短文。' +
    '故事应富有想象力、积极向上，词汇和句型贴合所选年级水平，能激发学生的阅读兴趣。'
  const themeLine = theme.value.trim() ? `\n主题提示：${theme.value.trim()}` : ''
  const usr =
    `类型：${type.value}\n年级：${grade.value}\n篇幅：约 ${lengthMeta.words} 词${themeLine}\n\n` +
    `请严格只输出一个 JSON 对象（不要 markdown 代码块、不要解释文字），格式如下：\n` +
    `{\n` +
    `  "title": "英文标题",\n` +
    `  "story": "故事正文（英文，可分段，用 \\n 分段）",\n` +
    `  "words": [\n` +
    `    { "word": "生词", "meaning": "中文释义" }\n` +
    `  ],\n` +
    `  "translation": "故事中文翻译（可分段，用 \\n 分段）",\n` +
    `  "moral": "故事的寓意（中文，一句话）"\n` +
    `}\n` +
    `要求：\n` +
    `- 故事正文字数约 ${lengthMeta.words} 词，难度贴合 ${grade.value}；\n` +
    `- words 数量 5~10 个，挑选故事中较难的生词；\n` +
    `- translation 为完整中文翻译；\n` +
    `- moral 简洁明了，积极向上。`
  return { sys, usr }
}

function parseJSON(text: string): StoryResult | null {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const tryParse = (s: string): StoryResult | null => {
    try {
      const obj = JSON.parse(s)
      if (obj && typeof obj === 'object' && typeof obj.story === 'string') {
        return {
          title: String(obj.title || ''),
          story: String(obj.story || ''),
          words: Array.isArray(obj.words)
            ? obj.words.map((w: any) => ({
                word: String(w?.word || ''),
                meaning: String(w?.meaning || ''),
              }))
            : [],
          translation: String(obj.translation || ''),
          moral: String(obj.moral || ''),
        }
      }
    } catch {
      /* noop */
    }
    return null
  }
  let parsed = tryParse(t)
  if (parsed) return parsed
  const m = t.match(/\{[\s\S]*\}/)
  if (m) parsed = tryParse(m[0])
  return parsed
}

async function generate() {
  if (generating.value) return
  if (!ai.settings.apiKey) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  generating.value = true
  result.value = null
  showChinese.value = false
  stopRequested = true
  speechSynthesis.cancel()
  isPlayingStory.value = false
  try {
    const { sys, usr } = buildPrompt()
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.9,
      stream: false,
    })
    const parsed = parseJSON(text)
    if (!parsed) {
      toast.error('AI 返回内容无法解析，请重试')
      return
    }
    result.value = parsed
    toast.success('故事已生成')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

function copyStory() {
  if (!result.value) return
  const r = result.value
  const parts = [
    r.title,
    '',
    r.story,
    '',
    '【中文翻译】',
    r.translation,
    '',
    '【生词】',
    ...r.words.map((w) => `${w.word} - ${w.meaning}`),
    '',
    `【寓意】${r.moral}`,
  ]
  navigator.clipboard.writeText(parts.join('\n')).then(
    () => toast.success('已复制全文'),
    () => toast.error('复制失败'),
  )
}

onUnmounted(() => {
  stopRequested = true
  speechSynthesis.cancel()
})
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="false" />

    <section class="card-soft p-5 bg-gradient-to-br from-sky2-100 via-butter-100 to-mint-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky2-300 to-butter-300 flex items-center justify-center text-2xl shadow-softer">
          📖
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">英语爽文</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            AI 生成有趣、简单的英语短文与故事，激发小学生阅读兴趣，支持朗读、生词表与中文翻译。
          </p>
        </div>
      </div>
    </section>

    <section class="card-flat p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">类型</label>
          <select v-model="type" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="t in types" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">年级</label>
          <select v-model="grade" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">篇幅</label>
          <select v-model="length" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="l in lengthOptions" :key="l.value" :value="l.value">{{ l.label }}</option>
          </select>
        </div>
      </div>
      <div class="mt-3">
        <label class="text-xs text-cocoa-500 ml-1">主题（可选）</label>
        <input
          v-model="theme"
          type="text"
          placeholder="例如：a brave cat、a magic pencil"
          class="w-full mt-1 card-flat px-3 py-2 text-sm"
        />
      </div>
      <div class="mt-4">
        <button
          class="btn-primary flex items-center gap-2"
          :disabled="generating"
          @click="generate"
        >
          <Sparkles v-if="!generating" :size="16" />
          <RefreshCw v-else :size="16" class="animate-spin" />
          {{ generating ? '生成中...' : '生成故事' }}
        </button>
      </div>
    </section>

    <template v-if="result">
      <!-- 控制条 -->
      <section class="card-flat p-4">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            class="btn-primary flex items-center gap-2 !py-2"
            @click="playStory"
          >
            <Square v-if="isPlayingStory" :size="16" />
            <Volume2 v-else :size="16" />
            {{ isPlayingStory ? '停止' : '朗读' }}
          </button>
          <button
            class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
            @click="showChinese = !showChinese"
          >
            <EyeOff v-if="showChinese" :size="14" />
            <Eye v-else :size="14" />
            {{ showChinese ? '隐藏中文' : '显示中文' }}
          </button>
          <button
            class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
            @click="copyStory"
          >
            <Copy :size="14" /> 复制全文
          </button>
          <button
            class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
            :disabled="generating"
            @click="generate"
          >
            <RefreshCw :size="14" /> 重新生成
          </button>
        </div>
      </section>

      <!-- 标题 -->
      <section class="card-soft p-5 bg-gradient-to-br from-sky2-50 to-butter-50">
        <div class="flex items-center gap-2 mb-1">
          <BookOpen :size="18" class="text-sky2-500" />
          <h2 class="title-display text-xl text-cocoa-900">{{ result.title }}</h2>
        </div>
        <p v-if="showChinese" class="text-sm text-cocoa-600">{{ result.translation.split('\n')[0] }}</p>
      </section>

      <!-- 故事正文 -->
      <section class="card-flat p-5">
        <MarkdownView :md="result.story" />
      </section>

      <!-- 中文翻译 -->
      <section v-if="showChinese" class="card-flat p-5 !bg-cream-50">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-base">🇨🇳</span>
          <h3 class="title-display text-base text-cocoa-900">中文翻译</h3>
        </div>
        <p class="text-sm text-cocoa-700 whitespace-pre-line leading-relaxed">{{ result.translation }}</p>
      </section>

      <!-- 生词表 -->
      <section v-if="result.words.length" class="card-flat p-4">
        <div class="flex items-center gap-2 mb-3">
          <Sparkles :size="16" class="text-sky2-500" />
          <h3 class="title-display text-base text-cocoa-900">生词表</h3>
          <span class="text-xs text-cocoa-400">({{ result.words.length }} 词)</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          <div
            v-for="(w, wi) in result.words"
            :key="wi"
            class="card-flat !bg-cream-50 p-3 flex items-center justify-between gap-2"
          >
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-cocoa-800">{{ w.word }}</div>
              <div class="text-xs text-cocoa-500 mt-0.5">{{ w.meaning }}</div>
            </div>
            <button
              class="btn-ghost flex items-center gap-1 !px-2 !py-1 text-xs shrink-0"
              @click="speakWord(w.word)"
            >
              <Volume2 :size="11" /> 朗读
            </button>
          </div>
        </div>
      </section>

      <!-- 寓意 -->
      <section v-if="result.moral" class="card-soft p-5 bg-gradient-to-br from-mint-50 to-sky2-50">
        <div class="flex items-start gap-2">
          <Lightbulb :size="18" class="text-butter-500 mt-0.5" />
          <div>
            <h3 class="title-display text-base text-cocoa-900 mb-1">寓意</h3>
            <p class="text-sm text-cocoa-700">{{ result.moral }}</p>
          </div>
        </div>
      </section>
    </template>

    <section
      v-else-if="!generating"
      class="card-soft p-8 text-center text-cocoa-400"
    >
      <BookOpen :size="36" class="mx-auto mb-2 opacity-40" />
      <p class="text-sm">选择类型、年级、篇幅后点击「生成故事」</p>
      <p class="text-xs mt-1">AI 将创作有趣简单的英语故事，附带生词表、中文翻译与寓意</p>
    </section>
  </div>
</template>
