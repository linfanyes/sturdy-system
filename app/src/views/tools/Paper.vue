<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAIStore } from '../../stores/ai'
import { useAdminStore } from '../../stores/admin'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import Modal from '../../components/common/Modal.vue'
import MarkdownView from '../../components/common/MarkdownView.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'
import {
  downloadMarkdown,
  downloadDocx,
  renderMarkdownToHtml,
  printHtml,
} from '../../utils/download'
import {
  Sparkles,
  Search,
  Download,
  Printer,
  Copy,
  FileText,
  Check,
  BookOpen,
  ExternalLink,
  Square,
  Layers,
  GraduationCap,
} from 'lucide-vue-next'

const ai = useAIStore()
const adminStore = useAdminStore()
const toast = useToastStore()

// ============ 搜索 ============
const keywords = ref('')
const searching = ref(false)
const papers = ref<{ id: string; title: string; authors: string; abstract: string; journal: string; year: number; keywords: string }[]>([])
const selectedIds = ref<string[]>([])
const abortSearch = ref<AbortController | null>(null)

// ============ 写作 ============
const writeRequirements = ref('')
const linkedTemplateId = ref('')
const generating = ref(false)
const generatedPaper = ref('')
const generatedTitle = ref('')
const abortWrite = ref<AbortController | null>(null)

// ============ 计算 ============
const generatedHtml = computed(() => renderMarkdownToHtml(generatedPaper.value || ''))
const planTemplates = computed(() => adminStore.planTemplates)
const linkedTemplate = computed(() => planTemplates.value.find(t => t.id === linkedTemplateId.value) || null)

// ============ 搜索论文 ============
function parsePapers(text: string) {
  const results: typeof papers.value = []
  // 尝试匹配: ### 1. 标题 或 ### 论文1：标题
  const re = /^###\s*(?:论文\s*)?(\d+)[.、:：]\s*(.+)$/gm
  const matches: { idx: number; title: string; start: number; len: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    matches.push({ idx: +m[1], title: m[2].trim(), start: m.index, len: m[0].length })
  }
  if (matches.length === 0) return null
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].start + matches[i].len
    const end = i + 1 < matches.length ? matches[i + 1].start : text.length
    const block = text.slice(start, end).trim()
    const getField = (label: string) => {
      const r = new RegExp(`${label}[：:]\\s*(.+?)(?=\\n(?:作者|摘要|期刊|年份|关键词|\\*\\*)|$)`, 'i')
      const hit = r.exec(block)
      return hit ? hit[1].trim() : ''
    }
    results.push({
      id: 'p' + matches[i].idx,
      title: matches[i].title,
      authors: getField('作者'),
      abstract: getField('摘要'),
      journal: getField('期刊'),
      year: parseInt(getField('年份')) || new Date().getFullYear(),
      keywords: getField('关键词'),
    })
  }
  return results.length ? results : null
}

async function searchPapers() {
  if (searching.value) return
  if (!ai.settings.apiKey) { toast.error('请先在「AI 对话」右上角设置中配置 API Key'); return }
  if (!keywords.value.trim()) { toast.warning('请输入搜索关键词'); return }
  searching.value = true
  papers.value = []
  selectedIds.value = []
  generatedPaper.value = ''
  generatedTitle.value = ''
  abortSearch.value = new AbortController()

  const sys = '你是一位教育学术研究专家，熟悉中国基础教育领域的学术论文。请根据用户提供的关键词，推荐5篇高质量的相关论文参考。每篇论文信息要真实可信、具有学术参考价值。'
  const usr = `请根据关键词「${keywords.value.trim()}」推荐 5 篇优质教育论文参考。\n\n请严格按以下格式输出（Markdown），每篇用「### 序号. 标题」分隔：\n### 1. <论文标题>\n**作者：** xxx\n**期刊：** xxx\n**年份：** xxxx\n**关键词：** xxx, xxx\n**摘要：** 200字左右的摘要内容\n\n### 2. <论文标题>\n...\n\n### 5. <论文标题>\n...`

  try {
    let buf = ''
    await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.7,
      stream: true,
      signal: abortSearch.value.signal,
      onDelta: (t) => { buf += t },
    })
    const parsed = parsePapers(buf)
    if (!parsed || parsed.length === 0) {
      toast.warning('未能按预期解析论文列表，请重试')
    } else {
      papers.value = parsed
      selectedIds.value = parsed.map(p => p.id)
      toast.success(`已找到 ${parsed.length} 篇参考论文`)
    }
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已停止搜索')
    else toast.error('搜索失败：' + (e?.message || '未知错误'))
  } finally {
    searching.value = false
    abortSearch.value = null
  }
}

