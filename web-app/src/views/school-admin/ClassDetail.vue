<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/feedback'
import { getClass, deleteClass, listSchoolNotices, type ClassItem } from '@/api/school-admin'
import { listClassMembers, listClassStudents, type ClassMember } from '@/api/teacher'
import { listExams, getExamAnalysis, getLeaderboard, getExamTrend } from '@/api/teacher'
import { Users, Crown, BookOpen, Calendar, TrendingUp, Edit3, Trash2, ArrowLeft, GraduationCap, Megaphone, Trophy, BarChart3 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const classId = route.params.id as string

const loading = ref(false)
const cls = ref<ClassItem | null>(null)
const members = ref<ClassMember[]>([])
const notices = ref<any[]>([])

const membersLoading = ref(false)
const noticesLoading = ref(false)

/* 学业表现 */
const recentExams = ref<any[]>([])
const examStats = ref<any>(null)
const currentExamId = ref('')
const leaderboard = ref<any[]>([])
const academicLoading = ref(false)

/* 班级学业趋势 */
const trendData = ref<Array<{ examName: string; date: string; classAvg: number }>>([])
const trendLoading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await getClass(classId)
    cls.value = res
    await Promise.all([loadMembers(), loadNotices(), loadAcademic(), loadStudents()])
  } catch (e: any) {
    toast.error(e?.message || '加载班级详情失败')
  } finally {
    loading.value = false
  }
}

async function loadMembers() {
  membersLoading.value = true
  try {
    const list = await listClassMembers(classId)
    members.value = Array.isArray(list) ? list : []
  } catch {
    members.value = []
  } finally {
    membersLoading.value = false
  }
}

async function loadNotices() {
  noticesLoading.value = true
  try {
    const res = await listSchoolNotices(0, 50)
    notices.value = (res?.items || res || []).filter((n: any) => n.classId === classId)
  } catch {
    notices.value = []
  } finally {
    noticesLoading.value = false
  }
}

/* ============ 学业表现 ============ */
async function loadAcademic() {
  academicLoading.value = true
  try {
    // 1. 加载最近考试列表
    const examsRes = await listExams({ classId, take: 10 })
    recentExams.value = Array.isArray(examsRes) ? examsRes : (examsRes?.items || [])
    if (recentExams.value.length && !currentExamId.value) {
      currentExamId.value = recentExams.value[0].id
    }
    // 2. 加载最近一次考试统计
    if (currentExamId.value) {
      const fullScoreMap = recentExams.value[0]?.subjectFullScores
        ? Object.fromEntries(Object.entries(recentExams.value[0].subjectFullScores).map(([k, v]) => [k, Number(v)]))
        : undefined
      examStats.value = await getExamAnalysis(classId, currentExamId.value, fullScoreMap)
    }
    // 3. 加载班级积分榜
    const lb = await getLeaderboard(classId)
    leaderboard.value = (lb as any)?.items || lb || []
    // 4. 加载学业趋势
    await loadTrend()
  } catch {
    recentExams.value = []
    examStats.value = null
    leaderboard.value = []
    trendData.value = []
  } finally {
    academicLoading.value = false
  }
}

async function loadTrend() {
  trendLoading.value = true
  try {
    const res = await getExamTrend(classId)
    const trend = (res as any)?.trend || {}
    // 将按科目存储的 trend 转换为按考试汇总的班级均分
    const examMap = new Map<string, { examName: string; date: string; totalScore: number; totalCount: number }>()
    for (const [, arr] of Object.entries(trend)) {
      for (const item of arr as Array<{ examName: string; date: string; avg: number; count: number }>) {
        if (item.count <= 0) continue
        const key = item.examName + '|' + item.date
        const existing = examMap.get(key) || { examName: item.examName, date: item.date, totalScore: 0, totalCount: 0 }
        existing.totalScore += item.avg * item.count
        existing.totalCount += item.count
        examMap.set(key, existing)
      }
    }
    trendData.value = Array.from(examMap.values())
      .map(e => ({
        examName: e.examName,
        date: e.date,
        classAvg: Math.round((e.totalScore / e.totalCount) * 10) / 10,
      }))
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  } catch {
    trendData.value = []
  } finally {
    trendLoading.value = false
  }
}

