<!--
  Essay.vue
  小作文助手：支持 AI 生成范文（按年级、文体、字数、主题）与 AI 批改学生作文
  （错别字、语句通顺、立意结构、修辞手法等维度），输出得分、错字、建议与总评。
  适合语文教师备课出示范、批改学生习作。
-->
<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, Copy, Download, Loader2, AlertCircle, RotateCcw, PencilLine, FileText } from 'lucide-vue-next'
import { useAIStore } from '../../stores/ai'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import { downloadMarkdown } from '../../utils/download'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import MarkdownView from '../../components/common/MarkdownView.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'

const ai = useAIStore()
const toast = useToastStore()

const hasApiKey = computed(() => !!ai.settings.apiKey?.trim())

// ============ Tab 切换 ============
type Tab = 'generate' | 'correct'
const activeTab = ref<Tab>('generate')

// ============ 生成范文 选项 ============
const grades = ['三年级', '四年级', '五年级', '六年级'] as const
const genres = ['记叙文', '读后感', '观后感', '写景', '写人', '想象作文'] as const
const wordCounts = [200, 300, 400, 500] as const

const selectedGrade = ref<string>(grades[0])
const selectedGenre = ref<string>(genres[0])
const selectedWordCount = ref<number>(wordCounts[0])
const theme = ref('')

// ============ 生成状态 ============
type GenStatus = 'idle' | 'generating' | 'done' | 'error'
const genStatus = ref<GenStatus>('idle')
const genError = ref('')
const essayContent = ref('')
let genAbort: AbortController | null = null

// ============ 批改 选项 ============
const dimensions = ['综合', '错别字', '语句通顺', '立意结构', '修辞手法'] as const
const selectedDimension = ref<string>(dimensions[0])
const studentEssay = ref('')

// ============ 批改状态 ============
type CorrectStatus = 'idle' | 'correcting' | 'done' | 'error'
const correctStatus = ref<CorrectStatus>('idle')
const correctError = ref('')
let correctAbort: AbortController | null = null

interface EssayError {
  original: string
  corrected: string
  reason: string
}
interface CorrectResult {
  score: number
  errors: EssayError[]
  suggestions: string[]
  comment: string
}
const correctResult = ref<CorrectResult | null>(null)

// ============ 生成范文 ============
function buildGenPrompt() {
  const sys =
    '你是一位资深的小学语文教师，擅长为小学生编写符合其认知水平、语言规范的范文。' +
    '范文要内容健康向上、结构清晰、用词准确，体现该年级应有的写作能力。'
  const usr =
    `请为${selectedGrade.value}学生写一篇${selectedGenre.value}范文。\n` +
    `要求：\n` +
    `1. 字数约 ${selectedWordCount.value} 字；\n` +
    (theme.value.trim() ? `2. 主题/话题：${theme.value.trim()}；\n` : '2. 主题不限，自行选材；\n') +
    `3. 语言规范，符合${selectedGrade.value}学生的表达习惯，可适当运用修辞；\n` +
    `4. 先用一行写标题（不加书名号），再换行写正文；\n` +
    `5. 用 Markdown 格式输出，正文可分多段。`
  return { sys, usr }
}

async function generateEssay() {
  if (genStatus.value === 'generating') return
  if (!hasApiKey.value) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  genStatus.value = 'generating'
  genError.value = ''
  essayContent.value = ''
  genAbort = new AbortController()
  try {
    const { sys, usr } = buildGenPrompt()
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.85,
      stream: false,
      signal: genAbort.signal,
    })
    if (!text || !text.trim()) {
      genStatus.value = 'error'
      genError.value = 'AI 未返回有效内容，请重试'
      toast.error('生成失败，请重试')
      return
    }
    essayContent.value = text.trim()
    genStatus.value = 'done'
    toast.success('范文已生成')
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      genStatus.value = 'idle'
      toast.info('已取消生成')
      return
    }
    genStatus.value = 'error'
    if (e instanceof AIError || e?.name === 'AIError') {
      genError.value = e.message
      toast.error(e.message)
    } else {
      genError.value = '生成失败：' + (e?.message || '未知错误')
      toast.error('生成失败，请稍后重试')
    }
  } finally {
    genAbort = null
  }
}

