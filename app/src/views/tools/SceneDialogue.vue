<script setup lang="ts">
// 英语情景对话工具：按场景/难度/角色数生成对话，支持整段朗读、单句朗读与中英对照
import { ref, computed, onUnmounted } from 'vue'
import { Sparkles, RefreshCw, Volume2, Square, Eye, EyeOff } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import { useAIStore } from '../../stores/ai'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'

const toast = useToastStore()
const ai = useAIStore()

interface DialogueLine {
  speaker: string
  line: string
  translation: string
}
interface DialogueResult {
  scene: string
  dialogue: DialogueLine[]
}

const scenes = ['购物', '问路', '就餐', '看病', '打电话', '介绍朋友', '借东西']
const difficulties = ['入门', '进阶']
const characterOptions = [2, 3]

const scene = ref(scenes[0])
const difficulty = ref(difficulties[0])
const characterCount = ref(2)

const generating = ref(false)
const result = ref<DialogueResult | null>(null)
const showChinese = ref(true)

const isPlayingAll = ref(false)
let stopRequested = false

const speakerStyles = [
  { bubble: 'bg-sky2-100 text-cocoa-900', label: 'text-sky2-600', dot: 'bg-sky2-400' },
  { bubble: 'bg-mint-100 text-cocoa-900', label: 'text-mint-600', dot: 'bg-mint-400' },
  { bubble: 'bg-sakura-100 text-cocoa-900', label: 'text-sakura-600', dot: 'bg-sakura-400' },
  { bubble: 'bg-butter-100 text-cocoa-900', label: 'text-butter-600', dot: 'bg-butter-400' },
]

const speakers = computed(() => {
  if (!result.value) return []
  const seen: string[] = []
  for (const d of result.value.dialogue) {
    if (!seen.includes(d.speaker)) seen.push(d.speaker)
  }
  return seen
})

function speakerStyle(speaker: string) {
  const idx = speakers.value.indexOf(speaker)
  return speakerStyles[idx % speakerStyles.length]
}

function isRightSpeaker(speaker: string): boolean {
  return speakers.value.indexOf(speaker) === 0
}

function speakText(text: string): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.9
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

async function playAll() {
  if (!result.value) return
  if (isPlayingAll.value) {
    stopRequested = true
    speechSynthesis.cancel()
    isPlayingAll.value = false
    return
  }
  isPlayingAll.value = true
  stopRequested = false
  for (const d of result.value.dialogue) {
    if (stopRequested) break
    await speakText(d.line)
  }
  isPlayingAll.value = false
}

function speakLine(text: string) {
  speechSynthesis.cancel()
  isPlayingAll.value = false
  stopRequested = true
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'en-US'
  u.rate = 0.9
  speechSynthesis.speak(u)
}

function buildPrompt() {
  const sys =
    '你是一位资深小学英语口语对话设计教师。请根据用户给定的场景、难度和角色数，设计一段自然、地道、符合小学生水平的英语情景对话。' +
    '对话应贴近真实生活，句型简洁，便于学生模仿练习。'
  const usr =
    `场景：${scene.value}\n难度：${difficulty.value}\n角色数：${characterCount.value} 人\n\n` +
    `请严格只输出一个 JSON 对象（不要 markdown 代码块、不要解释文字），格式如下：\n` +
    `{\n` +
    `  "scene": "场景的简要中文描述",\n` +
    `  "dialogue": [\n` +
    `    { "speaker": "A", "line": "英文台词", "translation": "中文翻译" },\n` +
    `    { "speaker": "B", "line": "英文台词", "translation": "中文翻译" }\n` +
    `  ]\n` +
    `}\n` +
    `要求：\n` +
    `- 角色以 A、B、C... 标识，共 ${characterCount.value} 个角色；\n` +
    `- 对话轮次 6~10 轮；\n` +
    `- 每句 line 必须是纯英文，translation 必须是中文翻译；\n` +
    `- 难度为"入门"时句型简单，"进阶"时可适当增加复杂句和从句。`
  return { sys, usr }
}

