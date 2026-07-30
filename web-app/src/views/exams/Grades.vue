<script setup lang="ts">
/**
 * 成绩管理
 * - 下拉框选择考试名称 → 科目自动联动该考试设置的科目
 * - 选择学生录入成绩（单个）
 * - 批量文件导入（Excel/TXT/CSV）：支持单科导入
 * - 照片识别导入 / AI 识别导入
 */
import { ref, onMounted, computed, watch } from 'vue'
import request from '@/api/request'
import { loadClasses, useClasses } from '@/composables/useClasses'
import Modal from '@/components/Modal.vue'
import { listClassStudents, type TeacherStudent } from '@/api/teacher'
import { Plus, Search, Edit3, Trash2, Upload, Sparkles, Camera, FileSpreadsheet, X, Loader2 } from 'lucide-vue-next'

const { classes } = useClasses()
const loading = ref(false)
const grades = ref<any[]>([])
const classId = ref('')
const keyword = ref('')

/* ============ 考试与科目联动 ============ */
const exams = ref<any[]>([])
const selectedExamId = ref('')
const selectedSubject = ref('')
const selectedExam = computed(() => exams.value.find(e => e.id === selectedExamId.value))
const examSubjects = computed(() => selectedExam.value?.subjects || [])

async function loadExams() {
  if (!classId.value) { exams.value = []; return }
  try {
    const res = await request.get('/exams', { params: { classId: classId.value, take: 500 } })
    exams.value = Array.isArray(res) ? res : (res?.items || [])
  } catch { exams.value = [] }
}

watch(selectedExamId, () => {
  selectedSubject.value = ''
  loadGrades()
})

watch(selectedSubject, loadGrades)
watch(classId, () => {
  selectedExamId.value = ''
  loadExams()
  loadGrades()
})

/* ============ 学生列表 ============ */
const students = ref<TeacherStudent[]>([])
async function loadStudents() {
  if (!classId.value) { students.value = []; return }
  try {
    const res = await request.get('/students', { params: { classId: classId.value, take: 500 } })
    students.value = Array.isArray(res) ? res : (res?.items || [])
  } catch { students.value = [] }
}

watch(classId, loadStudents)

/* ============ 成绩列表 ============ */
const filtered = computed(() => {
  let list = grades.value
  if (selectedSubject.value) {
    list = list.filter(g => g.subject === selectedSubject.value)
  }
  if (keyword.value) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(g =>
      g.examName?.toLowerCase().includes(kw) ||
      g.subject?.toLowerCase().includes(kw),
    )
  }
  return list
})

async function loadGrades() {
  if (!classId.value) { grades.value = []; return }
  loading.value = true
  try {
    const res = await request.get('/grades', { params: { classId: classId.value, take: 500 } })
    grades.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadClasses()
})

function className(id: string) {
  return classes.value.find(c => c.id === id)?.name || id
}

/** 展开某条成绩记录的学生分数明细 */
function scoreSummary(g: any): string {
  if (!g.scores?.length) return '暂无'
  const valid = g.scores.filter((s: any) => s.score != null).map((s: any) => s.score)
  if (!valid.length) return '暂无'
  const avg = (valid.reduce((a: number, b: number) => a + b, 0) / valid.length).toFixed(1)
  return `${valid.length}人 均${avg} 最高${Math.max(...valid)} 最低${Math.min(...valid)}`
}

/* ============ 单个录入成绩 ============ */
const showEntryForm = ref(false)
const entryLoading = ref(false)
const entryScores = ref<Record<string, string>>({})  // studentId -> score string

function openEntry() {
  if (!selectedExamId.value) { alert('请先选择考试'); return }
  if (!selectedSubject.value) { alert('请先选择科目'); return }
  // 预填已有成绩
  entryScores.value = {}
  const existing = grades.value.find(g => g.examName === selectedExam.value?.name && g.subject === selectedSubject.value)
  if (existing) {
    for (const s of existing.scores) {
      entryScores.value[s.studentId] = s.score != null ? String(s.score) : ''
    }
  }
  showEntryForm.value = true
}