function stopGen() {
  genAbort?.abort()
}

function copyEssay() {
  if (!essayContent.value) return
  navigator.clipboard.writeText(essayContent.value).then(
    () => toast.success('已复制范文'),
    () => toast.error('复制失败'),
  )
}

function downloadEssay() {
  if (!essayContent.value) return
  const name = `范文_${selectedGrade.value}_${selectedGenre.value}_${Date.now()}.md`
  try {
    downloadMarkdown(name, essayContent.value)
    toast.success('已下载范文')
  } catch {
    toast.error('下载失败')
  }
}

// ============ 批改作文 ============
function buildCorrectPrompt() {
  const sys =
    '你是一位严谨负责的小学语文老师，擅长批改学生作文。' +
    '批改要细致、准确、有针对性，鼓励与指正并重，给出的建议要具体可操作。'
  const dimDesc: Record<string, string> = {
    '综合': '从错别字、语句通顺、立意结构、修辞手法等多个维度综合批改',
    '错别字': '重点找出作文中的错别字、用错词，逐一列出并给出正确写法',
    '语句通顺': '重点检查语句是否通顺、是否有语病，标出病句并给出修改建议',
    '立意结构': '重点分析文章立意是否恰当、结构是否清晰、详略是否得当',
    '修辞手法': '重点分析修辞手法的运用，指出可优化的表达并给出示范',
  }
  const usr =
    `请批改以下学生作文，批改维度：${selectedDimension.value}（${dimDesc[selectedDimension.value]}）。\n\n` +
    `【学生作文】\n${studentEssay.value.trim()}\n\n` +
    `严格只输出如下 JSON（不要 markdown 代码块、不要任何解释文字）：\n` +
    `{\n` +
    `  "score": 0-100 的整数,\n` +
    `  "errors": [ { "original": "原词/原句", "corrected": "正确写法", "reason": "修改原因" } ],\n` +
    `  "suggestions": [ "具体可操作的修改建议,每条一个字符串" ],\n` +
    `  "comment": "总评,2-4 句话,鼓励与指正并重"\n` +
    `}\n` +
    `注意：若该维度下没有错字/错误，errors 返回空数组 []；suggestions 至少给 2 条。`
  return { sys, usr }
}

function parseCorrectResult(text: string): CorrectResult | null {
  let t = (text || '').trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  if (!t.startsWith('{')) {
    const m = t.match(/\{[\s\S]*\}/)
    if (m) t = m[0]
  }
  try {
    const obj = JSON.parse(t)
    if (!obj || typeof obj !== 'object') return null
    const score = typeof obj.score === 'number' ? Math.max(0, Math.min(100, Math.round(obj.score))) : 0
    const errors = Array.isArray(obj.errors)
      ? obj.errors
          .filter((e: any) => e && typeof e.original === 'string')
          .map((e: any) => ({
            original: String(e.original),
            corrected: String(e.corrected || ''),
            reason: String(e.reason || ''),
          }))
      : []
    const suggestions = Array.isArray(obj.suggestions)
      ? obj.suggestions.map((s: any) => String(s)).filter(Boolean)
      : []
    const comment = typeof obj.comment === 'string' ? obj.comment : ''
    return { score, errors, suggestions, comment }
  } catch {
    return null
  }
}

