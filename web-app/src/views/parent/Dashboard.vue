<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getParentMe, getParentNotices, getParentExams, getParentHomework, type ParentExam, type ParentNotice, type ParentHomework } from '@/api/parent'
import { GraduationCap, School, Megaphone, BookOpen, ClipboardList, TrendingUp, Pin } from 'lucide-vue-next'

const auth = useAuthStore()
const loading = ref(true)
const me = ref<{ studentName: string; className: string; studentNo: string; nickName: string } | null>(null)
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
    notices.value = n || []
    exams.value = e?.exams || []
    homework.value = h || []
  } catch (e: any) {
    // 静默处理，家长端数据非关键路径
  } finally {
    loading.value = false
  }
}
onMounted(loadAll)

function fmtDate(s?: string) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('zh-CN').replace(/\//g, '-')
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900">家长查看</h1>
      <button
        class="px-4 py-2 rounded-xl bg-cream-100 text-cocoa-700 text-sm hover:bg-cream-200 transition-colors"
        :disabled="loading"
        @click="loadAll"
      >
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </div>

    <!-- 概览卡片 -->
    <div class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-butter-100 flex items-center justify-center">
          <GraduationCap class="w-6 h-6 text-butter-600" />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">孩子</div>
          <div class="text-lg font-semibold text-cocoa-900 mt-0.5">{{ me?.studentName || auth.user?.studentName || '-' }}</div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-mint-100 flex items-center justify-center">
          <School class="w-6 h-6 text-mint-500" />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">班级</div>
          <div class="text-lg font-semibold text-cocoa-900 mt-0.5">{{ me?.className || '-' }}</div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-sky2-100 flex items-center justify-center">
          <BookOpen class="w-6 h-6 text-sky2-500" />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">学号</div>
          <div class="text-lg font-semibold text-cocoa-900 mt-0.5">{{ me?.studentNo || '-' }}</div>
        </div>
      </div>
    </div>

    <!-- 考试成绩 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-4">
        <TrendingUp class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">考试成绩</h2>
      </div>
      <div v-if="loading" class="text-cocoa-400 text-sm py-4">加载中…</div>
      <div v-else-if="exams.length === 0" class="text-cocoa-400 text-sm py-4">暂无成绩数据</div>
      <div v-else class="space-y-3">
        <div v-for="ex in exams" :key="ex.examId" class="border border-cream-200 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="font-medium text-cocoa-900">{{ ex.examName }}</div>
            <div class="text-xs text-cocoa-400">{{ fmtDate(ex.date) }}{{ ex.term ? ' · ' + ex.term : '' }}</div>
          </div>
          <div class="flex flex-wrap gap-2 mb-2">
            <span
              v-for="sub in ex.subjects"
              :key="sub.subject"
              class="text-sm px-2.5 py-1 rounded-lg bg-cream-50 text-cocoa-700"
            >
              {{ sub.subject }}：<span class="font-semibold">{{ sub.score ?? '-' }}</span> / {{ sub.fullScore }}
              <span v-if="sub.classRank" class="text-xs text-cocoa-400 ml-1">第{{ sub.classRank }}名</span>
            </span>
          </div>
          <div v-if="ex.totalScore != null" class="text-sm text-butter-600">
            总分 {{ ex.totalScore }} / {{ ex.totalFullScore }}
            <span v-if="ex.classRank" class="ml-2">班级第 {{ ex.classRank }} 名</span>
          </div>
          <div v-if="ex.analysisNote" class="mt-2 text-xs text-cocoa-500 bg-cream-50 rounded-lg px-3 py-2">
            {{ ex.analysisNote }}
          </div>
        </div>
      </div>
    </div>

    <!-- 两列：公告 + 作业 -->
    <div class="grid grid-cols-2 gap-4">
      <!-- 公告 -->
      <div class="bg-white rounded-2xl p-6 shadow-softer">
        <div class="flex items-center gap-2 mb-4">
          <Megaphone class="w-5 h-5 text-sakura-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">班级公告</h2>
        </div>
        <div v-if="loading" class="text-cocoa-400 text-sm py-4">加载中…</div>
        <div v-else-if="notices.length === 0" class="text-cocoa-400 text-sm py-4">暂无公告</div>
        <div v-else class="space-y-2">
          <div v-for="n in notices.slice(0, 10)" :key="n.id" class="border-b border-cream-100 pb-2 last:border-0">
            <div class="flex items-center gap-1.5">
              <Pin v-if="n.pinned" class="w-3 h-3 text-butter-500" />
              <span class="font-medium text-cocoa-900 text-sm">{{ n.title }}</span>
            </div>
            <div v-if="n.content" class="text-xs text-cocoa-500 mt-1 line-clamp-2">{{ n.content }}</div>
            <div class="text-xs text-cocoa-400 mt-0.5">{{ fmtDate(n.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- 作业 -->
      <div class="bg-white rounded-2xl p-6 shadow-softer">
        <div class="flex items-center gap-2 mb-4">
          <ClipboardList class="w-5 h-5 text-mint-500" />
          <h2 class="text-lg font-semibold text-cocoa-900">近期作业</h2>
        </div>
        <div v-if="loading" class="text-cocoa-400 text-sm py-4">加载中…</div>
        <div v-else-if="homework.length === 0" class="text-cocoa-400 text-sm py-4">暂无作业</div>
        <div v-else class="space-y-2">
          <div v-for="h in homework.slice(0, 10)" :key="h.id" class="border-b border-cream-100 pb-2 last:border-0">
            <div class="flex items-center justify-between">
              <span class="font-medium text-cocoa-900 text-sm">
                <span class="text-mint-500 mr-1">[{{ h.subject }}]</span>{{ h.title }}
              </span>
              <span :class="['text-xs px-2 py-0.5 rounded-full', h.status === '待批改' ? 'bg-butter-100 text-butter-600' : 'bg-mint-100 text-mint-500']">
                {{ h.status || '-' }}
              </span>
            </div>
            <div v-if="h.content" class="text-xs text-cocoa-500 mt-1 line-clamp-2">{{ h.content }}</div>
            <div v-if="h.deadline" class="text-xs text-cocoa-400 mt-0.5">截止：{{ fmtDate(h.deadline) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
