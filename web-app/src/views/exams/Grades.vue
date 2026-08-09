<script setup lang="ts">
/**
 * 成绩管理
 * - 下拉框选择考试名称 → 科目自动联动该考试设置的科目
 * - 单科录入成绩（逐个 / 批量粘贴）
 * - 单科文件导入（Excel/TXT/CSV）或 AI 识别导入
 * - 【新增】全部考试科目一起录入（矩阵：行=学生，列=科目），按科目逐科提交
 * - 【新增】全部科目批量导入（矩阵文件：学号,姓名,科目1,科目2…），按科目逐科落库
 */
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { loadClasses, useClasses } from '@/composables/useClasses'
import Modal from '@/components/Modal.vue'
import { useAuthStore } from '@/stores/auth'
import { getTeacherSubjects } from '@gardener/shared/schemas/subject-schema'
import { listAllStudents, listExams, listGrades, type TeacherStudent } from '@/api/teacher'
import { Plus, Search, Upload, Sparkles, Loader2, Download, ClipboardPaste, Table2, Grid3x3 } from 'lucide-vue-next'
import { toast } from '@/utils/feedback'
import GradeEntry from './components/GradeEntry.vue'
import GradeStatistics from './components/GradeStatistics.vue'
import ExamList from './components/ExamList.vue'

const router = useRouter()
const auth = useAuthStore()

const { classes } = useClasses()
const loading = ref(false)
const grades = ref<any[]>([])
const classId = ref('')
const keyword = ref('')

/** 教师任教学科 */
const teacherSubjects = computed<string[]>(() =>
  getTeacherSubjects(auth.user?.subject as string | undefined, auth.user?.subjects as string[] | undefined),
)

/* ============ 考试与科目联动 ============ */
const exams = ref<any[]>([])
const selectedExamId = ref('')
const selectedSubject = ref('')
const selectedExam = computed(() => exams.value.find(e => e.id === selectedExamId.value))
const examSubjects = computed(() => {
  const subs = selectedExam.value?.subjects || []
  if (teacherSubjects.value.length && teacherSubjects.value.length < 15) {
    return subs.filter((s: string) => teacherSubjects.value.includes(s))
  }
  return subs
})

async function loadExams() {
  if (!classId.value) { exams.value = []; return }
  try {
    const res = await listExams({ classId: classId.value, take: 100 })
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
    const res = await listAllStudents({ classId: classId.value, take: 500 })
    students.value = Array.isArray(res) ? res : (res?.items || [])
  } catch { students.value = [] }
}

watch(classId, loadStudents)

/* ============ 成绩列表 ============ */
const pageGrades = ref(0)
const pageSizeGrades = ref(10)

function resetGradesPage() {
  pageGrades.value = 0
}
watch(selectedSubject, resetGradesPage)
watch(keyword, resetGradesPage)