async function correctEssay() {
  if (correctStatus.value === 'correcting') return
  if (!hasApiKey.value) {
    toast.error('请先在「AI 对话 → 设置」中配置 API Key')
    return
  }
  if (!studentEssay.value.trim()) {
    toast.warning('请先粘贴学生作文')
    return
  }
  correctStatus.value = 'correcting'
  correctError.value = ''
  correctResult.value = null
  correctAbort = new AbortController()
  try {
    const { sys, usr } = buildCorrectPrompt()
    const text = await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.5,
      stream: false,
      signal: correctAbort.signal,
    })
    const payload = parseCorrectResult(text)
    if (!payload) {
      correctStatus.value = 'error'
      correctError.value = 'AI 返回的内容无法解析为批改结果，请重试'
      toast.error('批改失败，请重试')
      return
    }
    correctResult.value = payload
    correctStatus.value = 'done'
    toast.success('批改完成')
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      correctStatus.value = 'idle'
      toast.info('已取消批改')
      return
    }
    correctStatus.value = 'error'
    if (e instanceof AIError || e?.name === 'AIError') {
      correctError.value = e.message
      toast.error(e.message)
    } else {
      correctError.value = '批改失败：' + (e?.message || '未知错误')
      toast.error('批改失败，请稍后重试')
    }
  } finally {
    correctAbort = null
  }
}

function stopCorrect() {
  correctAbort?.abort()
}

function scoreColor(score: number): string {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 75) return 'text-rose-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-rose-500'
}

