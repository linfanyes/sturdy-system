<script setup lang="ts">
/**
 * 成绩管理
 * - 下拉框选择考试名称 → 科目自动联动该考试设置的科目
 * - 单科录入成绩（逐个 / 批量粘贴）
 * - 单科文件导入（Excel/TXT/CSV）或 AI 识别导入
 * - 【新增】全部考试科目一起录入（矩阵：行=学生，列=科目），按科目逐科提交
 * - 【新增】全部科目批量导入（矩阵文件：学号,姓名,科目1,科目2…），按科目逐科落库
 *
 * 后端 /grades/import-commit 为单科接口（按 班级+考试+科目 upsert），
 * 因此「整场考试」的录入/导入均在「前端」拆成每科一组分别调用，无需后端改动。
 */
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import request from '@/api/request'
import { loadClasses, useClasses } from '@/composables/useClasses'
import Modal from '@/components/Modal.vue'
import { listClassStudents, type TeacherStudent } from '@/api/teacher'
import { Plus, Search, Edit3, Trash2, Upload, Sparkles, Camera, FileSpreadsheet, X, Loader2, User, Download, ClipboardPaste, Table2, Grid3x3 } from 'lucide-vue-next'

const router = useRouter()

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

/* ============ 单个录入成绩（单科） ============ */
const showEntryForm = ref(false)
const entryLoading = ref(false)
const entryScores = ref<Record<string, string>>({})  // studentId -> score string
const entryMode = ref<'table' | 'paste'>('table')
const pasteText = ref('')

/** 录入进度：已填 / 总人数 */
const entryProgress = computed(() => {
  const filled = Object.values(entryScores.value).filter(v => v !== '' && v != null).length
  return { filled, total: students.value.length }
})

function openEntry() {
  if (!selectedExamId.value) { alert('请先选择考试'); return }
  if (!selectedSubject.value) { alert('请先选择科目'); return }
  // 预填已有成绩
  entryScores.value = {}
  entryMode.value = 'table'
  pasteText.value = ''
  const existing = grades.value.find(g => g.examName === selectedExam.value?.name && g.subject === selectedSubject.value)
  if (existing) {
    for (const s of existing.scores) {
      entryScores.value[s.studentId] = s.score != null ? String(s.score) : ''
    }
  }
  showEntryForm.value = true
}

/** 解析批量粘贴文本：每行「学号,分数」或「姓名,分数」，自动匹配学生填入 */
function parsePaste() {
  if (!pasteText.value.trim()) { alert('请先粘贴成绩内容'); return }
  const lines = pasteText.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  let matched = 0
  let unmatched = 0
  for (const line of lines) {
    const parts = line.split(/[,，\t\s]+/).filter(Boolean)
    if (parts.length < 2) { unmatched++; continue }
    const key = parts[0].trim()
    const score = parts[1].trim()
    // 优先按学号匹配，再按姓名匹配
    const student = students.value.find(s => s.studentNo === key) || students.value.find(s => s.name === key)
    if (student) {
      entryScores.value[student.id] = score
      matched++
    } else {
      unmatched++
    }
  }
  alert(`解析完成：匹配 ${matched} 人，未匹配 ${unmatched} 行。可切换到「逐个录入」核对。`)
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
  if (!await confirm(`确定删除「${g.examName} - ${g.subject}」的成绩记录？`)) return
  try {
    await request.delete(`/grades/${g.id}`)
    grades.value = grades.value.filter(x => x.id !== g.id)
  } catch (e: any) {
    alert(e?.message || '删除失败')
  }
}

/* ============ 单科批量导入 ============ */
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

