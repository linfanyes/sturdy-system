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
import { Plus, Search, Upload, Sparkles, Loader2, Download, ClipboardPaste, Table2, Grid3x3, BarChart3, AlertTriangle, Users } from 'lucide-vue-next'
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

/* ============ 班级成绩概览（基于已加载的成绩数据本地计算） ============ */
const classOverview = computed(() => {
  if (!classId.value || !selectedExamId.value) return null
  const examGrades = grades.value.filter(g =>
    (g.examId === selectedExamId.value || g.examName === selectedExam.value?.name)
  )
  if (!examGrades.length) return null

  // 计算各科数据
  const subjectData: Record<string, { total: number; count: number; max: number; min: number; fullScore: number }> = {}
  for (const g of examGrades) {
    if (!Array.isArray(g.scores)) continue
    const fullScore = g.fullScore || 100
    for (const s of g.scores) {
      if (s.score == null) continue
      if (!subjectData[g.subject]) {
        subjectData[g.subject] = { total: 0, count: 0, max: -Infinity, min: Infinity, fullScore }
      }
      const d = subjectData[g.subject]
      d.total += Number(s.score)
      d.count += 1
      d.max = Math.max(d.max, Number(s.score))
      d.min = Math.min(d.min, Number(s.score))
    }
  }

  const subjects = Object.entries(subjectData).map(([subject, d]) => {
    const avg = d.count ? Math.round((d.total / d.count) * 10) / 10 : 0
    const passCount = Object.values(grades.value
      .filter(g => (g.examId === selectedExamId.value || g.examName === selectedExam.value?.name) && g.subject === subject)
      .flatMap(g => g.scores || [])
      .filter(s => s.score != null && Number(s.score) >= d.fullScore * 0.6)).length
    const passRate = d.count ? Math.round((passCount / d.count) * 1000) / 10 : 0
    const excellentCount = Object.values(grades.value
      .filter(g => (g.examId === selectedExamId.value || g.examName === selectedExam.value?.name) && g.subject === subject)
      .flatMap(g => g.scores || [])
      .filter(s => s.score != null && Number(s.score) >= d.fullScore * 0.85)).length
    const excellentRate = d.count ? Math.round((excellentCount / d.count) * 1000) / 10 : 0
    return { subject, avg, max: d.max, min: d.min, count: d.count, passRate, excellentRate, fullScore: d.fullScore }
  }).sort((a, b) => b.avg - a.avg)

  // 薄弱学生（单科低于班级均分）
  const weakStudents: Array<{ studentId: string; studentName: string; subject: string; score: number; classAvg: number }> = []
  for (const g of examGrades) {
    if (!Array.isArray(g.scores)) continue
    const subjStat = subjects.find(s => s.subject === g.subject)
    if (!subjStat) continue
    for (const s of g.scores) {
      if (s.score == null) continue
      if (Number(s.score) < subjStat.avg - 5) {
        const student = students.value.find(st => st.id === s.studentId)
        weakStudents.push({
          studentId: s.studentId,
          studentName: student?.name || s.studentId,
          subject: g.subject,
          score: Number(s.score),
          classAvg: subjStat.avg,
        })
      }
    }
  }

  const classAvg = subjects.length ? Math.round((subjects.reduce((s, x) => s + x.avg, 0) / subjects.length) * 10) / 10 : 0
  const overallPassRate = subjects.length ? Math.round(subjects.reduce((s, x) => s + x.passRate, 0) / subjects.length) : 0
  const overallExcellentRate = subjects.length ? Math.round(subjects.reduce((s, x) => s + x.excellentRate, 0) / subjects.length) : 0

  // 聚合薄弱学生（按学生）
  const weakStudentMap = new Map<string, { name: string; subject: string; score: number; avg: number }>()
  for (const w of weakStudents) {
    const existing = weakStudentMap.get(w.studentId)
    if (!existing || (w.classAvg - w.score) > (existing.avg - existing.score)) {
      weakStudentMap.set(w.studentId, { name: w.studentName, subject: w.subject, score: w.score, avg: w.classAvg })
    }
  }
  const topWeak = Array.from(weakStudentMap.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => (b.avg - b.score) - (a.avg - a.score))
    .slice(0, 6)

  return {
    classAvg,
    overallPassRate,
    overallExcellentRate,
    totalStudents: subjects.length ? subjects[0].count : 0,
    subjectCount: subjects.length,
    subjects,
    topWeak,
  }
})