function toggleSelect(id: string) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function selectAll() {
  selectedIds.value = papers.value.map(p => p.id)
}

function scholarLink() {
  const q = encodeURIComponent(keywords.value.trim())
  window.open(`https://scholar.google.com/scholar?q=${q}`, '_blank')
}

function cnkiLink() {
  const q = encodeURIComponent(keywords.value.trim())
  window.open(`https://kns.cnki.net/kns8s/defaultresult/index?kw=${q}`, '_blank')
}

// ============ AI 生成论文 ============
async function generatePaper() {
  if (generating.value) return
  const picks = papers.value.filter(p => selectedIds.value.includes(p.id))
  if (picks.length === 0) { toast.warning('请至少选择一篇参考论文'); return }
  if (!ai.settings.apiKey) { toast.error('请先配置 API Key'); return }

  generating.value = true
  generatedPaper.value = ''
  abortWrite.value = new AbortController()

  const refsText = picks.map((p, i) =>
    `【参考文献 ${i + 1}】\n标题：${p.title}\n作者：${p.authors}\n期刊：${p.journal} (${p.year})\n摘要：${p.abstract}`
  ).join('\n\n')

  let templateHint = ''
  if (linkedTemplate.value) {
    templateHint = `\n\n【依托教案模板】\n标题：${linkedTemplate.value.title}\n内容摘要：${linkedTemplate.value.content.slice(0, 500)}\n请结合该教案的教学设计和实践内容来撰写论文。`
  }

  const sys = '你是一位资深教育学术研究者和论文写作专家，擅长撰写高质量的教育教学论文。论文要求：学术规范、逻辑严谨、论据充分、语言流畅，符合教育类期刊发表标准。'
  const usr = `请根据以下信息撰写一篇完整的教育教学论文：\n\n研究主题/关键词：${keywords.value.trim()}\n写作要求：${writeRequirements.value.trim() || '无特殊要求，请自由发挥'}\n\n${refsText}\n${templateHint}\n\n请撰写一篇 3000-5000 字的完整论文，使用 Markdown 格式，包含：\n- 标题\n- 摘要（200字左右）\n- 关键词（3-5个）\n- 正文（含引言、多个章节、结论）\n- 参考文献（引用上述文献）`

  try {
    await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.7,
      stream: true,
      signal: abortWrite.value.signal,
      onDelta: (t) => { generatedPaper.value += t },
    })
    // 提取标题
    const titleMatch = /^#\s+(.+)$/m.exec(generatedPaper.value)
    generatedTitle.value = titleMatch ? titleMatch[1].trim() : `${keywords.value.trim()} 研究论文`
    toast.success('论文生成完成')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name === 'AbortError') toast.info('已停止生成')
    else toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
    abortWrite.value = null
  }
}

function stopSearch() { abortSearch.value?.abort() }
function stopWrite() { abortWrite.value?.abort() }

