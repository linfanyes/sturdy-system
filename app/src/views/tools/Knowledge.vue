<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../../stores/class'
import { useGeneratedStore } from '../../stores/generated'
import { useUserStore, currentTermStr } from '../../stores/user'
import { useToastStore } from '../../stores/toast'
import { aiChat, AIError } from '../../utils/aiCall'
import { downloadDocx, copyText } from '../../utils/download'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import MarkdownView from '../../components/common/MarkdownView.vue'
import AIModelHint from '../../components/common/AIModelHint.vue'
import { Sparkles, Download, Copy, Trash2, RefreshCw, Square, History, FileText } from 'lucide-vue-next'

const classStore = useClassStore()
const genStore = useGeneratedStore()
const userStore = useUserStore()
const toast = useToastStore()

const GRADE_OPTIONS = [
  '一年级', '二年级', '三年级', '四年级', '五年级', '六年级',
  '七年级', '八年级', '九年级', '高一', '高二', '高三',
]
const SUBJECT_OPTIONS = [
  '语文', '数学', '英语', '科学', '物理', '化学', '生物',
  '历史', '地理', '政治', '道德与法治', '信息技术', '音乐', '美术', '体育',
]
const TEXTBOOK_OPTIONS = [
  '人教版', '北师大版', '苏教版', '统编版', '外研社版',
  '冀教版', '沪教版', '浙教版', '华东师大版', '鲁教版',
]

const grade = ref('三年级')
const subject = ref('语文')
const textbook = ref('人教版')
const term = ref(currentTermStr() || '2026春季学期')
const unit = ref('')
const requirements = ref('')

const result = ref('')

const generating = ref(false)
const abort = ref<AbortController | null>(null)

const currentTitle = computed(() => {
  const u = unit.value.trim()
  return `${grade.value}${subject.value}${term.value}·${textbook.value}${u ? '「' + u + '」' : ''}知识点`
})

function buildPrompt(): { title: string; prompt: string } {
  const u = unit.value.trim()
  const title = currentTitle.value
  const sys =
    '你是一位资深的教材编写与教研专家，非常熟悉国内各版本中小学教材的知识体系。' +
    '请严格按照用户给出的年级、学科、教材版本、学期与单元（若有），梳理该部分对应的课本知识点。'
  const usr =
    `请为我梳理以下范围的课本知识点：\n` +
    `- 年级：${grade.value}\n` +
    `- 学科：${subject.value}\n` +
    `- 教材版本：${textbook.value}\n` +
    `- 学期：${term.value}\n` +
    (u ? `- 单元 / 章节：${u}\n` : '- 单元 / 章节：覆盖本学期全部内容\n') +
    (requirements.value.trim() ? `- 特殊要求：${requirements.value.trim()}\n` : '') +
    `\n要求：\n` +
    `1. 以 Markdown 输出，按"章节 / 单元 → 知识点"层级组织；\n` +
    `2. 每个知识点包含：概念释义、常考要点、易错提醒、典型例题（1-2 道，附简要思路）；\n` +
    `3. 聚焦当年该教材版本的要求，贴合所给学期进度；\n` +
    `4. 条理清晰、重点突出，便于教师备课与学生复习。`
  return { title, prompt: sys + '\n\n' + usr }
}

async function generate() {
  if (generating.value) return
  generating.value = true
  result.value = ''
  abort.value = new AbortController()
  const { title, prompt } = buildPrompt()
  const sysEnd = prompt.indexOf('\n\n')
  const sys = prompt.slice(0, sysEnd)
  const usr = prompt.slice(sysEnd + 2)
  try {
    await aiChat({
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: usr },
      ],
      temperature: 0.5,
      stream: true,
      signal: abort.value.signal,
      onDelta: (t) => {
        result.value += t
      },
    })
    genStore.addKnowledge({
      title,
      grade: grade.value,
      subject: subject.value,
      textbook: textbook.value,
      term: term.value,
      prompt,
      content: result.value,
    })
    toast.success('已生成知识点，可再次生成保留多个版本')
  } catch (e: any) {
    if (e instanceof AIError || e?.name === 'AIError') toast.error(e.message)
    else if (e?.name !== 'AbortError') toast.error('生成失败：' + (e?.message || '未知错误'))
  } finally {
    generating.value = false
    abort.value = null
  }
}

function stop() {
  abort.value?.abort()
}

