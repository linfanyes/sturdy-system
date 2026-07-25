<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { listMyClasses, type TeacherClass } from '@/api/teacher'
import { getUnreadCount, listNotifications, type AppNotification } from '@/api/notification'
import {
  School, BookOpen, GraduationCap, Megaphone, Bell, Search,
  ClipboardCheck, NotebookPen, CalendarCheck, ListTodo, Star,
  ChevronRight, Loader2,
} from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const loading = ref(true)
const classes = ref<TeacherClass[]>([])

async function loadDashboard() {
  loading.value = true
  try {
    const list = await listMyClasses()
    classes.value = Array.isArray(list) ? list : []
  } catch {
    classes.value = []
  } finally {
    loading.value = false
  }
}

/* ============ 通知铃铛 ============ */
const unreadCount = ref(0)
const recentNotifications = ref<AppNotification[]>([])
const showNotifyPanel = ref(false)
let notifyTimer: ReturnType<typeof setInterval> | null = null

async function loadUnread() {
  try {
    const res = await getUnreadCount()
    unreadCount.value = res?.count ?? 0
  } catch {
    unreadCount.value = 0
  }
}

async function loadRecentNotifications() {
  try {
    const res = await listNotifications(0, 5)
    if (Array.isArray(res)) {
      recentNotifications.value = res
    } else {
      recentNotifications.value = res?.items || []
    }
  } catch {
    recentNotifications.value = []
  }
}

async function toggleNotifyPanel() {
  showNotifyPanel.value = !showNotifyPanel.value
  if (showNotifyPanel.value && recentNotifications.value.length === 0) {
    await loadRecentNotifications()
  }
}

function closeNotifyPanel() {
  showNotifyPanel.value = false
}

function goAllNotifications() {
  closeNotifyPanel()
  router.push('/teacher/notifications')
}

