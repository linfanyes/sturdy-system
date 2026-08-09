<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 选择器 / 模式切换 / 操作按钮 -->
    <ExamManager
      v-if="classId"
      :class-opts="classOpts" :class-idx="classIdx"
      :exam-opts="examOpts" :exam-idx="examIdx"
      :subject-opts="subjectOpts" :subject-idx="subjectIdx"
      :date-val="date"
      :semester-list="semesterList" :semester-idx="semesterIdx"
      :is-homeroom="isHomeroom" :shared-class="sharedClass"
      :existing="existing" :mode="mode"
      @class-change="onClass" @exam-change="onExam" @subject-change="onSubject"
      @date-input="(e) => (date = e.detail.value)"
      @semester-change="onSemester"
      @export-csv="exportCsv" @export-rank="exportRank"
      @ai-analyze="aiAnalyze" @ai-diagnose="aiDiagnose" @set-mode="setMode"
    />

    <EmptyState v-if="!classId" icon="📊" text="请先选择班级" hint="选择一个班级后即可查看和录入成绩" />
    <view v-else-if="loadError" class="load-err" @tap="load">⚠️ 数据加载失败，点击重试</view>

    <block v-else>
      <!-- 成绩录入 -->
      <GradeEntry
        :mode="mode"
        :exam-id="examId" :exam-name="examName"
        :class-id="classId" :date="date" :subject="subject"
        :students="students" :scores="scores"
        :existing="existing" :analysis="analysis"
        :done-count="doneCount" :filled-count="filledCount"
        :saving="saving"
        :exams="exams"
        :matrix-subjects="matrixSubjects" :matrix-students="matrixStudents"
        :matrix-slice="matrixSlice" :matrix-page="matrixPage"
        :matrix-page-size="MATRIX_PAGE_SIZE"
        :matrix-has-prev="matrixHasPrev" :matrix-has-next="matrixHasNext"
        :matrix="matrix"
        :all-filled-count="allFilledCount" :all-filled-subjects="allFilledSubjects"
        :saving-all="savingAll" :show-all-import="showAllImport" :all-preview="allPreview"
        @show-analysis="showAnalysis = true"
        @score-input="(e) => (scores[e.studentId] = e.value)"
        @reload="reloadGrades"
        @matrix-input="onMatrixInput"
        @toggle-all-import="showAllImport = !showAllImport"
        @share-student="shareStudent"
      />
    </block>

    <!-- 综合分析 & 成绩单 -->
    <GradeAnalysis
      ref="gradeAnalysisRef"
      :show-analysis="showAnalysis"
      :exam-name="examName" :subject="subject"
      :exam-id="examId" :class-id="classId"
      :existing="existing" :students="students"
      @close-analysis="showAnalysis = false"
    />

    <!-- AI 结果面板 -->
    <view class="aimask" v-if="aiResult" @click="aiResult=''">
      <view class="aisheet" @click.stop>
        <view class="ait">{{ aiTitle }}</view>
        <scroll-view scroll-y class="aibody">{{ aiResult }}</scroll-view>
        <view class="aiclose" @click="aiResult=''">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import {
  listGrades, getGrades, listClasses, listExams, listStudents,
  getPublicConfig, listSemesters, analyzeExam, diagnoseStudent,
} from '@/api/grades'
import { auth, theme } from '../../common/store'
import { getTeacherSubjects } from '../../common/subject-schema'
import { exportXlsx } from '../../common/exporter'
import { computeExamStats } from '@gardener/shared/utils/score'
import EmptyState from '../../components/EmptyState/EmptyState.vue'
import ExamManager from './components/ExamManager.vue'
import GradeEntry from './components/GradeEntry.vue'
import GradeAnalysis from './components/GradeAnalysis.vue'

/* ===== 共享状态 ===== */
const classes = ref([])
const exams = ref([])
const students = ref([])
const pubSubjects = ref([])
const grades = ref([])
const classIdx = ref(-1)
const examIdx = ref(-1)
const subjectIdx = ref(-1)
const classId = ref('')
const examId = ref('')
const examName = ref('')
const subject = ref('')
const date = ref('')
const semesterList = ref([])
const semesterIdx = ref(0)
function onSemester(e) { semesterIdx.value = e.detail.value; load() }
const scores = reactive({})
const existing = ref(null)
const aiResult = ref('')
const aiTitle = ref('')
const doneCount = ref(0)
const showAnalysis = ref(false)
const saving = ref(false)
const loadError = ref(false)

