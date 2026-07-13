<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAIStore } from '../../stores/ai'
import { useClassStore } from '../../stores/class'
import { useGeneratedStore } from '../../stores/generated'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import {
  downloadMarkdown,
  downloadDocx,
  copyText,
  renderMarkdownToHtml,
  printHtml,
} from '../../utils/download'
import {
  Sparkles,
  FileText,
  Copy,
  Download,
  Printer,
  History,
  Trash2,
  Eye,
  Square,
  FileSpreadsheet,
} from 'lucide-vue-next'

const ai = useAIStore()
const classStore = useClassStore()
const genStore = useGeneratedStore()
const toast = useToastStore()

// ============ 表单 ============
const gradeOptions = computed(() => {
  const set = new Set<string>(classStore.classes.map((c) => c.grade).filter(Boolean))
  ;['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三'].forEach(
    (g) => set.add(g),
  )
  return [...set]
})
const subjectOptions = [
  '语文', '数学', '英语', '科学', '道德与法治', '音乐', '美术', '体育',
  '信息技术', '历史', '地理', '生物', '物理', '化学',
]
const typeOptions = [
  '选择题', '填空题', '判断题', '简答题', '计算题', '应用题', '阅读理解', '作文/表达题',
]
const difficultyOptions = ['简单', '中等', '较难', '拔尖']

const grade = ref(gradeOptions.value[0] || '三年级')
const subject = ref('语文')
const title = ref('')
const selectedTypes = ref<string[]>(['选择题', '填空题', '简答题'])
const difficulty = ref('中等')
const questionCount = ref(15)
const duration = ref(40)
const requirements = ref('')
const withAnswer = ref(true)
const withRubric = ref(true)

function toggleType(t: string) {
  if (selectedTypes.value.includes(t))
    selectedTypes.value = selectedTypes.value.filter((x) => x !== t)
  else selectedTypes.value.push(t)
}

// ============ 生成 ============
const generating = ref(false)
const result = ref('')
const currentTitle = ref('')
const currentMeta = ref<{ grade: string; subject: string; prompt: string } | null>(null)
const abort = ref<AbortController | null>(null)

const previewHtml = computed(() => (result.value ? renderMarkdownToHtml(result.value) : ''))

function buildPrompt() {
  const t = title.value.trim() || `${grade.value}${subject.value}试卷`
  const types = selectedTypes.value.length ? selectedTypes.value.join('、') : '不限'
  const req = requirements.value.trim() || '（无特殊要求）'
  const sections: string[] = []
  sections.push(
    `请为「${grade.value} ${subject.value}」出一套完整试卷，要求如下：`,
  )
  sections.push(`- 试卷标题：${t}`)
  sections.push(`- 适用年级：${grade.value}`)
  sections.push(`- 学科：${subject.value}`)
  sections.push(`- 题型：${types}`)
  sections.push(`- 题量：约 ${questionCount.value} 题`)
  sections.push(`- 难度：${difficulty.value}`)
  sections.push(`- 建议时长：${duration.value} 分钟`)
  sections.push(`- 知识点 / 特殊要求：${req}`)
  sections.push('')
  sections.push('请严格使用 Markdown 输出，结构如下：')
  sections.push('# ' + t)
  sections.push('> 适用：' + grade.value + ' · ' + subject.value + ' · 建议时长 ' + duration.value + ' 分钟 · 难度 ' + difficulty.value)
  sections.push('')
  sections.push('## 一、选择题（每题给出 4 个选项 A-D，并标注分值）')
  sections.push('1. 题目内容')
  sections.push('   A. ...  B. ...  C. ...  D. ...')
  sections.push('')
  sections.push('## 二、填空题')
  sections.push('')
  sections.push('## 三、简答题 / 应用题')
  sections.push('')
  if (withAnswer.value) {
    sections.push('## 参考答案与解析')
    sections.push('（逐题给出答案，并对重点/易错题给出简要解析）')
    sections.push('')
  }
  if (withRubric.value) {
    sections.push('## 评分标准')
    sections.push('（列出各题型分值、给分要点与扣分说明）')
  }
  const prompt = sections.join('\n')
  const summary = `年级:${grade.value} 学科:${subject.value} 题型:${types} 题量:${questionCount.value} 难度:${difficulty.value} 时长:${duration.value}分 含答案:${withAnswer.value ? '是' : '否'} 含评分:${withRubric.value ? '是' : '否'}`
  return { title: t, prompt, summary }
}

