<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import request from '@/api/request'
import {
  listMyClasses, listAllStudents, listExams, listGrades,
  listAttendances, listHomework, listNotes, listTodos, listNotices,
} from '@/api/teacher'
import {
  BarChart3, School, Users, CalendarCheck, NotebookPen,
  GraduationCap, ListTodo, NotebookText, Megaphone,
  Download, Loader2, RefreshCw, Trophy, PieChart,
} from 'lucide-vue-next'
import { safeParse } from '@gardener/shared/utils/general'

/* ============ 学期筛选 ============ */
interface Semester { id: string; name: string; [k: string]: any }
const semesterList = ref<Semester[]>([])
const semesterId = ref('')
const semesterName = computed(() => {
  if (!semesterId.value) return ''
  return semesterList.value.find(s => s.id === semesterId.value)?.name || ''
})

async function loadSemesters() {
  try {
    // /semesters 是独立端点，暂用 request.get
    const res = await request.get('/semesters')
    const list = toArray(res)
    semesterList.value = list
  } catch {
    semesterList.value = []
  }
}

function onSemesterChange() {
  loadAll()
}

/* ============ 统计数据 ============ */
const loading = ref(false)
const stat = ref({
  classes: 0,
  students: 0,
  attRate: 0,
  hwDone: 0,
  avgScore: 0,
  todoDone: 0,
  notes: 0,
  notices: 0,
})

interface ClassRow { id: string; name: string; count: number }
const classRows = ref<ClassRow[]>([])

interface TrendPoint { label: string; avg: number }
const examTrend = ref<TrendPoint[]>([])

/* ============ 成绩看板数据容器 ============ */
interface SubjectAvg { subject: string; avg: number; count: number }
const subjectAvgList = ref<SubjectAvg[]>([])
interface ClassAvg { id: string; name: string; avg: number; count: number }
const classAvgList = ref<ClassAvg[]>([])
interface ScoreLevel { label: string; count: number; pct: number; color: string }
const scoreLevelDist = ref<ScoreLevel[]>([])
interface TopStudent { id: string; name: string; className: string; avg: number; examCount: number }
const topStudents = ref<TopStudent[]>([])

/** 通用：从响应中取出数组 */
function toArray(res: any): any[] {
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.items)) return res.items
  return []
}

/** 公共参数：附加学期筛选 */
function params(): Record<string, any> {
  const p: Record<string, any> = {}
  if (semesterId.value) p.term = semesterName.value
  return p
}

async function loadAll() {
  loading.value = true
  try {
    const res = await Promise.allSettled([
      listMyClasses(semesterId.value ? { term: semesterName.value } : undefined),
      listAllStudents(params()),
      listAttendances(),
      listGrades(params()),
      listHomework(),
      listNotes(),
      listTodos(),
      listNotices(params()),
    ])
    const [classesRes, studentsRes, attsRes, gradesRes, homeworkRes, notesRes, todosRes, noticesRes] =
      res.map(r => (r.status === 'fulfilled' ? toArray(r.value) : []))

    // 出勤率
    let atTotal = 0
    let atPresent = 0
    attsRes.forEach((a: any) => {
      const recs = safeParse(a.records, []) as any[]
      recs.forEach((r: any) => {
        atTotal++
        if (r.status === '出勤' || r.status === '迟到' || r.status === '请假') atPresent++
      })
    })
    const attRate = atTotal ? Math.round((atPresent / atTotal) * 100) : 0

    // 作业完成率（已批改 + 已发还）
    const hwDone = homeworkRes.length
      ? Math.round((homeworkRes.filter((h: any) => h.status === '已批改' || h.status === '已发还').length / homeworkRes.length) * 100)
      : 0

    // 考试均分
    const sc: number[] = []
    gradesRes.forEach((g: any) => {
      (g.scores || []).forEach((x: any) => {
        if (x.score != null) sc.push(Number(x.score))
      })
    })
    const avgScore = sc.length ? Math.round((sc.reduce((a, b) => a + b, 0) / sc.length) * 10) / 10 : 0

    // 待办完成率
    const todoDone = todosRes.length
      ? Math.round((todosRes.filter((t: any) => t.done).length / todosRes.length) * 100)
      : 0

    // 未结束公告
    const nt = noticesRes.filter((n: any) => !n.ended).length

    stat.value = {
      classes: classesRes.length,
      students: studentsRes.length,
      attRate,
      hwDone,
      avgScore,
      todoDone,
      notes: notesRes.length,
      notices: nt,
    }

    // 各班学生数
    const map: Record<string, number> = {}
    studentsRes.forEach((s: any) => {
      map[s.classId] = (map[s.classId] || 0) + 1
    })
    classRows.value = classesRes.map((c: any) => ({
      id: c.id,
      name: c.name,
      count: map[c.id] || 0,
    }))

    // ============ 成绩看板数据计算 ============
    computeGradeDashboards(gradesRes, classesRes, studentsRes)

    // 考试均分趋势（不阻塞主流程）
    loadExamTrend()
  } catch {
    // 静默
  } finally {
    loading.value = false
  }
}

