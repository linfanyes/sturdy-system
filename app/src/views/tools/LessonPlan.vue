<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAIStore } from '../../stores/ai'
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
  Copy,
  Download,
  Printer,
  History,
  Trash2,
  Eye,
  Square,
  FileSpreadsheet,
  Check,
  Layers,
} from 'lucide-vue-next'

const ai = useAIStore()
const genStore = useGeneratedStore()
const toast = useToastStore()

const subjectOptions = [
  '语文', '数学', '英语', '科学', '道德与法治', '音乐', '美术', '体育',
  '信息技术', '历史', '地理', '生物', '物理', '化学',
]
const gradeOptions = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三']

const subject = ref('语文')
const grade = ref('三年级')
const topic = ref('')
const periods = ref(1)
const requirements = ref('')

const step = ref<'config' | 'candidates' | 'merged'>('config')
const generating = ref(false)
const phase = ref<'candidates' | 'merge' | null>(null)
const candidates = ref<{ id: string; title: string; content: string }[]>([])
const selectedIds = ref<string[]>([])
const merged = ref('')
const currentTitle = ref('')
const currentMeta = ref<string>('')
const abort = ref<AbortController | null>(null)

const candidatesHtml = computed(() =>
  candidates.value.map((c) => ({ ...c, html: renderMarkdownToHtml(c.content) })),
)
const mergedHtml = computed(() => (merged.value ? renderMarkdownToHtml(merged.value) : ''))

function parseCandidates(text: string) {
  const re = /^###\s*方案\s*(\d+)[：:]\s*(.*)$/gm
  const matches: { idx: number; title: string; start: number; len: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    matches.push({ idx: +m[1], title: m[2].trim(), start: m.index, len: m[0].length })
  }
  if (matches.length === 0) return null
  const res: { id: string; title: string; content: string }[] = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].start + matches[i].len
    const end = i + 1 < matches.length ? matches[i + 1].start : text.length
    const content = text.slice(start, end).trim()
    res.push({ id: 'c' + matches[i].idx, title: matches[i].title || '方案' + matches[i].idx, content })
  }
  return res
}

async function genCandidates() {
  if (generating.value) return
  if (!ai.settings.apiKey) {
    toast.error('请先在「AI 对话」右上角设置中配置 API Key')
    return
  }
  if (!topic.value.trim()) {
    toast.warning('请填写教案主题 / 课题')
    return
  }
  generating.value = true
  phase.value = 'candidates'
  candidates.value = []
  selectedIds.value = []
  merged.value = ''
  step.value = 'candidates'
  abort.value = new AbortController()
  const sys =
    '你是一位经验丰富的教研员，擅长撰写中小学教案。请针对同一课题，提供多个角度、风格各异的教案方案，便于教师比较与整合。'
  const usr =
    `请为「${grade.value} ${subject.value}」的课题《${topic.value.trim()}》设计 3 篇角度不同的教案方案（例如：情境体验式、探究式、项目式等），每篇都要结构完整。\n` +
    `课时：${periods.value} 课时\n` +
    `特殊要求：${requirements.value.trim() || '（无）'}\n\n` +
    `请严格按以下格式输出（Markdown），每篇用「### 方案N：标题」分隔：\n` +
    `### 方案1：<标题>\n<教案内容：含教学目标/重难点/过程/板书等>\n\n` +
    `### 方案2：<标题>\n...\n\n### 方案3：<标题>\n...`
  try {
    let buf = ''
    await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.8,
      stream: true,
      signal: abort.value.signal,
      onDelta: (t) => {
        buf += t
      },
    })
    const parsed = parseCandidates(buf)
    if (!parsed || parsed.length === 0) {
      candidates.value = [{ id: 'c1', title: '候选教案', content: buf }]
      toast.warning('未能按预期拆分多方案，已作为单篇展示，可直接整合')
    } else {
      candidates.value = parsed
    }
    selectedIds.value = candidates.value.map((c) => c.id)
    toast.success(`已生成 ${candidates.value.length} 篇候选教案，请勾选要整合的方案`)
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已停止生成')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
    phase.value = null
    abort.value = null
  }
}

async function mergeSelected() {
  if (generating.value) return
  const picks = candidates.value.filter((c) => selectedIds.value.includes(c.id))
  if (picks.length === 0) {
    toast.warning('请至少选择一篇教案')
    return
  }
  generating.value = true
  phase.value = 'merge'
  merged.value = ''
  step.value = 'merged'
  abort.value = new AbortController()
  const sys =
    '你是一位经验丰富的教研员，擅长把多篇教案整合为一篇结构完整、逻辑连贯、可直接用于课堂的优质教案。'
  const parts = picks
    .map((c, i) => `【候选方案 ${i + 1}：${c.title}】\n${c.content}`)
    .join('\n\n---\n\n')
  const usr =
    `以下是关于「${grade.value} ${subject.value}」课题《${topic.value.trim()}》的 ${picks.length} 篇候选教案（角度不同）。\n` +
    `请将其整合为一篇结构完整、逻辑连贯、可直接用于课堂的新教案。保留各方案亮点，去除重复，统一为一份。\n` +
    `使用 Markdown，包含：一、教学目标；二、教学重难点；三、教学准备；四、教学过程（含导入/新授/活动/小结/作业）；五、板书设计。\n\n` +
    parts
  try {
    await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.7,
      stream: true,
      signal: abort.value.signal,
      onDelta: (t) => {
        merged.value += t
      },
    })
    currentTitle.value = `${topic.value.trim()} 教案`
    currentMeta.value = `学科:${subject.value} 年级:${grade.value} 课时:${periods.value} 整合自:${picks.length}篇`
    genStore.addLessonPlan({
      title: currentTitle.value,
      topic: topic.value.trim(),
      subject: subject.value,
      grade: grade.value,
      prompt: currentMeta.value,
      content: merged.value,
    })
    toast.success('已整合为新教案并保存到本地历史')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已停止生成')
    else toast.error('整合失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
    phase.value = null
    abort.value = null
  }
}