async function submitEntry() {
  if (!selectedExam.value || !selectedSubject.value) return
  entryLoading.value = true
  try {
    const scores = students.value.map(s => ({
      studentId: s.id,
      score: entryScores.value[s.id] === '' || entryScores.value[s.id] == null ? null : Number(entryScores.value[s.id]),
    }))
    await request.post('/grades/import-commit', {
      classId: classId.value,
      examName: selectedExam.value.name,
      examId: selectedExam.value.id,
      subject: selectedSubject.value,
      date: selectedExam.value.date || new Date().toISOString().slice(0, 10),
      rows: scores.map(s => ({
        studentId: s.studentId,
        score: s.score,
        valid: true,
        name: students.value.find(st => st.id === s.studentId)?.name || '',
        studentNo: students.value.find(st => st.id === s.studentId)?.studentNo || '',
      })),
    })
    showEntryForm.value = false
    await loadGrades()
  } catch (e: any) {
    alert(e?.message || '保存失败')
  } finally {
    entryLoading.value = false
  }
}

/* ============ 删除 ============ */
async function handleDelete(g: any) {
  if (!confirm(`确定删除「${g.examName} - ${g.subject}」的成绩记录？`)) return
  try {
    await request.delete(`/grades/${g.id}`)
    grades.value = grades.value.filter(x => x.id !== g.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

/* ============ 批量导入 ============ */
const showImport = ref(false)
const importMode = ref<'file' | 'ai'>('file')
const importLoading = ref(false)
const importPreview = ref<any[]>([])
const importStats = ref({ valid: 0, error: 0 })

function openImport(mode: 'file' | 'ai') {
  if (!classId.value) { alert('请先选择班级'); return }
  if (!selectedExamId.value) { alert('请先选择考试'); return }
  if (!selectedSubject.value) { alert('请先选择科目'); return }
  importMode.value = mode
  importPreview.value = []
  importStats.value = { valid: 0, error: 0 }
  showImport.value = true
}

async function onPickFile(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  importLoading.value = true
  try {
    const dataUrl = await readFileAsBase64(file)
    const endpoint = importMode.value === 'ai' ? '/grades/import-ai' : '/grades/import-preview'
    const body = importMode.value === 'ai'
      ? { classId: classId.value, mode: file.type.startsWith('image/') ? 'image' : 'file', data: dataUrl, filename: file.name }
      : { classId: classId.value, filename: file.name, data: dataUrl }
    const res = await request.post(endpoint, body)
    importPreview.value = res.rows || []
    importStats.value = { valid: res.validCount || 0, error: res.errorCount || 0 }
  } catch (err: any) {
    alert(err?.message || '解析失败')
  } finally {
    importLoading.value = false
    input.value = ''
  }
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

async function commitImport() {
  const validRows = importPreview.value.filter(r => r.valid)
  if (!validRows.length) { alert('没有可导入的有效数据'); return }
  importLoading.value = true
  try {
    await request.post('/grades/import-commit', {
      classId: classId.value,
      examName: selectedExam.value?.name,
      examId: selectedExam.value?.id,
      subject: selectedSubject.value,
      date: selectedExam.value?.date || new Date().toISOString().slice(0, 10),
      rows: validRows,
    })
    showImport.value = false
    await loadGrades()
  } catch (e: any) {
    alert(e?.message || '导入失败')
  } finally {
    importLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900">成绩管理</h1>
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="classId"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
        >
          <option value="">选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select
          v-model="selectedExamId"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
          :disabled="!classId"
        >
          <option value="">选择考试</option>
          <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}（{{ e.date }}）</option>
        </select>
        <select
          v-model="selectedSubject"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
          :disabled="!selectedExamId"
        >
          <option value="">选择科目</option>
          <option v-for="s in examSubjects" :key="s" :value="s">{{ s }}</option>
        </select>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60"
          :disabled="!selectedSubject"
          @click="openEntry"
        >
          <Plus class="w-4 h-4" /> 录入成绩
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30 disabled:opacity-60"
          :disabled="!selectedSubject"
          @click="openImport('file')"
        >
          <Upload class="w-4 h-4" /> 文件导入
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-100 text-purple-500 text-sm font-medium hover:bg-purple-300/30 disabled:opacity-60"
          :disabled="!selectedSubject"
          @click="openImport('ai')"
        >
          <Sparkles class="w-4 h-4" /> AI识别
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="table-wrap">
      <table class="w-full text-sm">
        <thead class="bg-cream-100 text-cocoa-500 text-left">
          <tr>
            <th class="px-4 py-3 font-medium">考试名称</th>
            <th class="px-4 py-3 font-medium">科目</th>
            <th class="px-4 py-3 font-medium">班级</th>
            <th class="px-4 py-3 font-medium">日期</th>
            <th class="px-4 py-3 font-medium">成绩汇总</th>
            <th class="px-4 py-3 font-medium text-right">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading" class="text-center text-cocoa-400">
            <td colspan="6" class="py-8">加载中…</td>
          </tr>
          <tr v-else-if="!classId" class="text-center text-cocoa-400">
            <td colspan="6" class="py-8">请先选择班级</td>
          </tr>
          <tr v-else-if="filtered.length === 0" class="text-center text-cocoa-400">
            <td colspan="6" class="py-8">暂无成绩数据</td>
          </tr>
          <tr v-for="g in filtered" :key="g.id" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ g.examName }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ g.subject }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ className(g.classId) }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ g.date || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-500 text-xs">{{ scoreSummary(g) }}</td>
            <td class="px-4 py-3 text-right">
              <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="handleDelete(g)">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- 录入成绩弹窗 -->
  <Modal v-model="showEntryForm" :title="`录入成绩 · ${selectedExam?.name || ''} · ${selectedSubject}`" width="max-w-2xl">
    <div class="space-y-2">
      <div class="text-sm text-cocoa-400 bg-cream-50 rounded-xl px-3 py-2">
        班级：{{ className(classId) }} · 共 {{ students.length }} 名学生。留空表示缺考。
      </div>
      <div class="max-h-96 overflow-y-auto space-y-1">
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

  <!-- 导入弹窗 -->
  <Modal v-model="showImport" :title="importMode === 'ai' ? 'AI 识别导入成绩' : '文件导入成绩'" width="max-w-2xl">
    <div class="space-y-3">
      <div class="text-sm text-cocoa-400 bg-cream-50 rounded-xl px-3 py-2">
        考试：{{ selectedExam?.name }} · 科目：{{ selectedSubject }} · 班级：{{ className(classId) }}
      </div>

      <!-- 文件选择 -->
      <div v-if="!importPreview.length" class="border-2 border-dashed border-cream-300 rounded-xl p-8 text-center">
        <div class="flex items-center justify-center gap-3 mb-2">
          <component :is="importMode === 'ai' ? Sparkles : FileSpreadsheet" class="w-8 h-8 text-butter-500" />
        </div>
        <div class="text-sm text-cocoa-500 mb-3">
          {{ importMode === 'ai' ? '支持成绩单图片（OCR识别）或 Excel/CSV 文件（AI结构化解析）' : '支持 Excel(.xlsx/.xls) 和 TXT/CSV 文件，格式：姓名/学号 + 分数' }}
        </div>
        <label class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 cursor-pointer">
          <Upload class="w-4 h-4" />
          {{ importMode === 'ai' ? '选择文件识别' : '选择文件导入' }}
          <input type="file" class="hidden" accept=".xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg" @change="onPickFile" />
        </label>
        <div v-if="importLoading" class="mt-3 text-sm text-butter-500 flex items-center justify-center gap-1">
          <Loader2 class="w-4 h-4 animate-spin" /> {{ importMode === 'ai' ? 'AI 识别中…' : '解析中…' }}
        </div>
      </div>

      <!-- 预览 -->
      <div v-else>
        <div class="flex items-center justify-between mb-2">
          <div class="text-sm text-cocoa-500">
            共 {{ importPreview.length }} 条 ·
            <span class="text-mint-500">有效 {{ importStats.valid }}</span> ·
            <span class="text-red-500">错误 {{ importStats.error }}</span>
          </div>
          <button class="text-xs text-cocoa-400 hover:text-butter-500" @click="importPreview = []">重新选择</button>
        </div>
        <div class="max-h-72 overflow-y-auto border border-cream-200 rounded-xl">
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
