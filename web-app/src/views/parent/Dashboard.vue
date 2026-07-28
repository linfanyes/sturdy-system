<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getParentMe, getParentNotices, getParentExams, getParentHomework } from '@/api/parent'
import { Sparkles, Heart, Star, TrendingUp, BookOpen, Bell, ChevronRight, Loader2, Award, ClipboardList } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()

const loading = ref(true)
const me = ref<any>(null)
const notices = ref<any[]>([])
const exams = ref<any[]>([])
const homework = ref<any[]>([])

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
})

const studentName = computed(() => me.value?.studentName || auth.user?.studentName || '')
const className = computed(() => me.value?.className || '')

// 最近一次考试
const latestExam = computed(() => exams.value.length ? exams.value[exams.value.length - 1] : null)

// 待处理：未读通知 + 未完成作业
const pendingNotices = computed(() => notices.value.filter(n => !n.ended).length)
const pendingHomework = computed(() => homework.value.filter(h => h.status !== '已完成').length)

async function load() {
  loading.value = true
  try {
    const [meData, noticeData, examData, hwData] = await Promise.allSettled([
      getParentMe(),
      getParentNotices(),
      getParentExams(),
      getParentHomework(),
    ])
    if (meData.status === 'fulfilled') me.value = meData.value
    if (noticeData.status === 'fulfilled') notices.value = Array.isArray(noticeData.value) ? noticeData.value : []
    if (examData.status === 'fulfilled') exams.value = (examData.value && examData.value.exams) || []
    if (hwData.status === 'fulfilled') homework.value = Array.isArray(hwData.value) ? hwData.value : []
  } catch (e) {
    console.error('[parent] load error:', e)
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="relative z-10 flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-sakura-300/30 backdrop-blur flex items-center justify-center">
          <Heart class="w-7 h-7 text-sakura-600" />
        </div>
        <div class="flex-1">
          <div class="text-xl font-bold text-cocoa-900">
            {{ greeting }}，<span class="text-sakura-600">{{ studentName || '家长' }}</span>
          </div>
          <div class="text-sm text-cocoa-600/80 mt-0.5">
            <template v-if="className">班级：{{ className }}</template>
            <template v-else>家长中心</template>
          </div>
        </div>
      </div>
    </div>

    <!-- 概览卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Bell class="w-4 h-4 text-sakura-500" /> 待读通知</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin" /><template v-else>{{ pendingNotices }}</template></div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><ClipboardList class="w-4 h-4 text-butter-500" /> 待完成作业</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin" /><template v-else>{{ pendingHomework }}</template></div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Award class="w-4 h-4 text-mint-500" /> 考试次数</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin" /><template v-else>{{ exams.length }}</template></div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Star class="w-4 h-4 text-sky2-500" /> 最新排名</div>
        <div class="text-3xl font-bold text-cocoa-900">
          <Loader2 v-if="loading" class="w-6 h-6 animate-spin" />
          <template v-else-if="latestExam && latestExam.classRank">第 {{ latestExam.classRank }} 名</template>
          <template v-else>--</template>
        </div>
      </div>
    </div>

    <!-- 最新考试成绩 -->
    <div v-if="!loading && latestExam">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2"><TrendingUp class="w-5 h-5 text-mint-400" /> 最新考试</h2>
      <div class="quick-card">
        <div class="flex items-center justify-between mb-3">
          <div>
            <div class="font-semibold text-cocoa-900 text-lg">{{ latestExam.examName }}</div>
            <div class="text-xs text-cocoa-500 mt-1">{{ latestExam.date }} · 总分 {{ latestExam.totalScore ?? '--' }} / {{ latestExam.totalFullScore ?? '--' }}</div>
          </div>
          <div v-if="latestExam.classRank" class="text-right">
            <div class="text-2xl font-bold text-mint-600">第 {{ latestExam.classRank }} 名</div>
            <div class="text-xs text-cocoa-500">班级排名</div>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-for="s in latestExam.subjects" :key="s.subject" class="bg-cocoa-50 rounded-lg p-3">
            <div class="text-xs text-cocoa-500">{{ s.subject }}</div>
            <div class="text-lg font-bold text-cocoa-900 mt-1">{{ s.score ?? '--' }} <span class="text-xs font-normal text-cocoa-400">/ {{ s.fullScore }}</span></div>
            <div v-if="s.classRank" class="text-xs text-mint-600 mt-1">班级第 {{ s.classRank }} 名</div>
          </div>
        </div>
        <div v-if="latestExam.analysisNote" class="mt-3 text-sm text-cocoa-600 bg-butter-50 rounded-lg p-3">
          📝 {{ latestExam.analysisNote }}
        </div>
      </div>
    </div>

    <!-- 班级公告 -->
    <div v-if="!loading && notices.length > 0">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2"><Bell class="w-5 h-5 text-sakura-400" /> 班级公告</h2>
      <div class="space-y-3">
        <div v-for="n in notices.slice(0, 5)" :key="n.id" class="quick-card">
          <div class="flex items-center justify-between mb-1">
            <div class="font-medium text-cocoa-900">{{ n.title }}</div>
            <span v-if="n.pinned" class="text-xs bg-butter-100 text-butter-700 px-2 py-0.5 rounded-full">置顶</span>
          </div>
          <div class="text-sm text-cocoa-600 line-clamp-2">{{ n.content }}</div>
          <div class="text-xs text-cocoa-400 mt-2">{{ n.createdAt }}</div>
        </div>
      </div>
    </div>

    <!-- 作业列表 -->
    <div v-if="!loading && homework.length > 0">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-3 flex items-center gap-2"><BookOpen class="w-5 h-5 text-butter-400" /> 作业</h2>
      <div class="space-y-3">
        <div v-for="h in homework.slice(0, 5)" :key="h.id" class="quick-card">
          <div class="flex items-center justify-between mb-1">
            <div class="font-medium text-cocoa-900">{{ h.subject }} · {{ h.title }}</div>
            <span class="text-xs px-2 py-0.5 rounded-full" :class="h.status === '已完成' ? 'bg-mint-50 text-mint-700' : 'bg-sakura-50 text-sakura-700'">{{ h.status || '待完成' }}</span>
          </div>
          <div class="text-sm text-cocoa-600 line-clamp-2">{{ h.content }}</div>
          <div class="text-xs text-cocoa-400 mt-2">截止：{{ h.deadline || h.startDate || '--' }}</div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && !notices.length && !exams.length && !homework.length" class="empty-state">
      <div class="icon">🌟</div>
      <div class="title">欢迎来到家长中心</div>
      <div class="desc">老师尚未发布通知、作业或成绩，请稍后再来</div>
    </div>
  </div>
</template>
