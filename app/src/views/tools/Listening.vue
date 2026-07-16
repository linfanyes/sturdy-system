<script setup lang="ts">
// 英语听力工具：按年级/主题/难度生成听力材料，支持整段朗读、分段重听与答题对照
import { ref, computed, onUnmounted } from 'vue'
import { Volume2, Square, Copy, RotateCcw, RefreshCw, Check, X, Sparkles } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import { useAIStore } from '../../stores/ai'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'

const toast = useToastStore()
const ai = useAIStore()

interface ListenQuestion {
  stem: string
  options: string[]
  answer: string // 'A' | 'B' | 'C' | 'D'
  audioRef: number
}
interface ListenResult {
  transcript: string
  audioChunks: string[]
  questions: ListenQuestion[]
}

const grades = ['三年级', '四年级', '五年级', '六年级']
const topics = ['日常对话', '数字时间', '家庭介绍', '学校生活', '购物就餐', '问路指路']
const difficulties = ['简单', '中等', '进阶']
const counts = [3, 5, 8]
const optionLetters = ['A', 'B', 'C', 'D']

const grade = ref(grades[0])
const topic = ref(topics[0])
const difficulty = ref(difficulties[0])
const count = ref(5)

const generating = ref(false)
const result = ref<ListenResult | null>(null)
const answers = ref<Record<number, string>>({})
const submitted = ref(false)

const isPlayingFull = ref(false)
let stopRequested = false

const score = computed(() => {
  if (!result.value) return 0
  let correct = 0
  result.value.questions.forEach((q, i) => {
    if (answers.value[i] === q.answer) correct++
  })
  return correct
})

function speakChunk(text: string): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.9
    u.onend = () => resolve()
    u.onerror = () => resolve()
    speechSynthesis.speak(u)
  })
}

async function playFull() {
  if (!result.value) return
  if (isPlayingFull.value) {
    stopRequested = true
    speechSynthesis.cancel()
    isPlayingFull.value = false
    return
  }
  isPlayingFull.value = true
  stopRequested = false
  for (const chunk of result.value.audioChunks) {
    if (stopRequested) break
    await speakChunk(chunk)
  }
  isPlayingFull.value = false
}

function replayChunk(idx: number) {
  if (!result.value) return
  const chunk = result.value.audioChunks[idx]
  if (!chunk) return
  speechSynthesis.cancel()
  isPlayingFull.value = false
  stopRequested = true
  const u = new SpeechSynthesisUtterance(chunk)
  u.lang = 'en-US'
  u.rate = 0.9
  speechSynthesis.speak(u)
}

function buildPrompt() {
  const sys =
    '你是一位资深小学英语听力命题教师。请根据用户给定的年级、主题、难度和题量，生成一段符合小学生水平的英语听力材料。' +
    '听力材料应包含一段简短原文、若干音频分句（用于依次朗读）、若干单选题。题目难度需贴合所选年级与难度档位，词汇和句型不得超纲。'
  const usr =
    `年级：${grade.value}\n主题：${topic.value}\n难度：${difficulty.value}\n题量：${count.value} 小题\n\n` +
    `请严格只输出一个 JSON 对象（不要 markdown 代码块、不要解释文字），格式如下：\n` +
    `{\n` +
    `  "transcript": "完整的听力原文（英文，可含中文场景说明）",\n` +
    `  "audioChunks": ["分句1", "分句2", "..."],\n` +
    `  "questions": [\n` +
    `    { "stem": "题干（中文或英文）", "options": ["选项A内容", "选项B内容", "选项C内容", "选项D内容"], "answer": "A", "audioRef": 0 }\n` +
    `  ]\n` +
    `}\n` +
    `要求：audioChunks 数量不少于 questions 数量；每题 audioRef 必须是有效索引（0 到 audioChunks.length-1）；` +
    `answer 必须是 A/B/C/D 之一且与 options 对应；每题 4 个选项；题量严格等于 ${count.value}。`
  return { sys, usr }
}