function doDocx() {
  if (!result.value) return
  downloadDocx(currentTitle.value + '.docx', currentTitle.value, result.value)
}

async function doCopy() {
  if (!result.value) return
  await copyText(result.value)
  toast.success('已复制')
}

function loadHistory(id: string) {
  const item = genStore.getKnowledge(id)
  if (!item) return
  grade.value = item.grade
  subject.value = item.subject
  textbook.value = item.textbook
  term.value = item.term
  result.value = item.content
  toast.info('已载入历史版本，可再次生成')
}

function downloadHistory(item: { title: string; content: string }) {
  downloadDocx(item.title + '.docx', item.title, item.content)
}

function removeHistory(id: string) {
  genStore.removeKnowledge(id)
  toast.success('已删除该版本')
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader title="知识点" desc="按年级 / 科目 / 教材版本 / 学期，AI 生成当年课本知识点，支持预览、下载与多版本留存" icon="💡" />
    <AIModelHint :injected="false" />

    <div class="grid lg:grid-cols-3 gap-4">
      <!-- 左侧：参数 -->
      <div class="card-soft p-5 space-y-3 lg:col-span-1">
        <div>
          <label class="text-xs text-cocoa-500">年级</label>
          <select v-model="grade" class="input-soft">
            <option v-for="g in GRADE_OPTIONS" :key="g" :value="g">{{ g }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">学科</label>
          <select v-model="subject" class="input-soft">
            <option v-for="s in SUBJECT_OPTIONS" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">教材版本</label>
          <select v-model="textbook" class="input-soft">
            <option v-for="t in TEXTBOOK_OPTIONS" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">学期</label>
          <input v-model="term" class="input-soft" placeholder="如 2026春季学期" />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">单元 / 章节（可选）</label>
          <input v-model="unit" class="input-soft" placeholder="如 第一单元·分数" />
        </div>
        <div>
          <label class="text-xs text-cocoa-500">特殊要求（可选）</label>
          <textarea v-model="requirements" class="input-soft min-h-[60px]" placeholder="如 侧重易错点、增加典型例题" />
        </div>
        <button v-if="!generating" class="btn-primary w-full" @click="generate">
          <Sparkles :size="14" /> 生成知识点
        </button>
        <button v-else class="btn-secondary w-full" @click="stop">
          <Square :size="14" /> 停止生成
        </button>
      </div>

      <!-- 右侧：预览 + 历史 -->
      <div class="lg:col-span-2 space-y-4">
        <div class="card-soft p-5">
          <div class="flex items-center justify-between mb-3">
            <h3 class="title-display text-lg flex items-center gap-2">
              <FileText :size="16" /> {{ result ? currentTitle : '知识点预览' }}
            </h3>
            <div v-if="result" class="flex items-center gap-2">
              <button class="btn-soft text-xs" @click="doCopy"><Copy :size="12" /> 复制</button>
              <button class="btn-soft text-xs" @click="doDocx"><Download :size="12" /> 下载 doc</button>
            </div>
          </div>
          <MarkdownView
            v-if="result"
            class="prose-doc max-h-[60vh] overflow-y-auto p-4 rounded-2xl bg-cream-50 text-sm leading-relaxed"
            :md="result"
          />
          <div v-else class="text-center text-cocoa-500 py-8">
            <div class="text-4xl mb-3">💡</div>
            设置左侧参数后点击「生成知识点」
          </div>
        </div>

        <!-- 历史版本 -->
        <div class="card-soft p-5" v-if="genStore.knowledges.length">
          <h3 class="title-display text-base mb-3 flex items-center gap-2">
            <History :size="16" /> 历史版本（{{ genStore.knowledges.length }}）
          </h3>
          <div class="space-y-2">
            <div
              v-for="k in genStore.knowledges"
              :key="k.id"
              class="flex items-center gap-2 card-flat p-2.5"
            >
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium truncate">{{ k.title }}</div>
                <div class="text-[10px] text-cocoa-400">
                  {{ k.textbook }} · {{ new Date(k.createdAt).toLocaleString() }}
                </div>
              </div>
              <button class="btn-soft text-xs" @click="loadHistory(k.id)">载入</button>
              <button class="btn-soft text-xs" @click="downloadHistory(k)"><Download :size="12" /></button>
              <button class="btn-soft text-xs text-sakura-500" @click="removeHistory(k.id)"><Trash2 :size="12" /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