/* ===== 模式切换 / 全部科目矩阵 ===== */
const mode = ref('single')
const matrixSubjects = ref([])
const matrixStudents = ref([])
const matrixPage = ref(0)
const MATRIX_PAGE_SIZE = 20
const matrix = reactive({})
const savingAll = ref(false)
const showAllImport = ref(false)
const allPreview = ref(null)

const matrixSlice = computed(() => {
  const start = matrixPage.value * MATRIX_PAGE_SIZE
  return matrixStudents.value.slice(start, start + MATRIX_PAGE_SIZE)
})
const matrixHasPrev = computed(() => matrixPage.value > 0)
const matrixHasNext = computed(() => (matrixPage.value + 1) * MATRIX_PAGE_SIZE < matrixStudents.value.length)
const allFilledCount = computed(() => {
  let n = 0
  matrixSlice.value.forEach((s) => {
    matrixSubjects.value.forEach((sub) => {
      const v = ((matrix[s.id] && matrix[s.id][sub]) || '').toString().trim()
      if (v !== '') n++
    })
  })
  return n
})
const allFilledSubjects = computed(() => {
  let n = 0
  matrixSubjects.value.forEach((sub) => {
    const has = matrixSlice.value.some((s) => {
      const v = ((matrix[s.id] && matrix[s.id][sub]) || '').toString().trim()
      return v !== ''
    })
    if (has) n++
  })
  return n
})

const analysis = computed(() => {
  const empty = { avg: '-', max: '-', min: '-', median: '-', passRate: 0, excellentRate: 0 }
  if (!existing.value) return empty
  const fs1 = existing.value.fullScore || 100
  const st = computeExamStats(existing.value.scores || [], fs1)
  if (st.avg === '-') return empty
  return { avg: st.avg, max: st.max, min: st.min, median: '-', passRate: st.passRate, excellentRate: st.excellentRate }
})

const classOpts = ref([])
const examOpts = ref([])
const subjectOpts = ref([])
const isHomeroom = ref(false)
const sharedClass = ref(false)
const gradeAnalysisRef = ref(null)

/* ===== 数据加载 ===== */
async function load() {
  loadError.value = false
  try {
    const [cs, es, pub, gs, semesters] = await Promise.all([
      listClasses({ silent: true }), listExams({ silent: true }),
      getPublicConfig(), listGrades({ loading: true, loadingText: '加载成绩' }), listSemesters(),
    ])
    classes.value = cs; exams.value = es; pubSubjects.value = (pub && pub.defaultSubjects) || []
    grades.value = gs
    semesterList.value = Array.isArray(semesters) ? semesters : (semesters?.items || [])
    classOpts.value = cs.map((c) => c.name)
    rebuildExamOpts()
  } catch (e) { loadError.value = true }
}

onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })

function rebuildExamOpts() {
  examOpts.value = exams.value.filter((e) => !classId.value || e.classId === classId.value)
    .map((e) => e.name + (e.subjects && e.subjects.length ? `（${e.subjects.join('/')}）` : ''))
}

async function onClass(e) {
  classIdx.value = +e.detail.value
  const c = classes.value[classIdx.value]
  classId.value = c.id; examIdx.value = -1; examId.value = ''; examName.value = ''
  subjectIdx.value = -1; subject.value = ''; existing.value = null
  isHomeroom.value = c.headTeacher === (auth.user?.name || '')
  sharedClass.value = !isHomeroom.value && (c.teachers || []).some(t => t.name === (auth.user?.name || '') || t === (auth.user?.name || ''))
  rebuildExamOpts(); await loadStudents(); checkExisting()
}

