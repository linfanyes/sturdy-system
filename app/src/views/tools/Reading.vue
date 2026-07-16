<!--
  Reading.vue
  阅读理解生成：调用 AI 按年级、文体、题量、字数生成阅读理解题目，
  支持单选作答、查看答案解析、复制文章、重新生成等。适合语文课堂练习与课后训练。
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, Copy, RotateCcw, CheckCircle2, AlertCircle, Loader2, BookOpen } from 'lucide-vue-next'
import { useAIStore } from '../../stores/ai'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import MarkdownView from '../../components/common/MarkdownView.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'

const ai = useAIStore()
const toast = useToastStore()

// ============ 选项 ============
const grades = ['三年级', '四年级', '五年级', '六年级'] as const
const genres = ['记叙文', '说明文', '童话', '散文'] as const
const counts = [3, 5, 8] as const
const wordCounts = [200, 300, 500] as const

const selectedGrade = ref<string>(grades[0])
const selectedGenre = ref<string>(genres[0])
const selectedCount = ref<number>(counts[1])
const selectedWordCount = ref<number>(wordCounts[0])

const hasApiKey = computed(() => !!ai.settings.apiKey?.trim())

// ============ 题目数据结构 ============
interface Question {
  stem: string
  options: string[]
  answer: string
  analysis: string
}
interface ReadingPayload {
  passage: string
  questions: Question[]
}

// ============ 状态 ============
type Status = 'idle' | 'generating' | 'done' | 'error'
const status = ref<Status>('idle')
const errorMsg = ref('')
const passage = ref('')
const questions = ref<Question[]>([])
const userAnswers = ref<Record<number, string>>({})
const submitted = ref(false)
let abortCtrl: AbortController | null = null

const optionLabels = ['A', 'B', 'C', 'D', 'E', 'F']

const correctCount = computed(() => {
  let n = 0
  questions.value.forEach((q, i) => {
    if (userAnswers.value[i] && userAnswers.value[i] === q.answer) n++
  })
  return n
})

// ============ 生成 ============
function buildPrompt() {
  const sys =
    '你是一位资深的小学语文教研员，擅长编写符合课标要求、难度适中的阅读理解题目。' +
    '题目要紧扣文章内容，选项要有一定迷惑性，答案与解析要准确清晰。'
  const usr =
    `请为${selectedGrade.value}学生编写一篇${selectedGenre.value}阅读理解。\n` +
    `要求：\n` +
    `1. 文章字数约 ${selectedWordCount.value} 字，内容健康向上，语言规范，符合该年级学生认知水平；\n` +
    `2. 围绕文章设计 ${selectedCount.value} 道单项选择题，每题 4 个选项（A/B/C/D）；\n` +
    `3. 题目覆盖字词理解、内容理解、主旨把握、写作手法等不同层次；\n` +
    `4. 严格只输出如下 JSON（不要 markdown 代码块、不要任何解释文字）：\n` +
    `{\n` +
    `  "passage": "文章正文（可含段落换行）",\n` +
    `  "questions": [\n` +
    `    { "stem": "题干", "options": ["A 选项内容", "B 选项内容", "C 选项内容", "D 选项内容"], "answer": "A", "analysis": "解析说明" }\n` +
    `  ]\n` +
    `}\n` +
    `注意：answer 必须是 "A"/"B"/"C"/"D" 中的一个字母；options 数组长度必须为 4。`
  return { sys, usr }
}

function parsePayload(text: string): ReadingPayload | null {
  let t = (text || '').trim()
  // 去掉可能的 ```json ... ``` 代码块
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  // 兜底：从文本中截取第一个 {...}
  if (!t.startsWith('{')) {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) t = m[0]
  }
  try {
    const obj = JSON.parse(t)
    if (!obj || typeof obj.passage !== 'string' || !Array.isArray(obj.questions)) return null
    const validQuestions = obj.questions
      .filter((q: any) => q && typeof q.stem === 'string' && Array.isArray(q.options) && typeof q.answer === 'string')
      .map((q: any) => ({
        stem: String(q.stem),
        options: (q.options as any[]).map((o) => String(o)),
        answer: String(q.answer).toUpperCase().trim(),
        analysis: String(q.analysis || ''),
      }))
      .filter((q: Question) => q.options.length >= 2)
    if (!validQuestions.length) return null
    return { passage: obj.passage, questions: validQuestions }
  } catch {
    return null
  }
}