function switchTab(tab: Tab) {
  // 切换前停止进行中的请求
  if (genStatus.value === 'generating') stopGen()
  if (correctStatus.value === 'correcting') stopCorrect()
  activeTab.value = tab
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="false" />

    <section class="card-soft p-5 bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center text-2xl shadow-softer">
          ✍️
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">小作文助手</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            AI 一键生成小学习作范文，或批改学生作文（错字、语句、立意、修辞），输出得分、错字与建议。
          </p>
        </div>
      </div>
    </section>

    <!-- Tab 切换 -->
    <section class="card-flat p-2 flex gap-1">
      <button
        class="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
        :class="activeTab === 'generate' ? 'bg-rose-500 text-white shadow-sm' : 'text-cocoa-600 hover:bg-cream-100'"
        @click="switchTab('generate')"
      >
        <FileText :size="14" /> 生成范文
      </button>
      <button
        class="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-1.5"
        :class="activeTab === 'correct' ? 'bg-rose-500 text-white shadow-sm' : 'text-cocoa-600 hover:bg-cream-100'"
        @click="switchTab('correct')"
      >
        <PencilLine :size="14" /> 批改作文
      </button>
    </section>

    <!-- API Key 缺失提示 -->
    <div
      v-if="!hasApiKey"
      class="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-600 flex items-center gap-2"
    >
      <AlertCircle :size="12" />
      <span>请先在「AI 对话 → 设置」中配置 API Key 才能使用本工具</span>
    </div>

    <!-- ============ 生成范文 ============ -->
    <template v-if="activeTab === 'generate'">
      <section class="card-flat p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label class="text-xs text-cocoa-500 ml-1">年级</label>
            <select
              v-model="selectedGrade"
              class="w-full mt-1 card-flat px-3 py-2 text-sm"
              :disabled="genStatus === 'generating'"
            >
              <option v-for="g in grades" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">文体</label>
            <select
              v-model="selectedGenre"
              class="w-full mt-1 card-flat px-3 py-2 text-sm"
              :disabled="genStatus === 'generating'"
            >
              <option v-for="g in genres" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">字数</label>
            <select
              v-model.number="selectedWordCount"
              class="w-full mt-1 card-flat px-3 py-2 text-sm"
              :disabled="genStatus === 'generating'"
            >
              <option v-for="w in wordCounts" :key="w" :value="w">{{ w }} 字</option>
            </select>
          </div>
        </div>
        <div class="mt-3">
          <label class="text-xs text-cocoa-500 ml-1">主题 / 话题（可选）</label>
          <input
            v-model="theme"
            type="text"
            placeholder="如：一次难忘的旅行 / 我的好朋友 / 秋天的校园"
            class="w-full mt-1 card-flat px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 rounded-xl"
            :disabled="genStatus === 'generating'"
          />
        </div>

        <div class="mt-3 flex items-center justify-end gap-2">
          <button
            v-if="genStatus === 'generating'"
            class="btn-secondary px-4 py-2 flex items-center gap-1.5"
            @click="stopGen"
          >
            <Loader2 :size="14" class="animate-spin" /> 停止
          </button>
          <button
            v-else-if="genStatus === 'done'"
            class="btn-secondary px-4 py-2 flex items-center gap-1.5"
            :disabled="!hasApiKey"
            @click="generateEssay"
          >
            <RotateCcw :size="14" /> 重新生成
          </button>
          <button
            v-else
            class="btn-primary px-5 py-2 flex items-center gap-1.5"
            :disabled="!hasApiKey"
            @click="generateEssay"
          >
            <Sparkles :size="14" /> 生成范文
          </button>
        </div>
      </section>

      <!-- 生成中 -->
      <section v-if="genStatus === 'generating'" class="card-flat p-8 text-center">
        <Loader2 :size="32" class="animate-spin mx-auto text-rose-500 mb-3" />
        <p class="text-cocoa-700 text-sm">生成中...</p>
        <p class="text-cocoa-400 text-xs mt-1">{{ selectedGrade }} · {{ selectedGenre }} · {{ selectedWordCount }} 字</p>
      </section>

      <!-- 错误 -->
      <section v-else-if="genStatus === 'error'" class="card-flat p-6 text-center">
        <AlertCircle :size="28" class="mx-auto text-rose-500 mb-2" />
        <p class="text-cocoa-700 text-sm">{{ genError }}</p>
        <button class="btn-primary mt-3 px-4 py-1.5 text-sm" @click="generateEssay">重新生成</button>
      </section>

      <!-- 结果 -->
      <section v-else-if="genStatus === 'done'" class="card-flat p-5">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 class="text-base font-medium text-cocoa-900 flex items-center gap-1.5">
            <FileText :size="16" class="text-rose-500" /> 范文
          </h3>
          <div class="flex items-center gap-2">
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
              {{ selectedGrade }} · {{ selectedGenre }} · {{ selectedWordCount }} 字
            </span>
            <button
              class="btn-ghost !px-2.5 !py-1 text-xs flex items-center gap-1"
              @click="copyEssay"
            >
              <Copy :size="12" /> 复制
            </button>
            <button
              class="btn-ghost !px-2.5 !py-1 text-xs flex items-center gap-1"
              @click="downloadEssay"
            >
              <Download :size="12" /> 下载
            </button>
          </div>
        </div>
        <MarkdownView :md="essayContent" />
      </section>

      <!-- 空状态 -->
      <section v-else class="card-flat p-10 text-center">
        <div class="text-5xl mb-3">📝</div>
        <p class="text-cocoa-700 text-sm">选择年级、文体、字数，点击"生成范文"开始</p>
        <p class="text-cocoa-400 text-xs mt-1">可选填主题，AI 将生成一篇符合要求的小学习作范文</p>
      </section>
    </template>

    <!-- ============ 批改作文 ============ -->
    <template v-else>
      <section class="card-flat p-4">
        <label class="text-xs text-cocoa-500 ml-1">学生作文</label>
        <textarea
          v-model="studentEssay"
          rows="8"
          placeholder="在此粘贴学生作文全文..."
          class="w-full mt-1 card-flat px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 rounded-xl"
          :disabled="correctStatus === 'correcting'"
        />
        <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div class="sm:col-span-2 lg:col-span-1">
            <label class="text-xs text-cocoa-500 ml-1">批改维度</label>
            <select
              v-model="selectedDimension"
              class="w-full mt-1 card-flat px-3 py-2 text-sm"
              :disabled="correctStatus === 'correcting'"
            >
              <option v-for="d in dimensions" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div class="flex items-end justify-end sm:col-span-2 lg:col-span-2">
            <div class="flex items-center gap-2">
              <button
                v-if="correctStatus === 'correcting'"
                class="btn-secondary px-4 py-2 flex items-center gap-1.5"
                @click="stopCorrect"
              >
                <Loader2 :size="14" class="animate-spin" /> 停止
              </button>
              <button
                v-else
                class="btn-primary px-5 py-2 flex items-center gap-1.5"
                :disabled="!hasApiKey || !studentEssay.trim()"
                @click="correctEssay"
              >
                <Sparkles :size="14" /> AI 批改
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 批改中 -->
      <section v-if="correctStatus === 'correcting'" class="card-flat p-8 text-center">
        <Loader2 :size="32" class="animate-spin mx-auto text-rose-500 mb-3" />
        <p class="text-cocoa-700 text-sm">AI 正在批改...</p>
        <p class="text-cocoa-400 text-xs mt-1">批改维度：{{ selectedDimension }}</p>
      </section>

      <!-- 错误 -->
      <section v-else-if="correctStatus === 'error'" class="card-flat p-6 text-center">
        <AlertCircle :size="28" class="mx-auto text-rose-500 mb-2" />
        <p class="text-cocoa-700 text-sm">{{ correctError }}</p>
        <button class="btn-primary mt-3 px-4 py-1.5 text-sm" @click="correctEssay">重新批改</button>
      </section>

      <!-- 批改结果 -->
      <template v-else-if="correctStatus === 'done' && correctResult">
        <!-- 得分 -->
        <section class="card-flat p-5 flex items-center gap-4 flex-wrap">
          <div class="text-center">
            <div class="text-xs text-cocoa-500 mb-1">得分</div>
            <div class="text-4xl font-bold" :class="scoreColor(correctResult.score)">
              {{ correctResult.score }}
            </div>
          </div>
          <div class="h-12 w-px bg-cream-200" />
          <div class="flex-1 min-w-0">
            <div class="text-xs text-rose-500 font-medium mb-1">总评</div>
            <p class="text-sm text-cocoa-700 leading-relaxed">{{ correctResult.comment }}</p>
          </div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-600">
            {{ selectedDimension }}
          </span>
        </section>

        <!-- 错字列表 -->
        <section v-if="correctResult.errors.length" class="card-flat p-5">
          <h3 class="text-base font-medium text-cocoa-900 mb-3 flex items-center gap-1.5">
            <PencilLine :size="16" class="text-rose-500" /> 错字 / 错句（{{ correctResult.errors.length }} 处）
          </h3>
          <div class="space-y-2">
            <div
              v-for="(err, i) in correctResult.errors"
              :key="i"
              class="p-3 rounded-xl border border-rose-100 bg-rose-50/50"
            >
              <div class="flex items-center gap-2 flex-wrap text-sm">
                <span class="text-rose-500 font-semibold text-xs">#{{ i + 1 }}</span>
                <span class="text-cocoa-800 line-through">{{ err.original }}</span>
                <span class="text-cocoa-400 text-xs">→</span>
                <span class="text-emerald-600 font-medium">{{ err.corrected }}</span>
              </div>
              <p v-if="err.reason" class="text-xs text-cocoa-500 mt-1.5 leading-relaxed">{{ err.reason }}</p>
            </div>
          </div>
        </section>

        <!-- 修改建议 -->
        <section v-if="correctResult.suggestions.length" class="card-flat p-5">
          <h3 class="text-base font-medium text-cocoa-900 mb-3 flex items-center gap-1.5">
            <Sparkles :size="16" class="text-rose-500" /> 修改建议（{{ correctResult.suggestions.length }} 条）
          </h3>
          <ul class="space-y-2">
            <li
              v-for="(s, i) in correctResult.suggestions"
              :key="i"
              class="text-sm text-cocoa-700 leading-relaxed flex items-start gap-2"
            >
              <span class="shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-600 text-xs flex items-center justify-center font-semibold mt-0.5">{{ i + 1 }}</span>
              <span>{{ s }}</span>
            </li>
          </ul>
        </section>
      </template>

      <!-- 空状态 -->
      <section v-else class="card-flat p-10 text-center">
        <div class="text-5xl mb-3">🧧</div>
        <p class="text-cocoa-700 text-sm">粘贴学生作文，选择批改维度，点击"AI 批改"开始</p>
        <p class="text-cocoa-400 text-xs mt-1">AI 将给出得分、错字、修改建议与总评</p>
      </section>
    </template>

    <div class="text-center text-xs text-cocoa-400 py-2">
      💡 提示：生成的范文可下载为 Markdown 文件；批改结果可直接用于讲评与反馈
    </div>
  </div>
</template>
