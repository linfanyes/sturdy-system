<script setup lang="ts">
import { ref, computed } from 'vue'
import Modal from '@/components/Modal.vue'
import { Plus, Upload, Sparkles, ClipboardPaste, FileSpreadsheet, X, Loader2, Download } from 'lucide-vue-next'
import { toast } from '@/utils/feedback'

interface Student {
  id: string
  name: string
  studentNo?: string
}

interface Exam {
  id: string
  name: string
  date?: string
  subjects?: string[]
}

const props = defineProps<{
  classId: string
  className: string
  selectedExam: Exam | null
  selectedSubject: string
  students: Student[]
  examSubjects: string[]
  grades: any[]
}>()

const emit = defineEmits<{
  (e: 'reload'): void
}>()

// 单个录入成绩（单科）
const showEntryForm = ref(false)
const entryLoading = ref(false)
const entryScores = ref<Record<string, string>>({})
const entryMode = ref<'table' | 'paste'>('table')
const pasteText = ref('')

const entryProgress = computed(() => {
  const filled = Object.values(entryScores.value).filter(v => v !== '' && v != null).length
  return { filled, total: props.students.length }
})

function openEntry() {
  if (!props.selectedExam) { toast.warning('请先选择考试'); return }
  if (!props.selectedSubject) { toast.warning('请先选择科目'); return }
  entryScores.value = {}
  entryMode.value = 'table'
  pasteText.value = ''
  const existing = props.grades.find(g => g.examName === props.selectedExam?.name && g.subject === props.selectedSubject)
  if (existing) {
    for (const s of existing.scores) {
      entryScores.value[s.studentId] = s.score != null ? String(s.score) : ''
    }
  }
  showEntryForm.value = true
}

function parsePaste() {
  if (!pasteText.value.trim()) { toast.warning('请先粘贴成绩内容'); return }
  const lines = pasteText.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let matched = 0
  let unmatched = 0
  for (const line of lines) {
    const parts = line.split(/[,，\t\s]+/).filter(Boolean)
    if (parts.length < 2) { unmatched++; continue }
    const key = parts[0].trim()
    const score = parts[1].trim()
    const student = props.students.find(s => s.studentNo === key) || props.students.find(s => s.name === key)
    if (student) {
      entryScores.value[student.id] = score
      matched++
    } else {
      unmatched++
    }
  }
  toast.info(`解析完成：匹配 ${matched} 人，未匹配 ${unmatched} 行。可切换到「逐个录入」核对。`)
}

async function submitEntry() {
  if (!props.selectedExam || !props.selectedSubject) return
  entryLoading.value = true
  try {
    const { importGradesCommit } = await import('@/api/teacher')
    const scores = props.students.map(s => ({
      studentId: s.id,
      score: entryScores.value[s.id] === '' || entryScores.value[s.id] == null ? null : Number(entryScores.value[s.id]),
    }))
    await importGradesCommit({
      classId: props.classId,
      examName: props.selectedExam.name,
      examId: props.selectedExam.id,
      subject: props.selectedSubject,
      date: props.selectedExam.date || new Date().toISOString().slice(0, 10),
      rows: scores.map(s => ({
        studentId: s.studentId,
        score: s.score,
        valid: true,
        name: props.students.find(st => st.id === s.studentId)?.name || '',
        studentNo: props.students.find(st => st.id === s.studentId)?.studentNo || '',
      })),
    })
    showEntryForm.value = false
    emit('reload')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    entryLoading.value = false
  }
}

// 单科批量导入
const showImport = ref(false)
const importMode = ref<'file' | 'ai'>('file')
const importLoading = ref(false)
const importPreview = ref<any[]>([])
const importStats = ref({ valid: 0, error: 0 })

function openImport(mode: 'file' | 'ai') {
  if (!props.classId) { toast.warning('请先选择班级'); return }
  if (!props.selectedExam) { toast.warning('请先选择考试'); return }
  if (!props.selectedSubject) { toast.warning('请先选择科目'); return }
  importMode.value = mode
  importPreview.value = []
  importStats.value = { valid: 0, error: 0 }
  showImport.value = true
}