async function generate() {
  if (status.value === 'generating') return
  if (!hasApiKey.value) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  status.value = 'generating'
  errorMsg.value = ''
  passage.value = ''
  questions.value = []
  userAnswers.value = {}
  submitted.value = false
  abortCtrl = new AbortController()
  try {
    const { sys, usr } = buildPrompt()
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.85,
      stream: false,
      signal: abortCtrl.signal,
    })
    const payload = parsePayload(text)
    if (!payload) {
      status.value = 'error'
      errorMsg.value = 'AI 返回的内容无法解析为有效的阅读理解，请重试'
      toast.error('生成失败，请重试')
      return
    }
    passage.value = payload.passage
    questions.value = payload.questions
    status.value = 'done'
    toast.success(`已生成 ${payload.questions.length} 道题`)
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      status.value = 'idle'
      toast.info('已取消生成')
      return
    }
    status.value = 'error'
    if (e instanceof AIError || e?.name === 'AIError') {
      errorMsg.value = e.message
      toast.error(e.message)
    } else {
      errorMsg.value = '生成失败：' + (e?.message || '未知错误')
      toast.error('生成失败，请稍后重试')
    }
  } finally {
    abortCtrl = null
  }
}

function stopGenerate() {
  abortCtrl?.abort()
}

function selectOption(qIdx: number, label: string) {
  if (submitted.value) return
  userAnswers.value = { ...userAnswers.value, [qIdx]: label }
}

function submitAnswers() {
  const unanswered = questions.value.filter((_, i) => !userAnswers.value[i]).length
  if (unanswered > 0) {
    toast.warning(`还有 ${unanswered} 题未作答`)
    return
  }
  submitted.value = true
  toast.success(`作答完成，答对 ${correctCount.value} / ${questions.value.length} 题`)
}

function resetAnswers() {
  userAnswers.value = {}
  submitted.value = false
}

function copyPassage() {
  if (!passage.value) return
  navigator.clipboard.writeText(passage.value).then(
    () => toast.success('已复制文章'),
    () => toast.error('复制失败'),
  )
}

function isOptionCorrect(qIdx: number, label: string): boolean {
  return submitted.value && questions.value[qIdx]?.answer === label
}