/** ============ 成绩看板计算：各科均分 / 各班均分 / 等级分布 / Top 学生 ============ */
function computeGradeDashboards(gradesRes: any[], classesRes: any[], studentsRes: any[]) {
  // 学生 id -> { name, classId, className }
  const studentMap: Record<string, { name: string; classId: string; className: string }> = {}
  studentsRes.forEach((s: any) => {
    const cls = classesRes.find((c: any) => c.id === s.classId)
    studentMap[s.id] = {
      name: s.name || '未命名',
      classId: s.classId || '',
      className: cls?.name || s.classId || '-',
    }
  })

  // 1) 各科均分（聚合所有成绩按 subject 分组）
  const subjMap: Record<string, { sum: number; count: number }> = {}
  // 2) 各班均分（按 classId 聚合，需要从 grade 上找到 classId）
  const clsMap: Record<string, { sum: number; count: number }> = {}
  // 3) 等级分布（按 100 制折算后分四档）
  const levels = { excellent: 0, good: 0, pass: 0, fail: 0 }
  // 4) Top 学生：每个学生的均分
  const stuAgg: Record<string, { sum: number; count: number }> = {}

  gradesRes.forEach((g: any) => {
    const subj = g.subject || g.subjectName || ''
    const cls = g.classId || ''
    const fullScore = Number(g.fullScore) || 100
    const scores: any[] = Array.isArray(g.scores) ? g.scores : []
    scores.forEach((s: any) => {
      const score = Number(s.score)
      if (s.score == null || Number.isNaN(score)) return
      const sid = s.studentId || s.student_id || ''
      // 1) 各科均分
      if (subj) {
        if (!subjMap[subj]) subjMap[subj] = { sum: 0, count: 0 }
        subjMap[subj].sum += score
        subjMap[subj].count++
      }
      // 2) 各班均分（用学生信息找到 classId 兜底）
      const realCls = cls || studentMap[sid]?.classId || ''
      if (realCls) {
        if (!clsMap[realCls]) clsMap[realCls] = { sum: 0, count: 0 }
        clsMap[realCls].sum += score
        clsMap[realCls].count++
      }
      // 3) 等级分布（按 100 制折算）
      const ratio = fullScore > 0 ? score / fullScore : 0
      if (ratio >= 0.85) levels.excellent++
      else if (ratio >= 0.7) levels.good++
      else if (ratio >= 0.6) levels.pass++
      else levels.fail++
      // 4) 学生均分
      if (sid) {
        if (!stuAgg[sid]) stuAgg[sid] = { sum: 0, count: 0 }
        stuAgg[sid].sum += score
        stuAgg[sid].count++
      }
    })
  })

  // 1) 各科均分列表
  subjectAvgList.value = Object.entries(subjMap)
    .map(([subject, v]) => ({ subject, avg: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0, count: v.count }))
    .sort((a, b) => b.avg - a.avg)

  // 2) 各班均分列表
  classAvgList.value = classesRes
    .map((c: any) => {
      const v = clsMap[c.id]
      return {
        id: c.id,
        name: c.name,
        avg: v && v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0,
        count: v ? v.count : 0,
      }
    })
    .filter(c => c.count > 0)
    .sort((a, b) => b.avg - a.avg)

  // 3) 等级分布
  const total = levels.excellent + levels.good + levels.pass + levels.fail
  const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0)
  scoreLevelDist.value = [
    { label: '优秀 (≥85%)', count: levels.excellent, pct: pct(levels.excellent), color: '#07c160' },
    { label: '良好 (70-85%)', count: levels.good, pct: pct(levels.good), color: '#1C6FB3' },
    { label: '及格 (60-70%)', count: levels.pass, pct: pct(levels.pass), color: '#E6A23C' },
    { label: '不及格 (<60%)', count: levels.fail, pct: pct(levels.fail), color: '#f56c6c' },
  ]

  // 4) Top 10 学生（按均分降序）
  topStudents.value = Object.entries(stuAgg)
    .map(([sid, v]) => {
      const info = studentMap[sid] || { name: '未知', className: '-' }
      return {
        id: sid,
        name: info.name,
        className: info.className,
        avg: v.count ? Math.round((v.sum / v.count) * 10) / 10 : 0,
        examCount: v.count,
      }
    })
    .filter(s => s.examCount >= 1)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10)
}