/* 滚动到成绩统计区 */
const statsRef = ref<HTMLElement | null>(null)
function scrollToStats() {
  const el = document.querySelector('[data-stats-section]')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

        <!-- 搜索框 -->
        <div class="relative">
          <Search class="w-4 h-4 text-cocoa-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索考试/科目"
            class="pl-8 pr-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400 w-44"
          />
        </div>

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

    <!-- 班级成绩速览（选中考后即时展示） -->
    <div v-if="classOverview" class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <!-- 左侧：班级核心指标 -->
      <div class="bg-surface rounded-2xl p-4 shadow-softer lg:col-span-1">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700">
            <BarChart3 class="w-4 h-4 text-butter-500" />
            班级成绩速览
          </div>
          <button
            class="text-xs text-mint-600 hover:text-mint-700 flex items-center gap-0.5"
            @click="scrollToStats"
          >
            详情分析 →
          </button>
        </div>
        <div class="grid grid-cols-2 gap-2.5">
          <div class="rounded-xl bg-cream-50 p-3">
            <div class="text-xs text-cocoa-500">班级均分</div>
            <div class="text-xl font-bold text-cocoa-900 mt-0.5">{{ classOverview.classAvg }}</div>
          </div>
          <div class="rounded-xl bg-mint-50 p-3">
            <div class="text-xs text-mint-700">平均及格率</div>
            <div class="text-xl font-bold text-mint-600 mt-0.5">{{ classOverview.overallPassRate }}%</div>
          </div>
          <div class="rounded-xl bg-butter-50 p-3">
            <div class="text-xs text-butter-700">平均优秀率</div>
            <div class="text-xl font-bold text-butter-600 mt-0.5">{{ classOverview.overallExcellentRate }}%</div>
          </div>
          <div class="rounded-xl bg-sky2-50 p-3">
            <div class="text-xs text-sky2-700">参考人数</div>
            <div class="text-xl font-bold text-sky2-600 mt-0.5">{{ classOverview.totalStudents }} 人</div>
          </div>
        </div>

        <!-- 各科均分条 -->
        <div class="mt-3 space-y-2">
          <div v-for="s in classOverview.subjects" :key="s.subject" class="flex items-center gap-2">
            <span class="text-xs text-cocoa-600 w-12 shrink-0">{{ s.subject }}</span>
            <div class="flex-1 h-5 bg-cream-100 rounded-full overflow-hidden relative">
              <div
                class="h-full rounded-full flex items-center justify-end pr-1.5 transition-all"
                :style="{
                  width: Math.min(100, (s.avg / s.fullScore) * 100) + '%',
                  background: s.passRate >= 90 ? '#67c23a' : s.passRate >= 75 ? '#e6a23c' : '#f56c6c',
                }"
              >
                <span class="text-[10px] text-white font-medium">{{ s.avg }}</span>
              </div>
            </div>
            <span class="text-[10px] text-cocoa-400 shrink-0">及{{ s.passRate }}% 优{{ s.excellentRate }}%</span>
          </div>
        </div>
      </div>

      <!-- 中间：学生成绩详情（带排名徽标） -->
      <div class="bg-surface rounded-2xl p-4 shadow-softer lg:col-span-1">
        <div class="flex items-center gap-2 text-sm font-medium text-cocoa-700 mb-3">
          <Users class="w-4 h-4 text-sky2-500" />
          学生成绩详情
          <span v-if="keyword" class="text-xs text-cocoa-400">（已搜索「{{ keyword }}」）</span>
        </div>
        <div class="max-h-72 overflow-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-surface text-cocoa-500 text-xs">
              <tr>
                <th class="text-left px-2 py-1.5 font-medium">学生</th>
                <th v-for="s in classOverview.subjects" :key="'th-' + s.subject" class="text-right px-1 py-1.5 font-medium">{{ s.subject }}</th>
                <th class="text-right px-2 py-1.5 font-medium">总分</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr
                v-for="stu in (() => {
                  const examGrades = grades.value.filter(g =>
                    (g.examId === selectedExamId.value || g.examName === selectedExam?.name)
                  )
                  const map = new Map<string, Record<string, number | null>>()
                  for (const g of examGrades) {
                    for (const s of (g.scores || [])) {
                      if (!map.has(s.studentId)) map.set(s.studentId, {})
                      map.get(s.studentId)![g.subject] = s.score
                    }
                  }
                  let list = Array.from(map.entries()).map(([id, subjMap]) => {
                    const stu = students.value.find(s => s.id === id)
                    const total = Object.values(subjMap).reduce((s, v) => s + (v ?? 0), 0)
                    const full = classOverview.subjects.reduce((s, x) => s + x.fullScore, 0)
                    return { id, name: stu?.name || id, studentNo: stu?.studentNo || '', subjMap, total, full }
                  }).filter(r => !keyword || r.name.includes(keyword) || r.studentNo.includes(keyword))
                  list.sort((a, b) => b.total - a.total)
                  return list
                })()"
                :key="stu.id"
                class="hover:bg-cream-50 cursor-pointer"
                @click="onStudentDblClick(stu.id)"
              >
                <td class="px-2 py-1.5 font-medium text-cocoa-900 whitespace-nowrap">
                  <div class="flex items-center gap-1.5">
                    <span>{{ stu.name }}</span>
                    <span v-if="students.value.findIndex(s => s.id === stu.id) < 3" class="text-[10px] px-1 rounded bg-butter-100 text-butter-600">TOP{{ students.value.findIndex(s => s.id === stu.id) + 1 > 3 ? '' : students.value.findIndex(s => s.id === stu.id) + 1 }}</span>
                  </div>
                </td>
                <td v-for="s in classOverview.subjects" :key="'td-' + s.subject" class="text-right px-1 py-1.5">
                  <span
                    v-if="stu.subjMap[s.subject] != null"
                    class="text-sm"
                    :class="(stu.subjMap[s.subject] as number) >= s.avg ? 'text-mint-600' : (stu.subjMap[s.subject] as number) < s.avg - 10 ? 'text-red-500' : 'text-cocoa-700'"
                  >{{ stu.subjMap[s.subject] }}</span>
                  <span v-else class="text-cocoa-300">—</span>
                </td>
                <td class="text-right px-2 py-1.5 font-semibold text-cocoa-900">{{ stu.total }}</td>
              </tr>
              <tr v-if="!classOverview.subjects.length" class="text-center text-cocoa-300">
                <td :colspan="classOverview.subjects.length + 3" class="py-6">暂无成绩数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 右侧：薄弱学生预警 -->
      <div class="bg-surface rounded-2xl p-4 shadow-softer lg:col-span-1">
        <div class="flex items-center gap-2 mb-3">
          <AlertTriangle class="w-4 h-4 text-sakura-500" />
          <h3 class="text-sm font-medium text-cocoa-700">薄弱学生预警</h3>
        </div>
        <div v-if="classOverview.topWeak.length" class="space-y-2">
          <div
            v-for="w in classOverview.topWeak"
            :key="w.id"
            class="flex items-center justify-between gap-2 p-2 rounded-xl bg-sakura-50 cursor-pointer hover:bg-sakura-100 transition-colors"
            @click="onStudentDblClick(w.id)"
          >
            <div class="min-w-0">
              <div class="text-sm font-medium text-cocoa-900 truncate">{{ w.name }}</div>
              <div class="text-xs text-cocoa-500 mt-0.5">
                <span class="text-sakura-600">{{ w.subject }}</span>
                <span class="mx-1">·</span>
                <span>{{ w.score }} 分</span>
                <span class="mx-1">·</span>
                <span class="text-sakura-500">低{{ (w.avg - w.score).toFixed(1) }}分</span>
              </div>
            </div>
            <button
              class="shrink-0 text-xs px-2 py-1 rounded-lg bg-sakura-200/50 text-sakura-700 hover:bg-sakura-300/50"
              @click.stop="onStudentDblClick(w.id)"
            >查看 →</button>
          </div>
        </div>
        <div v-else class="text-sm text-cocoa-400 text-center py-8">
          <div class="text-3xl mb-2">🎉</div>
          班级整体发挥稳定
        </div>

        <!-- AI 生成的教学建议 -->
        <div v-if="classOverview.subjects.length" class="mt-3 p-3 rounded-xl bg-butter-50 border border-butter-100">
          <div class="flex items-center gap-1.5 text-xs font-medium text-butter-700 mb-1.5">
            <Sparkles class="w-3.5 h-3.5" />
            教学建议
          </div>
          <div class="text-xs text-cocoa-700 leading-relaxed space-y-1">
            <template v-if="classOverview.subjects.length">
              <p v-if="classOverview.overallPassRate < 80">⚠️ 平均及格率仅 {{ classOverview.overallPassRate }}%，建议加强及格线附近学生的基础训练。</p>
              <p v-if="classOverview.overallExcellentRate < 30">💡 优秀率 {{ classOverview.overallExcellentRate }}%，可考虑分层教学提升尖子生。</p>
              <p v-if="classOverview.topWeak.length >= 3">🎯 有 {{ classOverview.topWeak.length }} 名学生多科低于班级均分，建议一对一辅导。</p>
              <p v-if="classOverview.overallPassRate >= 90 && classOverview.overallExcellentRate >= 40">✅ 班级整体表现优秀，继续保持良好的教学节奏。</p>
              <p>📘 优势学科：{{ classOverview.subjects[0].subject }}（均分 {{ classOverview.subjects[0].avg }}）</p>
              <p v-if="classOverview.subjects.length > 1">📕 薄弱学科：{{ classOverview.subjects[classOverview.subjects.length - 1].subject }}（均分 {{ classOverview.subjects[classOverview.subjects.length - 1].avg }}，建议重点突破）</p>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 无选中考试时的提示 -->
    <div v-else-if="classId" class="bg-surface rounded-2xl p-6 shadow-softer text-center">
      <BarChart3 class="w-10 h-10 mx-auto text-cream-300 mb-2" />
      <p class="text-cocoa-400 text-sm">请选择考试查看班级成绩概览</p>
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
    <div data-stats-section>
      <GradeStatistics
        :class-id="classId"
        :selected-exam="selectedExam"
        :selected-exam-id="selectedExamId"
        :students="students"
        :grades="grades"
        @student-dbl-click="onStudentDblClick"
      />
    </div>
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