async function generate() {
  if (generating.value) return
  if (!ai.settings.apiKey) {
    toast.error('请先在「AI 对话」右上角设置中配置 API Key')
    return
  }
  if (!selectedTypes.value.length) {
    toast.warning('请至少选择一种题型')
    return
  }
  const spec = buildPrompt()
  generating.value = true
  result.value = ''
  currentTitle.value = spec.title
  currentMeta.value = { grade: grade.value, subject: subject.value, prompt: spec.summary }
  abort.value = new AbortController()
  const sys =
    '你是一位经验丰富的学科命题专家教师，擅长根据教学要求出高质量的试卷。请严格按照用户给出的年级、学科、题型、难度与题量生成试卷，题目要符合该学段学生认知水平，表述准确、无歧义，并使用清晰的 Markdown 结构。'
  try {
    await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: spec.prompt },
      ],
      temperature: 0.7,
      stream: true,
      signal: abort.value.signal,
      onDelta: (t) => {
        result.value += t
      },
    })
    genStore.addPaper({
      title: spec.title,
      grade: grade.value,
      subject: subject.value,
      prompt: spec.summary,
      content: result.value,
    })
    toast.success('试卷已生成并保存到本地历史')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') {
      toast.error(e.message)
    } else if (e?.name === 'AbortError') {
      toast.info('已停止生成')
    } else {
      toast.error('生成失败：' + (e?.message || '未知错误'))
    }
  } finally {
    generating.value = false
    abort.value = null
  }
}

function stop() {
  abort.value?.abort()
}