function onExamChange() {
  if (!currentExamId.value) { examStats.value = null; return }
  const exam = recentExams.value.find(e => e.id === currentExamId.value)
  const fullScoreMap = exam?.subjectFullScores
    ? Object.fromEntries(Object.entries(exam.subjectFullScores).map(([k, v]) => [k, Number(v)]))
    : undefined
  getExamAnalysis(classId, currentExamId.value, fullScoreMap)
    .then(r => { examStats.value = r })
    .catch(() => { examStats.value = null })
}

const headTeacher = computed(() => members.value.find(m => m.role === 'head'))
const subjectTeachers = computed(() => members.value.filter(m => m.role === 'subject'))
const activeNotices = computed(() => notices.value.filter(n => !n.ended).length)

/* 学生花名册 */
const students = ref<any[]>([])
const studentsLoading = ref(false)
async function loadStudents() {
  studentsLoading.value = true
  try {
    const list = await listClassStudents(classId)
    students.value = Array.isArray(list) ? list : (list as any)?.items || []
  } catch {
    students.value = []
  } finally {
    studentsLoading.value = false
  }
}

function goStudents() {
  router.push({ path: '/school-admin/students', query: { classId } })
}
function goNotices() {
  router.push('/school-admin/notices')
}
function goEdit() {
  router.push(`/school-admin/classes?edit=${classId}`)
}
async function handleDelete() {
  if (!cls.value) return
  if (!confirm(`确定删除班级「${cls.value.name}」？此操作不可恢复。`)) return
  try {
    await deleteClass(classId)
    toast.success('已删除')
    router.push('/school-admin/classes')
  } catch (e: any) {
    toast.error(e?.message || '删除失败')
  }
}

function fmtScore(n: number | undefined) { return n != null ? Number(n).toFixed(1) : '-' }
function pct(n: number | undefined) {
  if (n == null) return '-'
  return (n <= 1 ? n * 100 : n).toFixed(1) + '%'
}

/* ============ 趋势图 SVG ============ */
const TREND_W = 680
const TREND_H = 220
const TREND_PAD = { top: 20, right: 20, bottom: 40, left: 44 }