/** 考试均分趋势：最近 12 次考试 */
async function loadExamTrend() {
  try {
    let examsRes = await listExams(params())
    let examsArr = toArray(examsRes)
    if (semesterName.value) {
      examsArr = examsArr.filter((e: any) => e.term === semesterName.value)
    }
    if (!examsArr.length) {
      examTrend.value = []
      return
    }
    examsArr.sort((a: any, b: any) => (a.date || '').localeCompare(b.date || ''))
    const recent = examsArr.slice(-12)
    const points: TrendPoint[] = []
    for (const exam of recent) {
      try {
        const gradesRes = await listGrades({ examId: exam.id })
        const gradesArr = toArray(gradesRes)
        const scs: number[] = []
        gradesArr.forEach((g: any) => {
          (g.scores || []).forEach((s: any) => {
            if (s.score != null) scs.push(Number(s.score))
          })
        })
        if (scs.length) {
          points.push({
            label: (exam.name || '').slice(0, 8),
            avg: Math.round((scs.reduce((a, b) => a + b, 0) / scs.length) * 10) / 10,
          })
        }
      } catch {
        // 忽略单次
      }
    }
    examTrend.value = points
  } catch {
    examTrend.value = []
  }
}

/* ============ 指标卡 ============ */
const cards = computed(() => [
  { key: 'classes', label: '班级数', value: stat.value.classes, icon: School, color: 'butter' },
  { key: 'students', label: '学生数', value: stat.value.students, icon: Users, color: 'sky2' },
  { key: 'attRate', label: '出勤率', value: stat.value.attRate + '%', icon: CalendarCheck, color: 'mint' },
  { key: 'hwDone', label: '作业完成率', value: stat.value.hwDone + '%', icon: NotebookPen, color: 'sakura' },
  { key: 'avgScore', label: '考试均分', value: stat.value.avgScore, icon: GraduationCap, color: 'butter' },
  { key: 'todoDone', label: '待办完成率', value: stat.value.todoDone + '%', icon: ListTodo, color: 'mint' },
  { key: 'notes', label: '笔记数', value: stat.value.notes, icon: NotebookText, color: 'sky2' },
  { key: 'notices', label: '未结束公告', value: stat.value.notices, icon: Megaphone, color: 'sakura' },
])

