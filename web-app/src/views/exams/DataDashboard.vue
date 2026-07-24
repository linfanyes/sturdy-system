<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import request from '@/api/request'
import {
  BarChart3, School, Users, CalendarCheck, NotebookPen,
  GraduationCap, ListTodo, NotebookText, Megaphone,
  Download, Loader2, RefreshCw,
} from 'lucide-vue-next'

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
    const res = await request.get('/semesters')
    const list = Array.isArray(res) ? res : (res?.items || [])
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

/** 通用：从响应中取出数组 */
function toArray(res: any): any[] {
  if (Array.isArray(res)) return res
  if (res && Array.isArray(res.items)) return res.items
  return []
}

/** 安全解析 JSON 字符串 */
function safeParse(s: any): any[] {
  if (Array.isArray(s)) return s
  if (typeof s !== 'string') return []
  try { return JSON.parse(s) } catch { return [] }
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
      request.get('/classes', { params: params() }),
      request.get('/students', { params: params() }),
      request.get('/attendances', { params: params() }),
      request.get('/grades', { params: params() }),
      request.get('/homework', { params: params() }),
      request.get('/notes', { params: params() }),
      request.get('/todos', { params: params() }),
      request.get('/notices', { params: params() }),
    ])
    const [classesRes, studentsRes, attsRes, gradesRes, homeworkRes, notesRes, todosRes, noticesRes] =
      res.map(r => (r.status === 'fulfilled' ? toArray(r.value) : []))

    // 出勤率
    let atTotal = 0
    let atPresent = 0
    attsRes.forEach((a: any) => {
      const recs = safeParse(a.records)
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

    // 考试均分趋势（不阻塞主流程）
    loadExamTrend()
  } catch {
    // 静默
  } finally {
    loading.value = false
  }
}

/** 考试均分趋势：最近 12 次考试 */
async function loadExamTrend() {
  try {
    let examsRes = await request.get('/exams', { params: params() })
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
        const gradesRes = await request.get('/grades', { params: { examId: exam.id } })
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
          class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400 max-w-xs"
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
      <div class="grid grid-cols-4 gap-4">
        <div
          v-for="card in cards"
          :key="card.key"
          class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4"
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
      <div class="bg-white rounded-2xl p-6 shadow-softer">
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
      <div class="bg-white rounded-2xl p-6 shadow-softer">
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
    </template>
  </div>
</template>