function formatTime(createdAt: string): string {
  const dt = new Date(createdAt)
  const diff = Date.now() - dt.getTime()
  if (diff < 60 * 1000) return '刚刚'
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`
  return dt.toLocaleString('zh-CN')
}

/* ============ 全局搜索（本地：在已加载班级中过滤，300ms 防抖） ============ */
const searchKeyword = ref('')
const debouncedKeyword = ref('')
const searchFocused = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchFocused.value = true
  const kw = searchKeyword.value
  searchTimer = setTimeout(() => {
    debouncedKeyword.value = kw
  }, 300)
}

const searchResults = computed(() => {
  const kw = debouncedKeyword.value.trim().toLowerCase()
  if (!kw) return []
  return classes.value
    .filter(c =>
      (c.name || '').toLowerCase().includes(kw) ||
      (c.grade || '').toLowerCase().includes(kw) ||
      (c.headTeacher || '').toLowerCase().includes(kw) ||
      (c.term || '').toLowerCase().includes(kw),
    )
    .slice(0, 8)
})

function onBlurSearch() {
  // 延迟关闭，允许点击结果
  setTimeout(() => { searchFocused.value = false }, 200)
}

function goClass(c: TeacherClass) {
  searchKeyword.value = ''
  searchFocused.value = false
  router.push({ name: 'teacher-classes', query: { classId: c.id } })
}

/* ============ 快捷操作圆形按钮 ============ */
const quickActions = [
  { label: '记考勤', icon: CalendarCheck, to: '/teacher/attendance', color: 'butter' },
  { label: '布置作业', icon: NotebookPen, to: '/teacher/homework', color: 'sky2' },
  { label: '发通知', icon: Megaphone, to: '/teacher/notices', color: 'sakura' },
  { label: '待办', icon: ListTodo, to: '/teacher/todos', color: 'mint' },
  { label: '行为记录', icon: Star, to: '/teacher/behavior', color: 'butter' },
]

const featureLabel = (count: number) => count === 0 ? '全部可用' : `${count} 项`

onMounted(() => {
  loadDashboard()
  loadUnread()
  notifyTimer = setInterval(loadUnread, 60 * 1000)
})

onUnmounted(() => {
  if (notifyTimer) {
    clearInterval(notifyTimer)
    notifyTimer = null
  }
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
})
</script>

<template>
  <div class="space-y-6" @click="closeNotifyPanel">
    <!-- 顶部：搜索 + 铃铛 + 刷新 -->
    <div class="flex items-center justify-end gap-4">
        <!-- 全局搜索框 -->
        <div class="relative" @click.stop>
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400 pointer-events-none" />
          <input
            v-model="searchKeyword"
            placeholder="搜索班级"
            class="w-56 pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400 focus:w-64 transition-all"
            @input="onSearchInput"
            @focus="searchFocused = true"
            @blur="onBlurSearch"
          />
          <div
            v-if="debouncedKeyword && searchFocused"
            class="absolute z-30 mt-1 w-full bg-white rounded-xl shadow-soft border border-cream-200 max-h-72 overflow-y-auto"
          >
            <div v-if="searchResults.length === 0" class="px-4 py-3 text-sm text-cocoa-400">未找到匹配班级</div>
            <button
              v-for="c in searchResults"
              :key="c.id"
              class="w-full text-left px-4 py-2 hover:bg-cream-50 flex items-center justify-between text-sm"
              @mousedown.prevent="goClass(c)"
            >
              <span class="text-cocoa-900 font-medium">{{ c.name }}</span>
              <span class="text-cocoa-400 text-xs">{{ c.grade }} · {{ c.headTeacher }}</span>
            </button>
          </div>
        </div>

        <!-- 通知铃铛 -->
        <div class="relative" @click.stop>
          <button
            class="relative w-10 h-10 rounded-xl bg-cream-100 hover:bg-cream-200 flex items-center justify-center transition-colors"
            @click="toggleNotifyPanel"
            title="通知"
          >
            <Bell class="w-5 h-5 text-cocoa-700" />
            <span
              v-if="unreadCount > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sakura-500 text-white text-[10px] font-semibold flex items-center justify-center"
            >
              {{ unreadCount > 99 ? '99+' : unreadCount }}
            </span>
          </button>
          <!-- 下拉通知面板 -->
          <div
            v-if="showNotifyPanel"
            class="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-soft border border-cream-200 z-30 overflow-hidden"
          >
            <div class="px-4 py-3 border-b border-cream-200 flex items-center justify-between">
              <div class="font-semibold text-cocoa-900">最近通知</div>
              <span class="text-xs text-cocoa-400">{{ unreadCount }} 条未读</span>
            </div>
            <div class="max-h-72 overflow-y-auto">
              <div v-if="recentNotifications.length === 0" class="px-4 py-6 text-sm text-cocoa-400 text-center">
                暂无通知
              </div>
              <div
                v-for="n in recentNotifications"
                :key="n.id"
                class="px-4 py-3 border-b border-cream-100 hover:bg-cream-50"
              >
                <div class="flex items-start gap-2">
                  <span
                    v-if="!n.read"
                    class="shrink-0 w-2 h-2 rounded-full bg-sakura-500 mt-1.5"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium text-cocoa-900 truncate">{{ n.title }}</div>
                    <div v-if="n.content" class="text-xs text-cocoa-500 mt-0.5 line-clamp-2">{{ n.content }}</div>
                    <div class="text-xs text-cocoa-400 mt-1">{{ formatTime(n.createdAt) }}</div>
                  </div>
                </div>
              </div>
            </div>
            <button
              class="w-full px-4 py-2.5 text-sm text-butter-600 hover:bg-cream-50 border-t border-cream-200 flex items-center justify-center gap-1"
              @click="goAllNotifications"
            >
              查看全部
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          class="px-4 py-2 rounded-xl bg-cream-100 text-cocoa-700 text-sm hover:bg-cream-200 transition-colors"
          :disabled="loading"
          @click="loadDashboard"
        >
          {{ loading ? '刷新中…' : '刷新' }}
        </button>
    </div>

    <!-- 概览卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-butter-100 flex items-center justify-center">
          <GraduationCap class="w-6 h-6 text-butter-600" />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">当前教师</div>
          <div class="text-lg font-semibold text-cocoa-900 mt-0.5">{{ auth.user?.name }}</div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-mint-100 flex items-center justify-center">
          <School class="w-6 h-6 text-mint-500" />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">所属学校</div>
          <div class="text-lg font-semibold text-cocoa-900 mt-0.5 truncate max-w-[10rem]">{{ auth.user?.schoolName || auth.user?.schoolId || '-' }}</div>
        </div>
      </div>
      <div class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-sky2-100 flex items-center justify-center">
          <BookOpen class="w-6 h-6 text-sky2-500" />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">功能权限</div>
          <div class="text-lg font-semibold text-cocoa-900 mt-0.5">{{ featureLabel(auth.user?.features?.length ?? 0) }}</div>
        </div>
      </div>
    </div>

    <!-- 快捷操作圆形按钮组 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-4">
        <Megaphone class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">快捷操作</h2>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        <router-link
          v-for="a in quickActions"
          :key="a.to"
          :to="a.to"
          class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-cream-50 transition-colors"
        >
          <div
            :class="[
              'w-12 h-12 rounded-full flex items-center justify-center',
              a.color === 'butter' ? 'bg-butter-100' : '',
              a.color === 'mint' ? 'bg-mint-100' : '',
              a.color === 'sky2' ? 'bg-sky2-100' : '',
              a.color === 'sakura' ? 'bg-sakura-100' : '',
            ]"
          >
            <component
              :is="a.icon"
              :class="[
                'w-5 h-5',
                a.color === 'butter' ? 'text-butter-600' : '',
                a.color === 'mint' ? 'text-mint-500' : '',
                a.color === 'sky2' ? 'text-sky2-500' : '',
                a.color === 'sakura' ? 'text-sakura-500' : '',
              ]"
            />
          </div>
          <span class="text-sm text-cocoa-700">{{ a.label }}</span>
        </router-link>
      </div>
    </div>

    <!-- 我的班级 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-4">
        <School class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">我的班级</h2>
        <span class="text-sm text-cocoa-400 ml-auto">共 {{ classes.length }} 个班级</span>
      </div>
      <div v-if="loading" class="text-cocoa-400 text-sm py-4 flex items-center justify-center gap-2">
        <Loader2 class="w-4 h-4 animate-spin" />
        加载中…
      </div>
      <div v-else-if="classes.length === 0" class="text-cocoa-400 text-sm py-8 text-center">
        <School class="w-8 h-8 mx-auto mb-2 text-cocoa-300" />
        暂无班级，请联系校管为您分配班级
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="c in classes"
          :key="c.id"
          class="border border-cream-200 rounded-xl p-4 hover:border-butter-300 hover:shadow-softer transition-all"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="font-semibold text-cocoa-900">{{ c.name }}</div>
            <span class="text-xs text-cocoa-400">{{ c.term || '本学期' }}</span>
          </div>
          <div class="text-sm text-cocoa-500 space-y-1">
            <div>年级：{{ c.grade || '-' }}</div>
            <div>班主任：{{ c.headTeacher || '-' }}</div>
            <div v-if="c.subjects?.length" class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="s in c.subjects"
                :key="s"
                class="text-xs px-2 py-0.5 rounded-full bg-butter-100 text-butter-600"
              >{{ s }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 原快捷入口（保留） -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-4">
        <ClipboardCheck class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">快捷入口</h2>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <router-link to="/teacher/exams" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-cream-100 transition-colors">
          <GraduationCap class="w-6 h-6 text-butter-500" />
          <span class="text-sm text-cocoa-700">考试管理</span>
        </router-link>
        <router-link to="/teacher/grades" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-cream-100 transition-colors">
          <BookOpen class="w-6 h-6 text-mint-500" />
          <span class="text-sm text-cocoa-700">成绩录入</span>
        </router-link>
        <router-link to="/teacher/homework" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-cream-100 transition-colors">
          <BookOpen class="w-6 h-6 text-sky2-500" />
          <span class="text-sm text-cocoa-700">作业管理</span>
        </router-link>
        <router-link to="/teacher/ai-chat" class="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-cream-100 transition-colors">
          <Megaphone class="w-6 h-6 text-sakura-500" />
          <span class="text-sm text-cocoa-700">AI 助手</span>
        </router-link>
      </div>
    </div>
  </div>
</template>
