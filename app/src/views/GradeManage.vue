<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClassStore } from '../stores/class'
import { useGradeStore, calcStat, type GradeStat } from '../stores/grade'
import type { GradeScore } from '../types'
import { useExamStore } from '../stores/exam'
import type { Grade } from '../types'
import { fmtScore } from '../utils/format'
import Modal from '../components/common/Modal.vue'
import EmptyState from '../components/common/EmptyState.vue'
import AIImportPanel from '../components/common/AIImportPanel.vue'
import {
  Plus,
  Save,
  X,
  Trash2,
  BarChart3,
  Edit,
  Upload,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  BarChart,
  LineChart,
  Award,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Trophy,
  Sparkles,
} from 'lucide-vue-next'
import { subjectPalette } from '../seed'
import { useToastStore } from '../stores/toast'
import { parseTableFile, parsePastedText, downloadTXT, downloadExcel, type FormatType } from '../utils/excel'
import { useUserStore, currentTermStr, normalizeTerm } from '../stores/user'
import { classSubjects } from '../utils'

const classStore = useClassStore()
const gradeStore = useGradeStore()
const examStore = useExamStore()
const userStore = useUserStore()
const toast = useToastStore()

const FALLBACK_SUBJECTS = ['语文', '数学', '英语', '科学', '品德', '音乐', '美术', '体育']

const subjects = computed<string[]>(() => {
  const c = filterClass.value ? classStore.getClass(filterClass.value) : null
  return classSubjects(c, FALLBACK_SUBJECTS)
})

/** 取出指定班级下, 考试管理里已存在的考试名称 (按日期倒序去重) */
function examNamesOfClass(classId: string | null | undefined): string[] {
  if (!classId) return []
  const set = new Set<string>()
  const list = examStore.exams
    .filter((e) => e.classId === classId && e.name?.trim())
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
  for (const e of list) {
    set.add(e.name.trim())
  }
  return Array.from(set)
}

/** 找到匹配 (classId + examName + date) 的考试计划, 用于给 grade 关联 examId */
function findExamId(
  classId: string,
  examName: string,
  date: string,
): string | undefined {
  const e = examStore.exams.find(
    (x) => x.classId === classId && x.name.trim() === examName.trim() && x.date === date,
  )
  return e?.id
}

/** 科目默认满分: 语数英 100, 其他 50 (与考试管理默认一致) */
function defaultFullScore(subject: string): number {
  return ['语文', '数学', '英语'].includes(subject) ? 100 : 50
}

/** 取某科目的满分: 优先读考试计划里配置的 subjectFullScores, 否则用默认 */
function fullScoreOf(classId: string, examName: string, date: string, subject: string): number {
  const e = examStore.exams.find(
    (x) => x.classId === classId && x.name.trim() === examName.trim() && x.date === date,
  )
  const cfg = e?.subjectFullScores?.[subject]
  return typeof cfg === 'number' && cfg > 0 ? cfg : defaultFullScore(subject)
}

/**
 * 校验一批分数是否都落在 [0, full] 内 (空值视为缺考, 合法).
 * 返回第一个非法项的描述, 全部合法返回 null.
 */
function validateScores(
  scores: { studentId: string; score: number | null | '' | undefined }[],
  full: number,
  subject: string,
): string | null {
  for (const sc of scores) {
    const raw = sc.score as unknown
    if (raw === null || raw === undefined || raw === '') continue // 缺考
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0 || n > full) {
      const name = classStore.getStudent(sc.studentId)?.name || '某学生'
      return `${subject}「${name}」的分数 ${raw} 超出范围 (0~${full})`
    }
  }
  return null
}

const filterClass = ref<string>(classStore.classes[0]?.id || '')
const filterSubject = ref<string>('all')

const filteredGrades = computed(() => {
  let list = gradeStore.grades
  if (filterClass.value) list = list.filter((g) => g.classId === filterClass.value)
  if (filterSubject.value !== 'all')
    list = list.filter((g) => g.subject === filterSubject.value)
  return list.sort((a, b) => +new Date(b.date) - +new Date(a.date))
})

/**
 * 预计算每个成绩卡片的统计数据（avg/passRate/excellentRate/fullScore）
 * 避免模板中每个卡片重复调用 calcStat 3 次
 */
interface GradeCardStat {
  id: string
  fullScore: number
  avg: number
  passRate: number
  excellentRate: number
  count: number
}
const filteredGradeStats = computed<GradeCardStat[]>(() => {
  return filteredGrades.value.map((g) => {
    const full = fullScoreOf(g.classId, g.examName, g.date, g.subject)
    const stat = calcStat(g.scores, full)
    return {
      id: g.id,
      fullScore: full,
      avg: stat.avg,
      passRate: stat.passRate,
      excellentRate: stat.excellentRate,
      count: stat.count,
    }
  })
})
const gradeStatMap = computed(() => {
  const map = new Map<string, GradeCardStat>()
  for (const s of filteredGradeStats.value) map.set(s.id, s)
  return map
})

// 录入
const editOpen = ref(false)
const editId = ref<string | null>(null)
const edit = ref<Grade | null>(null)
const editSnapshot = ref('')
const entryMode = ref<'single' | 'all' | 'multi'>('single')
const entrySubjects = ref<string[]>([])
// 多科目模式下：额外科目分数（按 学生id 存）
// 主科目（entrySubjects[0]）的分数直接写在 edit.value.scores 上
const extraScores = ref<Record<string, Record<string, number | null>>>({})

/** 录入/编辑弹框中, 当前班级下考试管理里已存在的考试名称 */
const availableExamNames = computed<string[]>(() => {
  if (!edit.value) return []
  return examNamesOfClass(edit.value.classId)
})
/** 录入/编辑弹框中, 当前考试名是否已在考试管理中 (可能为旧数据残留) */
const isOrphanExamName = computed(() => {
  if (!edit.value || !edit.value.examName.trim()) return false
  return !availableExamNames.value.includes(edit.value.examName.trim())
})

/** 当前主科目的满分（动态显示在输入框上方） */
const currentSubjectFullScore = computed(() => {
  if (!edit.value || !entrySubjects.value.length) return 100
  return fullScoreOf(
    edit.value.classId,
    edit.value.examName,
    edit.value.date,
    entrySubjects.value[0],
  )
})

/** 获取某个科目的满分（用于多科模式下每列的 max） */
function subjectFullScore(subject: string): number {
  if (!edit.value) return 100
  return fullScoreOf(edit.value.classId, edit.value.examName, edit.value.date, subject)
}

// 切换班级时, 如果当前考试名不在新班级考试列表里, 自动清空 (避免脏数据)
watch(
  () => edit.value?.classId,
  () => {
    if (!edit.value) return
    if (
      edit.value.examName &&
      !examNamesOfClass(edit.value.classId).includes(edit.value.examName.trim())
    ) {
      edit.value.examName = ''
    }
  },
)

// 切换到「多选」时默认勾上语数英
function switchEntryMode(m: 'single' | 'all' | 'multi') {
  entryMode.value = m
  if (m === 'multi' && !entrySubjects.value.length) {
    entrySubjects.value = ['语文', '数学', '英语'].filter((s) => subjects.value.includes(s))
  }
  if (m === 'all') entrySubjects.value = [...subjects.value]
  ensureExtraScores()
}

function ensureExtraScores() {
  if (!edit.value) return
  if (entryMode.value === 'single') {
    extraScores.value = {}
    return
  }
  // 确保每个非主科目都有每个学生的占位
  const list = entrySubjects.value
  for (const s of list) {
    if (!extraScores.value[s]) extraScores.value[s] = {}
    for (const sc of edit.value.scores) {
      if (!(sc.studentId in extraScores.value[s])) {
        extraScores.value[s][sc.studentId] = null
      }
    }
  }
}

// 接收来自考试管理 / 其他地方的预填参数
const route = useRoute()
const router = useRouter()

// 跳转到学生管理页面添加学生
function goAddStudents() {
  editOpen.value = false
  router.push({ name: 'students', query: { classId: filterClass.value } })
}
function openCreateFromQuery(opts: { classId?: string; examName?: string; subjects?: string[]; date?: string }) {
  if (!opts.classId) {
    toast.warning('缺少班级信息')
    return
  }
  if (!filterClass.value) filterClass.value = opts.classId
  editId.value = null
  entryMode.value = 'single'
  entrySubjects.value = []
  extraScores.value = {}
  filterClass.value = opts.classId
  const subjects = opts.subjects && opts.subjects.length ? opts.subjects : ['语文']
  edit.value = {
    id: '',
    classId: opts.classId,
    subject: subjects[0],
    examName: opts.examName || '',
    date: opts.date || new Date().toISOString().slice(0, 10),
    scores: classStore.studentsOf(opts.classId).map((s) => ({
      studentId: s.id,
      score: null,
    })),
    createdAt: 0,
  }
  if (subjects.length > 1) {
    entryMode.value = 'multi'
    entrySubjects.value = [...subjects]
    extraScores.value = {}
    for (const subj of subjects) {
      extraScores.value[subj] = {}
      for (const sc of edit.value.scores) {
        extraScores.value[subj][sc.studentId] = null
      }
    }
  }
  editSnapshot.value = JSON.stringify(edit.value)
  editOpen.value = true
}

function openCreate() {
  if (!filterClass.value) {
    toast.warning('请先选择班级')
    return
  }
  editId.value = null
  entryMode.value = 'single'
  entrySubjects.value = []
  extraScores.value = {}
  edit.value = {
    id: '',
    classId: filterClass.value,
    subject: filterSubject.value !== 'all' ? filterSubject.value : '语文',
    examName: '',
    date: new Date().toISOString().slice(0, 10),
    scores: classStore.studentsOf(filterClass.value).map((s) => ({
      studentId: s.id,
      score: null,
    })),
    createdAt: 0,
  }
  editSnapshot.value = JSON.stringify(edit.value)
  editOpen.value = true
}

onMounted(() => {
  const q = route.query
  if (q.classId || q.examName) {
    openCreateFromQuery({
      classId: typeof q.classId === 'string' ? q.classId : undefined,
      examName: typeof q.examName === 'string' ? q.examName : undefined,
      subjects:
        typeof q.subjects === 'string' && q.subjects
          ? decodeURIComponent(q.subjects).split(',').filter(Boolean)
          : undefined,
      date: typeof q.date === 'string' ? q.date : undefined,
    })
  }
})