async function loadGrades() {
  if (!classId.value) { grades.value = []; return }
  loading.value = true
  try {
    const res = await listGrades({ classId: classId.value, take: 200 })
    grades.value = Array.isArray(res) ? res : (res?.items || [])
    pageGrades.value = 0
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
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

function onStudentDblClick(studentId: string) {
  router.push({ path: '/teacher/student-grades', query: { studentId, classId: classId.value } })
}

const gradeEntryRef = ref<InstanceType<typeof GradeEntry> | null>(null)

function openEntry() {
  gradeEntryRef.value?.openEntry()
}

function openImport(mode: 'file' | 'ai') {
  gradeEntryRef.value?.openImport(mode)
}

/* ============ 全部科目一起录入（矩阵） ============ */
const showMatrixEntry = ref(false)
const matrixScores = ref<Record<string, string>>({})
const matrixErrorCells = ref<Set<string>>(new Set())
const matrixUnmatched = ref<string[]>([])
const matrixImportFileName = ref('')
const matrixImportStats = ref({ valid: 0, error: 0 })

const matrixProgress = computed(() => {
  const total = students.value.length * examSubjects.value.length
  const filled = Object.values(matrixScores.value).filter(v => v !== '' && v != null).length
  return { filled, total }
})

function ensureMatrixInit() {
  for (const s of students.value) {
    for (const sub of examSubjects.value) {
      const k = `${s.id}__${sub}`
      if (matrixScores.value[k] == null) matrixScores.value[k] = ''
    }
  }
}

function openMatrixEntry() {
  if (!selectedExamId.value) { toast.warning('请先选择考试'); return }
  if (!examSubjects.value.length) { toast.warning('该考试未设置科目，请先在考试设置中添加科目'); return }
  if (!students.value.length) { toast.warning('该班级暂无学生'); return }
  matrixScores.value = {}
  matrixErrorCells.value = new Set()
  matrixUnmatched.value = []
  matrixImportFileName.value = ''
  for (const g of grades.value) {
    if (g.examName !== selectedExam.value?.name && g.examId !== selectedExamId.value) continue
    if (!examSubjects.value.includes(g.subject)) continue
    for (const s of (g.scores || [])) {
      matrixScores.value[`${s.studentId}__${g.subject}`] = s.score != null ? String(s.score) : ''
    }
  }
  ensureMatrixInit()
  showMatrixEntry.value = true
}

import { importGradesCommit } from '@/api/teacher'

async function submitMatrix() {
  if (!selectedExam.value) return
  const subjects = examSubjects.value
  if (!subjects.length) { toast.warning('该考试未设置科目'); return }
  if (matrixUnmatched.value.length && !await confirm(`有 ${matrixUnmatched.value.length} 行学生未匹配，将不会被导入。仍要继续？`)) return
  entryLoading.value = true
  let committed = 0
  const failed: string[] = []
  try {
    for (const subject of subjects) {
      const rows = students.value.map(s => {
        const raw = matrixScores.value[`${s.id}__${subject}`]
        const score = (raw === '' || raw == null) ? null : Number(raw)
        return {
          studentId: s.id,
          score,
          valid: true,
          name: s.name,
          studentNo: s.studentNo,
        }
      })
      try {
        await importGradesCommit({
          classId: classId.value,
          examName: selectedExam.value.name,
          examId: selectedExam.value.id,
          subject,
          date: selectedExam.value.date || new Date().toISOString().slice(0, 10),
          rows,
        })
        committed++
      } catch (e: any) {
        failed.push(`${subject}: ${e?.message || '失败'}`)
      }
    }
    showMatrixEntry.value = false
    await loadGrades()
    if (failed.length) {
      toast.success(`已保存 ${committed}/${subjects.length} 个科目，以下科目失败：\n${failed.join('\n')}`)
    } else {
      toast.success(`已全部保存：${committed} 个科目 ✅`)
    }
  } finally {
    entryLoading.value = false
  }
}

const entryLoading = ref(false)

/* ============ 全部科目批量导入（矩阵文件） ============ */
const showMatrixImport = ref(false)
const matrixImportLoading = ref(false)

function openMatrixImport() {
  if (!classId.value) { toast.warning('请先选择班级'); return }
  if (!selectedExamId.value) { toast.warning('请先选择考试'); return }
  if (!examSubjects.value.length) { toast.warning('该考试未设置科目，请先在考试设置中添加科目'); return }
  matrixScores.value = {}
  matrixErrorCells.value = new Set()
  matrixUnmatched.value = []
  matrixImportFileName.value = ''
  matrixImportStats.value = { valid: 0, error: 0 }
  showMatrixImport.value = true
}

function downloadMatrixTemplate() {
  const subjects = examSubjects.value
  const header = ['学号', '姓名', ...subjects].join(',')
  const rows = students.value.length
    ? students.value.map(s => [s.studentNo || '', s.name || '', ...subjects.map(() => '')].join(','))
    : []
  const csv = '\ufeff' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `整场成绩导入模板_${selectedExam.value?.name || '考试'}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string) || '')
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file, 'UTF-8')
  })
}

async function onPickMatrixFile(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files?.length) return
  const file = input.files[0]
  matrixImportLoading.value = true
  try {
    const text = await readFileAsText(file)
    parseMatrixText(text, file.name)
  } catch (err: any) {
    toast.error(err?.message || '文件读取失败')
  } finally {
    matrixImportLoading.value = false
    input.value = ''
  }
}

function parseMatrixText(text: string, filename: string) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) { toast.warning('文件至少需包含表头行和一行数据'); return }
  const header = lines[0].split(/[,，\t]+/).map(c => c.trim())
  const subjects = examSubjects.value

  const noCol = Math.max(header.findIndex(h => h === '学号'), header.findIndex(h => /student\s*no/i.test(h)))
  const nameCol = Math.max(header.findIndex(h => h === '姓名'), header.findIndex(h => /^name$/i.test(h)))
  const keyCol = noCol >= 0 ? noCol : nameCol
  if (keyCol < 0) { toast.warning('未找到「学号」或「姓名」列，请使用下载的模板'); return }

  const subCols: { subject: string; idx: number }[] = []
  for (const sub of subjects) {
    const idx = header.findIndex(h => h === sub)
    if (idx >= 0) subCols.push({ subject: sub, idx })
  }
  if (!subCols.length) {
    toast.warning(`表头中未匹配到任何考试科目（${subjects.join('、')}），请使用下载的模板，科目列名需与考试设置一致。`)
    return
  }

  matrixScores.value = {}
  const errorCells = new Set<string>()
  const unmatched: string[] = []
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(/[,，\t]+/).map(c => c.trim())
    if (cells.length <= keyCol) continue
    const key = cells[keyCol]
    const student = students.value.find(s => (noCol >= 0 ? s.studentNo === key : s.name === key))
      || students.value.find(s => s.studentNo === key || s.name === key)
    if (!student) { unmatched.push(`第${i + 1}行: ${key}`); continue }
    for (const { subject, idx } of subCols) {
      const raw = cells[idx] ?? ''
      const k = `${student.id}__${subject}`
      if (raw !== '' && (Number.isNaN(Number(raw)))) {
        errorCells.add(k)
      }
      matrixScores.value[k] = raw === '' ? '' : raw
    }
  }
  matrixErrorCells.value = errorCells
  matrixUnmatched.value = unmatched
  matrixImportFileName.value = filename
  const filled = Object.values(matrixScores.value).filter(v => v !== '').length
  matrixImportStats.value = { valid: filled, error: errorCells.size + unmatched.length }
  ensureMatrixInit()
}

function resetMatrixImport() {
  matrixScores.value = {}
  matrixErrorCells.value = new Set()
  matrixUnmatched.value = []
  matrixImportFileName.value = ''
  matrixImportStats.value = { valid: 0, error: 0 }
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
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
        >
          <option value="">选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select
          v-model="selectedExamId"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
          :disabled="!classId"
        >
          <option value="">选择考试</option>
          <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}（{{ e.date }}）</option>
        </select>
        <select
          v-model="selectedSubject"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
          :disabled="!selectedExamId"
        >
          <option value="">选择科目</option>
          <option v-for="s in examSubjects" :key="s" :value="s">{{ s }}</option>
        </select>

        <!-- 整场考试：全部科目一起录入 / 批量导入 -->
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 disabled:opacity-60"
          :disabled="!selectedExamId || !examSubjects.length"
          @click="openMatrixEntry"
        >
          <Grid3x3 class="w-4 h-4" /> 全部科目录入
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-100 text-indigo-600 text-sm font-medium hover:bg-indigo-200/40 disabled:opacity-60"
          :disabled="!selectedExamId || !examSubjects.length"
          @click="openMatrixImport"
        >
          <Table2 class="w-4 h-4" /> 全部科目导入
        </button>

        <span class="w-px h-6 bg-cream-200"></span>

        <!-- 单科操作 -->
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-700 text-sm font-medium hover:bg-cream-200 disabled:opacity-60"
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

    <!-- 成绩录入子组件 -->
    <GradeEntry
      ref="gradeEntryRef"
      :class-id="classId"
      :class-name="className(classId)"
      :selected-exam="selectedExam"
      :selected-subject="selectedSubject"
      :students="students"
      :exam-subjects="examSubjects"
      :grades="grades"
      @reload="loadGrades"
    />

    <!-- 考试列表子组件 -->
    <ExamList
      :loading="loading"
      :class-id="classId"
      :grades="grades"
      :selected-subject="selectedSubject"
      :keyword="keyword"
      :page="pageGrades"
      :page-size="pageSizeGrades"
      :class-name="className"
      @update:page="pageGrades = $event"
      @update:page-size="pageSizeGrades = $event"
      @reload="loadGrades"
    />

    <!-- 成绩统计子组件 -->
    <GradeStatistics
      :class-id="classId"
      :selected-exam="selectedExam"
      :selected-exam-id="selectedExamId"
      :students="students"
      :grades="grades"
      @student-dbl-click="onStudentDblClick"
    />
  </div>

  <!-- 全部科目录入（矩阵）弹窗 -->
  <Modal v-model="showMatrixEntry" :title="`全部科目录入 · ${selectedExam?.name || ''}`" width="max-w-5xl">
    <div class="space-y-3">
      <div class="text-sm text-cocoa-400 bg-cream-50 rounded-xl px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
        <span>班级：{{ className(classId) }} · {{ students.length }} 名学生 × {{ examSubjects.length }} 科目。留空=缺考。</span>
        <span class="text-xs whitespace-nowrap">
          已填 <span class="text-butter-500 font-medium">{{ matrixProgress.filled }}</span> / {{ matrixProgress.total }} 格
        </span>
      </div>
      <div class="overflow-auto max-h-[60vh] border border-cream-200 rounded-xl">
        <table class="w-full text-sm border-collapse">
          <thead class="sticky top-0 z-10 bg-cream-100 text-cocoa-500">
            <tr>
              <th class="sticky left-0 z-10 bg-cream-100 px-3 py-2 text-left font-medium whitespace-nowrap">姓名 / 学号</th>
              <th v-for="sub in examSubjects" :key="sub" class="px-2 py-2 text-center font-medium min-w-[72px]">{{ sub }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cream-100">
            <tr v-for="s in students" :key="s.id" class="hover:bg-cream-50/60">
              <td class="sticky left-0 bg-surface px-3 py-1.5 font-medium text-cocoa-900 whitespace-nowrap">
                <div>{{ s.name }}</div>
                <div class="text-xs text-cocoa-400 font-normal">{{ s.studentNo || '-' }}</div>
              </td>
              <td v-for="sub in examSubjects" :key="sub" class="px-1.5 py-1 text-center">
                <input
                  v-model="matrixScores[`${s.id}__${sub}`]"
                  type="number"
                  step="0.5"
                  :class="[
                    'w-[68px] px-1.5 py-1 text-sm rounded border text-center',
                    matrixErrorCells.has(`${s.id}__${sub}`)
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : 'border-cream-200 focus:border-butter-400 focus:ring-1 focus:ring-butter-300',
                  ]"
                  placeholder="—"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="matrixUnmatched.length" class="text-xs text-red-500">
        未匹配学生（将不会被导入）：{{ matrixUnmatched.slice(0, 5).join('；') }}{{ matrixUnmatched.length > 5 ? ' …' : '' }}
      </p>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showMatrixEntry = false">取消</button>
      <button
        class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
        :disabled="entryLoading || !matrixProgress.total"
        @click="submitMatrix"
      >
        {{ entryLoading ? '保存中…' : `保存全部 ${examSubjects.length} 科` }}
      </button>
    </template>
  </Modal>

  <!-- 全部科目导入（矩阵文件）弹窗 -->
  <Modal v-model="showMatrixImport" :title="`全部科目导入 · ${selectedExam?.name || ''}`" width="max-w-5xl">
    <div class="space-y-3">
      <div class="text-sm text-cocoa-400 bg-cream-50 rounded-xl px-3 py-2">
        考试：{{ selectedExam?.name }} · 班级：{{ className(classId) }} · 科目：{{ examSubjects.join('、') }}
      </div>
      <div v-if="!matrixImportFileName" class="border-2 border-dashed border-cream-300 rounded-xl p-8 text-center">
        <div class="flex items-center justify-center gap-3 mb-2">
          <Table2 class="w-8 h-8 text-indigo-500" />
        </div>
        <div class="text-sm text-cocoa-500 mb-1">
          支持 CSV / TXT（逗号或 Tab 分隔）。表头格式：<code class="px-1 bg-cream-100 rounded">学号,姓名,{{ examSubjects.join(',') }}</code>
        </div>
        <div class="text-xs text-cocoa-400 mb-3">每行一个学生，每一列一个科目；与「全部科目录入」矩阵一致。</div>
        <div class="flex items-center justify-center gap-2 flex-wrap">
          <label class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 cursor-pointer">
            <Upload class="w-4 h-4" /> 选择文件
            <input type="file" class="hidden" accept=".csv,.txt,.tsv" @change="onPickMatrixFile" />
          </label>
          <button
            class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30"
            @click="downloadMatrixTemplate"
          >
            <Download class="w-4 h-4" /> 下载矩阵模板
          </button>
        </div>
        <div v-if="matrixImportLoading" class="mt-3 text-sm text-indigo-500 flex items-center justify-center gap-1">
          <Loader2 class="w-4 h-4 animate-spin" /> 解析中…
        </div>
      </div>
      <div v-else>
        <div class="flex items-center justify-between mb-2 flex-wrap gap-2">
          <div class="text-sm text-cocoa-500">
            文件：{{ matrixImportFileName }} ·
            已填 <span class="text-mint-500">{{ matrixImportStats.valid }}</span> 格 ·
            <span class="text-red-500">错误 {{ matrixImportStats.error }}</span>
          </div>
          <button class="text-xs text-cocoa-400 hover:text-butter-500" @click="resetMatrixImport">重新选择</button>
        </div>
        <p v-if="matrixUnmatched.length" class="text-xs text-red-500 mb-2">
          未匹配学生（不导入）：{{ matrixUnmatched.slice(0, 5).join('；') }}{{ matrixUnmatched.length > 5 ? ' …' : '' }}
        </p>
        <div class="overflow-auto max-h-[55vh] border border-cream-200 rounded-xl">
          <table class="w-full text-sm border-collapse">
            <thead class="sticky top-0 z-10 bg-cream-100 text-cocoa-500">
              <tr>
                <th class="sticky left-0 z-10 bg-cream-100 px-3 py-2 text-left font-medium whitespace-nowrap">姓名 / 学号</th>
                <th v-for="sub in examSubjects" :key="sub" class="px-2 py-2 text-center font-medium min-w-[72px]">{{ sub }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="s in students" :key="s.id" class="hover:bg-cream-50/60">
                <td class="sticky left-0 bg-surface px-3 py-1.5 font-medium text-cocoa-900 whitespace-nowrap">
                  <div>{{ s.name }}</div>
                  <div class="text-xs text-cocoa-400 font-normal">{{ s.studentNo || '-' }}</div>
                </td>
                <td v-for="sub in examSubjects" :key="sub" class="px-1.5 py-1 text-center">
                  <input
                    v-model="matrixScores[`${s.id}__${sub}`]"
                    type="number"
                    step="0.5"
                    :class="[
                      'w-[68px] px-1.5 py-1 text-sm rounded border text-center',
                      matrixErrorCells.has(`${s.id}__${sub}`)
                        ? 'border-red-400 bg-red-50 text-red-600'
                        : 'border-cream-200 focus:border-butter-400 focus:ring-1 focus:ring-butter-300',
                    ]"
                    placeholder="—"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-cocoa-400">提示：解析后可在此直接修正标红的单元格，再点击「导入全部科目」。</p>
      </div>
    </div>
    <template #footer>
      <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showMatrixImport = false">取消</button>
      <button
        v-if="matrixImportFileName"
        class="px-4 py-2 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-60"
        :disabled="entryLoading || !matrixProgress.total"
        @click="submitMatrix"
      >
        {{ entryLoading ? '导入中…' : `导入全部 ${examSubjects.length} 科` }}
      </button>
    </template>
  </Modal>
</template>