// ============ 导出 ============
const exportName = computed(
  () => (currentTitle.value || '试卷').replace(/[\\/:*?"<>|]/g, '_'),
)
async function doCopy() {
  if (!result.value) return
  const ok = await copyText(result.value)
  ok ? toast.success('已复制全文') : toast.error('复制失败')
}
async function doDocx() {
  if (!result.value) return
  try {
    await downloadDocx(exportName.value + '.docx', currentTitle.value, result.value)
    toast.success('Word 文件已下载')
  } catch (e: any) {
    toast.error('导出 Word 失败：' + (e?.message || ''))
  }
}
function doPrint() {
  if (!result.value) return
  printHtml(currentTitle.value || '试卷', renderMarkdownToHtml(result.value))
}
function doMd() {
  if (!result.value) return
  downloadMarkdown(exportName.value + '.md', result.value)
  toast.success('Markdown 已下载')
}

// ============ 历史 ============
function loadHistory(id: string) {
  const p = genStore.getPaper(id)
  if (!p) return
  result.value = p.content
  currentTitle.value = p.title
  currentMeta.value = { grade: p.grade, subject: p.subject, prompt: p.prompt }
  toast.info('已载入历史试卷到预览区')
}
function removeHistory(id: string) {
  genStore.removePaper(id)
  toast.info('已删除历史记录')
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <!-- 顶部说明 -->
    <section class="card-soft p-5 bg-gradient-to-br from-sakura-100 via-cream-50 to-butter-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sakura-300 to-butter-300 flex items-center justify-center text-2xl shadow-softer">
          📝
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">
            优选试卷
          </h2>
          <p class="text-sm text-cocoa-600 mt-1">
            告诉我年级、学科、题型与难度，AI 帮你出一套结构完整、带答案与评分标准的试卷。支持下载 Markdown / Word，或打印。
          </p>
        </div>
        <div
          v-if="!ai.settings.apiKey"
          class="flex items-center gap-1.5 text-xs text-sakura-500"
        >
          <Sparkles :size="14" /> 请先在「AI 对话」配置 API Key
        </div>
      </div>
    </section>

    <div class="grid lg:grid-cols-3 gap-4">
      <!-- 左: 配置 + 历史 -->
      <div class="lg:col-span-1 space-y-4">
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-3">
            出卷要求
          </h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-cocoa-500 ml-1">年级</label>
                <select
                  v-model="grade"
                  class="input-soft mt-1"
                >
                  <option
                    v-for="g in gradeOptions"
                    :key="g"
                    :value="g"
                  >
                    {{ g }}
                  </option>
                </select>
              </div>
              <div>
                <label class="text-xs text-cocoa-500 ml-1">学科</label>
                <select
                  v-model="subject"
                  class="input-soft mt-1"
                >
                  <option
                    v-for="s in subjectOptions"
                    :key="s"
                    :value="s"
                  >
                    {{ s }}
                  </option>
                </select>
              </div>
            </div>
            <div>
              <label class="text-xs text-cocoa-500 ml-1">试卷标题（可选，留空自动拟定）</label>
              <input
                v-model="title"
                class="input-soft mt-1"
                placeholder="如：三年级语文第一单元测试"
              >
            </div>
            <div>
              <label class="text-xs text-cocoa-500 ml-1">题型（可多选）</label>
              <div class="flex flex-wrap gap-1.5 mt-1.5">
                <button
                  v-for="t in typeOptions"
                  :key="t"
                  class="chip border transition"
                  :class="
                    selectedTypes.includes(t)
                      ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                      : 'bg-white/70 border-white-80 text-cocoa-700 hover:bg-butter-100'
                  "
                  @click="toggleType(t)"
                >
                  {{ t }}
                </button>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-cocoa-500 ml-1">题量</label>
                <input
                  v-model.number="questionCount"
                  type="number"
                  min="1"
                  max="60"
                  class="input-soft mt-1"
                >
              </div>
              <div>
                <label class="text-xs text-cocoa-500 ml-1">难度</label>
                <select
                  v-model="difficulty"
                  class="input-soft mt-1"
                >
                  <option
                    v-for="d in difficultyOptions"
                    :key="d"
                    :value="d"
                  >
                    {{ d }}
                  </option>
                </select>
              </div>
              <div>
                <label class="text-xs text-cocoa-500 ml-1">时长(分)</label>
                <input
                  v-model.number="duration"
                  type="number"
                  min="1"
                  max="180"
                  class="input-soft mt-1"
                >
              </div>
            </div>
            <div>
              <label class="text-xs text-cocoa-500 ml-1">知识点 / 特殊要求</label>
              <textarea
                v-model="requirements"
                class="input-soft mt-1 min-h-[70px]"
                placeholder="如：重点考查分数加减法、应用题结合实际生活；或指定某个单元"
              />
            </div>
            <div class="flex gap-4">
              <label class="flex items-center gap-1.5 text-sm text-cocoa-700 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="withAnswer"
                  class="rounded accent-butter-500"
                >
                含答案与解析
              </label>
              <label class="flex items-center gap-1.5 text-sm text-cocoa-700 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="withRubric"
                  class="rounded accent-butter-500"
                >
                含评分标准
              </label>
            </div>
            <button
              v-if="!generating"
              class="btn-primary w-full flex items-center justify-center gap-2 !py-2.5"
              @click="generate"
            >
              <Sparkles :size="16" /> 生成试卷
            </button>
            <button
              v-else
              class="btn-secondary w-full flex items-center justify-center gap-2 !py-2.5"
              @click="stop"
            >
              <Square :size="16" /> 停止生成
            </button>
          </div>
        </div>

        <!-- 历史 -->
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-3 flex items-center gap-2">
            <History :size="16" /> 历史试卷 ({{ genStore.papers.length }})
          </h3>
          <div
            v-if="!genStore.papers.length"
            class="text-sm text-cocoa-400 text-center py-4"
          >
            还没有生成记录
          </div>
          <div
            v-else
            class="space-y-2 max-h-[360px] overflow-y-auto"
          >
            <div
              v-for="p in genStore.papers"
              :key="p.id"
              class="card-flat !rounded-xl p-3 flex items-center gap-2"
            >
              <div
                class="min-w-0 flex-1 cursor-pointer"
                @click="loadHistory(p.id)"
              >
                <div class="text-sm font-medium text-cocoa-900 truncate flex items-center gap-1">
                  <FileText
                    :size="12"
                    class="shrink-0 text-butter-600"
                  /> {{ p.title }}
                </div>
                <div class="text-[10px] text-cocoa-400 truncate">
                  {{ p.grade }} · {{ p.subject }} · {{ new Date(p.createdAt).toLocaleString('zh-CN').slice(0, 16) }}
                </div>
              </div>
              <button
                class="p-1.5 rounded-full hover:bg-butter-100"
                :title="'下载 Word'"
                @click="loadHistory(p.id); doDocx()"
              >
                <Download
                  :size="13"
                  class="text-cocoa-500"
                />
              </button>
              <button
                class="p-1.5 rounded-full hover:bg-sakura-100"
                :title="'删除'"
                @click="removeHistory(p.id)"
              >
                <Trash2
                  :size="13"
                  class="text-cocoa-500"
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右: 预览 + 导出 -->
      <div class="lg:col-span-2 space-y-4">
        <div class="card-soft p-5">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 class="title-display text-lg flex items-center gap-2">
              <Eye :size="16" /> 试卷预览
              <span
                v-if="currentTitle"
                class="text-xs text-cocoa-400 font-normal"
              >· {{ currentTitle }}</span>
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <button
                class="btn-secondary !py-1.5 !px-3 text-xs"
                :disabled="!result"
                @click="doMd"
              >
                <FileText :size="12" /> MD
              </button>
              <button
                class="btn-secondary !py-1.5 !px-3 text-xs"
                :disabled="!result"
                @click="doDocx"
              >
                <FileSpreadsheet :size="12" /> Word
              </button>
              <button
                class="btn-secondary !py-1.5 !px-3 text-xs"
                :disabled="!result"
                @click="doCopy"
              >
                <Copy :size="12" /> 复制
              </button>
              <button
                class="btn-primary !py-1.5 !px-3 text-xs"
                :disabled="!result"
                @click="doPrint"
              >
                <Printer :size="12" /> 打印
              </button>
            </div>
          </div>

          <div
            v-if="generating"
            class="min-h-[300px] prose-doc p-4 rounded-2xl bg-cream-50 text-sm leading-relaxed whitespace-pre-wrap break-words"
          >
            {{ result }}<span class="inline-block w-2 h-4 bg-butter-500 ml-0.5 align-middle animate-pulse" />
          </div>
          <div
            v-else-if="result"
            class="min-h-[300px] prose-doc p-4 rounded-2xl bg-cream-50 text-sm leading-relaxed overflow-y-auto max-h-[70vh]"
            v-html="previewHtml"
          />
          <div
            v-else
            class="min-h-[300px] flex flex-col items-center justify-center text-cocoa-400"
          >
            <FileText
              :size="40"
              class="mb-2 opacity-40"
            />
            <p class="text-sm">
              填写左侧要求，点击「生成试卷」
            </p>
            <p class="text-xs mt-1">
              生成后可下载 Markdown / Word，或打印
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
