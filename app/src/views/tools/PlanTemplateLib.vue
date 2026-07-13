<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAdminStore } from '../../stores/admin'
import { useToastStore } from '../../stores/toast'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'
import Modal from '../../components/common/Modal.vue'
import EmptyState from '../../components/common/EmptyState.vue'
import { Plus, Trash2, Save, Star, Copy, Upload, Download } from 'lucide-vue-next'
import type { LessonPlanTemplate } from '../../types'
import JSZip from 'jszip'
import WordExtractor from 'word-extractor'
import { Buffer } from 'buffer'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { extractDocumentText } from '../../utils/document'

const adminStore = useAdminStore()
const toast = useToastStore()

const lessonTypes: LessonPlanTemplate['lessonType'][] = ['新授课', '复习课', '练习课', '讲评课', '其他']
const filterType = ref<string>('全部')
const filterFav = ref(false)
const search = ref('')

const filtered = computed(() => {
  let list = [...adminStore.planTemplates].sort((a, b) => {
    if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
    return b.createdAt - a.createdAt
  })
  if (filterType.value !== '全部') list = list.filter(t => t.lessonType === filterType.value)
  if (filterFav.value) list = list.filter(t => t.isFavorite)
  if (search.value.trim()) {
    const kw = search.value.trim().toLowerCase()
    list = list.filter(t => t.title.toLowerCase().includes(kw) || t.content.toLowerCase().includes(kw))
  }
  return list
})

const modalOpen = ref(false)
const editing = ref<LessonPlanTemplate | null>(null)
const draft = ref({
  title: '',
  subject: '',
  lessonType: '新授课' as LessonPlanTemplate['lessonType'],
  grade: '',
  content: '',
})

function openCreate() {
  editing.value = null
  draft.value = { title: '', subject: '', lessonType: '新授课', grade: '', content: '' }
  modalOpen.value = true
}

function openEdit(t: LessonPlanTemplate) {
  editing.value = t
  draft.value = { title: t.title, subject: t.subject, lessonType: t.lessonType, grade: t.grade, content: t.content }
  modalOpen.value = true
}

function save() {
  if (!draft.value.title.trim()) { toast.warning('请输入模板标题'); return }
  if (!draft.value.content.trim()) { toast.warning('请输入模板内容'); return }
  if (editing.value) {
    adminStore.updatePlanTemplate(editing.value.id, { ...draft.value, isFavorite: editing.value.isFavorite })
    toast.success('已更新')
  } else {
    adminStore.addPlanTemplate({ ...draft.value, isFavorite: false })
    toast.success('已创建')
  }
  modalOpen.value = false
}

function remove(t: LessonPlanTemplate) {
  if (!confirm(`确定删除「${t.title}」？`)) return
  adminStore.removePlanTemplate(t.id)
  toast.info('已删除')
}

function toggleFav(t: LessonPlanTemplate) {
  adminStore.togglePlanFavorite(t.id)
}

function copyContent(t: LessonPlanTemplate) {
  navigator.clipboard.writeText(t.content).then(() => toast.success('已复制到剪贴板'))
}

/** 从 .docx 文件提取纯文本 (JSZip 解析 XML) */
async function extractDocxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file)
  const xml = await zip.file('word/document.xml')?.async('string')
  if (!xml) return ''
  const text = xml
    .replace(/<\/w:p>/g, '\n')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#xa0;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return text
}

/** 从 .doc 文件提取纯文本 (word-extractor 解析 OLE2 二进制格式) */
async function extractDocText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const extractor = new WordExtractor()
  const doc = await extractor.extract(Buffer.from(buffer))
  return doc.getBody().trim()
}

/** 根据文件扩展名自动选择解析方式 (支持 .doc / .docx / .pdf) */
async function extractWordText(file: File): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) {
    return extractDocumentText(file)
  }
  if (name.endsWith('.doc') && !name.endsWith('.docx')) {
    return extractDocText(file)
  }
  return extractDocxText(file)
}

/** 导入 .docx 文件 */
const importFileRef = ref<HTMLInputElement | null>(null)
function triggerImport() {
  importFileRef.value?.click()
}

async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  try {
    const text = await extractWordText(file)
    if (!text) { toast.warning('文件内容为空'); return }
    const name = file.name.replace(/\.docx?$/i, '')
    draft.value = { title: name, subject: '', lessonType: '其他', grade: '', content: text }
    editing.value = null
    modalOpen.value = true
    toast.success('已导入，请补充信息后保存')
  } catch (err) {
    toast.warning('文件解析失败，请确认是 .doc / .docx / .pdf 格式')
  }
}