/** 下载 CSV 导入模板（含表头 + 当前班级学生预填行） */
function downloadTemplate() {
  const header = '学号,姓名,分数'
  const rows = students.value.length
    ? students.value.map(s => `${s.studentNo || ''},${s.name || ''},`)
    : []
  const csv = '\ufeff' + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `成绩导入模板_${selectedSubject.value || '成绩'}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
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

/* ============ 全部科目一起录入（矩阵） ============ */
const showMatrixEntry = ref(false)
const matrixScores = ref<Record<string, string>>({})        // `${studentId}__${subject}` -> score string
const matrixErrorCells = ref<Set<string>>(new Set())        // 解析出错的单元格
const matrixUnmatched = ref<string[]>([])                   // 导入时未匹配的学生（行描述）
const matrixImportFileName = ref('')
const matrixImportStats = ref({ valid: 0, error: 0 })

/** 矩阵录入进度：已填单元格 / 总单元格 */
const matrixProgress = computed(() => {
  const total = students.value.length * examSubjects.value.length
  const filled = Object.values(matrixScores.value).filter(v => v !== '' && v != null).length
  return { filled, total }
})

/** 保证所有 (学生×科目) 单元格都有初始值，便于 v-model 绑定 */
function ensureMatrixInit() {
  for (const s of students.value) {
    for (const sub of examSubjects.value) {
      const k = `${s.id}__${sub}`
      if (matrixScores.value[k] == null) matrixScores.value[k] = ''
    }
  }
}

/** 打开矩阵录入：预填已有成绩 */
function openMatrixEntry() {
  if (!selectedExamId.value) { alert('请先选择考试'); return }
  if (!examSubjects.value.length) { alert('该考试未设置科目，请先在考试设置中添加科目'); return }
  if (!students.value.length) { alert('该班级暂无学生'); return }
  matrixScores.value = {}
  matrixErrorCells.value = new Set()
  matrixUnmatched.value = []
  matrixImportFileName.value = ''
  // 预填已有成绩（按 考试+科目 匹配）
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

/**
 * 提交矩阵：按科目逐科调用 import-commit。
 * 后端按 (班级,考试,科目) upsert，因此逐科提交安全、可重导。
 */
async function submitMatrix() {
  if (!selectedExam.value) return
  const subjects = examSubjects.value
  if (!subjects.length) { alert('该考试未设置科目'); return }
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
        await request.post('/grades/import-commit', {
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
      alert(`已保存 ${committed}/${subjects.length} 个科目，以下科目失败：\n${failed.join('\n')}`)
    } else {
      alert(`已全部保存：${committed} 个科目 ✅`)
    }
  } finally {
    entryLoading.value = false
  }
}

/* ============ 全部科目批量导入（矩阵文件） ============ */
const showMatrixImport = ref(false)
const matrixImportLoading = ref(false)

function openMatrixImport() {
  if (!classId.value) { alert('请先选择班级'); return }
  if (!selectedExamId.value) { alert('请先选择考试'); return }
  if (!examSubjects.value.length) { alert('该考试未设置科目，请先在考试设置中添加科目'); return }
  matrixScores.value = {}
  matrixErrorCells.value = new Set()
  matrixUnmatched.value = []
  matrixImportFileName.value = ''
  matrixImportStats.value = { valid: 0, error: 0 }
  showMatrixImport.value = true
}

/** 下载矩阵导入模板：表头 学号,姓名,科目1,科目2…（预填学生行） */
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
    alert(err?.message || '文件读取失败')
  } finally {
    matrixImportLoading.value = false
    input.value = ''
  }
}

/** 解析矩阵文件：行=学生，列=科目（表头需含 学号/姓名 + 与考试科目同名的列） */
function parseMatrixText(text: string, filename: string) {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) { alert('文件至少需包含表头行和一行数据'); return }
  const header = lines[0].split(/[,，\t]+/).map(c => c.trim())
  const subjects = examSubjects.value

  const noCol = Math.max(header.findIndex(h => h === '学号'), header.findIndex(h => /student\s*no/i.test(h)))
  const nameCol = Math.max(header.findIndex(h => h === '姓名'), header.findIndex(h => /^name$/i.test(h)))
  const keyCol = noCol >= 0 ? noCol : nameCol
  if (keyCol < 0) { alert('未找到「学号」或「姓名」列，请使用下载的模板'); return }

  const subCols: { subject: string; idx: number }[] = []
  for (const sub of subjects) {
    const idx = header.findIndex(h => h === sub)
    if (idx >= 0) subCols.push({ subject: sub, idx })
  }
  if (!subCols.length) {
    alert(`表头中未匹配到任何考试科目（${subjects.join('、')}），请使用下载的模板，科目列名需与考试设置一致。`)
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

/* ============ 学生成绩矩阵（双击查看学生详情） ============ */
const studentMatrix = computed(() => {
  if (!classId.value || !selectedExamId.value || !students.value.length) return []
  const examGrades = grades.value.filter(g => g.examName === selectedExam.value?.name || g.examId === selectedExamId.value)
  const subjects = selectedExam.value?.subjects || [...new Set(examGrades.map(g => g.subject))]
  return students.value.map(st => {
    const scores: Record<string, number | null> = {}
    let total = 0
    let count = 0
    for (const subj of subjects) {
      const grade = examGrades.find(g => g.subject === subj)
      const entry = grade?.scores?.find((s: any) => s.studentId === st.id)
      scores[subj] = entry?.score ?? null
      if (entry?.score != null) { total += entry.score; count++ }
    }
    return { student: st, scores, total, avg: count > 0 ? total / count : null, subjects }
  })
})

const matrixSubjects = computed(() => selectedExam.value?.subjects || [])

function onStudentDblClick(studentId: string) {
  router.push({ path: '/teacher/student-grades', query: { studentId, classId: classId.value } })
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

    <!-- 学生成绩矩阵（双击查看学生详情） -->
    <div v-if="classId && selectedExamId && studentMatrix.length" class="bg-surface rounded-2xl p-4 shadow-softer">
      <div class="flex items-center gap-2 mb-3">
        <User class="w-4 h-4 text-butter-500" />
        <h3 class="text-sm font-medium text-cocoa-700">学生成绩（双击行查看详情）</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead class="bg-cream-100 text-cocoa-500 text-left">
            <tr>
              <th class="px-3 py-2 font-medium">姓名</th>
              <th v-for="s in matrixSubjects" :key="s" class="px-3 py-2 font-medium text-center">{{ s }}</th>
              <th class="px-3 py-2 font-medium text-center">总分</th>
              <th class="px-3 py-2 font-medium text-center">均分</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cream-100">
            <tr
              v-for="row in studentMatrix"
              :key="row.student.id"
              class="hover:bg-cream-50 transition-colors cursor-pointer"
              @dblclick="onStudentDblClick(row.student.id)"
            >
              <td class="px-3 py-2 font-medium text-cocoa-900">{{ row.student.name }}</td>
              <td v-for="s in matrixSubjects" :key="s" class="px-3 py-2 text-center" :class="row.scores[s] == null ? 'text-cocoa-300' : row.scores[s] >= 85 ? 'text-mint-500 font-medium' : row.scores[s] < 60 ? 'text-red-400' : 'text-cocoa-700'">
                {{ row.scores[s] ?? '缺' }}
              </td>
              <td class="px-3 py-2 text-center font-medium text-cocoa-900">{{ row.total || '-' }}</td>
              <td class="px-3 py-2 text-center text-cocoa-700">{{ row.avg != null ? row.avg.toFixed(1) : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <!-- 单科录入成绩弹窗 -->
  <Modal v-model="showEntryForm" :title="`录入成绩 · ${selectedExam?.name || ''} · ${selectedSubject}`" width="max-w-2xl">
    <div class="space-y-3">
      <div class="text-sm text-cocoa-400 bg-cream-50 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
        <span>班级：{{ className(classId) }} · 共 {{ students.length }} 名学生。留空表示缺考。</span>
        <span class="text-xs whitespace-nowrap">
          已填 <span class="text-butter-500 font-medium">{{ entryProgress.filled }}</span> / {{ entryProgress.total }} 人
        </span>
      </div>

      <!-- 录入模式切换 -->
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

      <!-- 批量粘贴模式 -->
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
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mint-100 text-mint-500 text-sm font-medium hover:bg-mint-300/30"
            @click="parsePaste"
          >
            <ClipboardPaste class="w-4 h-4" /> 解析填充
          </button>
          <button
            class="px-3 py-1.5 rounded-lg text-cocoa-400 text-sm hover:bg-cream-100"
            @click="pasteText = ''"
          >清空</button>
          <span class="text-xs text-cocoa-400">解析后可切换到「逐个录入」核对</span>
        </div>
      </div>

      <!-- 逐个录入模式 -->
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

      <!-- 文件选择 -->
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

      <!-- 解析后预览（可编辑修正） -->
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