function parseJSON(text: string): ListenResult | null {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const tryParse = (s: string): ListenResult | null => {
    try {
      const obj = JSON.parse(s)
      if (obj && typeof obj === 'object' && Array.isArray(obj.audioChunks) && Array.isArray(obj.questions)) {
        const questions = obj.questions.map((q: any) => ({
          stem: String(q?.stem || ''),
          options: Array.isArray(q?.options) ? q.options.map((o: any) => String(o)) : [],
          answer: String(q?.answer || '').toUpperCase().trim(),
          audioRef: Number(q?.audioRef) || 0,
        }))
        return {
          transcript: String(obj.transcript || ''),
          audioChunks: obj.audioChunks.map((c: any) => String(c || '')),
          questions,
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
  submitted.value = false
  answers.value = {}
  result.value = null
  stopRequested = true
  speechSynthesis.cancel()
  isPlayingFull.value = false
  try {
    const { sys, usr } = buildPrompt()
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.7,
      stream: false,
    })
    const parsed = parseJSON(text)
    if (!parsed) {
      toast.error('AI 返回内容无法解析，请重试')
      return
    }
    result.value = parsed
    toast.success('听力已生成，可点击「播放完整听力」开始')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

function submitAnswers() {
  if (!result.value) return
  const unanswered = result.value.questions.length - Object.keys(answers.value).length
  if (unanswered > 0) {
    toast.warning(`还有 ${unanswered} 题未作答`)
    return
  }
  submitted.value = true
  toast.success(`已提交，得分 ${score.value}/${result.value.questions.length}`)
}

function copyTranscript() {
  if (!result.value) return
  navigator.clipboard.writeText(result.value.transcript).then(
    () => toast.success('已复制听力原文'),
    () => toast.error('复制失败'),
  )
}

function reset() {
  result.value = null
  answers.value = {}
  submitted.value = false
  stopRequested = true
  speechSynthesis.cancel()
  isPlayingFull.value = false
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

    <section class="card-soft p-5 bg-gradient-to-br from-sky2-100 via-mint-100 to-butter-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky2-300 to-mint-300 flex items-center justify-center text-2xl shadow-softer">
          🎧
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">英语听力</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            根据年级、主题与难度生成英语听力材料，支持整段朗读、分段重听与答题对照。
          </p>
        </div>
      </div>
    </section>

    <section class="card-flat p-4">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">年级</label>
          <select v-model="grade" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">主题</label>
          <select v-model="topic" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="t in topics" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">难度</label>
          <select v-model="difficulty" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="d in difficulties" :key="d" :value="d">{{ d }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">题量</label>
          <select v-model="count" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="c in counts" :key="c" :value="c">{{ c }} 小题</option>
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
          {{ generating ? '生成中...' : '生成听力' }}
        </button>
      </div>
    </section>

    <template v-if="result">
      <section class="card-flat p-4">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            class="btn-primary flex items-center gap-2 !py-2"
            @click="playFull"
          >
            <Square v-if="isPlayingFull" :size="16" />
            <Volume2 v-else :size="16" />
            {{ isPlayingFull ? '停止' : '播放完整听力' }}
          </button>
          <button
            class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
            @click="copyTranscript"
          >
            <Copy :size="14" /> 复制原文
          </button>
          <button
            class="btn-ghost flex items-center gap-1 !px-3 !py-2 text-sm"
            :disabled="generating"
            @click="generate"
          >
            <RotateCcw :size="14" /> 重新生成
          </button>
        </div>
      </section>

      <section class="space-y-3">
        <div
          v-for="(q, qi) in result.questions"
          :key="qi"
          class="card-flat p-4"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1 min-w-0">
              <span class="text-xs text-sky2-600 font-medium">第 {{ qi + 1 }} 题</span>
              <p class="text-sm text-cocoa-800 mt-1">{{ q.stem }}</p>
            </div>
            <button
              class="btn-ghost flex items-center gap-1 !px-2.5 !py-1.5 text-xs shrink-0"
              @click="replayChunk(q.audioRef)"
            >
              <Volume2 :size="12" /> 重听本段
            </button>
          </div>
          <div class="space-y-2">
            <label
              v-for="(letter, li) in optionLetters"
              :key="letter"
              class="flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition text-sm"
              :class="[
                answers[qi] === letter ? 'bg-sky2-50 border-sky2-300' : 'bg-white/60 border-cream-200',
                submitted && letter === q.answer ? '!bg-mint-100 !border-mint-400' : '',
                submitted && answers[qi] === letter && answers[qi] !== q.answer ? '!bg-sakura-100 !border-sakura-400' : '',
              ]"
            >
              <input
                type="radio"
                :value="letter"
                v-model="answers[qi]"
                :disabled="submitted"
                class="accent-sky2-500"
              />
              <span class="text-cocoa-700">{{ letter }}. {{ q.options[li] }}</span>
              <Check
                v-if="submitted && letter === q.answer"
                :size="14"
                class="text-mint-500 ml-auto"
              />
              <X
                v-if="submitted && answers[qi] === letter && answers[qi] !== q.answer"
                :size="14"
                class="text-sakura-500 ml-auto"
              />
            </label>
          </div>
        </div>
      </section>

      <section v-if="!submitted" class="flex justify-center">
        <button class="btn-primary px-8 py-2" @click="submitAnswers">
          提交答题
        </button>
      </section>

      <section v-if="submitted" class="card-soft p-5 bg-gradient-to-br from-mint-50 to-sky2-50">
        <div class="flex items-center justify-between mb-3">
          <h3 class="title-display text-lg flex items-center gap-2">
            <Check :size="18" class="text-mint-500" /> 得分
          </h3>
          <span class="text-2xl font-bold text-sky2-600">
            {{ score }} / {{ result.questions.length }}
          </span>
        </div>
        <div class="border-t border-cream-200 pt-3">
          <div class="text-xs text-cocoa-500 mb-2">听力原文对照</div>
          <p class="text-sm text-cocoa-700 whitespace-pre-line leading-relaxed">{{ result.transcript }}</p>
        </div>
      </section>
    </template>

    <section
      v-else-if="!generating"
      class="card-soft p-8 text-center text-cocoa-400"
    >
      <Volume2 :size="36" class="mx-auto mb-2 opacity-40" />
      <p class="text-sm">选择年级、主题、难度后点击「生成听力」</p>
      <p class="text-xs mt-1">AI 将自动生成听力原文、音频分句与单选题</p>
    </section>
  </div>
</template>