async function onExam(e) {
  examIdx.value = +e.detail.value
  const list = exams.value.filter((x) => x.classId === classId.value)
  const chosen = list[examIdx.value]
  examId.value = chosen.id; examName.value = chosen.name
  let availableSubjects = chosen.subjects && chosen.subjects.length ? chosen.subjects : pubSubjects.value
  if (!isHomeroom.value) {
    const mySubjects = getTeacherSubjects(auth.user?.subject, auth.user?.subjects)
    availableSubjects = availableSubjects.filter(s => mySubjects.includes(s))
  }
  subjectOpts.value = availableSubjects
  subjectIdx.value = subjectOpts.value.length ? 0 : -1
  subject.value = subjectOpts.value[0] || ''
  date.value = chosen.date || date.value
  checkExisting()
  if (mode.value === 'all') nextTick(buildMatrix)
}

function onSubject(e) { subjectIdx.value = +e.detail.value; subject.value = subjectOpts.value[subjectIdx.value]; checkExisting() }

async function loadStudents() { students.value = await listStudents(classId.value, { silent: true }) }

function checkExisting() {
  if (!classId.value || !examName.value || !subject.value) { existing.value = null; return }
  const rec = grades.value.find((g) => g.classId === classId.value && g.examName === examName.value && g.subject === subject.value)
  existing.value = rec || null
  for (const k in scores) delete scores[k]
  doneCount.value = 0
  if (rec) {
    const map = {}
    ;(rec.scores || []).forEach((x) => (map[x.studentId] = x.score))
    students.value.forEach((s) => { scores[s.id] = map[s.id] != null ? String(map[s.id]) : '' })
    doneCount.value = (rec.scores || []).filter((x) => x.score != null).length
  }
}

/* ===== 成绩重载 ===== */
async function reloadGrades() {
  grades.value = await getGrades()
  checkExisting()
}

/* ===== 矩阵操作 ===== */
function setMode(m) { mode.value = m; matrixPage.value = 0; if (m === 'all') buildMatrix() }

function buildMatrix() {
  if (!students.value.length || !examName.value) return
  const exam = exams.value.find((e) => e.id === examId.value)
  const subs = (exam && exam.subjects && exam.subjects.length ? exam.subjects : pubSubjects.value)
  matrixSubjects.value = subs; matrixStudents.value = students.value
  for (const k in matrix) delete matrix[k]
  students.value.forEach((s) => { matrix[s.id] = {} })
  grades.value.filter((g) => g.classId === classId.value && g.examName === examName.value)
    .forEach((g) => { (g.scores || []).forEach((x) => { if (matrix[x.studentId]) matrix[x.studentId][g.subject] = String(x.score) }) })
}

function onMatrixInput(stuId, sub, val) { if (!matrix[stuId]) matrix[stuId] = {}; matrix[stuId][sub] = val }

/* ===== 导出 ===== */
function exportCsv() {
  if (!existing.value || !students.value.length) return uni.showToast({ title: '暂无成绩可导出', icon: 'none' })
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  const scoreMap = {}
  ;(existing.value.scores || []).forEach((x) => (scoreMap[x.studentId] = x.score))
  const header = ['学号', '姓名', '性别', '班级', '考试', '科目', '日期', '分数']
  const rows = students.value.map((s) => [s.studentNo || '', s.name, s.gender || '', className, examName.value, subject.value, date.value, scoreMap[s.id] != null ? String(scoreMap[s.id]) : ''])
  exportXlsx(header, rows, className + '_' + examName.value + '_' + subject.value, '成绩')
}

function exportRank() {
  if (!existing.value || !students.value.length) return uni.showToast({ title: '暂无成绩可导出', icon: 'none' })
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  const scoreMap = {}
  ;(existing.value.scores || []).forEach((x) => (scoreMap[x.studentId] = x.score))
  const rows = students.value.map((s) => ({ name: s.name, studentNo: s.studentNo || '', score: scoreMap[s.id] })).filter((r) => r.score != null).sort((a, b) => b.score - a.score)
  if (!rows.length) return uni.showToast({ title: '暂无成绩可导出', icon: 'none' })
  const a = analysis.value
  const header = ['名次', '姓名', '学号', '分数']
  const data = rows.map((r, i) => [String(i + 1), r.name, r.studentNo, String(r.score)])
  const summaryHeader = ['', '班级', className, '考试', examName.value, '科目', subject.value, '日期', date.value]
  const summaryRow1 = ['', '应考', String(students.value.length), '实考', String(rows.length), '平均', String(a.avg), '最高', String(a.max)]
  const summaryRow2 = ['', '最低', String(a.min), '及格率', a.passRate + '%', '优秀率', a.excellentRate + '%', '', '']
  exportXlsx(summaryHeader, [summaryRow1, summaryRow2, header].concat(data), className + '_名次_' + subject.value, '名次表')
}