function downloadTemplate() {
  const header = '学号,姓名,分数'
  const rows = props.students.length
    ? props.students.map(s => `${s.studentNo || ''},${s.name || ''},`)
    : []
  const csv = '\ufeff' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `成绩导入模板_${props.selectedSubject || '成绩'}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] || result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsDataURL(file)
  })
}

async function onPickFile(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  importLoading.value = true
  try {
    const { importGradesPreview, importGradesAi } = await import('@/api/teacher')
    const dataUrl = await readFileAsBase64(file)
    let res: any
    if (importMode.value === 'ai') {
      res = await importGradesAi({
        classId: props.classId,
        mode: file.type.startsWith('image/') ? 'image' : 'file',
        data: dataUrl,
        filename: file.name,
      })
    } else {
      res = await importGradesPreview({
        classId: props.classId,
        filename: file.name,
        data: dataUrl,
      })
    }
    importPreview.value = res.rows || []
    importStats.value = { valid: res.validCount || 0, error: res.errorCount || 0 }
  } catch (err: any) {
    toast.error(err?.message || '解析失败')
  } finally {
    importLoading.value = false
    input.value = ''
  }
}

async function commitImport() {
  const validRows = importPreview.value.filter(r => r.valid)
  if (!validRows.length) { toast.warning('没有可导入的有效数据'); return }
  importLoading.value = true
  try {
    const { importGradesCommit } = await import('@/api/teacher')
    await importGradesCommit({
      classId: props.classId,
      examName: props.selectedExam?.name || '',
      examId: props.selectedExam?.id || '',
      subject: props.selectedSubject,
      date: props.selectedExam?.date || new Date().toISOString().slice(0, 10),
      rows: validRows.map(r => ({
        studentId: r.studentId,
        score: r.score,
        valid: true,
      })),
    })
    showImport.value = false
    emit('reload')
  } catch (e: any) {
    toast.error(e?.message || '导入失败')
  } finally {
    importLoading.value = false
  }
}

// 暴露方法给父组件
defineExpose({ openEntry, openImport })
</script>

<template>
  <!-- 单科录入成绩弹窗 -->
  <Modal v-model="showEntryForm" :title="`录入成绩 · ${selectedExam?.name || ''} · ${selectedSubject}`" width="max-w-2xl">
    <div class="space-y-3">
      <div class="text-sm text-cocoa-400 bg-cream-50 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
        <span>班级：{{ className }} · 共 {{ students.length }} 名学生。留空表示缺考。</span>
        <span class="text-xs whitespace-nowrap">
          已填 <span class="text-butter-500 font-medium">{{ entryProgress.filled }}</span> / {{ entryProgress.total }} 人
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="entryMode === 'table' ? 'bg-butter-500 text-white' : 'bg-cream-100 text-cocoa-500 hover:bg-cream-200'"
          @click="entryMode = 'table'"
        >逐个录入</button>
        <button
          class="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          :class="entryMode === 'paste' ? 'bg-butter-500 text-white' : 'bg-cream-100 text-cocoa-500 hover:bg-cream-200'"
          @click="entryMode = 'paste'"
        >批量粘贴</button>
      </div>
      <div v-if="entryMode === 'paste'" class="space-y-2">
        <div class="text-xs text-cocoa-400 leading-relaxed">
          每行一条，格式：「学号,分数」或「姓名,分数」（支持逗号、Tab、空格分隔）。点击「解析填充」自动匹配学生填入分数。
        </div>
        <textarea
          v-model="pasteText"
          rows="8"
          class="w-full px-3 py-2 text-sm rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 font-mono"
          placeholder="例如：&#10;20240001,95&#10;张三,88&#10;20240003,76"
        />
        <div class="flex items-center gap-2 flex-wrap">
          <button class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30" @click="parsePaste">
            <ClipboardPaste class="w-4 h-4" /> 解析填充
          </button>
          <button class="px-3 py-1.5 rounded-lg text-cocoa-400 text-sm hover:bg-cream-100" @click="pasteText = ''">清空</button>
          <span class="text-xs text-cocoa-400">解析后可切换到「逐个录入」核对</span>
        </div>
      </div>
      <div v-if="entryMode === 'table'" class="max-h-96 overflow-y-auto space-y-1">
        <div v-for="s in students" :key="s.id" class="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-cream-50">
          <span class="flex-1 text-sm text-cocoa-900">{{ s.name }}</span>
          <span class="text-xs text-cocoa-400 w-20">{{ s.studentNo || '-' }}</span>
          <input
            v-model="entryScores[s.id]"
            type="number"
            step="0.5"
            class="w-20 px-2 py-1 text-sm rounded-lg border border-cream-200 focus:outline-none focus:border-butter-400"
            placeholder="分数"
          />
        </div>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showEntryForm = false">取消</button>
      <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60" :disabled="entryLoading" @click="submitEntry">
        {{ entryLoading ? '保存中…' : '保存' }}
      </button>
    </template>
  </Modal>

  <!-- 单科导入弹窗 -->
  <Modal v-model="showImport" :title="importMode === 'ai' ? 'AI 识别导入成绩' : '文件导入成绩'" width="max-w-2xl">
    <div class="space-y-3">
      <div class="text-sm text-cocoa-400 bg-cream-50 rounded-xl px-3 py-2">
        考试：{{ selectedExam?.name }} · 科目：{{ selectedSubject }} · 班级：{{ className }}
      </div>
      <div v-if="!importPreview.length" class="border-2 border-dashed border-cream-300 rounded-xl p-8 text-center">
        <div class="flex items-center justify-center gap-3 mb-2">
          <component :is="importMode === 'ai' ? Sparkles : FileSpreadsheet" class="w-8 h-8 text-butter-500" />
        </div>
        <div class="text-sm text-cocoa-500 mb-3">
          {{ importMode === 'ai' ? '支持成绩单图片（OCR识别）或 Excel/CSV 文件（AI结构化解析）' : '支持 Excel(.xlsx/.xls) 和 TXT/CSV 文件，格式：姓名/学号 + 分数' }}
        </div>
        <div class="flex items-center justify-center gap-2 flex-wrap">
          <label class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 cursor-pointer">
            <Upload class="w-4 h-4" />
            {{ importMode === 'ai' ? '选择文件识别' : '选择文件导入' }}
            <input type="file" class="hidden" accept=".xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg" @change="onPickFile" />
          </label>
          <button
            v-if="importMode !== 'ai'"
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30"
            @click="downloadTemplate"
          >
            <Download class="w-4 h-4" /> 下载模板
          </button>
        </div>
        <div v-if="importLoading" class="mt-3 text-sm text-butter-500 flex items-center justify-center gap-1">
          <Loader2 class="w-4 h-4 animate-spin" /> {{ importMode === 'ai' ? 'AI 识别中…' : '解析中…' }}
        </div>
      </div>
      <div v-else>
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-cocoa-500">
            共 {{ importPreview.length }} 条 ·
            <span class="text-mint-500">有效 {{ importStats.valid }}</span> ·
            <span class="text-red-500">错误 {{ importStats.error }}</span>
          </div>
          <button class="text-xs text-cocoa-400 hover:text-butter-500" @click="importPreview = []">重新选择</button>
        </div>
        <div class="max-h-72 overflow-auto border border-cream-200 rounded-xl">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left sticky top-0">
              <tr>
                <th class="px-3 py-2 font-medium">行</th>
                <th class="px-3 py-2 font-medium">姓名</th>
                <th class="px-3 py-2 font-medium">学号</th>
                <th class="px-3 py-2 font-medium">分数</th>
                <th class="px-3 py-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="r in importPreview" :key="r.line" :class="r.valid ? '' : 'bg-red-50/40'">
                <td class="px-3 py-1.5 text-cocoa-400">{{ r.line }}</td>
                <td class="px-3 py-1.5 text-cocoa-900">{{ r.name }}</td>
                <td class="px-3 py-1.5 text-cocoa-500">{{ r.studentNo || '-' }}</td>
                <td class="px-3 py-1.5 text-cocoa-700">{{ r.score ?? '缺考' }}</td>
                <td class="px-3 py-1.5 text-xs" :class="r.valid ? 'text-mint-500' : 'text-red-500'">
                  {{ r.valid ? '有效' : r.error }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showImport = false">取消</button>
      <button
        v-if="importPreview.length"
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="importLoading || !importStats.valid"
        @click="commitImport"
      >
        {{ importLoading ? '导入中…' : `导入 ${importStats.valid} 条` }}
      </button>
    </template>
  </Modal>
</template>