function parseJSON(text: string): DialogueResult | null {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const tryParse = (s: string): DialogueResult | null => {
    try {
      const obj = JSON.parse(s)
      if (obj && typeof obj === 'object' && Array.isArray(obj.dialogue)) {
        return {
          scene: String(obj.scene || ''),
          dialogue: obj.dialogue.map((d: any) => ({
            speaker: String(d?.speaker || ''),
            line: String(d?.line || ''),
            translation: String(d?.translation || ''),
          })),
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
  stopRequested = true
  speechSynthesis.cancel()
  isPlayingAll.value = false
  try {
    const { sys, usr } = buildPrompt()
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.85,
      stream: false,
    })
    const parsed = parseJSON(text)
    if (!parsed) {
      toast.error('AI 返回内容无法解析，请重试')
      return
    }
    result.value = parsed
    toast.success('对话已生成，可点击「整段朗读」开始')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
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

    <section class="card-soft p-5 bg-gradient-to-br from-sakura-100 via-sky2-100 to-mint-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sakura-300 to-sky2-300 flex items-center justify-center text-2xl shadow-softer">
          💬
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">英语情景对话</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            按场景生成多角色英语对话，支持整段朗读、单句朗读与中英对照。
          </p>
        </div>
      </div>
    </section>

    <section class="card-flat p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">场景</label>
          <select v-model="scene" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="s in scenes" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">难度</label>
          <select v-model="difficulty" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="d in difficulties" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">角色数</label>
          <select v-model="characterCount" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="c in characterOptions" :key="c" :value="c">{{ c }} 人</option>
          </select>
        </div>
      </div>
      <div class="mt-4">
        <button
          class="btn-primary flex items-center gap-2"
          :disabled="generating"
          @click="generate"
        >
          <Sparkles v-if="!generating" :size="16" />
          <RefreshCw v-else :size="16" class="animate-spin" />
          {{ generating ? '生成中...' : '生成对话' }}
        </button>
      </div>
    </section>

    <template v-if="result">
      <section class="card-flat p-4">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            class="btn-primary flex items-center gap-2 !py-2"
            @click="playAll"
          >
            <Square v-if="isPlayingAll" :size="16" />
            <Volume2 v-else :size="16" />
            {{ isPlayingAll ? '停止' : '整段朗读' }}
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
            :disabled="generating"
            @click="generate"
          >
            <RefreshCw :size="14" /> 重新生成
          </button>
        </div>
      </section>

      <section class="card-soft p-4 bg-gradient-to-br from-sky2-50 to-mint-50">
        <div class="flex items-center gap-2 text-sm text-cocoa-600">
          <span class="text-base">🎭</span>
          <span>{{ result.scene }}</span>
        </div>
      </section>

      <section class="card-flat p-4 space-y-3">
        <div
          v-for="(d, di) in result.dialogue"
          :key="di"
          class="flex gap-2"
          :class="isRightSpeaker(d.speaker) ? 'flex-row-reverse' : 'flex-row'"
        >
          <div
            class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
            :class="speakerStyle(d.speaker).bubble"
          >
            {{ d.speaker }}
          </div>
          <div
            class="max-w-[80%] rounded-2xl px-4 py-2.5"
            :class="speakerStyle(d.speaker).bubble"
          >
            <p class="text-sm text-cocoa-900 leading-relaxed">{{ d.line }}</p>
            <p
              v-if="showChinese"
              class="text-xs text-cocoa-500 mt-1 pt-1 border-t border-cocoa-200/30"
            >
              {{ d.translation }}
            </p>
            <button
              class="mt-1.5 flex items-center gap-1 text-xs text-cocoa-600 hover:text-sky2-600 transition"
              @click="speakLine(d.line)"
            >
              <Volume2 :size="11" /> 朗读
            </button>
          </div>
        </div>
      </section>
    </template>

    <section
      v-else-if="!generating"
      class="card-soft p-8 text-center text-cocoa-400"
    >
      <Volume2 :size="36" class="mx-auto mb-2 opacity-40" />
      <p class="text-sm">选择场景、难度、角色数后点击「生成对话」</p>
      <p class="text-xs mt-1">AI 将自动生成多角色情景对话，支持朗读与中英对照</p>
    </section>
  </div>
</template>