function stop() {
  abort.value?.abort()
}
function togglePick(id: string) {
  if (selectedIds.value.includes(id))
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  else selectedIds.value.push(id)
}

// 导出
const exportName = computed(() => (currentTitle.value || '教案').replace(/[\\/:*?"<>|]/g, '_'))
async function doCopy() {
  if (!merged.value) return
  ;(await copyText(merged.value)) ? toast.success('已复制全文') : toast.error('复制失败')
}
async function doDocx() {
  if (!merged.value) return
  try {
    await downloadDocx(exportName.value + '.docx', currentTitle.value, merged.value)
    toast.success('Word 文件已下载')
  } catch (e: any) {
    toast.error('导出 Word 失败：' + (e?.message || ''))
  }
}
function doPrint() {
  if (!merged.value) return
  printHtml(currentTitle.value || '教案', renderMarkdownToHtml(merged.value))
}
function doMd() {
  if (!merged.value) return
  downloadMarkdown(exportName.value + '.md', merged.value)
  toast.success('Markdown 已下载')
}

function loadHistory(id: string) {
  const p = genStore.getLessonPlan(id)
  if (!p) return
  merged.value = p.content
  currentTitle.value = p.title
  currentMeta.value = p.prompt
  step.value = 'merged'
  toast.info('已载入历史教案到预览区')
}
function removeHistory(id: string) {
  genStore.removeLessonPlan(id)
  toast.info('已删除历史记录')
}
function backToConfig() {
  step.value = 'config'
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <section class="card-soft p-5 bg-gradient-to-br from-mint-100 via-sky2-100 to-cream-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-mint-300 to-sky2-300 flex items-center justify-center text-2xl shadow-softer">
          📚
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">
            优质教案
          </h2>
          <p class="text-sm text-cocoa-600 mt-1">
            给出课题与要求，AI 先生成多篇不同角度的候选教案，你勾选满意的几篇，再由 AI 整合成一篇完整新教案。支持下载 Markdown / Word，或打印。
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
      <!-- 左 -->
      <div class="lg:col-span-1 space-y-4">
        <!-- 配置 -->
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-3">
            教案要求
          </h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
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
            </div>
            <div>
              <label class="text-xs text-cocoa-500 ml-1">课题 / 主题</label>
              <input
                v-model="topic"
                class="input-soft mt-1"
                placeholder="如：春 / 认识分数 / 光合作用"
              >
            </div>
            <div>
              <label class="text-xs text-cocoa-500 ml-1">课时</label>
              <select
                v-model.number="periods"
                class="input-soft mt-1"
              >
                <option :value="1">
                  1 课时
                </option>
                <option :value="2">
                  2 课时
                </option>
                <option :value="3">
                  3 课时
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs text-cocoa-500 ml-1">特殊要求</label>
              <textarea
                v-model="requirements"
                class="input-soft mt-1 min-h-[60px]"
                placeholder="如：结合生活实例、注重小组合作、使用多媒体课件"
              />
            </div>
            <button
              v-if="step === 'config' && !generating"
              class="btn-primary w-full flex items-center justify-center gap-2 !py-2.5"
              @click="genCandidates"
            >
              <Sparkles :size="16" /> ① 生成候选教案
            </button>
            <button
              v-else-if="generating && phase === 'candidates'"
              class="btn-secondary w-full flex items-center justify-center gap-2 !py-2.5"
              @click="stop"
            >
              <Square :size="16" /> 停止生成
            </button>
            <button
              v-if="step !== 'config'"
              class="btn-ghost w-full !py-2 text-xs"
              @click="backToConfig"
            >
              ← 修改要求
            </button>
          </div>
        </div>

        <!-- 历史 -->
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-3 flex items-center gap-2">
            <History :size="16" /> 历史教案 ({{ genStore.lessonPlans.length }})
          </h3>
          <div
            v-if="!genStore.lessonPlans.length"
            class="text-sm text-cocoa-400 text-center py-4"
          >
            还没有生成记录
          </div>
          <div
            v-else
            class="space-y-2 max-h-[320px] overflow-y-auto"
          >
            <div
              v-for="p in genStore.lessonPlans"
              :key="p.id"
              class="card-flat !rounded-xl p-3 flex items-center gap-2"
            >
              <div
                class="min-w-0 flex-1 cursor-pointer"
                @click="loadHistory(p.id)"
              >
                <div class="text-sm font-medium text-cocoa-900 truncate flex items-center gap-1">
                  <FileSpreadsheet
                    :size="12"
                    class="shrink-0 text-mint-600"
                  /> {{ p.title }}
                </div>
                <div class="text-[10px] text-cocoa-400 truncate">
                  {{ p.subject }} · {{ p.grade }} · {{ new Date(p.createdAt).toLocaleString('zh-CN').slice(0, 16) }}
                </div>
              </div>
              <button
                class="p-1.5 rounded-full hover:bg-butter-100"
                title="下载 Word"
                @click="loadHistory(p.id); doDocx()"
              >
                <Download
                  :size="13"
                  class="text-cocoa-500"
                />
              </button>
              <button
                class="p-1.5 rounded-full hover:bg-sakura-100"
                title="删除"
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

      <!-- 右 -->
      <div class="lg:col-span-2 space-y-4">
        <!-- 候选 -->
        <div
          v-if="step === 'candidates' || (step === 'merged' && candidates.length)"
          class="card-soft p-5"
        >
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 class="title-display text-lg flex items-center gap-2">
              <Layers :size="16" /> 候选教案（勾选要整合的）
            </h3>
            <button
              v-if="step === 'candidates' && !generating"
              class="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1"
              @click="mergeSelected"
            >
              <Sparkles :size="12" /> ② 整合为新教案
            </button>
            <button
              v-else-if="generating && phase === 'merge'"
              class="btn-secondary !py-1.5 !px-3 text-xs"
              @click="stop"
            >
              <Square :size="12" /> 停止
            </button>
          </div>
          <div
            v-if="!candidates.length && generating && phase==='candidates'"
            class="text-sm text-cocoa-400 py-6 text-center"
          >
            正在生成候选教案…<span class="inline-block w-2 h-4 bg-butter-500 ml-0.5 align-middle animate-pulse" />
          </div>
          <div
            v-else
            class="space-y-3 max-h-[60vh] overflow-y-auto"
          >
            <div
              v-for="c in candidatesHtml"
              :key="c.id"
              class="card-flat !rounded-xl p-3 border-2 transition"
              :class="selectedIds.includes(c.id) ? 'border-butter-400 bg-butter-50/40' : 'border-transparent'"
            >
              <div class="flex items-center justify-between mb-1.5">
                <label class="flex items-center gap-2 cursor-pointer">
                  <span
                    class="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs"
                    :class="selectedIds.includes(c.id) ? 'bg-butter-500' : 'bg-cocoa-100'"
                    @click="togglePick(c.id)"
                  >
                    <Check
                      v-if="selectedIds.includes(c.id)"
                      :size="13"
                    />
                  </span>
                  <span class="font-medium text-cocoa-900">{{ c.title }}</span>
                </label>
              </div>
              <div
                class="prose-doc text-xs leading-relaxed max-h-48 overflow-y-auto pl-1"
                v-html="c.html"
              />
            </div>
          </div>
        </div>

        <!-- 整合结果 -->
        <div class="card-soft p-5">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 class="title-display text-lg flex items-center gap-2">
              <Eye :size="16" /> 整合后的教案
              <span
                v-if="currentTitle"
                class="text-xs text-cocoa-400 font-normal"
              >· {{ currentTitle }}</span>
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <button
                class="btn-secondary !py-1.5 !px-3 text-xs"
                :disabled="!merged"
                @click="doMd"
              >
                <FileSpreadsheet :size="12" /> MD
              </button>
              <button
                class="btn-secondary !py-1.5 !px-3 text-xs"
                :disabled="!merged"
                @click="doDocx"
              >
                <Download :size="12" /> Word
              </button>
              <button
                class="btn-secondary !py-1.5 !px-3 text-xs"
                :disabled="!merged"
                @click="doCopy"
              >
                <Copy :size="12" /> 复制
              </button>
              <button
                class="btn-primary !py-1.5 !px-3 text-xs"
                :disabled="!merged"
                @click="doPrint"
              >
                <Printer :size="12" /> 打印
              </button>
            </div>
          </div>
          <div
            v-if="generating && phase==='merge'"
            class="min-h-[300px] prose-doc p-4 rounded-2xl bg-cream-50 text-sm leading-relaxed whitespace-pre-wrap break-words"
          >
            {{ merged }}<span class="inline-block w-2 h-4 bg-butter-500 ml-0.5 align-middle animate-pulse" />
          </div>
          <div
            v-else-if="merged"
            class="min-h-[300px] prose-doc p-4 rounded-2xl bg-cream-50 text-sm leading-relaxed overflow-y-auto max-h-[70vh]"
            v-html="mergedHtml"
          />
          <div
            v-else
            class="min-h-[300px] flex flex-col items-center justify-center text-cocoa-400"
          >
            <Layers
              :size="40"
              class="mb-2 opacity-40"
            />
            <p class="text-sm">
              先生成候选教案，勾选后点击「整合为新教案」
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
