<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  getParentMe,
  getParentNotices,
  getParentExams,
  getParentHomework,
  type ParentExam,
  type ParentNotice,
  type ParentHomework,
} from '@/api/parent'
import {
  GraduationCap, School, BookOpen, Megaphone, ClipboardList,
  TrendingUp, Pin, LogOut, ChevronDown, Loader2,
} from 'lucide-vue-next'

type ParentMe = {
  imUserId: string
  studentId: string
  studentName: string
  classId: string
  className: string
  studentNo: string
  nickName: string
}

const auth = useAuthStore()
const router = useRouter()
const loading = ref(true)
const me = ref<ParentMe | null>(null)
// 预留多孩子切换：当前 API 只返回一个孩子，故 kids 仅含单元素
const kids = ref<any[]>([])
const showKidsDropdown = ref(false)
const tab = ref<'pending' | 'scores'>('pending')
const notices = ref<ParentNotice[]>([])
const exams = ref<ParentExam[]>([])
const homework = ref<ParentHomework[]>([])

async function loadAll() {
  loading.value = true
  try {
    const [m, n, e, h] = await Promise.all([
      getParentMe(),
      getParentNotices(),
      getParentExams(),
      getParentHomework(),
    ])
    me.value = m
    kids.value = [m]
    notices.value = n || []
    exams.value = e?.exams || []
    homework.value = h || []
  } catch (e: any) {
    alert('加载失败：' + (e?.message || e))
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

function fmtDate(s?: string) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('zh-CN').replace(/\//g, '-')
}

/** HTML 实体转义：防止分布图 label 含标签字符时通过 v-html 注入脚本（存储型 XSS 防护） */
function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 内联 SVG 柱状图：分数段分布，isStudent=true 的柱子高亮 */
function barChart(distribution: Array<{ label: string; count: number; pct: number; isStudent: boolean }>) {
  if (!distribution?.length) return ''
  const w = 100, h = 200, padding = 30, barW = (w - padding * 2) / distribution.length
  const maxCount = Math.max(...distribution.map(d => d.count), 1)
  const barHeight = (c: number) => (c / maxCount) * (h - padding * 2)
  const bars = distribution.map((d, i) => {
    const x = padding + i * barW + barW * 0.15
    const bh = barHeight(d.count)
    const y = h - padding - bh
    // butter-400 / cream-200
    const fill = d.isStudent ? '#f59e0b' : '#fef3c7'
    return `<rect x="${x}" y="${y}" width="${barW * 0.7}" height="${bh}" fill="${fill}" rx="2"/>
            <text x="${x + barW * 0.35}" y="${y - 4}" font-size="10" text-anchor="middle" fill="#78716c">${escapeHtml(d.count)}</text>
            <text x="${x + barW * 0.35}" y="${h - padding + 12}" font-size="9" text-anchor="middle" fill="#a8a29e">${escapeHtml(d.label)}</text>`
  }).join('')
  return `<svg viewBox="0 0 ${w} ${h}" class="w-full" style="max-height:200px">${bars}</svg>`
}

/** 学科分析：>=0.8 为优势，<0.6 为薄弱 */
function analyzeSubjects(exam: ParentExam) {
  const strong: string[] = []
  const weak: string[] = []
  for (const s of exam.subjects) {
    if (s.score == null) continue
    if (s.fullScore <= 0) continue
    const rate = s.score / s.fullScore
    if (rate >= 0.8) strong.push(s.subject)
    else if (rate < 0.6) weak.push(s.subject)
  }
  return { strong, weak }
}

function switchKid(k: any) {
  me.value = k
  showKidsDropdown.value = false
}

function logout() {
  auth.logout()
  router.push({ name: 'login' })
}

function homeworkStatusClass(status?: string) {
  if (!status) return 'bg-cream-100 text-cocoa-500'
  if (status === '待批改') return 'bg-butter-100 text-butter-600'
  if (status === '已完成' || status === '已批改') return 'bg-mint-100 text-mint-500'
  return 'bg-cream-100 text-cocoa-500'
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900">📊 家长中心</h1>

    <!-- 加载状态 -->
    <div v-if="loading" class="bg-white rounded-2xl p-10 shadow-softer flex items-center justify-center">
      <Loader2 class="w-6 h-6 animate-spin text-butter-500" />
      <span class="ml-3 text-cocoa-500">加载中…</span>
    </div>

    <template v-else>
      <!-- 孩子信息卡 + 退出登录 -->
      <div class="bg-white rounded-2xl p-5 shadow-softer">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 relative">
            <div class="w-12 h-12 rounded-full bg-butter-100 flex items-center justify-center shrink-0">
              <GraduationCap class="w-6 h-6 text-butter-600" />
            </div>
            <div class="min-w-0">
              <button
                v-if="kids.length > 1"
                class="flex items-center gap-1 text-lg font-semibold text-cocoa-900"
                @click="showKidsDropdown = !showKidsDropdown"
              >
                {{ me?.studentName || '-' }}
                <ChevronDown class="w-4 h-4 text-cocoa-500" />
              </button>
              <div v-else class="text-lg font-semibold text-cocoa-900">{{ me?.studentName || '-' }}</div>
              <div class="text-sm text-cocoa-500 mt-0.5 flex items-center gap-2 flex-wrap">
                <span class="inline-flex items-center gap-1"><BookOpen class="w-3.5 h-3.5" />学号：{{ me?.studentNo || '-' }}</span>
                <span class="text-cocoa-300">·</span>
                <span class="inline-flex items-center gap-1"><School class="w-3.5 h-3.5" />{{ me?.className || '-' }}</span>
              </div>
            </div>
            <!-- 多孩子切换下拉（UI 预留） -->
            <div
              v-if="showKidsDropdown && kids.length > 1"
              class="absolute top-full left-0 mt-1 bg-white border border-cream-200 rounded-xl shadow-soft z-10 min-w-40 overflow-hidden"
            >
              <button
                v-for="(k, i) in kids"
                :key="i"
                :class="[
                  'w-full text-left px-3 py-2 text-sm hover:bg-cream-50',
                  k.studentId === me?.studentId ? 'bg-butter-100 text-cocoa-900 font-medium' : 'text-cocoa-700',
                ]"
                @click="switchKid(k)"
              >
                {{ k.studentName }}
              </button>
            </div>
          </div>
          <button
            class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-700 text-sm hover:bg-cream-200 transition-colors shrink-0"
            @click="logout"
          >
            <LogOut class="w-4 h-4" />
            退出登录
          </button>
        </div>
      </div>

      <!-- Tab 切换 -->
      <div class="flex gap-2">
        <button
          :class="[
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
            tab === 'pending' ? 'bg-butter-400 text-white shadow-softer' : 'bg-white text-cocoa-700 hover:bg-cream-100',
          ]"
          @click="tab = 'pending'"
        >
          📋 待办公告
        </button>
        <button
          :class="[
            'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5',
            tab === 'scores' ? 'bg-butter-400 text-white shadow-softer' : 'bg-white text-cocoa-700 hover:bg-cream-100',
          ]"
          @click="tab = 'scores'"
        >
          📊 成绩查询
        </button>
      </div>

      <!-- 待办公告 Tab -->
      <div v-if="tab === 'pending'" class="space-y-4">
        <!-- 待完成作业 -->
        <div class="bg-white rounded-2xl p-5 shadow-softer">
          <div class="flex items-center gap-2 mb-3">
            <ClipboardList class="w-5 h-5 text-mint-500" />
            <h2 class="text-lg font-semibold text-cocoa-900">📝 待完成作业</h2>
            <span class="px-2 py-0.5 rounded-full bg-mint-100 text-mint-500 text-xs font-medium">({{ homework.length }}项)</span>
          </div>
          <div v-if="homework.length === 0" class="text-cocoa-400 text-sm py-6 text-center">🎉 暂无待完成作业</div>
          <div v-else class="space-y-2">
            <div v-for="h in homework" :key="h.id" class="border border-cream-200 rounded-xl p-3">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="text-xs px-1.5 py-0.5 rounded bg-cream-100 text-cocoa-700 shrink-0">{{ h.subject }}</span>
                  <span class="font-medium text-cocoa-900 text-sm truncate">{{ h.title }}</span>
                </div>
                <span :class="['text-xs px-2 py-0.5 rounded-full whitespace-nowrap', homeworkStatusClass(h.status)]">
                  {{ h.status || '-' }}
                </span>
              </div>
              <div v-if="h.deadline" class="text-xs text-cocoa-400 mt-1">截止：{{ fmtDate(h.deadline) }}</div>
            </div>
          </div>
        </div>

        <!-- 班级公告 -->
        <div class="bg-white rounded-2xl p-5 shadow-softer">
          <div class="flex items-center gap-2 mb-3">
            <Megaphone class="w-5 h-5 text-sakura-500" />
            <h2 class="text-lg font-semibold text-cocoa-900">📢 班级公告</h2>
            <span class="px-2 py-0.5 rounded-full bg-sakura-100 text-sakura-500 text-xs font-medium">({{ notices.length }}条)</span>
          </div>
          <div v-if="notices.length === 0" class="text-cocoa-400 text-sm py-6 text-center">📭 暂无班级公告</div>
          <div v-else class="space-y-2">
            <div
              v-for="n in notices"
              :key="n.id"
              :class="['rounded-xl p-3', n.pinned ? 'bg-butter-100 border-l-4 border-butter-400' : 'border border-cream-200']"
            >
              <div class="flex items-center gap-1.5">
                <Pin v-if="n.pinned" class="w-3.5 h-3.5 text-butter-500 shrink-0" />
                <span class="font-medium text-cocoa-900 text-sm">{{ n.title }}</span>
              </div>
              <div v-if="n.content" class="text-xs text-cocoa-500 mt-1 line-clamp-2">{{ n.content }}</div>
              <div class="text-xs text-cocoa-400 mt-0.5">{{ fmtDate(n.createdAt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 成绩查询 Tab -->
      <div v-else class="space-y-4">
        <div v-if="exams.length === 0" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
          📊 暂无成绩数据
        </div>
        <div v-for="ex in exams" :key="ex.examId" class="bg-white rounded-2xl p-5 shadow-softer space-y-3">
          <!-- 头部：考试名 + 日期 + 学期 -->
          <div class="flex items-center justify-between gap-2">
            <div class="font-semibold text-cocoa-900">{{ ex.examName }}</div>
            <div class="text-xs text-cocoa-400 shrink-0">{{ fmtDate(ex.date) }}{{ ex.term ? ' · ' + ex.term : '' }}</div>
          </div>

          <!-- 总分 + 班级排名 -->
          <div v-if="ex.totalScore != null || ex.classRank" class="flex flex-wrap gap-2">
            <div v-if="ex.totalScore != null" class="px-3 py-1.5 rounded-lg bg-butter-100 text-butter-600 text-sm font-semibold">
              总分 {{ ex.totalScore }} / {{ ex.totalFullScore ?? '-' }}
            </div>
            <div v-if="ex.classRank" class="px-3 py-1.5 rounded-lg bg-mint-100 text-mint-500 text-sm font-semibold">
              班级排名：第{{ ex.classRank }}名
            </div>
          </div>

          <!-- 各科成绩表格 -->
          <div v-if="ex.subjects?.length" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="text-cocoa-500 text-xs bg-cream-50">
                  <th class="px-3 py-2 text-left font-medium">学科</th>
                  <th class="px-3 py-2 text-left font-medium">得分</th>
                  <th class="px-3 py-2 text-left font-medium">满分</th>
                  <th class="px-3 py-2 text-left font-medium">班级排名</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sub in ex.subjects" :key="sub.subject" class="border-t border-cream-100">
                  <td class="px-3 py-2 text-cocoa-900">{{ sub.subject }}</td>
                  <td class="px-3 py-2 text-cocoa-900 font-semibold">{{ sub.score ?? '-' }}</td>
                  <td class="px-3 py-2 text-cocoa-500">{{ sub.fullScore }}</td>
                  <td class="px-3 py-2 text-cocoa-700">{{ sub.classRank ? '第' + sub.classRank + '名' : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 成绩分布图 -->
          <div v-if="ex.distribution?.length">
            <div class="flex items-center gap-1.5 mb-2 text-sm text-cocoa-700">
              <TrendingUp class="w-4 h-4 text-butter-500" />
              成绩分布
            </div>
            <div v-html="barChart(ex.distribution)"></div>
          </div>

          <!-- 优势/薄弱学科 -->
          <div
            v-if="analyzeSubjects(ex).strong.length || analyzeSubjects(ex).weak.length"
            class="flex flex-wrap gap-x-4 gap-y-2 text-sm"
          >
            <div v-if="analyzeSubjects(ex).strong.length" class="flex items-center gap-1.5 flex-wrap">
              <span class="text-cocoa-500">优势学科：</span>
              <span
                v-for="s in analyzeSubjects(ex).strong"
                :key="'s-' + s"
                class="px-2 py-0.5 rounded-full bg-mint-100 text-mint-500 text-xs font-medium"
              >{{ s }}</span>
            </div>
            <div v-if="analyzeSubjects(ex).weak.length" class="flex items-center gap-1.5 flex-wrap">
              <span class="text-cocoa-500">薄弱学科：</span>
              <span
                v-for="s in analyzeSubjects(ex).weak"
                :key="'w-' + s"
                class="px-2 py-0.5 rounded-full bg-sakura-100 text-sakura-500 text-xs font-medium"
              >{{ s }}</span>
            </div>
          </div>

          <!-- 分析文案 -->
          <div v-if="ex.analysisNote" class="bg-cream-50 border-l-4 border-cream-300 px-4 py-2 text-sm text-cocoa-700 italic">
            {{ ex.analysisNote }}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