function openEdit(g: Grade) {
  editId.value = g.id
  edit.value = JSON.parse(JSON.stringify(g))
  editSnapshot.value = JSON.stringify(edit.value)
  entryMode.value = 'single'
  entrySubjects.value = [g.subject]
  extraScores.value = {}
  editOpen.value = true
}

function toggleEntrySubject(s: string) {
  const i = entrySubjects.value.indexOf(s)
  if (i >= 0) entrySubjects.value.splice(i, 1)
  else entrySubjects.value.push(s)
  ensureExtraScores()
}

function onExtraScoreInput(subject: string, studentId: string, e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (!extraScores.value[subject]) extraScores.value[subject] = {}
  extraScores.value[subject][studentId] = v === '' ? null : Number(v)
}

/** 录入/编辑弹框是否有未保存的修改 (用于关闭前二次确认) */
const editDirty = computed(
  () => !!edit.value && editOpen.value && JSON.stringify(edit.value) !== editSnapshot.value,
)

function saveEdit() {
  if (!edit.value) return
  if (!edit.value.examName.trim()) {
    toast.warning('请选择考试名称')
    return
  }
  const examName = edit.value.examName.trim()
  const date = edit.value.date

  // 构建待保存的「科目 -> 分数」列表, 逐个做 [0, 满分] 边界校验
  const pending: {
    subject: string
    scores: { studentId: string; score: number | null | '' | undefined }[]
  }[] = []

  if (entryMode.value !== 'multi' || editId.value) {
    // 单科 / 编辑：主科目
    pending.push({ subject: edit.value.subject, scores: edit.value.scores })
  } else {
    const list = [...entrySubjects.value]
    if (!list.length) {
      toast.warning('请选择至少一个科目')
      return
    }
    pending.push({ subject: list[0], scores: edit.value.scores })
    for (let i = 1; i < list.length; i++) {
      const s = list[i]
      const map = extraScores.value[s] || {}
      pending.push({
        subject: s,
        scores: edit.value.scores.map((sc) => ({
          studentId: sc.studentId,
          score: map[sc.studentId] ?? null,
        })),
      })
    }
  }

  for (const p of pending) {
    const full = fullScoreOf(edit.value.classId, examName, date, p.subject)
    const err = validateScores(p.scores, full, p.subject)
    if (err) {
      toast.warning(err)
      return
    }
  }

  // 若考试名不在考试管理中, 自动补建一个最小考试计划 (降低录入门槛)
  if (!availableExamNames.value.includes(examName)) {
    examStore.addExam({
      classId: edit.value.classId,
      name: examName,
      date,
      subjects: pending.map((p) => p.subject),
      term: userStore.user?.term || normalizeTerm(currentTermStr()),
      note: '',
    })
  }

  if (editId.value) {
    gradeStore.updateGrade(editId.value, edit.value)
    toast.success('已保存成绩')
    editOpen.value = false
    return
  }

  if (entryMode.value !== 'multi') {
    const examId = findExamId(edit.value.classId, examName, date)
    gradeStore.addGrade({ ...edit.value, subject: edit.value.subject, examId })
    toast.success(`已录入 ${edit.value.subject} 成绩`)
    editOpen.value = false
    return
  }
  const list = [...entrySubjects.value]
  const baseExamId = findExamId(edit.value.classId, examName, date)
  gradeStore.addGrade({ ...edit.value, subject: list[0], examId: baseExamId })
  for (let i = 1; i < list.length; i++) {
    const s = list[i]
    const map = extraScores.value[s] || {}
    const scores = edit.value.scores.map((sc) => ({
      studentId: sc.studentId,
      score: map[sc.studentId] ?? null,
    }))
    gradeStore.addGrade({
      ...edit.value,
      subject: s,
      scores,
      examId: baseExamId,
    })
  }
  toast.success(`已为 ${list.length} 个科目录入成绩`)
  editOpen.value = false
}

function removeGrade(g: Grade) {
  if (!confirm(`确定删除「${g.examName}」吗？`)) return
  gradeStore.removeGrade(g.id)
  toast.info('已删除')
}

// 详情
const detailOpen = ref(false)
const detail = ref<Grade | null>(null)
const detailStat = computed<GradeStat | null>(() =>
  detail.value
    ? calcStat(
        detail.value.scores,
        fullScoreOf(detail.value.classId, detail.value.examName, detail.value.date, detail.value.subject),
      )
    : null,
)

function openDetail(g: Grade) {
  detail.value = g
  detailOpen.value = true
}

// 从综合分析中打开某次单科详情
function openDetailById(id: string) {
  const g = gradeStore.grades.find((x) => x.id === id) || null
  if (g) {
    detail.value = g
    detailOpen.value = true
  }
}

const distMax = computed(() => {
  if (!detailStat.value) return 1
  return Math.max(...detailStat.value.distribution, 1)
})

function pct(n: number, total: number) {
  if (!total) return 0
  return Math.round((n / total) * 100)
}

// ============ 综合分析 ============
const analysisOpen = ref(false)
const analysisClassId = ref<string>('')
const analysisExamName = ref<string>('')

