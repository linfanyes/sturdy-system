<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listMyClasses, type TeacherClass } from '@/api/teacher'
import { getUnreadCount } from '@/api/notification'
import { Sparkles, School, GraduationCap, BookOpen, Bell, ChevronRight, Loader2, Calendar, Users, ClipboardList } from 'lucide-vue-next'
import WelcomeHero from '@/components/WelcomeHero.vue'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(true)
const classes = ref<TeacherClass[]>([])
const unreadCount = ref(0)

async function load() {
  loading.value = true
  try {
    const list = await listMyClasses() as any
    // 后端 findAll 返回 {items, total}，也兼容直接返回数组的情况
    classes.value = Array.isArray(list) ? list : (list?.items || [])
    const res = await getUnreadCount()
    unreadCount.value = res?.count ?? 0
  } catch { classes.value = [] } finally { loading.value = false }
}
onMounted(load)

const totalStudents = computed(() => classes.value.length) // 暂时不统计学生数
const totalExams = computed(() => 0) // 暂时不统计考试数

const shortcutTools = [
  { label: '记考勤', icon: '✅', to: '/teacher/attendance', color: '#e8f9e8' },
  { label: '布置作业', icon: '📝', to: '/teacher/homework', color: '#fff3d6' },
  { label: '发通知', icon: '📢', to: '/teacher/notices', color: '#e8f1fb' },
  { label: 'AI 对话', icon: '🤖', to: '/teacher/ai-chat', color: '#f0e8fb' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎横幅 -->
    <WelcomeHero
      :name="auth.user?.name || '老师'"
      :badge="auth.user?.position || ''"
      :subtitle="`${auth.user?.schoolName || '学校'}${auth.user?.teacherNo ? ' · 编号：' + auth.user.teacherNo : ''}`"
      avatar="🍎"
      accent="mint"
    >
      <template #actions>
        <button class="relative p-2 rounded-xl bg-surface/60 hover:bg-surface/90 transition-colors" @click="router.push('/teacher/notifications')">
          <Bell class="w-5 h-5 text-cocoa-600" />
          <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sakura-500 text-white text-[10px] font-semibold flex items-center justify-center">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </button>
      </template>
    </WelcomeHero>

    <!-- 概览卡片（可点击跳转） -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/teacher/classes')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><GraduationCap class="w-4 h-4 text-butter-500" /> 班级</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin" /><template v-else>{{ classes.length }}</template></div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/teacher/students')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Users class="w-4 h-4 text-mint-500" /> 学生管理</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin" /><template v-else>{{ totalStudents }}</template></div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/teacher/todos')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><ClipboardList class="w-4 h-4 text-sky2-500" /> 待办</div>
        <div class="text-3xl font-bold text-cocoa-900"><Loader2 v-if="loading" class="w-6 h-6 animate-spin" /><template v-else>{{ totalExams }}</template></div>
      </div>
      <div class="stat-card cursor-pointer hover:shadow-soft transition-shadow" @click="router.push('/teacher/config')">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><BookOpen class="w-4 h-4 text-sakura-500" /> 功能权限</div>
        <div class="text-3xl font-bold text-cocoa-900">{{ auth.user?.features?.length ? (auth.user.features.length === 0 ? 0 : auth.user.features.length) : '全部' }}</div>
      </div>
    </div>

    <!-- 快捷工具 -->
    <div>
      <h2 class="section-title"><Sparkles class="w-5 h-5 text-butter-400" /> 快捷工具</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button v-for="tool in shortcutTools" :key="tool.to" class="quick-card flex items-center gap-3 !p-4" @click="router.push(tool.to)">
          <span class="w-10 h-10 rounded-xl flex items-center justify-center text-lg" :style="{ background: tool.color }">{{ tool.icon }}</span>
          <span class="font-medium text-cocoa-900 text-sm">{{ tool.label }}</span>
        </button>
      </div>
    </div>

    <!-- 班级列表 -->
    <div v-if="!loading && classes.length > 0">
      <h2 class="section-title"><Users class="w-5 h-5 text-butter-400" /> 我的班级</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div v-for="c in classes" :key="c.id" class="quick-card" @click="router.push('/teacher/classes')">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <School class="w-5 h-5 text-butter-500" />
              <span class="font-semibold text-cocoa-900">{{ c.name }}</span>
            </div>
            <ChevronRight class="w-4 h-4 text-cocoa-300" />
          </div>
          <div class="text-xs text-cocoa-500 space-y-1">
            <div>年级：{{ c.grade || '-' }} · 班主任：{{ c.headTeacher || '-' }}</div>
            <div v-if="c.term">学期：{{ c.term }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="!loading && classes.length === 0" class="empty-state">
      <div class="icon">📚</div>
      <div class="title">暂无班级</div>
      <div class="desc">你还没有被分配到班级，请联系学校管理员</div>
    </div>
  </div>
</template>
