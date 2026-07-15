<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user'
import { useClassStore } from '../../stores/class'
import { useSchoolStore } from '../../stores/school'
import { useTodoStore } from '../../stores/todo'
import { Bell, Bot, Calendar, X, BookOpen } from 'lucide-vue-next'
import Modal from '../common/Modal.vue'
import EmptyState from '../common/EmptyState.vue'
import SystemManual from '../common/SystemManual.vue'
import { dayOfWeekCN, formatShort } from '../../utils'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const classStore = useClassStore()
const schoolStore = useSchoolStore()
const todoStore = useTodoStore()

const pageTitle = computed(() => (route.meta?.title as string) || '园丁工作台')

// 根据当前时间显示问候语
const currentHour = ref(new Date().getHours())
let _greetTimer: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  _greetTimer = setInterval(() => { currentHour.value = new Date().getHours() }, 60_000)
})
onUnmounted(() => { if (_greetTimer) clearInterval(_greetTimer) })
const greeting = computed(() => {
  const h = currentHour.value
  if (h < 6) return '夜深了，注意休息'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const navGroups = [
  {
    label: '工作',
    items: [
      { name: 'dashboard', label: '工作台', icon: '🏠', emoji: true },
      { name: 'notes', label: '我的笔记', icon: '📒', emoji: true },
      { name: 'schedule', label: '我的课表', icon: '📅', emoji: true },
      { name: 'work-log', label: '工作日志', icon: '📓', emoji: true },
    ],
  },
  {
    label: '班级',
    items: [
      { name: 'classes', label: '班级管理', icon: '🏫', emoji: true },
      { name: 'students', label: '学生管理', icon: '🧒', emoji: true },
      { name: 'exams', label: '考试管理', icon: '📋', emoji: true },
      { name: 'grades', label: '成绩管理', icon: '📊', emoji: true },
      { name: 'attendance', label: '考勤管理', icon: '✅', emoji: true },
      { name: 'homework', label: '作业登记', icon: '📝', emoji: true },
      { name: 'notice', label: '班级公告', icon: '📣', emoji: true },
      { name: 'parent-contact', label: '家长联系', icon: '📞', emoji: true },
      { name: 'growth', label: '成长档案', icon: '🌱', emoji: true },
      { name: 'behavior', label: '行为观察', icon: '👀', emoji: true },
      { name: 'class-finance', label: '班费管理', icon: '💰', emoji: true },
      { name: 'class-activity', label: '班级活动', icon: '🎉', emoji: true },
    ],
  },
  {
    label: '教研',
    items: [
      { name: 'lesson-obs', label: '听课记录', icon: '📝', emoji: true },
      { name: 'teachers', label: '教师通讯录', icon: '📇', emoji: true },
      { name: 'resource', label: '教学资源', icon: '📚', emoji: true },
    ],
  },
  {
    label: '工具',
    items: [{ name: 'toolbox', label: '工具箱', icon: '🧰', emoji: true }],
  },
  {
    label: '我',
    items: [{ name: 'profile', label: '个人中心', icon: '👤', emoji: true }],
  },
]

function go(name: string) {
  if (route.name === name) return
  router.push({ name })
}

// ============ 顶栏 - 通知(消息) 弹框 ============
const notifOpen = ref(false)
const manualOpen = ref(false)

const todayDate = new Date()
const todayStr = new Date().toISOString().slice(0, 10)
const todayDow = todayDate.getDay() === 0 ? 7 : todayDate.getDay()

interface NotifItem {
  id: string
  type: 'todo' | 'schedule' | 'homework' | 'notice' | 'attendance'
  title: string
  desc: string
  time?: string
  action: { label: string; route: string } | null
}

const notifications = computed<NotifItem[]>(() => {
  const list: NotifItem[] = []

  // 1. 今日待办 (含未完成)
  const todosToday = todoStore.todos.filter((t) => t.date === todayStr && !t.done)
  if (todosToday.length) {
    list.push({
      id: 'todo-count',
      type: 'todo',
      title: `今日待办 ${todosToday.length} 项未完成`,
      desc: todosToday.slice(0, 3).map((t) => `· ${t.title}`).join('  '),
      action: { label: '去完成', route: 'dashboard' },
    })
  }

  // 2. 今日课表
  const todaySchedules = schoolStore.schedules
    .filter((s) => s.dayOfWeek === todayDow)
    .filter((s) => !userStore.teaching.length || userStore.isTeaching(s.classId, s.subject))
    .sort((a, b) => a.period - b.period)
  if (todaySchedules.length) {
    const next = todaySchedules[0]
    const cls = classStore.getClass(next.classId)
    list.push({
      id: 'schedule-today',
      type: 'schedule',
      title: `今天共 ${todaySchedules.length} 节课`,
      desc: `下一节：第 ${next.period} 节 ${next.subject}（${cls?.name || ''}）`,
      action: { label: '查看课表', route: 'schedule' },
    })
  } else {
    list.push({
      id: 'schedule-none',
      type: 'schedule',
      title: '今天没有课程安排',
      desc: '享受轻松的一天吧～',
      action: null,
    })
  }

  // 3. 今日截止的作业
  const hwToday = schoolStore.homework.filter((h) => h.deadline === todayStr)
  for (const h of hwToday) {
    const cls = classStore.getClass(h.classId)
    list.push({
      id: `hw-${h.id}`,
      type: 'homework',
      title: `作业待处理：${h.title}`,
      desc: `${cls?.name || ''} · ${h.subject} · 状态：${h.status}`,
      time: h.deadline,
      action: { label: '去登记', route: 'homework' },
    })
  }
  // 4. 今日开始的作业
  const hwStart = schoolStore.homework.filter((h) => h.startDate === todayStr)
  for (const h of hwStart) {
    const cls = classStore.getClass(h.classId)
    list.push({
      id: `hw-start-${h.id}`,
      type: 'homework',
      title: `作业已布置：${h.title}`,
      desc: `${cls?.name || ''} · ${h.subject} · 状态：${h.status}`,
      time: h.startDate,
      action: { label: '去登记', route: 'homework' },
    })
  }

  // 5. 今日有出勤记录的班级
  const attToday = schoolStore.attendance.filter((a) => a.date === todayStr)
  for (const a of attToday) {
    const cls = classStore.getClass(a.classId)
    const late = a.records.filter((r) => r.status === '迟到').length
    const absent = a.records.filter((r) => r.status === '旷课').length
    const leave = a.records.filter((r) => r.status === '请假').length
    const parts: string[] = []
    if (late) parts.push(`迟到 ${late}`)
    if (absent) parts.push(`旷课 ${absent}`)
    if (leave) parts.push(`请假 ${leave}`)
    if (!parts.length) {
      list.push({
        id: `att-${a.id}`,
        type: 'attendance',
        title: `${cls?.name || ''}：今日全员到齐`,
        desc: '无迟到/旷课/请假',
        time: a.date,
        action: { label: '查看考勤', route: 'attendance' },
      })
    } else {
      list.push({
        id: `att-${a.id}`,
        type: 'attendance',
        title: `${cls?.name || ''}：今日有 ${parts.join(' / ')}`,
        desc: `请关注学生动态`,
        time: a.date,
        action: { label: '查看考勤', route: 'attendance' },
      })
    }
  }

  // 6. 今日发出的公告 (置顶优先, 最多 2 条)
  const todayNotices = schoolStore.notices
    .filter((n) => {
      const d = new Date(n.createdAt)
      return d.toISOString().slice(0, 10) === todayStr
    })
    .sort((a, b) => Number(b.pinned) - Number(a.pinned))
    .slice(0, 2)
  for (const n of todayNotices) {
    const clsName = n.classId === '全校' ? '全校' : classStore.getClass(n.classId)?.name || ''
    list.push({
      id: `n-${n.id}`,
      type: 'notice',
      title: n.title,
      desc: `${clsName}${n.pinned ? ' · 已置顶' : ''}`,
      time: formatShort(n.createdAt),
      action: { label: '查看公告', route: 'notice' },
    })
  }

  return list
})

const notifCount = computed(() => notifications.value.length)

function openNotif() {
  notifOpen.value = true
}
function closeNotif() {
  notifOpen.value = false
}
function goFromNotif(n: NotifItem) {
  if (n.action) router.push({ name: n.action.route })
  closeNotif()
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- 侧边栏 -->
    <aside
      class="w-56 shrink-0 hidden lg:flex flex-col gap-6 px-4 py-6 sticky top-0 h-screen"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <div
          class="w-12 h-12 rounded-2xl bg-gradient-to-br from-butter-300 to-sakura-300 flex items-center justify-center text-2xl shadow-pop animate-floaty"
        >
          🍎
        </div>
        <div>
          <div class="title-display text-xl leading-none">
            园丁工作台
          </div>
          <div class="text-xs text-cocoa-500 mt-1">
            老师的好帮手
          </div>
        </div>
      </div>

      <!-- 用户卡 -->
      <div
        class="card-flat p-3 flex items-center gap-3 cursor-pointer hover:shadow-soft"
        @click="router.push({ name: 'profile' })"
      >
        <div
          class="w-10 h-10 rounded-full bg-butter-300/80 flex items-center justify-center text-xl"
        >
          {{ userStore.user?.avatar || '🌷' }}
        </div>
        <div class="min-w-0">
          <div class="font-medium truncate">
            {{ userStore.user?.name || '未登录' }}
          </div>
          <div class="text-xs text-cocoa-400 mt-0.5">
            {{ greeting }}
          </div>
        </div>
      </div>

      <!-- 导航 -->
      <nav class="flex-1 overflow-y-auto -mx-2 px-2 space-y-4">
        <div
          v-for="g in navGroups"
          :key="g.label"
        >
          <div
            class="text-[11px] uppercase tracking-widest text-cocoa-300 px-3 mb-1.5"
          >
            {{ g.label }}
          </div>
          <div class="space-y-1">
            <button
              v-for="it in g.items"
              :key="it.name"
              class="nav-item w-full"
              :class="{ active: route.name === it.name }"
              @click="go(it.name)"
            >
              <span class="text-lg">{{ it.icon }}</span>
              <span class="text-sm">{{ it.label }}</span>
            </button>
          </div>
        </div>
      </nav>

      <div
        class="card-flat p-4 bg-gradient-to-br from-butter-100 to-sakura-100"
      >
        <div class="hand text-cocoa-900 text-lg leading-tight">
          "{{ userStore.user?.motto || '用爱浇灌每一颗小苗' }}"
        </div>
        <div class="text-xs text-cocoa-500 mt-2">
          — 我的教育格言
        </div>
      </div>
    </aside>

    <!-- 主区域 -->
    <div class="flex-1 min-w-0 flex flex-col">
      <!-- 顶栏 -->
      <header
        class="sticky top-0 z-30 px-4 sm:px-6 lg:px-10 py-3 sm:py-4 flex items-center gap-2 sm:gap-3 backdrop-blur-md bg-cream-100/70"
      >
        <button
          class="lg:hidden btn-ghost !px-3"
          @click="router.back()"
          aria-label="返回"
        >
          ←
        </button>
        <div class="flex-1 min-w-0">
          <div
            class="text-xs text-cocoa-500 flex items-center gap-1.5"
          >
            <span>园丁</span>
            <span class="text-cocoa-300">/</span>
            <span>{{ pageTitle }}</span>
          </div>
          <h1 class="title-display text-2xl mt-0.5">
            {{ pageTitle }}
          </h1>
        </div>

        <!-- 机器人按钮 (AI 对话) - 工具箱前 -->
        <button
          class="w-10 h-10 rounded-2xl bg-gradient-to-br from-butter-100 to-sakura-100 hover:from-butter-300 hover:to-sakura-300 flex items-center justify-center shadow-softer hover:shadow-soft hover:-translate-y-0.5 transition relative"
          title="AI 对话"
          aria-label="AI 对话"
          @click="router.push({ path: '/toolbox/ai' })"
        >
          <Bot
            :size="18"
            class="text-cocoa-700"
          />
        </button>

        <!-- 工具箱 -->
        <button
          class="btn-secondary !px-3 !py-2 hidden sm:inline-flex"
          @click="router.push({ name: 'toolbox' })"
        >
          🧰 工具箱
        </button>

        <!-- 消息按钮 - 工具箱后 -->
        <button
          class="w-10 h-10 rounded-2xl bg-gradient-to-br from-mint-100 to-sky2-100 hover:from-mint-300 hover:to-sky2-300 flex items-center justify-center shadow-softer hover:shadow-soft hover:-translate-y-0.5 transition relative"
          title="今日消息"
          aria-label="今日消息"
          @click="openNotif"
        >
          <Bell
            :size="18"
            class="text-cocoa-700"
          />
          <span
            v-if="notifCount"
            class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sakura-500 text-white text-[10px] font-medium flex items-center justify-center shadow-softer"
          >
            {{ notifCount > 99 ? '99+' : notifCount }}
          </span>
        </button>

        <!-- 系统说明按钮 -->
        <button
          class="w-10 h-10 rounded-2xl bg-gradient-to-br from-cocoa-100 to-butter-100 hover:from-butter-300 hover:to-cocoa-200 flex items-center justify-center shadow-softer hover:shadow-soft hover:-translate-y-0.5 transition"
          title="系统使用说明书"
          aria-label="系统说明"
          @click="manualOpen = true"
        >
          <BookOpen
            :size="18"
            class="text-cocoa-700"
          />
        </button>

        <div
          class="w-10 h-10 rounded-full bg-butter-300/80 flex items-center justify-center text-xl shadow-softer cursor-pointer"
          @click="router.push({ name: 'profile' })"
        >
          {{ userStore.user?.avatar || '🌷' }}
        </div>
      </header>

      <!-- 内容 -->
      <main class="flex-1 px-4 sm:px-6 lg:px-10 pb-24 lg:pb-12 animate-fadeIn">
        <router-view v-slot="{ Component, route }">
          <keep-alive :max="6">
            <component :is="Component" v-if="route.meta.keepAlive" :key="route.path" />
          </keep-alive>
          <component :is="Component" v-if="!route.meta.keepAlive" :key="route.path" />
        </router-view>
      </main>

      <footer
        class="px-6 lg:px-10 py-6 text-xs text-cocoa-500 flex flex-wrap items-center justify-between gap-2 hidden lg:flex"
      >
        <div>© {{ new Date().getFullYear() }} 园丁工作台 · 献给每一位温暖的老师</div>
        <div class="flex items-center gap-3">
          <span>用 ❤️ 与 ☕ 制作</span>
        </div>
      </footer>
    </div>

    <!-- 移动端底部导航栏 -->
    <nav
      class="fixed bottom-0 inset-x-0 z-40 lg:hidden glass border-t border-cocoa-100/40 pb-[env(safe-area-inset-bottom)]"
    >
      <div class="grid grid-cols-5">
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-all"
          :class="['dashboard', 'notes', 'schedule', 'work-log', 'lesson-obs'].includes(route.name as string) ? 'text-butter-600' : 'text-cocoa-500'"
          @click="go('dashboard')"
        >
          <span class="text-xl">🏠</span>
          <span>工作台</span>
        </button>
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-all"
          :class="['students', 'classes', 'exams', 'grades', 'attendance', 'homework', 'notice', 'parent-contact', 'growth', 'behavior', 'class-finance', 'class-activity'].includes(route.name as string) ? 'text-butter-600' : 'text-cocoa-500'"
          @click="go('students')"
        >
          <span class="text-xl">🧒</span>
          <span>班级</span>
        </button>
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-all"
          :class="route.path.startsWith('/toolbox') || route.path.startsWith('/games') ? 'text-butter-600' : 'text-cocoa-500'"
          @click="go('toolbox')"
        >
          <span class="text-xl">🧰</span>
          <span>工具</span>
        </button>
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-all relative"
          :class="notifOpen ? 'text-butter-600' : 'text-cocoa-500'"
          @click="openNotif"
        >
          <span class="text-xl">🔔</span>
          <span>消息</span>
          <span
            v-if="notifCount"
            class="absolute top-1.5 right-4 min-w-[16px] h-[16px] px-1 rounded-full bg-sakura-500 text-white text-[10px] font-medium flex items-center justify-center"
          >
            {{ notifCount > 99 ? '99+' : notifCount }}
          </span>
        </button>
        <button
          class="flex flex-col items-center gap-0.5 py-2.5 text-[10px] transition-all"
          :class="route.name === 'profile' ? 'text-butter-600' : 'text-cocoa-500'"
          @click="go('profile')"
        >
          <span class="text-xl">👤</span>
          <span>我的</span>
        </button>
      </div>
    </nav>

    <!-- 今日消息弹框 -->
    <Modal
      :open="notifOpen"
      title="今日消息"
      width="560px"
      @close="closeNotif"
    >
      <div class="space-y-3">
        <div class="text-xs text-cocoa-500 flex items-center gap-1.5">
          <Calendar :size="12" />
          {{ todayDate.getFullYear() }}-{{ String(todayDate.getMonth() + 1).padStart(2, '0') }}-{{ String(todayDate.getDate()).padStart(2, '0') }} 周{{ dayOfWeekCN() }}
        </div>

        <EmptyState
          v-if="!notifications.length"
          title="今天还没有消息"
          desc="享受片刻的安静吧"
          icon="🔔"
        />
        <ul
          v-else
          class="space-y-2 max-h-[60vh] overflow-y-auto pr-1"
        >
          <li
            v-for="n in notifications"
            :key="n.id"
            class="card-flat p-3 hover:shadow-soft transition cursor-pointer"
            @click="goFromNotif(n)"
          >
            <div class="flex items-start gap-2">
              <div
                class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                :class="
                  n.type === 'todo' ? 'bg-butter-300' :
                  n.type === 'schedule' ? 'bg-mint-300' :
                  n.type === 'homework' ? 'bg-sky2-300' :
                  n.type === 'attendance' ? 'bg-sakura-300' :
                  'bg-cream-300'
                "
              >
                <span class="text-sm">
                  {{
                    n.type === 'todo' ? '✅' :
                    n.type === 'schedule' ? '📅' :
                    n.type === 'homework' ? '📝' :
                    n.type === 'attendance' ? '👥' :
                    '📣'
                  }}
                </span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-cocoa-900">
                  {{ n.title }}
                </div>
                <div class="text-[11px] text-cocoa-500 mt-0.5 line-clamp-2">
                  {{ n.desc }}
                </div>
                <div class="flex items-center justify-between mt-1.5">
                  <span
                    v-if="n.time"
                    class="text-[10px] text-cocoa-300"
                  >
                    {{ n.time }}
                  </span>
                  <span
                    v-else
                    class="text-[10px] text-cocoa-300"
                  >
                    今日
                  </span>
                  <span
                    v-if="n.action"
                    class="text-[10px] text-sky2-500"
                  >
                    {{ n.action.label }} →
                  </span>
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="closeNotif"
        >
          <X :size="14" /> 关闭
        </button>
      </template>
    </Modal>

    <!-- 系统使用说明书弹框 -->
    <SystemManual
      :open="manualOpen"
      @close="manualOpen = false"
    />
  </div>
</template>