// 当前班级下的所有考试名称（优先从考试管理里取, 再合并成绩里出现过的）
const analysisExams = computed<string[]>(() => {
  if (!analysisClassId.value) return []
  const set = new Set<string>()
  // 1. 考试管理里已存在的 (这是优先选项)
  for (const e of examStore.exams) {
    if (e.classId === analysisClassId.value && e.name?.trim()) {
      set.add(e.name.trim())
    }
  }
  // 2. 补充: 已有成绩中出现过的考试名 (兼容旧数据, 避免看不到老成绩)
  for (const g of gradeStore.grades) {
    if (g.classId === analysisClassId.value && g.examName.trim()) {
      set.add(g.examName.trim())
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
})

// 当前班级 + 考试的所有科目成绩
const analysisGrades = computed<Grade[]>(() => {
  if (!analysisClassId.value || !analysisExamName.value) return []
  return gradeStore.grades
    .filter(
      (g) =>
        g.classId === analysisClassId.value && g.examName.trim() === analysisExamName.value,
    )
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
})

interface SubjectStat {
  subject: string
  stat: GradeStat
  gradeId: string
  full: number
}

const analysisStats = computed<SubjectStat[]>(() =>
  analysisGrades.value.map((g) => {
    const full = fullScoreOf(g.classId, g.examName, g.date, g.subject)
    return {
      subject: g.subject,
      gradeId: g.id,
      full,
      stat: calcStat(g.scores, full),
    }
  }),
)

// 分数段分布图纵轴最大值（跨所有科目，保证柱状可对比且清晰可见）
const analysisDistMax = computed(() => {
  let m = 0
  for (const s of analysisStats.value) {
    for (const c of s.stat.distribution) if (c > m) m = c
  }
  return m
})

// 各科平均分对比曲线图数据（按满分归一化到 0-100%，便于横向对比）
const curveChart = computed(() => {
  const stats = analysisStats.value
  if (!stats.length) return null
  const w = 800
  const h = 208
  const pad = { top: 20, right: 24, bottom: 40, left: 44 }
  const plotW = w - pad.left - pad.right
  const plotH = h - pad.top - pad.bottom
  const n = stats.length
  const points = stats.map((s, i) => {
    const x = pad.left + (n === 1 ? plotW / 2 : i * (plotW / (n - 1)))
    const pct = s.full ? s.stat.avg / s.full : 0
    const y = pad.top + plotH - pct * plotH
    return {
      subject: s.subject,
      avg: s.stat.avg,
      pct,
      x,
      y,
      colorClass: subjectPalette[s.subject]?.text || 'text-cocoa-500',
    }
  })
  let path = ''
  if (n === 1) {
    path = `M ${points[0].x} ${points[0].y}`
  } else {
    path = `M ${points[0].x} ${points[0].y}`
    for (let i = 0; i < n - 1; i++) {
      const p0 = points[i - 1] || points[i]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[i + 2] || p2
      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
  }
  return { w, h, pad, points, path }
})

// 班级层面的聚合（参考人数/总人次），所有科目合并
// 及格率/优秀率按「各科满分」分别判定后汇总，避免不同满分的科目被统一按 100 分误算
const analysisAggregate = computed<GradeStat | null>(() => {
  if (!analysisGrades.value.length) return null
  let total = 0
  let passSum = 0
  let excSum = 0
  const allScores: GradeScore[] = []
  for (const g of analysisGrades.value) {
    const fs = fullScoreOf(g.classId, g.examName, g.date, g.subject)
    for (const sc of g.scores) {
      const raw = sc.score as unknown
      if (raw === null || raw === undefined || raw === '') continue
      const n = Number(raw)
      if (!Number.isFinite(n)) continue
      total++
      if (n >= fs * 0.6) passSum++
      if (n >= fs * 0.9) excSum++
      allScores.push(sc)
    }
  }
  const base = calcStat(allScores, 100) // 分布/均值等按 0-100 粗略展示
  base.passRate = total ? Math.round((passSum / total) * 1000) / 10 : 0
  base.excellentRate = total ? Math.round((excSum / total) * 1000) / 10 : 0
  return base
})

// 学生综合总分（每名学生，所有科目的总分）
interface StudentTotal {
  studentId: string
  name: string
  total: number
  avg: number
  count: number
  rank: number
}

const analysisStudentTotals = computed<StudentTotal[]>(() => {
  if (!analysisGrades.value.length) return []
  const map = new Map<string, { total: number; count: number }>()
  for (const g of analysisGrades.value) {
    for (const sc of g.scores) {
      const raw = sc.score as unknown
      if (raw === null || raw === undefined || raw === '') continue
      const n = Number(raw)
      if (!Number.isFinite(n)) continue
      const cur = map.get(sc.studentId) || { total: 0, count: 0 }
      cur.total += n
      cur.count += 1
      map.set(sc.studentId, cur)
    }
  }
  const list: Omit<StudentTotal, 'rank'>[] = []
  for (const [studentId, v] of map.entries()) {
    const name = classStore.getStudent(studentId)?.name || '已删除'
    list.push({
      studentId,
      name,
      total: v.total,
      count: v.count,
      avg: Math.round((v.total / v.count) * 10) / 10,
    })
  }
  list.sort((a, b) => b.total - a.total)
  return list.map((s, i): StudentTotal => ({ ...s, rank: i + 1 }))
})

// 真实雷达：各科平均分
const radarSubjectsA = computed<string[]>(() => analysisStats.value.map((s) => s.subject))
const radarValues = computed<number[]>(() => analysisStats.value.map((s) => s.stat.avg))
function radarPoint(i: number, r: number): [number, number] {
  const n = radarSubjectsA.value.length || 1
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2
  return [160 + Math.cos(angle) * 90 * r, 110 + Math.sin(angle) * 60 * r]
}

function openAnalysis() {
  analysisClassId.value = filterClass.value || classStore.classes[0]?.id || ''
  // 默认选最近一次考试
  const exs = analysisExams.value
  if (exs.length) {
    // 按出现顺序（已 locale 排序），先取最后一个字母序靠后的作为默认
    analysisExamName.value = exs[exs.length - 1]
  } else {
    analysisExamName.value = ''
  }
  analysisNoteDraft.value = analysisExamForNote.value?.analysisNote || ''
  analysisOpen.value = true
}

// 本次考试分析情况描述（关联到对应考试计划，与「考试管理」双击分析保持一致）
const analysisNoteDraft = ref('')
const analysisExamForNote = computed(() => {
  if (!analysisClassId.value || !analysisExamName.value) return null
  return (
    examStore.exams.find(
      (e) =>
        e.classId === analysisClassId.value &&
        e.name.trim() === analysisExamName.value.trim(),
    ) || null
  )
})
watch([analysisClassId, analysisExamName], () => {
  analysisNoteDraft.value = analysisExamForNote.value?.analysisNote || ''
})
function saveAnalysisNote() {
  if (analysisExamForNote.value) {
    examStore.updateExam(analysisExamForNote.value.id, {
      analysisNote: analysisNoteDraft.value,
    })
    toast.success('已保存分析描述')
  } else {
    toast.warning('未找到对应的考试计划，无法保存描述')
  }
}

function closeAnalysis() {
  analysisOpen.value = false
}

// 学科内分数段迷你柱状图用：返回 { height: 'xx%' }
function miniBarStyle(s: SubjectStat, i: number) {
  const c = s.stat.distribution[i]
  const max = Math.max(...s.stat.distribution, 1)
  const h = (c / max) * 100
  return { height: (h || 4) + '%' }
}

// 班级切换时，若当前考试名不在新班级下则重置
watch(
  () => analysisClassId.value,
  () => {
    if (analysisExamName.value && !analysisExams.value.includes(analysisExamName.value)) {
      const exs = analysisExams.value
      analysisExamName.value = exs.length ? exs[exs.length - 1] : ''
    }
  },
)

// ============ 批量导入 ============
const importOpen = ref(false)
type ImportMode = 'single' | 'multi' | 'ai'
const importMode = ref<ImportMode>('single')
const importClass = ref<string>(classStore.classes[0]?.id || '')
const importSubject = ref<string>('语文')
const importSubjects = ref<string[]>(['语文', '数学', '英语'])
const importExamName = ref<string>('')
const importDate = ref<string>(new Date().toISOString().slice(0, 10))
const importText = ref<string>('')
const importFile = ref<File | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)
const importHeaders = ref<string[]>([])
const importFileRows = ref<string[][]>([])

/** AI 智能识别: 把 records 转成 importFileRows, 自动判断单/多科 */
function onAiRecords(records: Record<string, unknown>[]) {
  if (!records.length) {
    importHeaders.value = []
    importFileRows.value = []
    return
  }
  // 探测: 若首条记录里出现 importSubjects 中至少 2 个科目名, 视为多科
  const first = records[0]
  const keys = Object.keys(first)
  const subjectSet = new Set(importSubjects.value)
  const matchedSubjects = keys.filter((k) => subjectSet.has(k))
  if (matchedSubjects.length >= 2) {
    // 多科模式
    const headers = ['姓名', ...matchedSubjects, '学号']
    const rows = records.map((r) => {
      const row: string[] = [String(r.name ?? '').trim()]
      for (const s of matchedSubjects) row.push(String(r[s] ?? '').trim())
      row.push(String(r.studentNo ?? '').trim())
      return row
    })
    importHeaders.value = headers
    importFileRows.value = rows
    importMode.value = 'multi'
    toast.success('已合并到多科预览, 可直接「确认导入」')
  } else {
    // 单科模式
    const headers = ['姓名', importSubject.value, '学号']
    const rows = records.map((r) => [
      String(r.name ?? '').trim(),
      String(r.score ?? r[importSubject.value] ?? '').trim(),
      String(r.studentNo ?? '').trim(),
    ])
    importHeaders.value = headers
    importFileRows.value = rows
    importMode.value = 'single'
    toast.success('已合并到单科预览, 可直接「确认导入」')
  }
}

/** 批量导入弹框中, 当前班级下考试管理里已存在的考试名称 */
const importAvailableExamNames = computed<string[]>(() =>
  examNamesOfClass(importClass.value),
)
/** 批量导入弹框中, 当前考试名是否仍在考试管理中 (可能为旧数据残留) */
const importIsOrphanExamName = computed(() => {
  if (!importExamName.value.trim()) return false
  return !importAvailableExamNames.value.includes(importExamName.value.trim())
})

// 切换班级时, 同步把不合法考试名清空
watch(importClass, () => {
  if (
    importExamName.value &&
    !examNamesOfClass(importClass.value).includes(importExamName.value.trim())
  ) {
    importExamName.value = ''
  }
})

interface ParsedRow {
  name: string
  studentId: string | null
  scores: { subject: string; score: number | null }[]
  ok: boolean
  reason?: string
}

// 当前用于预览的数据源：优先用文件解析，否则用粘贴文本
const currentRows = computed<string[][]>(() => {
  if (importFileRows.value.length) return importFileRows.value
  if (!importText.value.trim()) return []
  const { rows } = parsePastedText(importText.value)
  return rows
})

const currentHeaders = computed<string[]>(() => {
  if (importFileRows.value.length) return importHeaders.value
  if (!importText.value.trim()) return []
  return parsePastedText(importText.value).headers
})

const parsedRows = computed<ParsedRow[]>(() => {
  const lines = currentRows.value
  if (!lines.length) return []

  const students = classStore.studentsOf(importClass.value)
  const nameToStudent = new Map<string, string>()
  const noToStudent = new Map<string, string>()
  for (const s of students) {
    nameToStudent.set(s.name.trim(), s.id)
    if (s.studentNo) noToStudent.set(s.studentNo.trim(), s.id)
  }

  // 智能识别表头：姓名/学号/分数
  const firstLine = lines[0] || []
  const firstCell = (firstLine[0] || '').trim().toLowerCase()
  const looksLikeHeader = ['姓名', '名字', '学生', 'name', 'student', '学号', '编号', 'no', 'id'].some(
    (k) => firstCell === k.toLowerCase(),
  )
  // 判断第一列是不是学号（如果表头是"学号"或第一行数据都是数字）
  const firstColIsNo = looksLikeHeader && ['学号', '编号', 'no', 'id'].includes(firstCell)
  const dataLines = looksLikeHeader ? lines.slice(1) : lines

  // 匹配学生：优先按学号，其次按姓名
  function matchStudent(nameOrNo: string): string | null {
    const key = nameOrNo.trim()
    if (!key) return null
    // 先尝试学号匹配
    if (noToStudent.has(key)) return noToStudent.get(key)!
    // 再尝试姓名匹配
    if (nameToStudent.has(key)) return nameToStudent.get(key)!
    return null
  }

  // 获取当前模式下某科目的满分
  function getFullScore(subject: string): number {
    if (!importExamName.value.trim()) return defaultFullScore(subject)
    const e = examStore.exams.find(
      (x) => x.classId === importClass.value && x.name.trim() === importExamName.value.trim(),
    )
    const cfg = e?.subjectFullScores?.[subject]
    return typeof cfg === 'number' && cfg > 0 ? cfg : defaultFullScore(subject)
  }

  if (importMode.value === 'single') {
    const full = getFullScore(importSubject.value)
    return dataLines.map((parts) => {
      const nameOrNo = (parts[0] || '').trim()
      const scoreStr = (parts[1] || '').trim()
      let score: number | null = null
      if (scoreStr !== '' && scoreStr !== '-' && scoreStr !== '缺') {
        const n = Number(scoreStr)
        score = isNaN(n) ? null : n
      }
      const studentId = matchStudent(nameOrNo)
      return {
        name: nameOrNo,
        studentId,
        scores: [{ subject: importSubject.value, score }],
        ok:
          !!studentId &&
          (score === null || (!isNaN(score as number) && (score as number) >= 0 && (score as number) <= full)),
        reason: !nameOrNo
          ? '姓名/学号为空'
          : !studentId
            ? '未找到该学生'
            : score !== null && (isNaN(score as number) || (score as number) < 0 || (score as number) > full)
              ? `分数需在 0~${full}`
              : undefined,
      }
    })
  } else {
    // multi: 第一列姓名/学号，之后按 importSubjects 顺序对应
    return dataLines.map((parts) => {
      const nameOrNo = (parts[0] || '').trim()
      const studentId = matchStudent(nameOrNo)
      const scores: { subject: string; score: number | null }[] = importSubjects.value.map((sub, i) => {
        const v = (parts[i + 1] || '').trim()
        if (v === '' || v === '-' || v === '缺') return { subject: sub, score: null }
        const n = Number(v)
        return { subject: sub, score: isNaN(n) ? null : n }
      })
      // 按各科满分分别校验
      const allValid = scores.every((s) => {
        if (s.score === null) return true
        const full = getFullScore(s.subject)
        return s.score >= 0 && s.score <= full
      })
      const invalidSub = scores.find((s) => s.score !== null && (s.score < 0 || s.score > getFullScore(s.subject)))
      return {
        name: nameOrNo,
        studentId,
        scores,
        ok: !!studentId && allValid,
        reason: !nameOrNo
          ? '姓名/学号为空'
          : !studentId
            ? '未找到该学生'
            : !allValid
              ? `存在非法分数（${invalidSub?.subject} 满分 ${getFullScore(invalidSub?.subject || '')}）`
              : undefined,
      }
    })
  }
})

const validCount = computed(() => parsedRows.value.filter((r) => r.ok).length)
const invalidCount = computed(() => parsedRows.value.length - validCount.value)

function openImport() {
  importClass.value = filterClass.value || classStore.classes[0]?.id || ''
  importSubject.value = filterSubject.value !== 'all' ? filterSubject.value : '语文'
  importMode.value = 'single'
  importExamName.value = ''
  importText.value = ''
  importFile.value = null
  importFileRows.value = []
  importHeaders.value = []
  // 提前校验: 该班级是否在考试管理中已有考试计划
  if (importClass.value && !examNamesOfClass(importClass.value).length) {
    toast.warning('该班级暂无考试计划, 请先在「考试管理」中创建')
    // 不直接 return, 仍打开弹框, 让用户看到提示
  }
  importOpen.value = true
}

function toggleImportSubject(s: string) {
  const i = importSubjects.value.indexOf(s)
  if (i >= 0) importSubjects.value.splice(i, 1)
  else importSubjects.value.push(s)
  if (!importSubjects.value.length) importSubjects.value.push(s)
}

function pickImportFile() {
  importFileInput.value?.click()
}

async function onImportFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  importFile.value = file
  importText.value = ''
  try {
    const { headers, rows } = await parseTableFile(file)
    importHeaders.value = headers
    importFileRows.value = rows
    toast.success(`已解析 ${rows.length} 行数据`)
  } catch (err) {
    console.error(err)
    toast.error('文件解析失败：' + (err as Error).message)
    importFileRows.value = []
  }
  (e.target as HTMLInputElement).value = ''
}

function clearImportFile() {
  importFile.value = null
  importFileRows.value = []
  importHeaders.value = []
}

async function downloadTemplate(fmt: FormatType) {
  if (!importClass.value) {
    toast.warning('请先选择班级')
    return
  }
  const students = classStore.studentsOf(importClass.value)
  if (!students.length) {
    toast.warning('该班级暂无学生')
    return
  }
  const cls = classStore.getClass(importClass.value)
  let headerRow: string[]
  let dataRows: string[][]
  if (importMode.value === 'single') {
    headerRow = ['姓名', importSubject.value]
    dataRows = students.map((s) => [s.name, ''])
  } else {
    headerRow = ['姓名', ...importSubjects.value]
    dataRows = students.map((s) => [s.name, ...importSubjects.value.map(() => '')])
  }

  if (fmt === 'xlsx') {
    const baseName = `${cls?.name || '班级'}_${importExamName.value || '成绩'}_${importMode.value === 'single' ? importSubject.value : '多科'}`
    await downloadExcel(`${baseName}.xlsx`, '成绩', [headerRow, ...dataRows])
  } else {
    const baseName = `${cls?.name || '班级'}_${importExamName.value || '成绩'}_${importMode.value === 'single' ? importSubject.value : '多科'}`
    const content = [headerRow.join('\t'), ...dataRows.map((r) => r.join('\t'))].join('\n')
    downloadTXT(`${baseName}.txt`, content)
  }
  toast.success(`${fmt === 'xlsx' ? 'Excel' : 'TXT'} 模板已下载`)
}

function confirmImport() {
  if (!importClass.value) {
    toast.warning('请选择班级')
    return
  }
  if (!importExamName.value.trim()) {
    toast.warning('请选择考试名称')
    return
  }
  if (importMode.value === 'single' && !importSubject.value) {
    toast.warning('请选择科目')
    return
  }
  if (importMode.value === 'multi' && !importSubjects.value.length) {
    toast.warning('请至少选择一个科目')
    return
  }
  const valid = parsedRows.value.filter((r) => r.ok && r.studentId)
  if (!valid.length) {
    toast.error('没有可导入的有效数据')
    return
  }

  // 重复导入检测：检查该班级+考试+科目是否已有成绩
  const subjects = importMode.value === 'single' ? [importSubject.value] : importSubjects.value
  const existingSubjects: string[] = []
  for (const sub of subjects) {
    const exists = gradeStore.grades.some(
      (g) =>
        g.classId === importClass.value &&
        g.examName === importExamName.value.trim() &&
        g.subject === sub,
    )
    if (exists) existingSubjects.push(sub)
  }

  // 如果有重复科目，弹出确认
  if (existingSubjects.length) {
    const msg = `「${existingSubjects.join('、')}」已有该考试的成绩记录，是否覆盖导入？\n\n（覆盖会更新已有学生的分数，不影响其他学生）`
    if (!confirm(msg)) return
  }

  // 若考试名不在考试管理中, 自动补建一个最小考试计划 (降低录入门槛)
  if (!importAvailableExamNames.value.includes(importExamName.value.trim())) {
    examStore.addExam({
      classId: importClass.value,
      name: importExamName.value.trim(),
      date: importDate.value,
      subjects:
        importMode.value === 'single' ? [importSubject.value] : [...importSubjects.value],
      term: userStore.user?.term || normalizeTerm(currentTermStr()),
      note: '',
    })
  }

  if (importMode.value === 'single') {
    const scores = valid.map((r) => ({
      studentId: r.studentId!,
      score: r.scores[0]?.score ?? null,
    }))
    const { created } = gradeStore.mergeGrade({
      classId: importClass.value,
      subject: importSubject.value,
      examName: importExamName.value.trim(),
      date: importDate.value,
      scores,
    })
    toast.success(created
      ? `已导入「${importSubject.value}」${scores.length} 条成绩`
      : `已更新「${importSubject.value}」${scores.length} 条成绩`
    )
  } else {
    const subs = importSubjects.value
    const examName = importExamName.value.trim()
    let created = 0
    let updated = 0
    for (const sub of subs) {
      const scores = valid
        .map((r) => {
          const sc = r.scores.find((x) => x.subject === sub)
          return { studentId: r.studentId!, score: sc?.score ?? null }
        })
        .filter((x) => x.score !== null)
      if (!scores.length) continue
      const result = gradeStore.mergeGrade({
        classId: importClass.value,
        subject: sub,
        examName,
        date: importDate.value,
        scores,
      })
      if (result.created) created++
      else updated++
    }
    const parts: string[] = []
    if (created) parts.push(`新增 ${created} 科`)
    if (updated) parts.push(`更新 ${updated} 科`)
    toast.success(`已导入成绩（${parts.join('，')}），共 ${valid.length} 名学生`)
  }
  importText.value = ''
  importFile.value = null
  importFileRows.value = []
  importHeaders.value = []
  importOpen.value = false
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col md:flex-row gap-3 md:items-center justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="filterClass"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option
            v-for="c in classStore.classes"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
        <select
          v-model="filterSubject"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option value="all">
            全部科目
          </option>
          <option
            v-for="s in subjects"
            :key="s"
            :value="s"
          >
            {{ s }}
          </option>
        </select>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="btn-secondary"
          @click="openAnalysis"
        >
          <LineChart :size="14" /> 综合分析
        </button>
        <button
          class="btn-secondary"
          @click="openImport"
        >
          <ClipboardList :size="14" /> 批量导入
        </button>
        <button
          class="btn-primary"
          @click="openCreate"
        >
          <Plus :size="14" /> 录入新成绩
        </button>
      </div>
    </div>

    <div
      v-if="filteredGrades.length"
      class="grid lg:grid-cols-2 gap-4"
    >
      <div
        v-for="g in filteredGrades"
        :key="g.id"
        class="card-soft p-5 hover:-translate-y-0.5 transition cursor-pointer"
        @click="openDetail(g)"
      >
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span
                class="chip"
                :class="subjectPalette[g.subject]?.bg || 'bg-butter-100'"
              >
                {{ g.subject }}
              </span>
              <h3 class="title-display text-lg">
                {{ g.examName }}
              </h3>
            </div>
            <div class="text-xs text-cocoa-500 mt-1.5">
              {{ classStore.getClass(g.classId)?.name }} · {{ g.date }}
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button
              class="p-1.5 rounded-full hover:bg-butter-100"
              @click.stop="openEdit(g)"
            >
              <Edit :size="14" />
            </button>
            <button
              class="p-1.5 rounded-full hover:bg-sakura-100"
              @click.stop="removeGrade(g)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
        <div class="mt-4 grid grid-cols-4 gap-2 text-center">
          <div class="card-flat p-2">
            <div class="text-[10px] text-cocoa-500">
              参考
            </div>
            <div class="number text-lg">
              {{ gradeStatMap.get(g.id)?.count || g.scores.length }}
            </div>
          </div>
          <div class="card-flat p-2">
            <div class="text-[10px] text-cocoa-500">
              平均
            </div>
            <div class="number text-lg text-butter-600">
              {{ fmtScore(gradeStatMap.get(g.id)?.avg || 0) }}
            </div>
          </div>
          <div class="card-flat p-2">
            <div class="text-[10px] text-cocoa-500">
              及格率
            </div>
            <div class="number text-lg text-mint-500">
              {{ gradeStatMap.get(g.id)?.passRate || 0 }}%
            </div>
          </div>
          <div class="card-flat p-2">
            <div class="text-[10px] text-cocoa-500">
              优秀率
            </div>
            <div class="number text-lg text-sakura-500">
              {{ gradeStatMap.get(g.id)?.excellentRate || 0 }}%
            </div>
          </div>
        </div>
      </div>
    </div>
    <EmptyState
      v-else
      title="还没有成绩记录"
      desc="录入第一次考试，AI 帮你自动统计"
      icon="📊"
    >
      <div class="flex gap-2 justify-center">
        <button
          class="btn-secondary"
          @click="openImport"
        >
          <ClipboardList :size="14" /> 批量导入
        </button>
        <button
          class="btn-primary"
          @click="openCreate"
        >
          <Plus :size="14" /> 立即录入
        </button>
      </div>
    </EmptyState>

    <!-- 录入弹窗 -->
    <Modal
      :open="editOpen"
      :title="editId ? '编辑成绩' : '录入成绩'"
      width="820px"
      :dirty="editDirty"
      @close="editOpen = false"
    >
      <div
        v-if="edit"
        class="space-y-3"
      >
        <!-- 模式切换（仅新增时显示） -->
        <div
          v-if="!editId"
          class="flex items-center gap-2 flex-wrap"
        >
          <span class="text-xs text-cocoa-500">录入模式：</span>
          <button
            class="chip border transition"
            :class="
              entryMode === 'single'
                ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
            "
            @click="entryMode = 'single'"
          >
            🎯 单科
          </button>
          <button
            class="chip border transition"
            :class="
              entryMode === 'all'
                ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
            "
            @click="switchEntryMode('all')"
          >
            ✨ 全部科目
          </button>
          <button
            class="chip border transition"
            :class="
              entryMode === 'multi'
                ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
            "
            @click="switchEntryMode('multi')"
          >
            ☑️ 多选科目
          </button>
        </div>

        <div class="grid grid-cols-4 gap-3">
          <div class="col-span-2">
            <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
              考试名称
              <span class="text-sakura-500 text-[10px]">（仅可从考试管理中选择）</span>
            </label>
            <input
              v-model="edit.examName"
              list="examNames-edit"
              class="input-soft mt-1"
              placeholder="输入或选择考试名称"
            >
            <datalist id="examNames-edit">
              <option
                v-for="n in availableExamNames"
                :key="n"
                :value="n"
              />
            </datalist>
            <div
              v-if="isOrphanExamName"
              class="text-[10px] text-sakura-500 mt-1 flex items-center gap-1"
            >
              <AlertCircle :size="10" /> 该考试计划已不在考试管理中, 建议先在考试管理中创建, 再录入成绩
            </div>
            <div
              v-else-if="!availableExamNames.length"
              class="text-[10px] text-sakura-500 mt-1 flex items-center gap-1"
            >
              <AlertCircle :size="10" /> 该班级暂无考试计划, 请先在「考试管理」中创建
            </div>
          </div>
          <div v-if="entryMode === 'single' || editId">
            <label class="text-xs text-cocoa-500 ml-1">科目</label>
            <select
              v-model="edit.subject"
              class="input-soft mt-1"
            >
              <option
                v-for="s in subjects"
                :key="s"
                :value="s"
              >
                {{ s }}
              </option>
            </select>
          </div>
          <div v-else-if="entryMode === 'all'">
            <label class="text-xs text-cocoa-500 ml-1">科目（全部）</label>
            <div class="input-soft mt-1 flex items-center text-sm text-butter-600 font-medium">
              {{ subjects.length }} 科全选
            </div>
          </div>
          <div v-else>
            <label class="text-xs text-cocoa-500 ml-1">科目（已选 {{ entrySubjects.length }}）</label>
            <div class="input-soft mt-1 flex items-center gap-1 flex-wrap text-xs">
              <span
                v-for="s in entrySubjects"
                :key="s"
                class="chip bg-butter-200 text-cocoa-900"
              >
                {{ s }}
              </span>
              <span
                v-if="!entrySubjects.length"
                class="text-cocoa-300"
              >未选</span>
            </div>
          </div>
          <div>
            <label class="text-xs text-cocoa-500 ml-1">日期</label>
            <input
              v-model="edit.date"
              type="date"
              class="input-soft mt-1"
            >
          </div>
        </div>

        <!-- 多选模式：可勾选科目 -->
        <div v-if="entryMode === 'multi' && !editId">
          <label class="text-xs text-cocoa-500 ml-1">选择要录入的科目</label>
          <div class="mt-1 flex flex-wrap gap-2">
            <button
              v-for="s in subjects"
              :key="s"
              class="chip border transition"
              :class="
                entrySubjects.includes(s)
                  ? `${subjectPalette[s]?.bg || 'bg-butter-300'} border-butter-500 text-cocoa-900`
                  : 'bg-white/70 border-white-80 text-cocoa-700 hover:bg-butter-100'
              "
              @click="toggleEntrySubject(s)"
            >
              {{ entrySubjects.includes(s) ? '✓ ' : '' }}{{ s }}
            </button>
          </div>
        </div>

        <div>
          <label class="text-xs text-cocoa-500 ml-1">
            分数（满分 {{ currentSubjectFullScore }}）
          </label>
          <div class="card-flat p-3 mt-1 max-h-[400px] overflow-y-auto">
            <!-- 无学生提示 -->
            <div
              v-if="!edit.scores.length"
              class="text-center py-8"
            >
              <div class="text-3xl mb-2">🧒</div>
              <p class="text-sm text-cocoa-600 mb-1">该班级还没有学生</p>
              <p class="text-xs text-cocoa-400 mb-4">请先添加学生后再录入成绩</p>
              <button
                class="btn-primary !py-1.5 !px-4 text-sm inline-flex items-center gap-1"
                @click="goAddStudents"
              >
                <Plus :size="14" /> 去添加学生
              </button>
            </div>
            <template v-else-if="entryMode === 'single' || editId">
              <!-- 单科：每生一行，2 列 -->
              <div class="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                <div
                  v-for="(s, i) in edit.scores"
                  :key="s.studentId"
                  class="flex items-center gap-2"
                >
                  <div class="w-24 truncate text-sm text-cocoa-700">
                    {{ classStore.getStudent(s.studentId)?.name || '已删除' }}
                  </div>
                  <input
                    v-model.number="edit!.scores[i].score"
                    type="number"
                    min="0"
                    :max="currentSubjectFullScore"
                    class="input-soft !py-1.5 text-sm w-20"
                    placeholder="-"
                  >
                  <span class="text-xs text-cocoa-300">分</span>
                </div>
              </div>
            </template>
            <template v-else>
              <!-- 多科：每生一行，多列（科目 = 列） -->
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left border-b border-cocoa-100/60">
                    <th class="py-1.5 pr-3 text-cocoa-500 font-normal w-24">
                      学生
                    </th>
                    <th
                      v-for="s in entrySubjects"
                      :key="s"
                      class="py-1.5 px-2 text-cocoa-700 font-medium text-center"
                    >
                      <div
                        class="inline-flex items-center gap-1 chip text-[10px]"
                        :class="subjectPalette[s]?.bg || 'bg-butter-100'"
                      >
                        {{ s }}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(sc, i) in edit.scores"
                    :key="sc.studentId"
                    class="border-b border-cocoa-100/40 last:border-b-0 hover:bg-butter-50/40"
                  >
                    <td class="py-1.5 pr-3 truncate text-cocoa-700">
                      {{ classStore.getStudent(sc.studentId)?.name || '已删除' }}
                    </td>
                    <td
                      v-for="s in entrySubjects"
                      :key="s + '-' + sc.studentId"
                      class="py-1.5 px-2 text-center"
                    >
                      <input
                        v-if="s === entrySubjects[0]"
                        v-model.number="edit!.scores[i].score"
                        type="number"
                        min="0"
                        :max="subjectFullScore(s)"
                        class="input-soft !py-1 text-xs w-16 text-center"
                        placeholder="-"
                      >
                      <input
                        v-else
                        :value="extraScores[s]?.[sc.studentId] ?? null"
                        type="number"
                        min="0"
                        :max="subjectFullScore(s)"
                        class="input-soft !py-1 text-xs w-16 text-center"
                        placeholder="-"
                        @input="onExtraScoreInput(s, sc.studentId, $event)"
                      >
                    </td>
                  </tr>
                </tbody>
              </table>
            </template>
          </div>
        </div>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="editOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="saveEdit"
        >
          <Save :size="14" /> 保存
        </button>
      </template>
    </Modal>

    <!-- 批量导入弹窗 -->
    <Modal
      :open="importOpen"
      title="批量导入成绩"
      width="820px"
      @close="importOpen = false"
    >
      <div class="space-y-4">
        <!-- 模式切换 -->
        <div class="flex items-center gap-2 flex-wrap">
          <span class="text-xs text-cocoa-500">导入模式：</span>
          <button
            class="chip border transition"
            :class="
              importMode === 'single'
                ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
            "
            @click="importMode = 'single'"
          >
            <FileSpreadsheet :size="12" /> 单科成绩
          </button>
          <button
            class="chip border transition"
            :class="
              importMode === 'multi'
                ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
            "
            @click="importMode = 'multi'"
          >
            <FileSpreadsheet :size="12" /> 多科成绩
          </button>
          <button
            class="chip border transition"
            :class="
              importMode === 'ai'
                ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
            "
            @click="importMode = 'ai'"
          >
            <Sparkles :size="12" /> AI 智能识别
          </button>
        </div>

        <!-- AI 智能识别面板 -->
        <AIImportPanel
          v-if="importMode === 'ai'"
          :schema="{
            name: 'grades',
            fields: {
              name: '学生姓名 (必填)',
              score: '分数 (0-100 数字, 缺考填 -1 或留空)',
              studentNo: '学号 (可空, 用于辅助匹配)',
            },
            example: {
              name: '张三',
              score: 92,
              studentNo: '2025001',
            },
            extra:
              '多科模式请额外输出每个科目字段 (字段名 = 科目名, 如 语文/数学/英语). 学生姓名保留原始写法. 分数缺失或缺考请填 -1.',
          }"
          placeholder="把成绩文本粘贴到此处, 例如:&#10;张三 92&#10;李四 缺考&#10;或: 张三 语文92 数学85 英语78&#10;或 Excel 复制粘贴的整块表格"
          :textarea-min-height="160"
          :on-parsed="onAiRecords"
        />

        <!-- 模板导入模式 (single/multi) -->
        <template v-if="importMode !== 'ai'">
          <!-- 基本信息 -->
          <div class="grid grid-cols-4 gap-3">
            <div class="col-span-2">
              <label class="text-xs text-cocoa-500 ml-1 flex items-center gap-1">
                考试名称
                <span class="text-sakura-500 text-[10px]">（仅可从考试管理中选择）</span>
              </label>
              <input
                v-model="importExamName"
                list="examNames-import"
                class="input-soft mt-1"
                placeholder="输入或选择考试名称"
              >
              <datalist id="examNames-import">
                <option
                  v-for="n in importAvailableExamNames"
                  :key="n"
                  :value="n"
                />
              </datalist>
              <div
                v-if="importIsOrphanExamName"
                class="text-[10px] text-sakura-500 mt-1 flex items-center gap-1"
              >
                <AlertCircle :size="10" /> 该考试计划已不在考试管理中
              </div>
              <div
                v-else-if="!importAvailableExamNames.length"
                class="text-[10px] text-sakura-500 mt-1 flex items-center gap-1"
              >
                <AlertCircle :size="10" /> 该班级暂无考试计划, 请先在「考试管理」中创建
              </div>
            </div>
            <div>
              <label class="text-xs text-cocoa-500 ml-1">班级</label>
              <select
                v-model="importClass"
                class="input-soft mt-1"
              >
                <option
                  v-for="c in classStore.classes"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="text-xs text-cocoa-500 ml-1">考试日期</label>
              <input
                v-model="importDate"
                type="date"
                class="input-soft mt-1"
              >
            </div>
          </div>

          <!-- 科目选择 -->
          <div v-if="importMode === 'single'">
            <label class="text-xs text-cocoa-500 ml-1">导入的科目</label>
            <div class="mt-1 flex flex-wrap gap-2">
              <button
                v-for="s in subjects"
                :key="s"
                class="chip border transition"
                :class="
                  importSubject === s
                    ? `${subjectPalette[s]?.bg || 'bg-butter-300'} border-butter-500 text-cocoa-900`
                    : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
                "
                @click="importSubject = s"
              >
                {{ s }}
              </button>
            </div>
          </div>
          <div v-else>
            <label class="text-xs text-cocoa-500 ml-1">导入的科目（可多选）</label>
            <div class="mt-1 flex flex-wrap gap-2">
              <button
                v-for="s in subjects"
                :key="s"
                class="chip border transition"
                :class="
                  importSubjects.includes(s)
                    ? `${subjectPalette[s]?.bg || 'bg-butter-300'} border-butter-500 text-cocoa-900`
                    : 'bg-white/70 border-white/80 text-cocoa-700 hover:bg-butter-100'
                "
                @click="toggleImportSubject(s)"
              >
                {{ s }}
              </button>
            </div>
            <p class="text-[11px] text-cocoa-500 mt-1.5">
              每一行的第 2~N 列对应所选科目的顺序（按勾选先后），例：勾选「语文 → 数学 → 英语」后，一行格式为：<code>姓名 语文分 数学分 英语分</code>
            </p>
          </div>

          <!-- 模板下载 -->
          <div class="card-flat p-3">
            <div class="flex items-center justify-between flex-wrap gap-2">
              <div class="text-sm font-medium">
                第一步：下载模板（按所选班级/科目生成）
              </div>
              <div class="flex gap-2">
                <button
                  class="btn-secondary !py-1.5 !px-3 text-xs"
                  @click="downloadTemplate('txt')"
                >
                  <FileText :size="12" /> TXT 模板
                </button>
                <button
                  class="btn-secondary !py-1.5 !px-3 text-xs"
                  @click="downloadTemplate('xlsx')"
                >
                  <FileSpreadsheet :size="12" /> Excel 模板
                </button>
              </div>
            </div>
            <p class="text-[11px] text-cocoa-500 mt-1.5">
              💡 Excel 模板里已自动填入本班学生姓名，填上分数直接回传即可。
            </p>
          </div>

          <!-- 文件上传 -->
          <div class="card-flat p-3">
            <div class="text-sm font-medium mb-2">
              第二步：上传文件
            </div>
            <div
              class="border-2 border-dashed border-cocoa-100 rounded-2xl p-4 text-center cursor-pointer hover:border-butter-400 transition"
              @click="pickImportFile"
            >
              <div
                v-if="!importFile"
                class="text-cocoa-500"
              >
                <Upload
                  :size="20"
                  class="mx-auto mb-1"
                />
                <div class="text-sm">
                  点击选择 .txt / .xlsx / .xls 文件
                </div>
                <div class="text-[11px] mt-1">
                  或拖到此处（暂时仅支持点击）
                </div>
              </div>
              <div
                v-else
                class="flex items-center justify-center gap-2 text-sm text-mint-500"
              >
                <FileSpreadsheet :size="16" />
                <span>{{ importFile.name }}</span>
                <button
                  class="text-cocoa-300 hover:text-sakura-500"
                  @click.stop="clearImportFile"
                >
                  <X :size="14" />
                </button>
              </div>
            </div>
            <input
              ref="importFileInput"
              type="file"
              accept=".txt,.csv,.xlsx,.xls"
              class="hidden"
              @change="onImportFileChange"
            >
          </div>

          <!-- 手动输入 -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label class="text-xs text-cocoa-500 ml-1">或者直接粘贴</label>
              <div class="text-[10px] text-cocoa-500">
                支持 Tab / 空格 / 英文逗号 / 中文逗号；缺考留空或写「-」
              </div>
            </div>
            <textarea
              v-model="importText"
              class="input-soft min-h-[140px] font-mono text-sm leading-relaxed"
              :placeholder="
                importMode === 'single'
                  ? '格式：姓名 分数\n例如：\n张三 92\n李四 85\n王五 78'
                  : '格式：姓名 语文 数学 英语\n例如：\n张三 92 88 75\n李四 85 90 82'
              "
            />
          </div>

          <!-- 解析预览 -->
          <div
            v-if="parsedRows.length"
            class="card-flat p-3"
          >
            <div class="flex items-center justify-between mb-2">
              <div class="text-sm font-medium flex items-center gap-2">
                <AlertCircle
                  :size="14"
                  class="text-cocoa-500"
                />
                解析预览
              </div>
              <div class="flex items-center gap-2 text-xs">
                <span class="chip bg-mint-100 text-mint-500">
                  <CheckCircle2 :size="10" /> 有效 {{ validCount }}
                </span>
                <span
                  v-if="invalidCount"
                  class="chip bg-sakura-100 text-sakura-500"
                >
                  <AlertCircle :size="10" /> 错误 {{ invalidCount }}
                </span>
              </div>
            </div>
            <div class="max-h-[200px] overflow-y-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-cocoa-500 border-b border-cocoa-100/60">
                    <th class="py-1.5 pr-2">
                      姓名
                    </th>
                    <th
                      v-for="s in importMode === 'single' ? [importSubject] : importSubjects"
                      :key="s"
                      class="py-1.5 pr-2"
                    >
                      {{ s }}
                    </th>
                    <th class="py-1.5">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(r, i) in parsedRows"
                    :key="i"
                    class="border-b border-cocoa-100/40"
                    :class="r.ok ? '' : 'bg-sakura-100/30'"
                  >
                    <td class="py-1.5 pr-2">
                      {{ r.name || '（空）' }}
                    </td>
                    <td
                      v-for="sc in r.scores"
                      :key="sc.subject"
                      class="py-1.5 pr-2 font-mono"
                    >
                      {{ fmtScore(sc.score) }}
                    </td>
                    <td class="py-1.5">
                      <span
                        v-if="r.ok"
                        class="text-mint-500 text-xs inline-flex items-center gap-1"
                      >
                        <CheckCircle2 :size="10" /> 就绪
                      </span>
                      <span
                        v-else
                        class="text-sakura-500 text-xs inline-flex items-center gap-1"
                      >
                        <AlertCircle :size="10" /> {{ r.reason }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="importOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          v-if="importMode !== 'ai'"
          class="btn-primary"
          :disabled="!validCount"
          @click="confirmImport"
        >
          <Upload :size="14" /> 导入 {{ validCount }} 条
        </button>
        <button
          v-else
          class="btn-primary"
          disabled
        >
          <Sparkles :size="14" /> 请先解析上方文本
        </button>
      </template>
    </Modal>

    <!-- 详情弹窗 -->
    <Modal
      :open="detailOpen"
      :title="detail?.examName || ''"
      width="780px"
      @close="detailOpen = false"
    >
      <div
        v-if="detail && detailStat"
        class="space-y-5"
      >
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div class="card-flat p-3 text-center">
            <div class="text-[11px] text-cocoa-500">
              参考
            </div>
            <div class="number text-2xl">
              {{ detailStat.count }}
            </div>
          </div>
          <div class="card-flat p-3 text-center">
            <div class="text-[11px] text-cocoa-500">
              平均分
            </div>
            <div class="number text-2xl text-butter-600">
              {{ fmtScore(detailStat.avg) }}
            </div>
          </div>
          <div class="card-flat p-3 text-center">
            <div class="text-[11px] text-cocoa-500">
              最高
            </div>
            <div class="number text-2xl text-mint-500">
              {{ fmtScore(detailStat.max) }}
            </div>
          </div>
          <div class="card-flat p-3 text-center">
            <div class="text-[11px] text-cocoa-500">
              及格率
            </div>
            <div class="number text-2xl text-sky2-500">
              {{ detailStat.passRate }}%
            </div>
          </div>
          <div class="card-flat p-3 text-center">
            <div class="text-[11px] text-cocoa-500">
              优秀率
            </div>
            <div class="number text-2xl text-sakura-500">
              {{ detailStat.excellentRate }}%
            </div>
          </div>
        </div>

        <!-- 分布柱状图（10 段） -->
        <div class="card-flat p-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="title-display text-base flex items-center gap-2">
              <BarChart :size="16" /> 分数段分布
            </h4>
            <div class="text-[10px] text-cocoa-500">
              每 10 分一段（参考：60 分及格，90 分优秀）
            </div>
          </div>
          <div class="flex items-end gap-1.5 h-44">
            <div
              v-for="(c, i) in detailStat.distribution"
              :key="i"
              class="flex-1 flex flex-col items-center justify-end gap-1 h-full"
            >
              <div class="number text-sm text-cocoa-700">
                {{ c }}
              </div>
              <div
                class="w-full rounded-t-xl transition-all"
                :style="{
                  height: ((c / distMax) * 100 || 4) + '%',
                }"
                :class="[
                  'bg-gradient-to-t',
                  i < 6
                    ? i < 4
                      ? 'from-sakura-400 to-sakura-200'
                      : 'from-butter-500 to-butter-200'
                    : i < 8
                      ? 'from-mint-400 to-mint-200'
                      : 'from-sky2-500 to-sky2-200',
                ]"
                :title="`${detailStat.distLabels[i]}：${c} 人（${pct(c, detailStat.count)}%）`"
              />
              <div class="text-[10px] text-cocoa-500 whitespace-nowrap">
                {{ detailStat.distLabels[i] }}
              </div>
              <div class="text-[10px] text-cocoa-300 -mt-0.5">
                {{ pct(c, detailStat.count) }}%
              </div>
            </div>
          </div>
          <div class="flex flex-wrap gap-3 text-[11px] text-cocoa-500 mt-3 justify-center">
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-sm bg-gradient-to-b from-sakura-400 to-sakura-200" />
              极低/不及格 (&lt; 60)
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-sm bg-gradient-to-b from-butter-500 to-butter-200" />
              待提高 (50-69)
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-sm bg-gradient-to-b from-mint-400 to-mint-200" />
              中等 (70-89)
            </span>
            <span class="flex items-center gap-1">
              <span class="w-3 h-3 rounded-sm bg-gradient-to-b from-sky2-500 to-sky2-200" />
              优秀 (90+)
            </span>
          </div>
        </div>

        <!-- 排名 -->
        <div>
          <h4 class="title-display text-base mb-2 flex items-center gap-2">
            <Award :size="16" /> 学生排名（前 10）
          </h4>
          <div class="space-y-1.5">
            <div
              v-for="r in detailStat.ranking.slice(0, 10)"
              :key="r.studentId"
              class="flex items-center gap-3 card-flat p-2.5"
            >
              <div
                class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
                :class="
                  r.rank === 1
                    ? 'bg-butter-400 text-cocoa-900'
                    : r.rank === 2
                      ? 'bg-sky2-300 text-cocoa-900'
                      : r.rank === 3
                        ? 'bg-sakura-300 text-cocoa-900'
                        : 'bg-cocoa-100 text-cocoa-700'
                "
              >
                {{ r.rank }}
              </div>
              <div class="flex-1">
                {{ classStore.getStudent(r.studentId)?.name }}
              </div>
              <div class="number text-lg">
                {{ fmtScore(r.score) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 详情弹窗中的雷达图原为占位假数据, 已移除; 真实科目平均分雷达见「综合分析」 -->
      </div>
    </Modal>

    <!-- 综合分析弹窗 -->
    <Modal
      :open="analysisOpen"
      title="综合分析"
      width="1080px"
      @close="closeAnalysis"
    >
      <div
        v-if="analysisOpen"
        class="space-y-5"
      >
        <!-- 选择器：班级 + 考试 -->
        <div class="card-flat p-3 flex flex-wrap items-end gap-3">
          <div class="flex-1 min-w-[180px]">
            <label class="text-xs text-cocoa-500 ml-1">班级</label>
            <select
              v-model="analysisClassId"
              class="input-soft mt-1"
            >
              <option
                v-for="c in classStore.classes"
                :key="c.id"
                :value="c.id"
              >
                {{ c.name }}
              </option>
            </select>
          </div>
          <div class="flex-1 min-w-[220px]">
            <label class="text-xs text-cocoa-500 ml-1">考试</label>
            <select
              v-model="analysisExamName"
              class="input-soft mt-1"
            >
              <option
                v-if="!analysisExams.length"
                value=""
                disabled
              >
                暂无考试
              </option>
              <option
                v-for="e in analysisExams"
                :key="e"
                :value="e"
              >
                {{ e }}
              </option>
            </select>
          </div>
          <div class="text-[11px] text-cocoa-500 pb-2">
            <span v-if="analysisStats.length">
              共 <span class="text-cocoa-900 font-semibold">{{ analysisStats.length }}</span> 个科目，
              综合 <span class="text-cocoa-900 font-semibold">{{ analysisAggregate?.count || 0 }}</span> 人次参考
            </span>
            <span
              v-else
              class="text-sakura-500"
            >该班级暂无该考试的成绩数据</span>
          </div>
        </div>

        <div v-if="analysisStats.length">
          <!-- 顶部综合指标卡片 -->
          <div class="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div class="card-flat p-3 text-center">
              <div class="text-[10px] text-cocoa-500">
                参考人次
              </div>
              <div class="number text-xl">
                {{ analysisAggregate?.count || 0 }}
              </div>
            </div>
            <div class="card-flat p-3 text-center">
              <div class="text-[10px] text-cocoa-500">
                综合平均
              </div>
              <div class="number text-xl text-butter-600">
                {{ fmtScore(analysisAggregate?.avg || 0) }}
              </div>
            </div>
            <div class="card-flat p-3 text-center">
              <div class="text-[10px] text-cocoa-500">
                综合最高
              </div>
              <div class="number text-xl text-mint-500">
                {{ fmtScore(analysisAggregate?.max || 0) }}
              </div>
            </div>
            <div class="card-flat p-3 text-center">
              <div class="text-[10px] text-cocoa-500">
                综合最低
              </div>
              <div class="number text-xl text-sakura-500">
                {{ fmtScore(analysisAggregate?.min || 0) }}
              </div>
            </div>
            <div class="card-flat p-3 text-center">
              <div class="text-[10px] text-cocoa-500">
                综合及格率
              </div>
              <div class="number text-xl text-sky2-500">
                {{ analysisAggregate?.passRate || 0 }}%
              </div>
            </div>
            <div class="card-flat p-3 text-center">
              <div class="text-[10px] text-cocoa-500">
                综合优秀率
              </div>
              <div class="number text-xl text-sakura-500">
                {{ analysisAggregate?.excellentRate || 0 }}%
              </div>
            </div>
          </div>

          <!-- 各科平均分雷达（真实数据） -->
          <div
            v-if="analysisStats.length"
            class="card-flat p-4"
          >
            <h4 class="title-display text-base mb-3 flex items-center gap-2">
              <BarChart3 :size="16" /> 各科平均分雷达
            </h4>
            <svg
              v-if="radarSubjectsA.length"
              viewBox="0 0 320 220"
              class="w-full h-56"
            >
              <g
                v-for="r in [0.25, 0.5, 0.75, 1]"
                :key="r"
              >
                <polygon
                  :points="radarSubjectsA.map((_, i) => radarPoint(i, r).join(',')).join(' ')"
                  fill="none"
                  stroke="rgba(190,140,80,0.2)"
                  stroke-width="1"
                />
              </g>
              <g
                v-for="(label, i) in radarSubjectsA"
                :key="label"
              >
                <line
                  :x1="160"
                  :y1="110"
                  :x2="160 + Math.cos((Math.PI * 2 * i) / radarSubjectsA.length - Math.PI / 2) * 90"
                  :y2="110 + Math.sin((Math.PI * 2 * i) / radarSubjectsA.length - Math.PI / 2) * 60"
                  stroke="rgba(190,140,80,0.18)"
                />
                <text
                  :x="160 + Math.cos((Math.PI * 2 * i) / radarSubjectsA.length - Math.PI / 2) * 105"
                  :y="110 + Math.sin((Math.PI * 2 * i) / radarSubjectsA.length - Math.PI / 2) * 72"
                  text-anchor="middle"
                  fill="#7A6A55"
                  font-size="12"
                >
                  {{ label }}
                </text>
              </g>
              <polygon
                :points="radarSubjectsA.map((_, i) => radarPoint(i, (radarValues[i] || 0) / 100).join(',')).join(' ')"
                fill="rgba(255,212,121,0.4)"
                stroke="#F5BE52"
                stroke-width="2"
              />
              <g
                v-for="(label, i) in radarSubjectsA"
                :key="'pt-' + label"
              >
                <circle
                  :cx="radarPoint(i, (radarValues[i] || 0) / 100)[0]"
                  :cy="radarPoint(i, (radarValues[i] || 0) / 100)[1]"
                  r="3"
                  fill="#F5BE52"
                />
              </g>
            </svg>
            <div
              v-else
              class="text-sm text-cocoa-400 text-center py-6"
            >
              暂无科目数据
            </div>
          </div>

          <!-- 多科平均分对比（曲线图） -->
          <div
            v-if="curveChart"
            class="card-flat p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="title-display text-base flex items-center gap-2">
                <TrendingUp :size="16" /> 各科平均分对比
              </h4>
              <div class="text-[10px] text-cocoa-500">
                按各科满分归一化，便于横向对比
              </div>
            </div>
            <div class="relative h-52">
              <svg
                :viewBox="`0 0 ${curveChart.w} ${curveChart.h}`"
                class="w-full h-full overflow-visible"
              >
                <!-- 网格横线（0/25/50/75/100%） -->
                <line
                  v-for="i in 5"
                  :key="'grid-' + i"
                  :x1="curveChart.pad.left"
                  :x2="curveChart.w - curveChart.pad.right"
                  :y1="curveChart.pad.top + (i - 1) * ((curveChart.h - curveChart.pad.top - curveChart.pad.bottom) / 4)"
                  :y2="curveChart.pad.top + (i - 1) * ((curveChart.h - curveChart.pad.top - curveChart.pad.bottom) / 4)"
                  stroke="currentColor"
                  class="text-cocoa-100 dark:text-cocoa-700"
                  stroke-dasharray="3,3"
                  stroke-width="1"
                />
                <!-- 坐标轴 -->
                <line
                  :x1="curveChart.pad.left"
                  :x2="curveChart.w - curveChart.pad.right"
                  :y1="curveChart.h - curveChart.pad.bottom"
                  :y2="curveChart.h - curveChart.pad.bottom"
                  stroke="currentColor"
                  class="text-cocoa-300 dark:text-cocoa-500"
                  stroke-width="1.5"
                />
                <line
                  :x1="curveChart.pad.left"
                  :x2="curveChart.pad.left"
                  :y1="curveChart.pad.top"
                  :y2="curveChart.h - curveChart.pad.bottom"
                  stroke="currentColor"
                  class="text-cocoa-300 dark:text-cocoa-500"
                  stroke-width="1.5"
                />
                <!-- 平滑曲线 -->
                <path
                  :d="curveChart.path"
                  fill="none"
                  stroke="currentColor"
                  class="text-butter-500"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <!-- 数据点 + 标签 -->
                <g
                  v-for="p in curveChart.points"
                  :key="p.subject"
                >
                  <circle
                    :cx="p.x"
                    :cy="p.y"
                    r="5"
                    fill="currentColor"
                    :class="p.colorClass"
                    stroke="white"
                    stroke-width="1.5"
                    class="dark:stroke-cream-100"
                  />
                  <text
                    :x="p.x"
                    :y="p.y - 12"
                    text-anchor="middle"
                    font-size="11"
                    font-weight="600"
                    fill="currentColor"
                    class="text-cocoa-700 dark:text-cocoa-100"
                  >
                    {{ fmtScore(p.avg) }}
                  </text>
                  <text
                    :x="p.x"
                    :y="curveChart.h - curveChart.pad.bottom + 18"
                    text-anchor="middle"
                    font-size="12"
                    fill="currentColor"
                    class="text-cocoa-600 dark:text-cocoa-200"
                  >
                    {{ p.subject }}
                  </text>
                </g>
              </svg>
            </div>
          </div>

          <!-- 各科及格率 / 优秀率 对比 -->
          <div class="grid md:grid-cols-2 gap-4">
            <div class="card-flat p-4">
              <h4 class="title-display text-base mb-3 flex items-center gap-2">
                <CheckCircle2 :size="16" /> 各科及格率
              </h4>
              <div class="space-y-2">
                <div
                  v-for="s in analysisStats"
                  :key="'p-' + s.subject"
                  class="flex items-center gap-2"
                >
                  <div class="w-12 text-xs text-cocoa-700">
                    {{ s.subject }}
                  </div>
                  <div class="flex-1 h-3 rounded-full bg-cocoa-50 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-mint-500 to-mint-300 transition-all"
                      :style="{ width: s.stat.passRate + '%' }"
                    />
                  </div>
                  <div class="number text-xs text-mint-500 w-12 text-right">
                    {{ s.stat.passRate }}%
                  </div>
                </div>
              </div>
            </div>
            <div class="card-flat p-4">
              <h4 class="title-display text-base mb-3 flex items-center gap-2">
                <Trophy :size="16" /> 各科优秀率
              </h4>
              <div class="space-y-2">
                <div
                  v-for="s in analysisStats"
                  :key="'e-' + s.subject"
                  class="flex items-center gap-2"
                >
                  <div class="w-12 text-xs text-cocoa-700">
                    {{ s.subject }}
                  </div>
                  <div class="flex-1 h-3 rounded-full bg-cocoa-50 overflow-hidden">
                    <div
                      class="h-full rounded-full bg-gradient-to-r from-sakura-500 to-sakura-300 transition-all"
                      :style="{ width: s.stat.excellentRate + '%' }"
                    />
                  </div>
                  <div class="number text-xs text-sakura-500 w-12 text-right">
                    {{ s.stat.excellentRate }}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 各科分数段分布（叠加柱状图） -->
          <div class="card-flat p-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="title-display text-base flex items-center gap-2">
                <BarChart :size="16" /> 各科分数段分布对比（每 10 分一段）
              </h4>
              <div class="text-[10px] text-cocoa-500">
                纵轴为人数，悬停查看占比
              </div>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-xs">
                <thead>
                  <tr class="text-cocoa-500 border-b border-cocoa-100/60">
                    <th class="py-1.5 pr-2 text-left font-normal whitespace-nowrap">
                      科目
                    </th>
                    <th
                      v-for="(label, i) in analysisStats[0]?.stat.distLabels || []"
                      :key="label"
                      class="py-1.5 px-1 text-center font-normal"
                      :title="label + ' 分'"
                    >
                      {{ label }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="s in analysisStats"
                    :key="'d-' + s.subject"
                    class="border-b border-cocoa-100/40 last:border-b-0"
                  >
                    <td class="py-2 pr-2 text-cocoa-700 font-medium whitespace-nowrap">
                      <div class="flex items-center gap-1">
                        <span
                          class="w-2 h-2 rounded-full"
                          :class="subjectPalette[s.subject]?.bg || 'bg-butter-300'"
                        />
                        {{ s.subject }}
                      </div>
                    </td>
                    <td
                      v-for="(c, i) in s.stat.distribution"
                      :key="i"
                      class="py-2 px-1 text-center align-bottom"
                    >
                      <div class="flex flex-col items-center gap-0.5">
                        <div class="text-[9px] text-cocoa-700 number leading-none">
                          {{ c }}
                        </div>
                        <div class="w-5 h-20 flex items-end bg-cocoa-50/60 rounded">
                          <div
                            class="w-full rounded-t transition-all"
                            :class="subjectPalette[s.subject]?.bar || 'bg-butter-400'"
                            :style="{
                              height:
                                analysisDistMax > 0
                                  ? (c / analysisDistMax) * 100 + '%'
                                  : '0%',
                            }"
                            :title="`${c} 人 · ${pct(c, s.stat.count)}%`"
                          />
                        </div>
                        <div class="text-[8px] text-cocoa-300 leading-none">
                          {{ pct(c, s.stat.count) }}%
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- 各科详情卡片 -->
          <div class="grid md:grid-cols-2 gap-4">
            <div
              v-for="s in analysisStats"
              :key="'card-' + s.subject"
              class="card-soft p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span
                    class="chip"
                    :class="subjectPalette[s.subject]?.bg || 'bg-butter-100'"
                  >
                    {{ s.subject }}
                  </span>
                  <span class="text-xs text-cocoa-500">
                    满分 100 · 参考 {{ s.stat.count }} 人
                  </span>
                </div>
                <button
                  class="text-xs text-butter-600 hover:underline"
                  @click="openDetailById(s.gradeId)"
                >
                  查看详情 →
                </button>
              </div>
              <div class="grid grid-cols-4 gap-2 text-center">
                <div class="card-flat p-2">
                  <div class="text-[10px] text-cocoa-500">
                    平均
                  </div>
                  <div class="number text-base text-butter-600">
                    {{ fmtScore(s.stat.avg) }}
                  </div>
                </div>
                <div class="card-flat p-2">
                  <div class="text-[10px] text-cocoa-500">
                    中位数
                  </div>
                  <div class="number text-base">
                    {{ s.stat.median }}
                  </div>
                </div>
                <div class="card-flat p-2">
                  <div class="text-[10px] text-cocoa-500">
                    最高
                  </div>
                  <div class="number text-base text-mint-500">
                    {{ fmtScore(s.stat.max) }}
                  </div>
                </div>
                <div class="card-flat p-2">
                  <div class="text-[10px] text-cocoa-500">
                    最低
                  </div>
                  <div class="number text-base text-sakura-500">
                    {{ fmtScore(s.stat.min) }}
                  </div>
                </div>
              </div>
              <!-- 学科内分数段迷你柱状图 -->
              <div class="mt-3">
                <div class="text-[10px] text-cocoa-500 mb-1">
                  分数段分布
                </div>
                <div class="flex items-end gap-0.5 h-14">
                  <div
                    v-for="(c, i) in s.stat.distribution"
                    :key="i"
                    class="flex-1 flex flex-col items-center justify-end h-full"
                  >
                    <div
                      class="w-full rounded-t transition-all"
                      :class="subjectPalette[s.subject]?.bar || 'bg-butter-400'"
                      :style="miniBarStyle(s, i)"
                    />
                    <div class="text-[8px] text-cocoa-300 mt-0.5">
                      {{ s.stat.distLabels[i].split('-')[0] }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 学生综合排名 -->
          <div
            v-if="analysisStudentTotals.length"
            class="card-flat p-4"
          >
            <div class="flex items-center justify-between mb-3">
              <h4 class="title-display text-base flex items-center gap-2">
                <Trophy :size="16" /> 学生综合排名
                <span class="text-[11px] text-cocoa-500 font-normal">
                  （按所有科目总分，{{ analysisStudentTotals[0].count }} 科合计）
                </span>
              </h4>
            </div>
            <div class="grid md:grid-cols-2 gap-3">
              <!-- 前 5 名 -->
              <div>
                <div
                  class="text-xs font-medium text-mint-500 mb-2 flex items-center gap-1"
                >
                  <TrendingUp :size="12" /> 前 5 名
                </div>
                <div class="space-y-1.5">
                  <div
                    v-for="r in analysisStudentTotals.slice(0, 5)"
                    :key="'top-' + r.studentId"
                    class="flex items-center gap-2 card-flat p-2"
                  >
                    <div
                      class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      :class="
                        r.rank === 1
                          ? 'bg-butter-400 text-cocoa-900'
                          : r.rank === 2
                            ? 'bg-sky2-300 text-cocoa-900'
                            : r.rank === 3
                              ? 'bg-sakura-300 text-cocoa-900'
                              : 'bg-cocoa-100 text-cocoa-700'
                      "
                    >
                      {{ r.rank }}
                    </div>
                    <div class="flex-1 text-sm">
                      {{ r.name }}
                    </div>
                    <div class="text-right">
                      <div class="number text-sm">
                        {{ fmtScore(r.total) }}
                      </div>
                      <div class="text-[10px] text-cocoa-500">
                        均 {{ fmtScore(r.avg) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <!-- 后 5 名 -->
              <div v-if="analysisStudentTotals.length > 5">
                <div
                  class="text-xs font-medium text-sakura-500 mb-2 flex items-center gap-1"
                >
                  <TrendingDown :size="12" /> 后 5 名
                </div>
                <div class="space-y-1.5">
                  <div
                    v-for="r in analysisStudentTotals.slice(-5).reverse()"
                    :key="'bot-' + r.studentId"
                    class="flex items-center gap-2 card-flat p-2"
                  >
                    <div
                      class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-cocoa-100 text-cocoa-700"
                    >
                      {{ r.rank }}
                    </div>
                    <div class="flex-1 text-sm">
                      {{ r.name }}
                    </div>
                    <div class="text-right">
                      <div class="number text-sm">
                        {{ fmtScore(r.total) }}
                      </div>
                      <div class="text-[10px] text-cocoa-500">
                        均 {{ fmtScore(r.avg) }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 本次考试分析情况描述 -->
          <div class="card-flat p-4">
            <div class="flex items-center justify-between mb-2">
              <h4 class="title-display text-base flex items-center gap-2">
                <FileText :size="16" /> 本次考试分析情况描述
              </h4>
              <button
                class="btn-soft text-xs"
                @click="saveAnalysisNote"
              >
                保存描述
              </button>
            </div>
            <textarea
              v-model="analysisNoteDraft"
              class="input-soft min-h-[90px] text-sm w-full"
              placeholder="记录本次考试的整体情况、亮点与改进建议…"
            />
          </div>
        </div>

        <EmptyState
          v-else
          title="该考试暂无数据"
          desc="请先在成绩管理录入或批量导入该次考试的成绩"
          icon="📈"
        />
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="closeAnalysis"
        >
          <X :size="14" /> 关闭
        </button>
      </template>
    </Modal>
  </div>
</template>
