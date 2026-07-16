<script setup lang="ts">
// 英语语法练习工具：按年级/语法专题/题型生成练习题，支持单选、句型转换、填空与一键批改、错题收集
import { ref, computed } from 'vue'
import { Sparkles, RefreshCw, Check, X, Copy, ChevronDown, ChevronUp, RotateCcw } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import { useAIStore } from '../../stores/ai'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'

const toast = useToastStore()
const ai = useAIStore()

interface Exercise {
  type: 'choice' | 'transform' | 'fill'
  stem: string
  options?: string[]
  answer: string
  analysis: string
}

const grades = ['三年级', '四年级', '五年级', '六年级']
const topics = ['一般现在时', '一般过去时', '一般将来时', '现在进行时', '名词复数', '冠词', '介词', '形容词比较级']
const typeOptions = [
  { label: '单选', value: 'choice' as const },
  { label: '句型转换', value: 'transform' as const },
  { label: '填空', value: 'fill' as const },
]
const counts = [5, 10, 15]
const optionLetters = ['A', 'B', 'C', 'D']

const typeLabelMap: Record<string, string> = { choice: '单选', transform: '句型转换', fill: '填空' }

const grade = ref(grades[0])
const topic = ref(topics[0])
const exerciseType = ref<'choice' | 'transform' | 'fill'>('choice')
const count = ref(5)

const generating = ref(false)
const exercises = ref<Exercise[]>([])
const userAnswers = ref<Record<number, string>>({})
const graded = ref(false)
const expanded = ref<Record<number, boolean>>({})

const correctCount = computed(() => {
  if (!graded.value) return 0
  return exercises.value.filter((_, i) => isCorrect(i)).length
})

const wrongExercises = computed(() => {
  if (!graded.value) return []
  return exercises.value
    .map((ex, i) => ({ ex, i, userAnswer: userAnswers.value[i] || '' }))
    .filter(({ i }) => !isCorrect(i))
})

function isCorrect(idx: number): boolean {
  const ex = exercises.value[idx]
  const userAns = (userAnswers.value[idx] || '').trim()
  if (!userAns) return false
  if (ex.type === 'choice') {
    return userAns.toUpperCase() === ex.answer.toUpperCase()
  }
  return userAns.toLowerCase() === ex.answer.toLowerCase()
}

function buildPrompt() {
  const sys =
    '你是一位资深小学英语语法教师。请根据用户给定的年级、语法专题、题型和题量，生成符合小学生水平的语法练习题。' +
    '题目需贴合所选年级，词汇和句型不得超纲，解析需简洁明了。'
  const typeDesc = typeLabelMap[exerciseType.value]
  const usr =
    `年级：${grade.value}\n语法专题：${topic.value}\n题型：${typeDesc}\n题量：${count.value} 题\n\n` +
    `请严格只输出一个 JSON 对象（不要 markdown 代码块、不要解释文字），格式如下：\n` +
    `{\n` +
    `  "exercises": [\n` +
    `    { "type": "${exerciseType.value}", "stem": "题干", "options": ["A内容","B内容","C内容","D内容"], "answer": "A", "analysis": "解析" }\n` +
    `  ]\n` +
    `}\n` +
    `要求：\n` +
    `- type 字段只能为 "choice"（单选）、"transform"（句型转换）或 "fill"（填空）；本题只生成 "${exerciseType.value}" 类型；\n` +
    `- choice 题：必须有 4 个 options，answer 为 A/B/C/D 之一；\n` +
    `- transform 题：stem 为原句或转换要求，answer 为转换后的完整句子，不需要 options；\n` +
    `- fill 题：stem 中用 ___ 表示空缺处，answer 为正确填空内容，不需要 options；\n` +
    `- 每题必须有 analysis 解析；题量严格等于 ${count.value}。`
  return { sys, usr }
}