function isOptionWrong(qIdx: number, label: string): boolean {
  return submitted.value && userAnswers.value[qIdx] === label && questions.value[qIdx]?.answer !== label
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="false" />

    <section class="card-soft p-5 bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-2xl shadow-softer">
          📖
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">阅读理解生成</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            AI 一键生成阅读理解题：选年级、文体、题量、字数，自动出题并支持在线作答与解析查看。
          </p>
        </div>
      </div>
    </section>

    <!-- 选项区 -->
    <section class="card-flat p-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">年级</label>
          <select
            v-model="selectedGrade"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
            :disabled="status === 'generating'"
          >
            <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">文体</label>
          <select
            v-model="selectedGenre"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
            :disabled="status === 'generating'"
          >
            <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">题量</label>
          <select
            v-model.number="selectedCount"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
            :disabled="status === 'generating'"
          >
            <option v-for="c in counts" :key="c" :value="c">{{ c }} 题</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">字数</label>
          <select
            v-model.number="selectedWordCount"
            class="w-full mt-1 card-flat px-3 py-2 text-sm"
            :disabled="status === 'generating'"
          >
            <option v-for="w in wordCounts" :key="w" :value="w">{{ w }} 字</option>
          </select>
        </div>
      </div>

      <!-- API Key 缺失提示 -->
      <div
        v-if="!hasApiKey"
        class="mt-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2"
      >
        <AlertCircle :size="12" />
        <span>请先在「AI 对话 → 设置」中配置 API Key 才能使用本工具</span>
      </div>

      <div class="mt-3 flex items-center justify-end gap-2">
        <button
          v-if="status === 'generating'"
          class="btn-secondary px-4 py-2 flex items-center gap-1.5"
          @click="stopGenerate"
        >
          <Loader2 :size="14" class="animate-spin" /> 停止
        </button>
        <button
          v-else-if="status === 'done'"
          class="btn-secondary px-4 py-2 flex items-center gap-1.5"
          :disabled="!hasApiKey"
          @click="generate"
        >
          <RotateCcw :size="14" /> 重新生成
        </button>
        <button
          v-else
          class="btn-primary px-5 py-2 flex items-center gap-1.5"
          :disabled="!hasApiKey"
          @click="generate"
        >
          <Sparkles :size="14" /> 生成
        </button>
      </div>
    </section>

    <!-- 生成中 -->
    <section v-if="status === 'generating'" class="card-flat p-8 text-center">
      <Loader2 :size="32" class="animate-spin mx-auto text-rose-500 mb-3" />
      <p class="text-cocoa-700 text-sm">AI 正在为您生成阅读理解...</p>
      <p class="text-cocoa-400 text-xs mt-1">{{ selectedGrade }} · {{ selectedGenre }} · {{ selectedCount }} 题 · {{ selectedWordCount }} 字</p>
    </section>

    <!-- 错误 -->
    <section v-else-if="status === 'error'" class="card-flat p-6 text-center">
      <AlertCircle :size="28" class="mx-auto text-rose-500 mb-2" />
      <p class="text-cocoa-700 text-sm">{{ errorMsg }}</p>
      <button class="btn-primary mt-3 px-4 py-1.5 text-sm" @click="generate">重新生成</button>
    </section>

    <!-- 结果展示 -->
    <template v-else-if="status === 'done'">
      <!-- 文章 -->
      <section class="card-flat p-5">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 class="text-base font-medium text-cocoa-900 flex items-center gap-1.5">
            <BookOpen :size="16" class="text-rose-500" /> 阅读文章
          </h3>
          <div class="flex items-center gap-2">
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
              {{ selectedGrade }} · {{ selectedGenre }}
            </span>
            <button
              class="btn-ghost !px-2.5 !py-1 text-xs flex items-center gap-1"
              @click="copyPassage"
            >
              <Copy :size="12" /> 复制
            </button>
          </div>
        </div>
        <MarkdownView :md="passage" />
      </section>

      <!-- 题目 -->
      <section class="card-flat p-5">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 class="text-base font-medium text-cocoa-900">
            题目（{{ questions.length }} 题）
          </h3>
          <div v-if="submitted" class="text-sm text-rose-600 font-medium">
            答对 {{ correctCount }} / {{ questions.length }} 题
          </div>
        </div>

        <div class="space-y-5">
          <div
            v-for="(q, qIdx) in questions"
            :key="qIdx"
            class="p-4 rounded-xl border border-cream-200 bg-cream-50/50"
          >
            <!-- 题干 -->
            <div class="text-sm text-cocoa-900 mb-3 leading-relaxed">
              <span class="text-rose-500 font-semibold mr-1">{{ qIdx + 1 }}.</span>
              {{ q.stem }}
            </div>
            <!-- 选项 -->
            <div class="space-y-2">
              <button
                v-for="(opt, oIdx) in q.options"
                :key="oIdx"
                class="w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-start gap-2"
                :class="[
                  isOptionCorrect(qIdx, optionLabels[oIdx])
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : isOptionWrong(qIdx, optionLabels[oIdx])
                      ? 'bg-rose-100 text-rose-700 border border-rose-300'
                      : userAnswers[qIdx] === optionLabels[oIdx]
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-white text-cocoa-700 border border-cream-200 hover:border-rose-200',
                ]"
                :disabled="submitted"
                @click="selectOption(qIdx, optionLabels[oIdx])"
              >
                <span class="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold"
                  :class="[
                    isOptionCorrect(qIdx, optionLabels[oIdx])
                      ? 'bg-emerald-500 text-white'
                      : isOptionWrong(qIdx, optionLabels[oIdx])
                        ? 'bg-rose-500 text-white'
                        : userAnswers[qIdx] === optionLabels[oIdx]
                          ? 'bg-rose-500 text-white'
                          : 'bg-cream-200 text-cocoa-600',
                  ]"
                >
                  {{ optionLabels[oIdx] }}
                </span>
                <span class="flex-1 pt-0.5">{{ opt }}</span>
                <CheckCircle2
                  v-if="isOptionCorrect(qIdx, optionLabels[oIdx])"
                  :size="14"
                  class="text-emerald-500 shrink-0 mt-0.5"
                />
              </button>
            </div>
            <!-- 解析（提交后显示） -->
            <div v-if="submitted" class="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div class="text-xs text-amber-700 font-medium mb-1">
                正确答案：{{ q.answer }}
              </div>
              <div class="text-xs text-cocoa-700 leading-relaxed">
                <span class="text-amber-600 font-medium">解析：</span>{{ q.analysis || '暂无解析' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 作答控制 -->
        <div class="mt-5 flex items-center justify-center gap-3 flex-wrap">
          <button
            v-if="!submitted"
            class="btn-primary px-6 py-2"
            @click="submitAnswers"
          >
            提交答案
          </button>
          <button
            v-if="!submitted"
            class="btn-ghost !px-3 !py-2 text-sm"
            @click="resetAnswers"
          >
            清空作答
          </button>
          <button
            v-if="submitted"
            class="btn-secondary px-5 py-2"
            @click="resetAnswers"
          >
            重新作答
          </button>
          <button
            v-if="submitted"
            class="btn-primary px-5 py-2 flex items-center gap-1.5"
            @click="generate"
          >
            <RotateCcw :size="14" /> 再来一组
          </button>
        </div>
      </section>
    </template>

    <!-- 初始空状态 -->
    <section v-else class="card-flat p-10 text-center">
      <div class="text-5xl mb-3">📝</div>
      <p class="text-cocoa-700 text-sm">选择年级、文体、题量与字数，点击"生成"开始</p>
      <p class="text-cocoa-400 text-xs mt-1">AI 将自动生成阅读文章与配套选择题</p>
    </section>

    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：生成的文章与题目可一键复制用于课堂；学生作答后可查看答案与解析
    </div>
  </div>
</template>