const trendChart = computed(() => {
  const data = trendData.value
  if (!data.length) return null
  const n = data.length
  const plotW = TREND_W - TREND_PAD.left - TREND_PAD.right
  const plotH = TREND_H - TREND_PAD.top - TREND_PAD.bottom
  const vals = data.map(d => d.classAvg).filter((v): v is number => v != null)
  const maxY = Math.max(100, ...vals)
  const minY = Math.min(0, ...vals)
  const yRange = maxY - minY || 100
  const points = data.map((d, i) => {
    const x = n <= 1 ? TREND_PAD.left + plotW / 2 : TREND_PAD.left + (i / (n - 1)) * plotW
    const y = d.classAvg != null ? TREND_PAD.top + plotH - ((d.classAvg - minY) / yRange) * plotH : null
    return { x, y, label: d.examName, value: d.classAvg }
  }).filter((p): p is { x: number; y: number; label: string; value: number } => p.y != null)
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const ticks = [0, 25, 50, 75, 100].map(v => ({ v, y: TREND_PAD.top + plotH - ((v - minY) / yRange) * plotH }))
  return { TREND_W, TREND_H, TREND_PAD, plotW, plotH, points, path, ticks, maxY, minY, data }
})

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 -->
    <div class="flex items-center gap-3 no-print">
      <button class="p-2 rounded-xl hover:bg-cream-100 text-cocoa-500" @click="router.back()">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <h1 class="text-2xl font-bold text-cocoa-900">班级详情</h1>
      <div class="ml-auto flex gap-2">
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-200 text-cocoa-700 text-sm hover:bg-cream-300" @click="goEdit">
          <Edit3 class="w-4 h-4" /> 编辑
        </button>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm hover:bg-red-100" @click="handleDelete">
          <Trash2 class="w-4 h-4" /> 删除
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center text-cocoa-400 py-12">加载中…</div>
    <div v-else-if="!cls" class="text-center text-cocoa-400 py-12">班级不存在或无权查看</div>
    <template v-else>
      <!-- 基本信息卡 -->
      <div class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-bold" :style="{ background: cls.color || '#f5b342' }">
            {{ cls.grade?.[0] || '班' }}
          </div>
          <div>
            <div class="text-xl font-bold text-cocoa-900">{{ cls.name }}</div>
            <div class="text-sm text-cocoa-500">{{ cls.grade }} · {{ cls.term || '未设学期' }}</div>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-cream-50 rounded-xl p-3 text-center">
            <div class="text-xs text-cocoa-500 mb-1">班主任</div>
            <div class="text-sm font-semibold text-cocoa-900">{{ cls.headTeacher || '-' }}</div>
          </div>
          <div class="bg-cream-50 rounded-xl p-3 text-center">
            <div class="text-xs text-cocoa-500 mb-1">学生人数</div>
            <div class="text-sm font-semibold text-cocoa-900">{{ (cls as any).studentCount ?? '-' }}</div>
          </div>
          <div class="bg-cream-50 rounded-xl p-3 text-center">
            <div class="text-xs text-cocoa-500 mb-1">班级成员</div>
            <div class="text-sm font-semibold text-cocoa-900">{{ members.length }} 人</div>
          </div>
          <div class="bg-cream-50 rounded-xl p-3 text-center">
            <div class="text-xs text-cocoa-500 mb-1">进行中公告</div>
            <div class="text-sm font-semibold text-cocoa-900">{{ activeNotices }}</div>
          </div>
        </div>
        <div v-if="cls.slogan" class="mt-3 text-sm text-cocoa-600 bg-cream-50 rounded-xl p-3">
          📢 班级口号：{{ cls.slogan }}
        </div>
      </div>

      <!-- 快捷操作 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="bg-surface rounded-2xl p-4 shadow-softer cursor-pointer hover:shadow-soft transition-shadow" @click="goStudents">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><GraduationCap class="w-4 h-4 text-mint-500" /> 学生管理</div>
          <div class="text-xs text-cocoa-400">花名册 / 成绩</div>
        </div>
        <div class="bg-surface rounded-2xl p-4 shadow-softer opacity-50 cursor-not-allowed">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Users class="w-4 h-4 text-sky2-500" /> 座位表</div>
          <div class="text-xs text-cocoa-400">请教师在端内查看</div>
        </div>
        <div class="bg-surface rounded-2xl p-4 shadow-softer opacity-50 cursor-not-allowed">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Calendar class="w-4 h-4 text-butter-500" /> 班级课表</div>
          <div class="text-xs text-cocoa-400">请教师在端内查看</div>
        </div>
        <div class="bg-surface rounded-2xl p-4 shadow-softer cursor-pointer hover:shadow-soft transition-shadow" @click="goNotices">
          <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Megaphone class="w-4 h-4 text-sakura-500" /> 公告</div>
          <div class="text-xs text-cocoa-400">发布/管理</div>
        </div>
      </div>

      <!-- 学业表现 -->
      <div v-if="academicLoading" class="bg-surface rounded-2xl p-6 shadow-softer text-center text-cocoa-400">
        加载学业数据…
      </div>
      <div v-else-if="recentExams.length" class="space-y-4">
        <!-- 最近一次考试概览 -->
        <div class="bg-surface rounded-2xl p-5 shadow-softer">
          <div class="flex items-center gap-2 mb-4">
            <Trophy class="w-5 h-5 text-butter-500" />
            <h2 class="text-lg font-semibold text-cocoa-900">学业表现</h2>
            <span class="text-sm text-cocoa-400 ml-auto">最近考试</span>
          </div>
          <div class="flex items-center gap-3 mb-4">
            <select v-model="currentExamId" class="px-3 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400" @change="onExamChange">
              <option v-for="e in recentExams" :key="e.id" :value="e.id">{{ e.name }} ({{ e.date }})</option>
            </select>
          </div>
          <div v-if="examStats" class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div class="bg-cream-50 rounded-xl p-3 text-center">
              <div class="text-xs text-cocoa-500 mb-1">班级均分</div>
              <div class="text-sm font-semibold text-cocoa-900">{{ fmtScore(examStats.classAvg) }}</div>
            </div>
            <div class="bg-cream-50 rounded-xl p-3 text-center">
              <div class="text-xs text-cocoa-500 mb-1">总人数</div>
              <div class="text-sm font-semibold text-cocoa-900">{{ examStats.totalStudents || '-' }}</div>
            </div>
            <div class="bg-cream-50 rounded-xl p-3 text-center">
              <div class="text-xs text-cocoa-500 mb-1">及格率</div>
              <div class="text-sm font-semibold text-cocoa-900">{{ pct(examStats.avgPassRate) }}</div>
            </div>
            <div class="bg-cream-50 rounded-xl p-3 text-center">
              <div class="text-xs text-cocoa-500 mb-1">优秀率</div>
              <div class="text-sm font-semibold text-cocoa-900">{{ pct(examStats.avgExcellentRate) }}</div>
            </div>
          </div>
          <div v-if="examStats?.subjects?.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-cream-100 text-cocoa-500 text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">科目</th>
                  <th class="px-3 py-2 font-medium text-right">均分</th>
                  <th class="px-3 py-2 font-medium text-right">最高</th>
                  <th class="px-3 py-2 font-medium text-right">最低</th>
                  <th class="px-3 py-2 font-medium text-right">及格率</th>
                  <th class="px-3 py-2 font-medium text-right">优秀率</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-cream-100">
                <tr v-for="s in examStats.subjects" :key="s.subject">
                  <td class="px-3 py-2 font-medium text-cocoa-900">{{ s.subject }}</td>
                  <td class="px-3 py-2 text-right text-butter-600 font-semibold">{{ fmtScore(s.avg) }}</td>
                  <td class="px-3 py-2 text-right text-mint-600">{{ fmtScore(s.max) }}</td>
                  <td class="px-3 py-2 text-right text-red-500">{{ fmtScore(s.min) }}</td>
                  <td class="px-3 py-2 text-right text-cocoa-700">{{ pct(s.passRate) }}</td>
                  <td class="px-3 py-2 text-right text-cocoa-700">{{ pct(s.excellentRate) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 班级学业趋势 -->
          <div v-if="trendLoading" class="text-center text-cocoa-400 py-6 text-sm">加载趋势中…</div>
          <div v-else-if="trendChart" class="mt-4">
            <div class="font-medium text-cocoa-700 mb-2 flex items-center gap-2">
              <TrendingUp class="w-4 h-4 text-butter-500" /> 班级均分趋势
            </div>
            <svg :viewBox="`0 0 ${trendChart.TREND_W} ${trendChart.TREND_H}`" class="w-full h-auto">
              <g v-for="(t, i) in trendChart.ticks" :key="'y' + i">
                <line :x1="trendChart.TREND_PAD.left" :x2="trendChart.TREND_W - trendChart.TREND_PAD.right" :y1="t.y" :y2="t.y" stroke="#f5f0e8" stroke-dasharray="3 3" />
                <text :x="trendChart.TREND_PAD.left - 6" :y="t.y + 4" text-anchor="end" class="fill-cocoa-400" style="font-size: 10px;">{{ t.v }}</text>
              </g>
              <g v-for="(p, i) in trendChart.points" :key="'x' + i">
                <text :x="p.x" :y="trendChart.TREND_H - 6" text-anchor="middle" class="fill-cocoa-400" style="font-size: 9px;">{{ p.label.length > 5 ? p.label.slice(0, 5) + '…' : p.label }}</text>
              </g>
              <path v-if="trendChart.points.length > 1" :d="trendChart.path" stroke="#e6a23c" stroke-width="2" fill="none" />
              <g v-for="(p, i) in trendChart.points" :key="'p' + i">
                <circle :cx="p.x" :cy="p.y" r="3" fill="#e6a23c" />
                <text v-if="p.value != null" :x="p.x" :y="p.y - 6" text-anchor="middle" class="fill-cocoa-700" style="font-size: 9px; font-weight: 600;">{{ p.value.toFixed(1) }}</text>
              </g>
            </svg>
            <div class="flex items-center justify-center gap-4 mt-2 text-xs text-cocoa-500">
              <span class="flex items-center gap-1"><span class="inline-block w-3 h-0.5 bg-butter-500 rounded"></span> 班级均分</span>
            </div>
          </div>
          <div v-else-if="!trendLoading && recentExams.length" class="text-center text-cocoa-400 py-4 text-sm">暂无趋势数据</div>
        </div>

        <!-- 班级积分榜 -->
        <div v-if="leaderboard.length" class="bg-surface rounded-2xl p-5 shadow-softer">
          <div class="flex items-center gap-2 mb-3">
            <Crown class="w-5 h-5 text-butter-500" />
            <h2 class="text-lg font-semibold text-cocoa-900">班级积分榜</h2>
            <span class="text-sm text-cocoa-400 ml-auto">德育积分</span>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-cream-100 text-cocoa-500 text-left">
                <tr>
                  <th class="px-3 py-2 font-medium w-16">名次</th>
                  <th class="px-3 py-2 font-medium">姓名</th>
                  <th class="px-3 py-2 font-medium text-right">积分</th>
                  <th class="px-3 py-2 font-medium text-right">记录数</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-cream-100">
                <tr v-for="item in leaderboard.slice(0, 20)" :key="item.studentId" class="hover:bg-cream-50">
                  <td class="px-3 py-2">
                    <span :class="['font-bold', item.rank <= 3 ? 'text-butter-600' : 'text-cocoa-700']">{{ item.rank }}</span>
                  </td>
                  <td class="px-3 py-2">
                    <span class="font-medium text-cocoa-900">{{ item.name }}</span>
                  </td>
                  <td class="px-3 py-2 text-right font-semibold" :class="item.total >= 0 ? 'text-mint-600' : 'text-red-500'">
                    {{ item.total > 0 ? '+' : '' }}{{ item.total }}
                  </td>
                  <td class="px-3 py-2 text-right text-cocoa-500">{{ item.count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div v-else class="bg-surface rounded-2xl p-6 shadow-softer text-center text-cocoa-400">
        暂无考试数据
      </div>

      <!-- 班级成员 -->
      <div class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <Users class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">班级成员</h2>
          <span class="text-sm text-cocoa-400 ml-auto">{{ members.length }} 人</span>
        </div>
        <div v-if="membersLoading" class="text-cocoa-400 text-sm">加载中…</div>
        <div v-else-if="!members.length" class="text-cocoa-400 text-sm">暂无成员</div>
        <div v-else class="space-y-2">
          <!-- 班主任 -->
          <div v-if="headTeacher" class="flex items-center gap-3 p-3 rounded-xl bg-cream-50">
            <div class="w-10 h-10 rounded-xl bg-butter-100 flex items-center justify-center text-butter-700 font-bold text-sm">班主任</div>
            <div class="flex-1">
              <div class="text-sm font-semibold text-cocoa-900">{{ headTeacher.teacherName || headTeacher.teacherId }}</div>
              <div class="text-xs text-cocoa-500">{{ headTeacher.term || '-' }}</div>
            </div>
            <div v-if="headTeacher.subjects?.length" class="flex gap-1">
              <span v-for="s in headTeacher.subjects" :key="s" class="text-xs px-2 py-0.5 rounded-full bg-butter-100 text-butter-700">{{ s }}</span>
            </div>
          </div>
          <!-- 科任老师 -->
          <div v-for="m in subjectTeachers" :key="m.id" class="flex items-center gap-3 p-3 rounded-xl border border-cream-200 hover:border-mint-400 transition-colors">
            <div class="w-10 h-10 rounded-xl bg-mint-100 flex items-center justify-center text-mint-700 font-bold text-sm">老师</div>
            <div class="flex-1">
              <div class="text-sm font-semibold text-cocoa-900">{{ m.teacherName || m.teacherId }}</div>
              <div class="text-xs text-cocoa-500">{{ m.term || '-' }}</div>
            </div>
            <div v-if="m.subjects?.length" class="flex gap-1">
              <span v-for="s in m.subjects" :key="s" class="text-xs px-2 py-0.5 rounded-full bg-mint-100 text-mint-700">{{ s }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 学生花名册 -->
      <div class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <GraduationCap class="w-5 h-5 text-butter-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">学生花名册</h2>
          <span class="text-sm text-cocoa-400 ml-auto">{{ students.length }} 人</span>
        </div>
        <div v-if="studentsLoading" class="text-cocoa-400 text-sm">加载中…</div>
        <div v-else-if="!students.length" class="text-cocoa-400 text-sm">暂无学生</div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-cream-100 text-cocoa-500 text-left">
              <tr>
                <th class="px-3 py-2 font-medium">姓名</th>
                <th class="px-3 py-2 font-medium">学号</th>
                <th class="px-3 py-2 font-medium">性别</th>
                <th class="px-3 py-2 font-medium">家长</th>
                <th class="px-3 py-2 font-medium">电话</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-cream-100">
              <tr v-for="s in students" :key="s.id" class="hover:bg-cream-50">
                <td class="px-3 py-2">
                  <span class="font-medium text-cocoa-900">{{ s.name || s.studentName || '-' }}</span>
                </td>
                <td class="px-3 py-2 text-cocoa-700">{{ s.studentNo || '-' }}</td>
                <td class="px-3 py-2 text-cocoa-700">{{ s.gender || '-' }}</td>
                <td class="px-3 py-2 text-cocoa-700">{{ s.parentName || '-' }}</td>
                <td class="px-3 py-2 text-cocoa-700">{{ s.parentPhone || s.studentPhone || '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 近期公告 -->
      <div class="bg-surface rounded-2xl p-5 shadow-softer">
        <div class="flex items-center gap-2 mb-3">
          <Megaphone class="w-5 h-5 text-sakura-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">近期公告</h2>
          <span class="text-sm text-cocoa-400 ml-auto">{{ notices.length }} 条</span>
        </div>
        <div v-if="noticesLoading" class="text-cocoa-400 text-sm">加载中…</div>
        <div v-else-if="!notices.length" class="text-cocoa-400 text-sm">暂无公告</div>
        <div v-else class="space-y-2">
          <div v-for="n in notices.slice(0, 10)" :key="n.id" class="flex items-center justify-between p-3 rounded-xl border border-cream-200">
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-cocoa-900 truncate">{{ n.title || '无标题' }}</div>
              <div class="text-xs text-cocoa-500 mt-0.5">{{ n.createdAt || n.created_at || '-' }}</div>
            </div>
            <span v-if="n.ended" class="text-xs px-2 py-0.5 rounded-full bg-cream-100 text-cocoa-500">已结束</span>
            <span v-else class="text-xs px-2 py-0.5 rounded-full bg-mint-100 text-mint-700">进行中</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