// ============ 导出 ============
async function doCopy() {
  if (!generatedPaper.value) return
  const { copyText } = await import('../../utils/download')
  ;(await copyText(generatedPaper.value)) ? toast.success('已复制全文') : toast.error('复制失败')
}
async function doDocx() {
  if (!generatedPaper.value) return
  try {
    const name = (generatedTitle.value || '论文').replace(/[\\/:*?"<>|]/g, '_')
    await downloadDocx(name + '.docx', generatedTitle.value, generatedPaper.value)
    toast.success('Word 文件已下载')
  } catch (e: any) { toast.error('导出失败：' + (e?.message || '')) }
}
function doMd() {
  if (!generatedPaper.value) return
  const name = (generatedTitle.value || '论文').replace(/[\\/:*?"<>|]/g, '_')
  downloadMarkdown(name + '.md', generatedPaper.value)
  toast.success('Markdown 已下载')
}
function doPrint() {
  if (!generatedPaper.value) return
  printHtml(generatedTitle.value || '论文', generatedHtml.value)
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />
    <AIModelHint :injected="true" />
    <!-- 顶部介绍 -->
    <section class="card-soft p-5 bg-gradient-to-br from-sky2-100 via-cream-50 to-mint-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky2-300 to-mint-300 flex items-center justify-center text-2xl shadow-softer">
          📝
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">教育论文助手</h2>
          <p class="text-sm text-cocoa-600 mt-1">
            根据关键词搜索优质论文参考，结合教案模板，AI 辅助撰写高质量教育教学论文。支持下载 Word / Markdown / 打印。
          </p>
        </div>
        <div v-if="!ai.settings.apiKey" class="flex items-center gap-1.5 text-xs text-sakura-500">
          <Sparkles :size="14" /> 请先在「AI 对话」配置 API Key
        </div>
      </div>
    </section>

    <div class="grid lg:grid-cols-3 gap-4">
      <!-- 左侧：搜索 + 写作设置 -->
      <div class="lg:col-span-1 space-y-4">
        <!-- 搜索 -->
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-3 flex items-center gap-2">
            <Search :size="16" /> 论文搜索
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-cocoa-500 ml-1">研究关键词</label>
              <input v-model="keywords" class="input-soft mt-1" placeholder="如：核心素养、大单元教学、项目式学习" />
            </div>
            <button v-if="!searching" class="btn-primary w-full flex items-center justify-center gap-2 !py-2.5" @click="searchPapers">
              <Search :size="16" /> 搜索参考论文
            </button>
            <button v-else class="btn-secondary w-full flex items-center justify-center gap-2 !py-2.5" @click="stopSearch">
              <Square :size="16" /> 停止搜索
            </button>
            <div class="flex gap-2">
              <button class="btn-ghost flex-1 !py-1.5 text-xs flex items-center justify-center gap-1" @click="scholarLink">
                <ExternalLink :size="12" /> Google Scholar
              </button>
              <button class="btn-ghost flex-1 !py-1.5 text-xs flex items-center justify-center gap-1" @click="cnkiLink">
                <ExternalLink :size="12" /> 知网 CNKI
              </button>
            </div>
          </div>
        </div>

        <!-- 写作设置 -->
        <div class="card-soft p-5">
          <h3 class="title-display text-lg mb-3 flex items-center gap-2">
            <GraduationCap :size="16" /> 论文写作
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-xs text-cocoa-500 ml-1">写作要求</label>
              <textarea v-model="writeRequirements" class="input-soft mt-1 min-h-[60px]" placeholder="如：侧重课堂教学实践、结合新课标要求、3000字以上" />
            </div>
            <div>
              <label class="text-xs text-cocoa-500 ml-1">关联教案模板（可选）</label>
              <select v-model="linkedTemplateId" class="input-soft mt-1">
                <option value="">不关联</option>
                <option v-for="t in planTemplates" :key="t.id" :value="t.id">{{ t.title }}</option>
              </select>
              <p v-if="linkedTemplate" class="text-[10px] text-cocoa-400 mt-1">
                已关联：{{ linkedTemplate.subject }} {{ linkedTemplate.grade }} {{ linkedTemplate.lessonType }}
              </p>
            </div>
            <button v-if="!generating" class="btn-primary w-full flex items-center justify-center gap-2 !py-2.5"
              :disabled="!papers.length" @click="generatePaper">
              <Sparkles :size="16" /> AI 生成论文
            </button>
            <button v-else class="btn-secondary w-full flex items-center justify-center gap-2 !py-2.5" @click="stopWrite">
              <Square :size="16" /> 停止生成
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧：参考论文 + 生成结果 -->
      <div class="lg:col-span-2 space-y-4">
        <!-- 参考论文列表 -->
        <div v-if="papers.length" class="card-soft p-5">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 class="title-display text-lg flex items-center gap-2">
              <BookOpen :size="16" /> 参考论文
              <span class="text-xs text-cocoa-400 font-normal">（勾选要参考的）</span>
            </h3>
            <button class="btn-ghost !py-1 !px-2 text-xs" @click="selectAll">全选</button>
          </div>
          <div class="space-y-3 max-h-[50vh] overflow-y-auto">
            <div v-for="p in papers" :key="p.id"
              class="card-flat !rounded-xl p-3 border-2 transition cursor-pointer"
              :class="selectedIds.includes(p.id) ? 'border-sky2-400 bg-sky2-50/40' : 'border-transparent'"
              @click="toggleSelect(p.id)">
              <div class="flex items-start gap-2">
                <span class="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs mt-0.5 shrink-0"
                  :class="selectedIds.includes(p.id) ? 'bg-sky2-500' : 'bg-cocoa-200'">
                  <Check v-if="selectedIds.includes(p.id)" :size="13" />
                </span>
                <div class="flex-1 min-w-0">
                  <h4 class="font-medium text-cocoa-900 text-sm">{{ p.title }}</h4>
                  <div class="text-[10px] text-cocoa-400 mt-0.5">
                    {{ p.authors }} · {{ p.journal }} · {{ p.year }}
                  </div>
                  <p class="text-xs text-cocoa-600 mt-1 line-clamp-3">{{ p.abstract }}</p>
                  <div v-if="p.keywords" class="flex flex-wrap gap-1 mt-1.5">
                    <span v-for="kw in p.keywords.split(/[,，、]/)" :key="kw"
                      class="chip bg-cream-200 text-cocoa-500 text-[10px]">{{ kw.trim() }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 搜索中占位 -->
        <div v-if="searching && !papers.length" class="card-soft p-8 text-center">
          <div class="text-cocoa-400 text-sm">
            正在搜索参考论文…<span class="inline-block w-2 h-4 bg-sky2-500 ml-0.5 align-middle animate-pulse" />
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!searching && !papers.length && !generatedPaper" class="card-soft p-8 text-center">
          <Layers :size="40" class="mx-auto mb-2 text-cocoa-300 opacity-40" />
          <p class="text-sm text-cocoa-400">输入关键词搜索参考论文，然后 AI 辅助撰写</p>
        </div>

        <!-- 生成结果 -->
        <div class="card-soft p-5">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
            <h3 class="title-display text-lg flex items-center gap-2">
              <FileText :size="16" /> 生成的论文
              <span v-if="generatedTitle" class="text-xs text-cocoa-400 font-normal">· {{ generatedTitle }}</span>
            </h3>
            <div class="flex flex-wrap gap-1.5">
              <button class="btn-secondary !py-1.5 !px-3 text-xs" :disabled="!generatedPaper" @click="doMd">
                <FileText :size="12" /> MD
              </button>
              <button class="btn-secondary !py-1.5 !px-3 text-xs" :disabled="!generatedPaper" @click="doDocx">
                <Download :size="12" /> Word
              </button>
              <button class="btn-secondary !py-1.5 !px-3 text-xs" :disabled="!generatedPaper" @click="doCopy">
                <Copy :size="12" /> 复制
              </button>
              <button class="btn-primary !py-1.5 !px-3 text-xs" :disabled="!generatedPaper" @click="doPrint">
                <Printer :size="12" /> 打印
              </button>
            </div>
          </div>

          <!-- 生成中 -->
          <div v-if="generating"
            class="min-h-[300px] prose-doc p-4 rounded-2xl bg-cream-50 text-sm leading-relaxed whitespace-pre-wrap break-words">
            {{ generatedPaper }}<span class="inline-block w-2 h-4 bg-sky2-500 ml-0.5 align-middle animate-pulse" />
          </div>
          <!-- 生成完成 -->
          <MarkdownView v-else-if="generatedPaper"
            class="min-h-[300px] prose-doc p-4 rounded-2xl bg-cream-50 text-sm leading-relaxed overflow-y-auto max-h-[70vh]"
            :md="generatedPaper" />
          <!-- 空 -->
          <div v-else class="min-h-[200px] flex flex-col items-center justify-center text-cocoa-400">
            <FileText :size="40" class="mb-2 opacity-40" />
            <p class="text-sm">搜索参考论文后，点击「AI 生成论文」开始撰写</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