/* ============ 班级学生数柱图（内联 SVG） ============ */
const barChart = computed(() => {
  if (!classRows.value.length) return null
  const width = 600
  const height = 220
  const padding = { top: 20, right: 20, bottom: 50, left: 40 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const max = Math.max(1, ...classRows.value.map(c => c.count))
  const barCount = classRows.value.length
  const slotW = barCount > 0 ? innerW / barCount : innerW
  const barW = Math.min(48, slotW * 0.6)
  const bars = classRows.value.map((c, i) => {
    const h = max ? (c.count / max) * innerH : 0
    const x = padding.left + slotW * i + (slotW - barW) / 2
    const y = padding.top + innerH - h
    return { ...c, x, y, h, w: barW }
  })
  return { width, height, padding, innerW, innerH, max, bars }
})

/* ============ 考试均分趋势折线图（内联 SVG） ============ */
const lineChart = computed(() => {
  if (examTrend.value.length < 2) return null
  const width = 600
  const height = 240
  const padding = { top: 20, right: 20, bottom: 50, left: 40 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const points = examTrend.value
  const max = Math.max(...points.map(p => p.avg), 100)
  const min = Math.min(...points.map(p => p.avg), 0)
  const range = max - min || 1
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0
  const coords = points.map((p, i) => {
    const x = padding.left + stepX * i
    const y = padding.top + innerH - ((p.avg - min) / range) * innerH
    return { x, y, label: p.label, avg: p.avg }
  })
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  return { width, height, padding, innerW, innerH, max, min, coords, path }
})

/* ============ 成绩看板：图表计算 ============ */
// 各科均分横向条形图数据
const subjectBarChart = computed(() => {
  if (!subjectAvgList.value.length) return null
  const data = subjectAvgList.value
  const maxAvg = Math.max(1, ...data.map(d => d.avg))
  return data.map(d => ({
    ...d,
    pct: Math.round((d.avg / maxAvg) * 100),
  }))
})

// 各班均分对比柱图（垂直柱状图）
const classAvgChart = computed(() => {
  if (!classAvgList.value.length) return null
  const data = classAvgList.value
  const width = 600
  const height = 240
  const padding = { top: 20, right: 20, bottom: 50, left: 40 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  const max = Math.max(1, ...data.map(c => c.avg))
  const slotW = data.length > 0 ? innerW / data.length : innerW
  const barW = Math.min(48, slotW * 0.6)
  const bars = data.map((c, i) => {
    const h = (c.avg / max) * innerH
    const x = padding.left + slotW * i + (slotW - barW) / 2
    const y = padding.top + innerH - h
    return { ...c, x, y, h, w: barW }
  })
  return { width, height, padding, innerW, innerH, max, bars }
})

// 成绩等级分布环形图：使用 conic-gradient 字符串
const donutGradient = computed(() => {
  if (!scoreLevelDist.value.length) return ''
  let acc = 0
  const stops: string[] = []
  scoreLevelDist.value.forEach(seg => {
    if (seg.pct <= 0) return
    const start = acc
    acc += seg.pct
    stops.push(`${seg.color} ${start}% ${acc}%`)
  })
  return `conic-gradient(${stops.join(', ')})`
})
const donutTotal = computed(() =>
  scoreLevelDist.value.reduce((a, b) => a + b.count, 0),
)

/* ============ 导出 CSV ============ */
function exportCsv() {
  const rows: (string | number)[][] = [
    ['指标', '数值'],
    ['班级数', stat.value.classes],
    ['学生数', stat.value.students],
    ['出勤率', stat.value.attRate + '%'],
    ['作业完成率', stat.value.hwDone + '%'],
    ['考试均分', stat.value.avgScore],
    ['待办完成率', stat.value.todoDone + '%'],
    ['笔记数', stat.value.notes],
    ['未结束公告', stat.value.notices],
  ]
  if (classRows.value.length) {
    rows.push([])
    rows.push(['班级', '学生数'])
    classRows.value.forEach(r => rows.push([r.name, r.count]))
  }
  if (examTrend.value.length) {
    rows.push([])
    rows.push(['考试', '均分'])
    examTrend.value.forEach(p => rows.push([p.label, p.avg]))
  }
  if (subjectAvgList.value.length) {
    rows.push([])
    rows.push(['科目', '均分', '人次'])
    subjectAvgList.value.forEach(s => rows.push([s.subject, s.avg, s.count]))
  }
  if (classAvgList.value.length) {
    rows.push([])
    rows.push(['班级', '均分', '人次'])
    classAvgList.value.forEach(c => rows.push([c.name, c.avg, c.count]))
  }
  if (scoreLevelDist.value.length) {
    rows.push([])
    rows.push(['等级', '人数', '占比'])
    scoreLevelDist.value.forEach(s => rows.push([s.label, s.count, s.pct + '%']))
  }
  if (topStudents.value.length) {
    rows.push([])
    rows.push(['排名', '姓名', '班级', '均分', '考试次数'])
    topStudents.value.forEach((s, i) => rows.push([i + 1, s.name, s.className, s.avg, s.examCount]))
  }
  const csv = '\ufeff' + rows.map(r => r.map(cell => {
    const s = String(cell)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `数据统计_${new Date().toLocaleString('zh-CN').replace(/[\/\s:]/g, '')}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadSemesters()
  loadAll()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 顶部：标题 + 学期筛选 + 导出 + 刷新 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <BarChart3 class="w-6 h-6 text-butter-500" /> 数据看板
      </h1>
      <div class="flex items-center gap-3">
        <select
          v-model="semesterId"
          @change="onSemesterChange"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400 max-w-xs"
        >
          <option value="">全部学期</option>
          <option v-for="s in semesterList" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <button
          class="px-4 py-2 rounded-xl bg-butter-500 text-white text-sm hover:bg-butter-600 transition-colors flex items-center gap-1.5"
          @click="exportCsv"
        >
          <Download class="w-4 h-4" />
          导出 CSV
        </button>
        <button
          class="px-4 py-2 rounded-xl bg-cream-100 text-cocoa-700 text-sm hover:bg-cream-200 transition-colors flex items-center gap-1.5"
          :disabled="loading"
          @click="loadAll"
        >
          <RefreshCw class="w-4 h-4" :class="{ 'animate-spin': loading }" />
          刷新
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="text-cocoa-400 text-sm py-8 text-center flex items-center justify-center gap-2">
      <Loader2 class="w-5 h-5 animate-spin" />
      统计中…
    </div>

    <template v-else>
      <!-- 8 项核心指标卡 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          v-for="card in cards"
          :key="card.key"
          class="bg-surface rounded-2xl p-5 shadow-softer flex items-center gap-4"
        >
          <div
            :class="[
              'w-12 h-12 rounded-xl flex items-center justify-center',
              card.color === 'butter' ? 'bg-butter-100' : '',
              card.color === 'mint' ? 'bg-mint-100' : '',
              card.color === 'sky2' ? 'bg-sky2-100' : '',
              card.color === 'sakura' ? 'bg-sakura-100' : '',
            ]"
          >
            <component
              :is="card.icon"
              :class="[
                'w-6 h-6',
                card.color === 'butter' ? 'text-butter-600' : '',
                card.color === 'mint' ? 'text-mint-500' : '',
                card.color === 'sky2' ? 'text-sky2-500' : '',
                card.color === 'sakura' ? 'text-sakura-500' : '',
              ]"
            />
          </div>
          <div class="min-w-0">
            <div class="text-sm text-cocoa-500">{{ card.label }}</div>
            <div class="text-2xl font-bold text-cocoa-900 mt-0.5 truncate">{{ card.value }}</div>
          </div>
        </div>
      </div>

      <!-- 各班级学生数柱图 -->
      <div class="bg-surface rounded-2xl p-6 shadow-softer">
        <div class="font-medium text-cocoa-700 mb-4">各班级学生数</div>
        <div v-if="!barChart" class="text-cocoa-400 text-sm py-8 text-center">暂无班级数据</div>
        <div v-else class="w-full overflow-x-auto">
          <svg :viewBox="`0 0 ${barChart.width} ${barChart.height}`" class="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <!-- Y 轴参考线 -->
            <line
              v-for="i in 4"
              :key="'grid-' + i"
              :x1="barChart.padding.left"
              :x2="barChart.width - barChart.padding.right"
              :y1="barChart.padding.top + (barChart.innerH * i) / 4"
              :y2="barChart.padding.top + (barChart.innerH * i) / 4"
              stroke="rgb(var(--cream-200))"
              stroke-width="1"
            />
            <!-- 柱子 -->
            <g v-for="b in barChart.bars" :key="b.id">
              <rect
                :x="b.x"
                :y="b.y"
                :width="b.w"
                :height="b.h"
                fill="rgb(var(--butter-400))"
                rx="3"
              />
              <text
                :x="b.x + b.w / 2"
                :y="b.y - 6"
                text-anchor="middle"
                class="fill-cocoa-700"
                font-size="12"
              >{{ b.count }}</text>
              <text
                :x="b.x + b.w / 2"
                :y="barChart.height - barChart.padding.bottom + 16"
                text-anchor="middle"
                class="fill-cocoa-500"
                font-size="11"
              >{{ (b.name || '').slice(0, 6) }}</text>
              <title>{{ b.name }}：{{ b.count }} 人</title>
            </g>
            <!-- X 轴 -->
            <line
              :x1="barChart.padding.left"
              :x2="barChart.width - barChart.padding.right"
              :y1="barChart.padding.top + barChart.innerH"
              :y2="barChart.padding.top + barChart.innerH"
              stroke="rgb(var(--cocoa-300))"
              stroke-width="1"
            />
          </svg>
        </div>
      </div>

      <!-- 考试均分趋势折线图 -->
      <div class="bg-surface rounded-2xl p-6 shadow-softer">
        <div class="font-medium text-cocoa-700 mb-4">考试均分趋势（最近 12 次）</div>
        <div v-if="!lineChart" class="text-cocoa-400 text-sm py-8 text-center">数据不足，至少需要 2 次考试</div>
        <div v-else class="w-full overflow-x-auto">
          <svg :viewBox="`0 0 ${lineChart.width} ${lineChart.height}`" class="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <!-- Y 轴参考线 -->
            <line
              v-for="i in 4"
              :key="'lgrid-' + i"
              :x1="lineChart.padding.left"
              :x2="lineChart.width - lineChart.padding.right"
              :y1="lineChart.padding.top + (lineChart.innerH * i) / 4"
              :y2="lineChart.padding.top + (lineChart.innerH * i) / 4"
              stroke="rgb(var(--cream-200))"
              stroke-width="1"
            />
            <!-- 折线 -->
            <path :d="lineChart.path" fill="none" stroke="rgb(var(--butter-400))" stroke-width="2" />
            <!-- 数据点 -->
            <g v-for="(c, i) in lineChart.coords" :key="'pt-' + i">
              <circle :cx="c.x" :cy="c.y" r="4" fill="rgb(var(--butter-500))" />
              <text :x="c.x" :y="c.y - 10" text-anchor="middle" class="fill-cocoa-700" font-size="11">{{ c.avg }}</text>
              <text
                :x="c.x"
                :y="lineChart.height - lineChart.padding.bottom + 16"
                text-anchor="middle"
                class="fill-cocoa-500"
                font-size="10"
                :transform="`rotate(20, ${c.x}, ${lineChart.height - lineChart.padding.bottom + 16})`"
              >{{ (c.label || '').slice(0, 6) }}</text>
            </g>
            <!-- X 轴 -->
            <line
              :x1="lineChart.padding.left"
              :x2="lineChart.width - lineChart.padding.right"
              :y1="lineChart.padding.top + lineChart.innerH"
              :y2="lineChart.padding.top + lineChart.innerH"
              stroke="rgb(var(--cocoa-300))"
              stroke-width="1"
            />
          </svg>
        </div>
      </div>

      <!-- ============ 成绩看板（新增） ============ -->
      <div class="flex items-center gap-2 pt-2">
        <GraduationCap class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">成绩看板</h2>
        <span class="text-xs text-cocoa-400">汇总当前学期所有考试成绩</span>
      </div>

      <!-- 各科均分横向条形图 + 成绩等级分布环形图 -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <!-- 各科均分横向条形图 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <div class="font-medium text-cocoa-700 mb-4 flex items-center gap-2">
            <BarChart3 class="w-4 h-4 text-butter-500" /> 各科均分对比
          </div>
          <div v-if="!subjectBarChart" class="text-cocoa-400 text-sm py-8 text-center">暂无成绩数据</div>
          <div v-else class="space-y-3">
            <div v-for="s in subjectBarChart" :key="s.subject" class="flex items-center gap-3">
              <span class="text-sm text-cocoa-700 w-14 flex-shrink-0 truncate" :title="s.subject">{{ s.subject }}</span>
              <div class="flex-1 bg-cream-100 rounded-full h-7 relative overflow-hidden">
                <div
                  class="h-full rounded-full flex items-center justify-end pr-2 transition-all"
                  :style="{ width: Math.max(6, s.pct) + '%', background: s.avg >= 80 ? '#07c160' : s.avg >= 60 ? '#E6A23C' : '#f56c6c' }"
                >
                  <span class="text-xs text-white font-medium">{{ s.avg }}</span>
                </div>
              </div>
              <span class="text-xs text-cocoa-400 w-12 text-right flex-shrink-0">{{ s.count }}人次</span>
            </div>
          </div>
        </div>

        <!-- 成绩等级分布环形图 -->
        <div class="bg-surface rounded-2xl p-6 shadow-softer">
          <div class="font-medium text-cocoa-700 mb-4 flex items-center gap-2">
            <PieChart class="w-4 h-4 text-butter-500" /> 成绩等级分布
          </div>
          <div v-if="!donutTotal" class="text-cocoa-400 text-sm py-8 text-center">暂无成绩数据</div>
          <div v-else class="flex items-center gap-6 flex-wrap">
            <!-- 环形图（conic-gradient） -->
            <div class="relative w-40 h-40 flex-shrink-0">
              <div
                class="w-full h-full rounded-full"
                :style="{ background: donutGradient }"
              ></div>
              <div class="absolute inset-4 bg-surface rounded-full flex flex-col items-center justify-center">
                <div class="text-2xl font-bold text-cocoa-900">{{ donutTotal }}</div>
                <div class="text-xs text-cocoa-500">总人次</div>
              </div>
            </div>
            <!-- 图例 -->
            <div class="flex-1 space-y-2 min-w-[160px]">
              <div v-for="s in scoreLevelDist" :key="s.label" class="flex items-center gap-2">
                <span class="w-3 h-3 rounded-sm flex-shrink-0" :style="{ background: s.color }"></span>
                <span class="text-sm text-cocoa-700 flex-1">{{ s.label }}</span>
                <span class="text-sm font-semibold text-cocoa-900">{{ s.count }}</span>
                <span class="text-xs text-cocoa-400 w-12 text-right">{{ s.pct }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 各班均分对比柱图 -->
      <div class="bg-surface rounded-2xl p-6 shadow-softer">
        <div class="font-medium text-cocoa-700 mb-4 flex items-center gap-2">
          <School class="w-4 h-4 text-butter-500" /> 各班均分对比
        </div>
        <div v-if="!classAvgChart" class="text-cocoa-400 text-sm py-8 text-center">暂无班级成绩数据</div>
        <div v-else class="w-full overflow-x-auto">
          <svg :viewBox="`0 0 ${classAvgChart.width} ${classAvgChart.height}`" class="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <!-- Y 轴参考线 -->
            <line
              v-for="i in 4"
              :key="'cgrid-' + i"
              :x1="classAvgChart.padding.left"
              :x2="classAvgChart.width - classAvgChart.padding.right"
              :y1="classAvgChart.padding.top + (classAvgChart.innerH * i) / 4"
              :y2="classAvgChart.padding.top + (classAvgChart.innerH * i) / 4"
              stroke="rgb(var(--cream-200))"
              stroke-width="1"
            />
            <!-- 柱子 -->
            <g v-for="b in classAvgChart.bars" :key="b.id">
              <rect
                :x="b.x"
                :y="b.y"
                :width="b.w"
                :height="b.h"
                :fill="b.avg >= 80 ? 'rgb(var(--mint-400))' : b.avg >= 60 ? 'rgb(var(--butter-400))' : 'rgb(var(--sakura-400))'"
                rx="3"
              />
              <text
                :x="b.x + b.w / 2"
                :y="b.y - 6"
                text-anchor="middle"
                class="fill-cocoa-700"
                font-size="12"
                font-weight="600"
              >{{ b.avg }}</text>
              <text
                :x="b.x + b.w / 2"
                :y="classAvgChart.height - classAvgChart.padding.bottom + 16"
                text-anchor="middle"
                class="fill-cocoa-500"
                font-size="11"
              >{{ (b.name || '').slice(0, 6) }}</text>
              <title>{{ b.name }}：均分 {{ b.avg }}（{{ b.count }} 人次）</title>
            </g>
            <!-- X 轴 -->
            <line
              :x1="classAvgChart.padding.left"
              :x2="classAvgChart.width - classAvgChart.padding.right"
              :y1="classAvgChart.padding.top + classAvgChart.innerH"
              :y2="classAvgChart.padding.top + classAvgChart.innerH"
              stroke="rgb(var(--cocoa-300))"
              stroke-width="1"
            />
          </svg>
        </div>
      </div>

      <!-- Top 10 学生榜单 -->
      <div class="bg-surface rounded-2xl p-6 shadow-softer">
        <div class="font-medium text-cocoa-700 mb-4 flex items-center gap-2">
          <Trophy class="w-4 h-4 text-butter-500" /> 学生成绩榜 Top 10
          <span class="text-xs text-cocoa-400 font-normal">（按均分降序）</span>
        </div>
        <div v-if="!topStudents.length" class="text-cocoa-400 text-sm py-8 text-center">暂无学生成绩数据</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">排名</th>
                <th class="px-4 py-3 font-medium">姓名</th>
                <th class="px-4 py-3 font-medium">班级</th>
                <th class="px-4 py-3 font-medium text-right">均分</th>
                <th class="px-4 py-3 font-medium text-right">考试次数</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="(s, i) in topStudents" :key="s.id" class="hover:bg-cream-50">
                <td class="px-4 py-3">
                  <span
                    class="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
                    :class="i === 0 ? 'bg-butter-100 text-butter-600' : i === 1 ? 'bg-cocoa-100 text-cocoa-600' : i === 2 ? 'bg-mint-100 text-mint-600' : 'text-cocoa-500'"
                  >
                    <Trophy v-if="i === 0" class="w-3.5 h-3.5" />
                    <template v-else>{{ i + 1 }}</template>
                  </span>
                </td>
                <td class="px-4 py-3 font-medium text-cocoa-900">{{ s.name }}</td>
                <td class="px-4 py-3 text-cocoa-700">{{ s.className }}</td>
                <td class="px-4 py-3 text-right">
                  <span class="font-semibold" :class="s.avg >= 85 ? 'text-mint-600' : s.avg >= 60 ? 'text-butter-600' : 'text-sakura-600'">{{ s.avg }}</span>
                </td>
                <td class="px-4 py-3 text-right text-cocoa-500">{{ s.examCount }} 次</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