/* ===== 分享 ===== */
function shareStudent(s) {
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  const allSubjects = grades.value.filter((g) => g.examName === examName.value)
  const lines = allSubjects.map((g) => {
    const sc = (g.scores || []).find((x) => x.studentId === s.id)
    const score = sc && sc.score != null ? sc.score : '—'
    const allSc = (g.scores || []).filter((x) => x.score != null).map((x) => Number(x.score))
    const avg = allSc.length > 0 ? (allSc.reduce((a, b) => a + b, 0) / allSc.length).toFixed(1) : '—'
    return `${g.subject}：${score}分（班级均分 ${avg}）`
  })
  const text = `📚 ${className} · ${examName.value}\n学生：${s.name}\n${lines.join('\n')}\n\n以上成绩由「园丁工作台」生成，供家长参考。`
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制所有科目成绩，可粘贴到微信', icon: 'success' }), fail: () => uni.showToast({ title: '复制失败', icon: 'none' }) })
}

function shareAll() {
  if (!existing.value || !students.value.length) return
  const className = (classes.value.find((c) => c.id === classId.value) || {}).name || ''
  const allSubjects = grades.value.filter((g) => g.examName === examName.value)
  const lines = students.value.map((s) => {
    const subs = allSubjects.map((g) => {
      const sc = (g.scores || []).find((x) => x.studentId === s.id)
      return sc && sc.score != null ? `${g.subject}:${sc.score}` : ''
    }).filter(Boolean).join(' · ')
    return `${s.name}：${subs || '无成绩'}`
  })
  const stats = allSubjects.map((g) => {
    const allSc = (g.scores || []).filter((x) => x.score != null).map((x) => Number(x.score))
    if (!allSc.length) return ''
    const avg = (allSc.reduce((a, b) => a + b, 0) / allSc.length).toFixed(1)
    const max = Math.max.apply(null, allSc); const min = Math.min.apply(null, allSc)
    return `${g.subject}：均分${avg} 最高${max} 最低${min}`
  }).filter(Boolean).join('\n')
  const text = `📚 ${className} · ${examName.value}\n\n${lines.join('\n')}\n\n${stats}\n\n由「园丁工作台」生成`
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: '已复制全班多科成绩，可粘贴到微信群', icon: 'success' }), fail: () => uni.showToast({ title: '复制失败', icon: 'none' }) })
}

/* ===== AI ===== */
async function aiAnalyze() {
  const exam = exams.value[examIdx.value]
  if (!exam || !exam.id) return uni.showToast({ title: '请先选择考试', icon: 'none' })
  aiTitle.value = `AI 分析：${exam.name}`; aiResult.value = '分析中…'
  try { const r = await analyzeExam(exam.id); aiResult.value = r.content || '未返回分析结果' }
  catch (e) { aiResult.value = '分析失败，请检查 AI 配置' }
}

async function aiDiagnose() {
  const names = students.value.map((s) => s.name)
  if (!names.length) return uni.showToast({ title: '暂无学生', icon: 'none' })
  uni.showActionSheet({
    itemList: names, success: async (r) => {
      const s = students.value[r.tapIndex]
      aiTitle.value = `学情诊断：${s.name}`; aiResult.value = '诊断中…'
      try { const res = await diagnoseStudent(s.id); aiResult.value = res.content || '未返回诊断结果' }
      catch (e) { aiResult.value = '诊断失败，请检查 AI 配置' }
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.load-err { text-align: center; padding: 40rpx; color: var(--c-danger); font-size: 28rpx; }
.aimask { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 99; }
.aisheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx 28rpx calc(30rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.ait { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.aibody { max-height: 60vh; font-size: 28rpx; line-height: 1.7; color: var(--c-text); white-space: pre-wrap; }
.aiclose { text-align: center; font-size: 28rpx; color: var(--c-accent); margin-top: 20rpx; padding: 14rpx 0; }
</style>