/** 导出为 .docx 文件 */
async function exportDocx(t: LessonPlanTemplate) {
  const paragraphs: Paragraph[] = []
  // 标题
  paragraphs.push(new Paragraph({
    text: t.title,
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
  }))
  // 元信息
  const meta: string[] = []
  if (t.subject) meta.push(`科目：${t.subject}`)
  if (t.grade) meta.push(`年级：${t.grade}`)
  meta.push(`课型：${t.lessonType}`)
  if (meta.length) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: meta.join('  '), size: 20, color: '666666' })],
      spacing: { after: 200 },
    }))
  }
  // 正文（按行拆分）
  for (const line of t.content.split('\n')) {
    paragraphs.push(new Paragraph({
      children: [new TextRun({ text: line, size: 22 })],
      spacing: { after: 80 },
    }))
  }

  const doc = new Document({ sections: [{ children: paragraphs }] })
  const blob = await Packer.toBlob(doc)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${t.title}.docx`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('已导出')
}

const typeColor: Record<string, string> = {
  '新授课': 'bg-mint-100 text-mint-500',
  '复习课': 'bg-sky2-100 text-sky2-500',
  '练习课': 'bg-butter-100 text-butter-600',
  '讲评课': 'bg-sakura-100 text-sakura-500',
  '其他': 'bg-cocoa-100 text-cocoa-500',
}
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="📑"
      title="文案模板库"
      description="收藏和管理常用文案模板，快速复用"
      gradient="from-butter-100 via-cream-50 to-sky2-100"
    />

    <div class="flex items-center gap-2 flex-wrap">
      <div class="flex gap-1">
        <button v-for="t in ['全部', ...lessonTypes]" :key="t" class="chip cursor-pointer text-[10px]"
          :class="filterType === t ? 'bg-butter-300 text-butter-700' : 'bg-cocoa-100 text-cocoa-500'"
          @click="filterType = t">{{ t }}</button>
      </div>
      <button class="chip cursor-pointer text-[10px]"
        :class="filterFav ? 'bg-sakura-300 text-sakura-700' : 'bg-cocoa-100 text-cocoa-500'"
        @click="filterFav = !filterFav">⭐ 收藏</button>
      <input v-model="search" class="input-soft !w-36 ml-auto" placeholder="搜索模板..." />
      <button class="btn-secondary" @click="triggerImport">
        <Upload :size="14" /> 导入文档
      </button>
      <input ref="importFileRef" type="file" accept=".doc,.docx,.pdf" class="hidden" @change="onImportFile" />
      <button class="btn-primary" @click="openCreate">
        <Plus :size="14" /> 新建模板
      </button>
    </div>

    <div v-if="!filtered.length" class="mt-8">
      <EmptyState title="还没有文案模板" desc="创建文案模板，快速复用" icon="📑" />
    </div>

    <div v-else class="grid sm:grid-cols-2 gap-4">
      <div v-for="t in filtered" :key="t.id" class="card-soft p-5 hover:shadow-soft transition">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <button @click="toggleFav(t)" class="text-lg" :title="t.isFavorite ? '取消收藏' : '收藏'">
                {{ t.isFavorite ? '⭐' : '☆' }}
              </button>
              <h3 class="title-display text-base truncate">{{ t.title }}</h3>
              <span class="chip text-[10px]" :class="typeColor[t.lessonType] || ''">{{ t.lessonType }}</span>
            </div>
            <div class="text-xs text-cocoa-500 mt-1">
              <span v-if="t.subject">{{ t.subject }}</span>
              <span v-if="t.grade"> · {{ t.grade }}</span>
            </div>
            <p class="text-sm text-cocoa-600 mt-2 whitespace-pre-line line-clamp-4">{{ t.content }}</p>
          </div>
        </div>
        <div class="flex gap-1 mt-3">
          <button class="btn-ghost !px-2 !py-1 text-xs" @click="copyContent(t)"><Copy :size="12" /> 复制</button>
          <button class="btn-ghost !px-2 !py-1 text-xs" @click="exportDocx(t)"><Download :size="12" /> 导出</button>
          <button class="btn-ghost !px-2 !py-1 text-xs" @click="openEdit(t)">编辑</button>
          <button class="btn-ghost !px-2 !py-1 text-xs text-sakura-500" @click="remove(t)"><Trash2 :size="12" /></button>
        </div>
      </div>
    </div>

    <Modal :open="modalOpen" :title="editing ? '编辑文案模板' : '新建文案模板'" width="640px" @close="modalOpen = false">
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">标题</label>
            <input v-model="draft.title" class="input-soft" placeholder="如：家长会发言稿" />
          </div>
          <div>
            <label class="text-xs text-cocoa-500">科目</label>
            <input v-model="draft.subject" class="input-soft" placeholder="如：语文" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-cocoa-500">课型</label>
            <select v-model="draft.lessonType" class="input-soft">
              <option v-for="lt in lessonTypes" :key="lt" :value="lt">{{ lt }}</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-cocoa-500">年级</label>
            <input v-model="draft.grade" class="input-soft" placeholder="如：五年级" />
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500">模板内容</label>
          <textarea v-model="draft.content" class="input-soft font-mono text-xs" rows="12" placeholder="在此输入模板内容..." />
        </div>
      </div>
      <template #footer>
        <button class="btn-secondary" @click="modalOpen = false">取消</button>
        <button class="btn-primary" @click="save"><Save :size="14" /> 保存</button>
      </template>
    </Modal>
  </div>
</template>