function parseJSON(text: string): Exercise[] | null {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const typeMap: Record<string, Exercise['type']> = {
    choice: 'choice', transform: 'transform', fill: 'fill',
    '单选': 'choice', '句型转换': 'transform', '填空': 'fill',
  }
  const normalize = (raw: any): Exercise => {
    const tStr = String(raw?.type || '').trim()
    return {
      type: typeMap[tStr] || typeMap[tStr.toLowerCase()] || 'choice',
      stem: String(raw?.stem || ''),
      options: Array.isArray(raw?.options) ? raw.options.map((o: any) => String(o)) : undefined,
      answer: String(raw?.answer || ''),
      analysis: String(raw?.analysis || ''),
    }
  }
  const tryParse = (s: string): Exercise[] | null => {
    try {
      const obj = JSON.parse(s)
      if (obj && Array.isArray(obj.exercises)) {
        return obj.exercises.map(normalize)
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
  graded.value = false
  userAnswers.value = {}
  expanded.value = {}
  exercises.value = []
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
    if (!parsed || !parsed.length) {
      toast.error('AI 返回内容无法解析，请重试')
      return
    }
    exercises.value = parsed
    toast.success(`已生成 ${parsed.length} 道练习题`)
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已取消')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
  }
}

function gradeAll() {
  const unanswered = exercises.value.filter((_, i) => !userAnswers.value[i]?.trim()).length
  if (unanswered > 0) {
    toast.warning(`还有 ${unanswered} 题未作答`)
    return
  }
  graded.value = true
  toast.success(`批改完成，得分 ${correctCount.value}/${exercises.value.length}`)
}

function toggleExpand(idx: number) {
  expanded.value[idx] = !expanded.value[idx]
}

function copyWrongList() {
  if (!wrongExercises.value.length) return
  const text = wrongExercises.value.map(({ ex, userAnswer }, idx) => {
    const parts = [`【错题${idx + 1}】${typeLabelMap[ex.type]}`]
    parts.push(`题干：${ex.stem}`)
    if (ex.options) {
      ex.options.forEach((o, oi) => parts.push(`${optionLetters[oi]}. ${o}`))
    }
    parts.push(`你的答案：${userAnswer || '未作答'}`)
    parts.push(`正确答案：${ex.answer}`)
    if (ex.analysis) parts.push(`解析：${ex.analysis}`)
    return parts.join('\n')
  }).join('\n\n')
  navigator.clipboard.writeText(text).then(
    () => toast.success('已复制错题'),
    () => toast.error('复制失败'),
  )
}

function reset() {
  exercises.value = []
  userAnswers.value = {}
  graded.value = false
  expanded.value = {}
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="false" />

    <section class="card-soft p-5 bg-gradient-to-br from-mint-100 via-sky2-100 to-sakura-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-300 to-sky2-300 flex items-center justify-center text-2xl shadow-softer">
          📝
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">英语语法练习</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            按语法专题生成单选、句型转换、填空题，支持一键批改与错题收集。
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
          <label class="text-xs text-cocoa-500 ml-1">语法专题</label>
          <select v-model="topic" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="t in topics" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">题型</label>
          <select v-model="exerciseType" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">题量</label>
          <select v-model="count" class="w-full mt-1 card-flat px-3 py-2 text-sm">
            <option v-for="c in counts" :key="c" :value="c">{{ c }} 题</option>
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
          {{ generating ? '生成中...' : '生成练习' }}
        </button>
      </div>
    </section>

    <template v-if="exercises.length">
      <section class="card-flat p-4">
        <div class="flex items-center gap-2 flex-wrap">
          <button
            v-if="!graded"
            class="btn-primary flex items-center gap-2 !py-2"
            @click="gradeAll"
          >
            <Check :size="16" /> 一键批改
          </button>
          <div v-else class="flex items-center gap-3">
            <span class="text-sm text-cocoa-600">得分</span>
            <span class="text-2xl font-bold text-sky2-600">
              {{ correctCount }} / {{ exercises.length }}
            </span>
          </div>
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
          v-for="(ex, ei) in exercises"
          :key="ei"
          class="card-flat p-4"
        >
          <div class="flex items-start justify-between gap-3 mb-3">
            <div class="flex-1 min-w-0">
              <span class="text-xs text-sky2-600 font-medium">第 {{ ei + 1 }} 题</span>
              <span class="text-xs text-cocoa-400 ml-2">{{ typeLabelMap[ex.type] }}</span>
              <p class="text-sm text-cocoa-800 mt-1">{{ ex.stem }}</p>
            </div>
            <span
              v-if="graded"
              class="shrink-0 w-6 h-6 rounded-full flex items-center justify-center"
              :class="isCorrect(ei) ? 'bg-mint-100 text-mint-600' : 'bg-sakura-100 text-sakura-600'"
            >
              <Check v-if="isCorrect(ei)" :size="14" />
              <X v-else :size="14" />
            </span>
          </div>

          <!-- 单选题 -->
          <div v-if="ex.type === 'choice'" class="space-y-2">
            <label
              v-for="(letter, li) in optionLetters"
              :key="letter"
              class="flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition text-sm"
              :class="[
                userAnswers[ei] === letter ? 'bg-sky2-50 border-sky2-300' : 'bg-white/60 border-cream-200',
                graded && letter === ex.answer.toUpperCase() ? '!bg-mint-100 !border-mint-400' : '',
                graded && userAnswers[ei] === letter && userAnswers[ei] !== ex.answer.toUpperCase() ? '!bg-sakura-100 !border-sakura-400' : '',
              ]"
            >
              <input
                type="radio"
                :value="letter"
                v-model="userAnswers[ei]"
                :disabled="graded"
                class="accent-sky2-500"
              />
              <span class="text-cocoa-700">{{ letter }}. {{ ex.options?.[li] }}</span>
            </label>
          </div>

          <!-- 句型转换 / 填空题 -->
          <div v-else class="space-y-2">
            <input
              v-model="userAnswers[ei]"
              type="text"
              :disabled="graded"
              placeholder="输入你的答案..."
              class="w-full card-flat px-4 py-2.5 text-sm"
            />
            <button
              class="btn-ghost flex items-center gap-1 !px-2.5 !py-1.5 text-xs"
              @click="toggleExpand(ei)"
            >
              <template v-if="expanded[ei]">
                <ChevronUp :size="12" /> 收起答案
              </template>
              <template v-else>
                <ChevronDown :size="12" /> 对照答案
              </template>
            </button>
            <div v-if="expanded[ei]" class="card-flat !bg-cream-50 p-3 text-sm space-y-1.5">
              <div>
                <span class="text-cocoa-500">正确答案：</span>
                <span class="text-mint-600 font-medium">{{ ex.answer }}</span>
              </div>
              <div v-if="ex.analysis">
                <span class="text-cocoa-500">解析：</span>
                <span class="text-cocoa-700">{{ ex.analysis }}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 错题列表 -->
      <section v-if="graded && wrongExercises.length" class="card-soft p-5 bg-gradient-to-br from-sakura-50 to-cream-50">
        <div class="flex items-center justify-between mb-3">
          <h3 class="title-display text-lg flex items-center gap-2">
            <X :size="18" class="text-sakura-500" /> 错题列表
            <span class="text-sm text-cocoa-400">({{ wrongExercises.length }} 题)</span>
          </h3>
          <button
            class="btn-ghost flex items-center gap-1 !px-3 !py-1.5 text-xs"
            @click="copyWrongList"
          >
            <Copy :size="12" /> 复制错题
          </button>
        </div>
        <div class="space-y-2">
          <div
            v-for="({ ex, userAnswer }, wi) in wrongExercises"
            :key="wi"
            class="card-flat p-3 text-sm"
          >
            <div class="text-cocoa-800">{{ ex.stem }}</div>
            <div class="mt-1.5 flex items-center gap-3 text-xs">
              <span class="text-sakura-500">你的答案：{{ userAnswer || '未作答' }}</span>
              <span class="text-mint-600">正确：{{ ex.answer }}</span>
            </div>
            <div v-if="ex.analysis" class="mt-1 text-xs text-cocoa-500">{{ ex.analysis }}</div>
          </div>
        </div>
      </section>
    </template>

    <section
      v-else-if="!generating"
      class="card-soft p-8 text-center text-cocoa-400"
    >
      <Sparkles :size="36" class="mx-auto mb-2 opacity-40" />
      <p class="text-sm">选择年级、语法专题、题型后点击「生成练习」</p>
      <p class="text-xs mt-1">支持单选、句型转换、填空三种题型，一键批改并收集错题</p>
    </section>
  </div>
</template>
