<script setup lang="ts">
import { computed, ref, onMounted, watch, onBeforeUnmount } from 'vue'
import { useUserStore, termOptions, currentTermStr } from '../stores/user'
import { useClassStore } from '../stores/class'
import { useGradeStore } from '../stores/grade'
import { useNoteStore } from '../stores/note'
import { useSchoolStore } from '../stores/school'
import { useTodoStore } from '../stores/todo'
import { useToastStore } from '../stores/toast'
import { useTeacherStore } from '../stores/teacher'
import { useDashboardStore } from '../stores/dashboard'
import { useRouter } from 'vue-router'
import { ALL_TOOLS, MAX_DASHBOARD_TOOLS } from '../data/tools'
import { subjectPalette } from '../seed'
import { Calendar, Notebook, Sparkles, ArrowRight, BookOpen, Megaphone, Bell, BookMarked, Plus, Check, X, Edit3, Trash2, ListChecks, RotateCcw, ChevronDown } from 'lucide-vue-next'
import { dayOfWeekCN, formatShort, uid } from '../utils'
import { getStorageKey } from '../utils/storage'
import type { TodoItem } from '../types'
import Modal from '../components/common/Modal.vue'

const userStore = useUserStore()
const classStore = useClassStore()
const gradeStore = useGradeStore()
const noteStore = useNoteStore()
const schoolStore = useSchoolStore()
const todoStore = useTodoStore()
const toast = useToastStore()
const teacherStore = useTeacherStore()
const dashboardStore = useDashboardStore()
const router = useRouter()

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

const today = new Date()
const todayDow = today.getDay() === 0 ? 7 : today.getDay()
const todayStr = new Date().toISOString().slice(0, 10)

const todaySchedule = computed(() => {
  const all = schoolStore.schedules.filter((s) => s.dayOfWeek === todayDow)
  const mine = all.filter((s) => userStore.isTeaching(s.classId, s.subject))
  const list = userStore.teaching.length ? mine : all
  return list.sort((a, b) => a.period - b.period).slice(0, 6)
})

const totalStudents = computed(() => classStore.students.length)
const totalClasses = computed(() => classStore.classes.length)
const totalNotes = computed(() => noteStore.notes.length)
const totalGrades = computed(() => gradeStore.grades.length)

// ============ 快速上手引导 ============
const setupSteps = computed(() => [
  {
    id: 'class',
    icon: '🏫',
    title: '创建你的第一个班级',
    desc: '先建立班级，才能添加学生和录入成绩',
    done: totalClasses.value > 0,
    action: '去创建班级',
    route: 'classes',
  },
  {
    id: 'student',
    icon: '🧒',
    title: '添加班级学生',
    desc: '支持单个添加、批量导入、AI 智能识别',
    done: totalStudents.value > 0,
    action: '去添加学生',
    route: 'students',
  },
  {
    id: 'schedule',
    icon: '📅',
    title: '设置课程表',
    desc: '把每周的课程安排录入系统，随时查看',
    done: schoolStore.schedules.length > 0,
    action: '去设置课表',
    route: 'schedule',
  },
  {
    id: 'exam',
    icon: '📊',
    title: '录入第一次考试成绩',
    desc: 'AI 自动统计平均分、及格率、排名等',
    done: totalGrades.value > 0,
    action: '去录入成绩',
    route: 'grades',
  },
  {
    id: 'teacher',
    icon: '📇',
    title: '添加教师通讯录',
    desc: '录入班主任与各学科任课老师，便于设置学生任课老师',
    done: teacherStore.teachers.length > 0,
    action: '去添加教师',
    route: 'teachers',
  },
])

const setupDoneCount = computed(() => setupSteps.value.filter((s) => s.done).length)
const showSetupGuide = computed(() => setupDoneCount.value < setupSteps.value.length)
const setupGuideCollapsed = ref(false)

function goSetup(routeName: string) {
  router.push({ name: routeName })
}

const recentNotes = computed(() =>
  [...noteStore.notes].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4),
)

const pinnedNotices = computed(() =>
  [...schoolStore.notices]
    .filter((n) => n.pinned)
    .filter(
      (n) =>
        !classStore.currentClassId ||
        n.classId === '全校' ||
        n.classId === classStore.currentClassId,
    )
    .slice(0, 3),
)

// 课堂神器：展示用户在「管理」中自选的 5 个（默认取前 5 个常用）
const tools = computed(() =>
  dashboardStore.selected
    .map((route) => ALL_TOOLS.find((t) => t.route === route))
    .filter((t): t is (typeof ALL_TOOLS)[number] => Boolean(t)),
)

// 课堂神器「管理」弹窗
const toolsEditorOpen = ref(false)
const draftSelected = ref<string[]>([])
function openToolsEditor() {
  draftSelected.value = [...dashboardStore.selected]
  toolsEditorOpen.value = true
}
function toggleToolRoute(route: string) {
  const i = draftSelected.value.indexOf(route)
  if (i >= 0) {
    draftSelected.value.splice(i, 1)
  } else {
    if (draftSelected.value.length >= MAX_DASHBOARD_TOOLS) {
      toast.warning(`最多选择 ${MAX_DASHBOARD_TOOLS} 个课堂神器`)
      return
    }
    draftSelected.value.push(route)
  }
}
function saveToolsEditor() {
  dashboardStore.selected = [...draftSelected.value]
  toolsEditorOpen.value = false
  toast.success('已更新课堂神器')
}

const stats = computed(() => [
  { label: '班级数', value: totalClasses.value, suffix: '个', icon: '🏫', color: 'bg-butter-300/70' },
  { label: '学生数', value: totalStudents.value, suffix: '人', icon: '🧒', color: 'bg-mint-300/70' },
  { label: '笔记数', value: totalNotes.value, suffix: '篇', icon: '📒', color: 'bg-sakura-300/70' },
  { label: '考试数', value: totalGrades.value, suffix: '次', icon: '📊', color: 'bg-sky2-300/70' },
])

// ============ 今日心情 ============
const moodOptions = ['元气满满', '有些小累', '需要鼓励', '灵感爆棚']
const moodEmojis = ['🌟', '🥱', '🤗', '💡']
// 今日心情按登录人隔离: trace.{userId}.mood
const MOOD_KEY = () => getStorageKey('mood')

const currentMood = ref<string>('')

onMounted(() => {
  try {
    const raw = localStorage.getItem(MOOD_KEY())
    if (raw) {
      const data = JSON.parse(raw)
      if (data.date === todayStr) currentMood.value = data.mood || ''
    }
  } catch (e) {
    console.warn('mood init err', e)
  }
})

function pickMood(m: string) {
  currentMood.value = m
  localStorage.setItem(MOOD_KEY(), JSON.stringify({ date: todayStr, mood: m }))
  toast.success(`已记录今日心情：${m}`)
}

function clearMood() {
  currentMood.value = ''
  localStorage.removeItem(MOOD_KEY())
}

// ============ 今日待办 ============
const todos = computed(() => todoStore.todos)

const todayTodos = computed(() =>
  todos.value
    .filter((t) => t.date === todayStr)
    .sort((a, b) => Number(a.done) - Number(b.done) || a.createdAt - b.createdAt),
)

const doneTodos = computed(() => todayTodos.value.filter((t) => t.done))
const pendingTodos = computed(() => todayTodos.value.filter((t) => !t.done))

const newTodoTitle = ref('')

function addTodo() {
  const t = newTodoTitle.value.trim()
  if (!t) {
    // 文本框空时, 弹框让用户填写标题+备注
    openCreate()
    return
  }
  todoStore.addTodo({ title: t, note: '', date: todayStr })
  newTodoTitle.value = ''
  toast.success('已添加待办')
}

function toggleTodo(t: TodoItem) {
  todoStore.toggleTodo(t.id)
  if (!t.done) toast.success('已完成 ✓')
}

function removeTodo(t: TodoItem) {
  todoStore.removeTodo(t.id)
  toast.info('已删除')
}

const editOpen = ref(false)
const editingTodo = ref<TodoItem | null>(null)
const editDraftTitle = ref('')
const editDraftNote = ref('')
const isCreating = ref(false)

function openCreate() {
  isCreating.value = true
  editingTodo.value = null
  editDraftTitle.value = newTodoTitle.value.trim()
  editDraftNote.value = ''
  editOpen.value = true
}

function openEdit(t: TodoItem) {
  isCreating.value = false
  editingTodo.value = t
  editDraftTitle.value = t.title
  editDraftNote.value = t.note
  editOpen.value = true
}

function saveEdit() {
  const v = editDraftTitle.value.trim()
  if (!v) {
    toast.warning('请填写标题')
    return
  }
  if (isCreating.value) {
    todoStore.addTodo({ title: v, note: editDraftNote.value, date: todayStr })
    newTodoTitle.value = ''
    toast.success('已添加待办')
  } else if (editingTodo.value) {
    todoStore.updateTodo(editingTodo.value.id, {
      title: v,
      note: editDraftNote.value,
    })
    toast.success('已保存')
  }
  editOpen.value = false
}

function clearDone() {
  const before = doneTodos.value.length
  for (const t of [...todos.value]) {
    if (t.date === todayStr && t.done) todoStore.removeTodo(t.id)
  }
  if (before) toast.info(`已清理 ${before} 条已完成`)
}

const dateLabel = computed(() => `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')} 周${dayOfWeekCN()}`)

// ============ 学期切换器 (欢迎条右上角) ============
const termOpen = ref(false)
const termBtnEl = ref<HTMLElement | null>(null)
const termPanelEl = ref<HTMLElement | null>(null)
const currentTerm = computed(
  () => userStore.user?.term || currentTermStr(),
)

/** 下拉里的所有可选学期: 包含预设 + 当前用户已有的学期 */
const termPickerOptions = computed<string[]>(() => {
  const preset = termOptions()
  const cur = currentTerm.value
  const set = new Set<string>(preset)
  if (cur) set.add(cur)
  return Array.from(set)
})

function toggleTerm() {
  termOpen.value = !termOpen.value
}

function selectTerm(t: string) {
  if (!userStore.user) return
  userStore.update({ term: t })
  termOpen.value = false
  toast.success(`已切换到「${t}」`)
}

function resetTermToCurrent() {
  const t = currentTermStr()
  if (!userStore.user) return
  userStore.update({ term: t })
  termOpen.value = false
  toast.info(`已重置为当前学期「${t}」`)
}

function onTermDocClick(e: MouseEvent) {
  if (!termOpen.value) return
  const t = e.target as Node
  if (termPanelEl.value?.contains(t)) return
  if (termBtnEl.value?.contains(t)) return
  termOpen.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onTermDocClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onTermDocClick)
})
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎条 -->
    <section
      class="card-soft relative overflow-hidden p-7 lg:p-9 bg-gradient-to-br from-butter-100 via-cream-50 to-sakura-100"
    >
      <div
        class="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-sakura-300/40 blur-2xl"
      />
      <div
        class="absolute -bottom-16 -left-8 w-56 h-56 rounded-full bg-mint-300/40 blur-2xl"
      />

      <!-- 学期切换器 (右上角) -->
      <div class="absolute top-4 right-4 z-10">
        <button
          ref="termBtnEl"
          class="chip bg-white/85 border border-white/80 backdrop-blur shadow-softer hover:bg-white hover:-translate-y-0.5 transition flex items-center gap-1.5 !py-1.5 !px-3"
          @click="toggleTerm"
        >
          <Calendar
            :size="12"
            class="text-butter-500"
          />
          <span class="font-medium text-cocoa-900">{{ currentTerm }}</span>
          <ChevronDown
            :size="12"
            class="text-cocoa-500 transition-transform"
            :class="termOpen ? 'rotate-180' : ''"
          />
        </button>
        <div
          v-if="termOpen"
          ref="termPanelEl"
          class="absolute right-0 top-full mt-2 w-56 card-soft p-2 shadow-soft z-20"
        >
          <div class="text-[10px] text-cocoa-400 px-2 py-1 flex items-center justify-between">
            <span>切换学期</span>
            <button
              class="text-sky2-500 hover:underline"
              @click="resetTermToCurrent"
            >
              重置
            </button>
          </div>
          <div class="max-h-64 overflow-y-auto">
            <button
              v-for="t in termPickerOptions"
              :key="t"
              class="w-full text-left px-3 py-1.5 text-sm rounded-xl hover:bg-butter-100/70 flex items-center justify-between"
              :class="t === currentTerm ? 'bg-butter-100/80 text-butter-700 font-medium' : 'text-cocoa-700'"
              @click="selectTerm(t)"
            >
              <span>{{ t }}</span>
              <Check
                v-if="t === currentTerm"
                :size="12"
                class="text-butter-600"
              />
            </button>
          </div>
          <div class="border-t border-cocoa-100/60 mt-1 pt-1 text-[10px] text-cocoa-400 px-2">
            学期格式：年份 + 春季/秋季学期
          </div>
        </div>
      </div>

      <div class="relative flex flex-col lg:flex-row lg:items-end gap-6 justify-between">
        <div>
          <div class="text-sm text-cocoa-500 flex items-center gap-2">
            <Calendar :size="14" /> {{ dateLabel }}
          </div>
          <h2 class="title-display text-3xl lg:text-4xl mt-1">
            {{ greeting }}，{{ userStore.user?.name }}<span class="text-2xl ml-1">老师</span>
            <span class="inline-block animate-wiggle ml-1">🍎</span>
          </h2>
          <p class="text-cocoa-500 mt-2 max-w-md">
            愿你今天看到的每一个孩子，都像早晨的阳光一样明亮 ✨
          </p>
          <div class="flex flex-wrap gap-2 mt-4 items-center">
            <span class="chip bg-white/70 border border-white-80">
              <Sparkles :size="12" /> 今日心情
            </span>
            <button
              v-for="(m, i) in moodOptions"
              :key="m"
              class="chip border transition cursor-pointer"
              :class="
                currentMood === m
                  ? 'bg-butter-300 border-butter-500 text-cocoa-900 shadow-softer'
                  : 'bg-white/70 border-white-80 text-cocoa-700 hover:bg-butter-100'
              "
              @click="pickMood(m)"
            >
              <span>{{ moodEmojis[i] }}</span> {{ m }}
            </button>
            <button
              v-if="currentMood"
              class="text-[11px] text-cocoa-300 hover:text-sakura-500 ml-1"
              @click="clearMood"
            >
              清除
            </button>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            class="btn-mint"
            @click="router.push({ name: 'notes' })"
          >
            <Notebook :size="16" /> 写新笔记
          </button>
          <button
            class="btn-primary"
            @click="router.push({ name: 'toolbox' })"
          >
            <BookOpen :size="16" /> 打开工具箱
          </button>
        </div>
      </div>
    </section>

    <!-- 快速上手引导 -->
    <section
      v-if="showSetupGuide && !setupGuideCollapsed"
      class="card-soft p-6 mb-5 relative overflow-hidden"
    >
      <div class="absolute top-0 right-0 w-32 h-32 bg-butter-100/50 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div class="relative z-10">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-butter-200/70 flex items-center justify-center text-xl">
              🌱
            </div>
            <div>
              <h2 class="title-display text-lg">快速上手 · 4 步开启高效教学</h2>
              <p class="text-xs text-cocoa-500 mt-0.5">
                已完成 {{ setupDoneCount }} / 4 步
              </p>
            </div>
          </div>
          <button
            class="text-cocoa-400 hover:text-cocoa-600 transition p-1"
            @click="setupGuideCollapsed = true"
            title="收起引导"
          >
            <X :size="18" />
          </button>
        </div>
        <!-- 进度条 -->
        <div class="w-full h-2 bg-cocoa-100 rounded-full mb-5 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-butter-400 to-butter-500 rounded-full transition-all duration-500"
            :style="{ width: (setupDoneCount / 4 * 100) + '%' }"
          />
        </div>
        <!-- 步骤卡片 -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="step in setupSteps"
            :key="step.id"
            class="rounded-xl p-4 transition-all"
            :class="step.done
              ? 'bg-mint-50/60 border border-mint-200/50'
              : 'bg-white/70 border border-cocoa-100 hover:border-butter-300 hover:shadow-softer cursor-pointer'"
            @click="!step.done && goSetup(step.route)"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                :class="step.done ? 'bg-mint-200/70' : 'bg-butter-100'"
              >
                <Check v-if="step.done" class="text-mint-600" :size="20" />
                <span v-else>{{ step.icon }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium text-sm text-cocoa-900 flex items-center gap-1">
                  {{ step.title }}
                  <span
                    v-if="step.done"
                    class="text-[10px] bg-mint-100 text-mint-600 px-1.5 py-0.5 rounded-full"
                  >已完成</span>
                </div>
                <p class="text-xs text-cocoa-500 mt-1 leading-relaxed">
                  {{ step.desc }}
                </p>
                <button
                  v-if="!step.done"
                  class="mt-2 text-xs text-butter-600 hover:text-butter-700 font-medium inline-flex items-center gap-0.5"
                  @click.stop="goSetup(step.route)"
                >
                  {{ step.action }} <ArrowRight :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 统计卡 -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div
        v-for="s in stats"
        :key="s.label"
        class="card-soft p-5 flex items-center gap-4 hover:-translate-y-1 transition-transform"
      >
        <div
          class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-softer"
          :class="s.color"
        >
          {{ s.icon }}
        </div>
        <div>
          <div class="text-xs text-cocoa-500">
            {{ s.label }}
          </div>
          <div class="flex items-baseline gap-1 mt-0.5">
            <span class="number text-3xl text-cocoa-900">{{ s.value }}</span>
            <span class="text-xs text-cocoa-500">{{ s.suffix }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 课表 + 待办 + 笔记 + 公告 -->
    <section class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      <!-- 今日课表 -->
      <div class="card-soft p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="title-display text-xl flex items-center gap-2">
            <Calendar :size="18" /> 今日课表
          </h3>
          <button
            class="text-xs text-cocoa-500 hover:text-cocoa-900 flex items-center gap-1"
            @click="router.push({ name: 'schedule' })"
          >
            完整 <ArrowRight :size="12" />
          </button>
        </div>
        <div
          v-if="todaySchedule.length"
          class="space-y-2.5"
        >
          <div
            v-for="(s, idx) in todaySchedule"
            :key="s.id"
            class="flex items-center gap-3 group"
          >
            <div class="number text-xl w-10 text-cocoa-500">
              {{ s.period }}
            </div>
            <div
              class="w-1 h-10 rounded-full"
              :class="subjectPalette[s.subject]?.bg || 'bg-butter-100'"
            />
            <div class="flex-1 min-w-0">
              <div class="font-medium text-cocoa-900">
                {{ s.subject }}
              </div>
              <div class="text-xs text-cocoa-500">
                {{ classStore.getClass(s.classId)?.name }}
              </div>
            </div>
            <span
              class="chip text-[10px]"
              :class="subjectPalette[s.subject]?.bg"
            >
              第{{ idx + 1 }}节
            </span>
          </div>
        </div>
        <div
          v-else
          class="text-center text-cocoa-500 py-6"
        >
          <div class="text-3xl mb-2">
            📭
          </div>
          今天没有课程安排
        </div>
      </div>

      <!-- 今日待办 -->
      <div class="card-soft p-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="title-display text-xl flex items-center gap-2">
            <ListChecks :size="18" /> 今日待办
          </h3>
          <div class="flex items-center gap-1">
            <span class="chip bg-butter-100 text-butter-600 text-[10px]">
              {{ doneTodos.length }} / {{ todayTodos.length }}
            </span>
            <button
              v-if="doneTodos.length"
              class="text-[10px] text-cocoa-300 hover:text-sakura-500 flex items-center gap-0.5"
              @click="clearDone"
              title="清理已完成"
            >
              <RotateCcw :size="10" /> 清理
            </button>
          </div>
        </div>

        <!-- 快速新增 -->
        <div class="flex gap-2 mb-3">
          <input
            v-model="newTodoTitle"
            class="input-soft !py-1.5 text-sm flex-1"
            placeholder="添加待办，回车保存"
            @keyup.enter="addTodo"
          >
          <button
            type="button"
            class="btn-primary !py-1.5 !px-3 text-sm flex items-center gap-1"
            :title="newTodoTitle.trim() ? '点击添加待办' : '请先填写待办内容'"
            @click="addTodo"
          >
            <Plus :size="14" /> 添加
          </button>
        </div>

        <!-- 待办列表 -->
        <ul
          v-if="todayTodos.length"
          class="space-y-1.5 max-h-[260px] overflow-y-auto pr-1"
        >
          <li
            v-for="t in pendingTodos"
            :key="t.id"
            class="flex items-start gap-2 p-2 rounded-xl hover:bg-butter-100/60 transition group"
          >
            <button
              class="mt-0.5 w-5 h-5 rounded-full border-2 border-cocoa-300 hover:border-mint-500 hover:bg-mint-100 transition shrink-0"
              :title="'标记完成'"
              @click="toggleTodo(t)"
            />
            <div class="flex-1 min-w-0">
              <div class="text-sm text-cocoa-900 break-all">
                {{ t.title }}
              </div>
              <div
                v-if="t.note"
                class="text-[11px] text-cocoa-500 mt-0.5 line-clamp-1"
              >
                {{ t.note }}
              </div>
            </div>
            <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
              <button
                class="p-1 rounded hover:bg-white"
                title="编辑"
                @click="openEdit(t)"
              >
                <Edit3
                  :size="12"
                  class="text-cocoa-500"
                />
              </button>
              <button
                class="p-1 rounded hover:bg-white"
                title="删除"
                @click="removeTodo(t)"
              >
                <Trash2
                  :size="12"
                  class="text-cocoa-500"
                />
              </button>
            </div>
          </li>
          <li
            v-for="t in doneTodos"
            :key="t.id"
            class="flex items-start gap-2 p-2 rounded-xl bg-mint-50/40 group"
          >
            <button
              class="mt-0.5 w-5 h-5 rounded-full bg-mint-500 flex items-center justify-center shrink-0"
              :title="'撤销完成'"
              @click="toggleTodo(t)"
            >
              <Check
                :size="12"
                class="text-white"
              />
            </button>
            <div class="flex-1 min-w-0">
              <div class="text-sm text-cocoa-300 line-through break-all">
                {{ t.title }}
              </div>
              <div
                v-if="t.note"
                class="text-[11px] text-cocoa-300 line-clamp-1"
              >
                {{ t.note }}
              </div>
            </div>
            <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
              <button
                class="p-1 rounded hover:bg-white"
                title="删除"
                @click="removeTodo(t)"
              >
                <Trash2
                  :size="12"
                  class="text-cocoa-500"
                />
              </button>
            </div>
          </li>
        </ul>
        <div
          v-else
          class="text-center text-cocoa-500 py-6"
        >
          <div class="text-3xl mb-2">
            🌿
          </div>
          <div class="text-xs">
            还没有待办，享受片刻安静
          </div>
        </div>
      </div>

      <!-- 最近笔记 -->
      <div class="card-soft p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="title-display text-xl flex items-center gap-2">
            <Notebook :size="18" /> 最近笔记
          </h3>
          <button
            class="text-xs text-cocoa-500 hover:text-cocoa-900 flex items-center gap-1"
            @click="router.push({ name: 'notes' })"
          >
            全部 <ArrowRight :size="12" />
          </button>
        </div>
        <div
          v-if="recentNotes.length"
          class="space-y-2.5"
        >
          <div
            v-for="n in recentNotes"
            :key="n.id"
            class="card-flat p-3 hover:shadow-soft transition cursor-pointer"
            @click="router.push({ name: 'notes' })"
          >
            <div class="flex items-center justify-between">
              <div class="font-medium truncate">
                {{ n.title }}
              </div>
              <span
                class="chip text-[10px]"
                :class="
                  n.category === '教学反思'
                    ? 'bg-sakura-100 text-sakura-500'
                    : n.category === '班会记录'
                      ? 'bg-mint-100 text-mint-500'
                      : n.category === '学习资料'
                        ? 'bg-sky2-100 text-sky2-500'
                        : 'bg-butter-100 text-butter-600'
                "
              >
                {{ n.category }}
              </span>
            </div>
            <div class="text-xs text-cocoa-500 mt-1 line-clamp-1">
              {{ n.content }}
            </div>
            <div class="text-[10px] text-cocoa-300 mt-1.5">
              {{ formatShort(n.updatedAt) }} 更新
            </div>
          </div>
        </div>
        <div
          v-else
          class="text-center text-cocoa-500 py-6"
        >
          <div class="text-3xl mb-2">
            📒
          </div>
          还没有笔记，开始记录吧
        </div>
      </div>

      <!-- 班级公告 -->
      <div class="card-soft p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="title-display text-xl flex items-center gap-2">
            <Megaphone :size="18" /> 班级公告
          </h3>
          <button
            class="text-xs text-cocoa-500 hover:text-cocoa-900 flex items-center gap-1"
            @click="router.push({ name: 'notice' })"
          >
            全部 <ArrowRight :size="12" />
          </button>
        </div>
        <div
          v-if="pinnedNotices.length"
          class="space-y-2.5"
        >
          <div
            v-for="n in pinnedNotices"
            :key="n.id"
            class="card-flat p-3 border-l-4 border-sakura-400"
          >
            <div class="font-medium truncate">
              {{ n.title }}
            </div>
            <div class="text-xs text-cocoa-500 mt-1 line-clamp-2">
              {{ n.content }}
            </div>
            <div class="text-[10px] text-cocoa-300 mt-1.5">
              {{ n.classId === '全校' ? '全校' : classStore.getClass(n.classId)?.name }} · {{ formatShort(n.createdAt) }}
            </div>
          </div>
        </div>
        <div
          v-else
          class="text-center text-cocoa-500 py-6"
        >
          <div class="text-3xl mb-2">
            📣
          </div>
          还没有置顶的公告
        </div>
      </div>
    </section>

    <!-- 工具快捷 -->
    <section class="card-soft p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="title-display text-xl flex items-center gap-2">
          <BookMarked :size="18" /> 课堂神器
        </h3>
        <div class="flex items-center gap-3">
          <button
            class="text-xs text-cocoa-500 hover:text-cocoa-900 flex items-center gap-1"
            @click="toolsEditorOpen = true"
          >
            <Edit3 :size="12" /> 管理
          </button>
          <button
            class="text-xs text-cocoa-500 hover:text-cocoa-900 flex items-center gap-1"
            @click="router.push({ name: 'toolbox' })"
          >
            全部工具 <ArrowRight :size="12" />
          </button>
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          v-for="t in tools"
          :key="t.name"
          class="card-flat p-4 text-left hover:shadow-soft hover:-translate-y-0.5 transition group"
          @click="router.push({ name: t.route })"
        >
          <div
            class="w-10 h-10 rounded-2xl flex items-center justify-center text-xl mb-2"
            :class="{
              'bg-sakura-100': t.color === 'sakura',
              'bg-mint-100': t.color === 'mint',
              'bg-sky2-100': t.color === 'sky2',
              'bg-butter-100': t.color === 'butter',
            }"
          >
            {{ t.icon }}
          </div>
          <div class="font-medium">
            {{ t.name }}
          </div>
          <div class="text-xs text-cocoa-500 mt-0.5 flex items-center gap-1 group-hover:text-cocoa-900">
            立即使用 <ArrowRight :size="12" />
          </div>
        </button>
      </div>
    </section>

    <!-- 待办编辑/新增弹窗 -->
    <Modal
      :open="editOpen"
      :title="isCreating ? '新增待办' : '编辑待办'"
      width="480px"
      @close="editOpen = false"
    >
      <div class="space-y-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">标题 *</label>
          <input
            v-model="editDraftTitle"
            class="input-soft mt-1"
            placeholder="要做的事…"
            @keyup.enter="saveEdit"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">备注</label>
          <textarea
            v-model="editDraftNote"
            class="input-soft min-h-[80px] mt-1"
            placeholder="可填写更详细说明"
          />
        </div>
        <label
          v-if="!isCreating && editingTodo"
          class="flex items-center gap-2 text-sm"
        >
          <input
            type="checkbox"
            :checked="editingTodo.done"
            class="accent-mint-500"
            @change="(e) => { editingTodo!.done = (e.target as HTMLInputElement).checked; editingTodo!.doneAt = editingTodo!.done ? Date.now() : 0 }"
          >
          标记为已完成
        </label>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="editOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          @click="saveEdit"
        >
          <Check :size="14" /> 保存
        </button>
      </template>
    </Modal>

    <!-- 课堂神器「管理」弹窗 -->
    <Modal
      :open="toolsEditorOpen"
      title="管理课堂神器"
      width="520px"
      @close="toolsEditorOpen = false"
    >
      <p class="text-xs text-cocoa-500 mb-3">
        最多选择 {{ MAX_DASHBOARD_TOOLS }} 个，将展示在工作台「课堂神器」区块（已选 {{ draftSelected.length }}/{{ MAX_DASHBOARD_TOOLS }}）
      </p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <button
          v-for="t in ALL_TOOLS"
          :key="t.route"
          class="card-flat p-3 flex flex-col items-center gap-1.5 transition hover:shadow-soft"
          :class="draftSelected.includes(t.route) ? 'ring-2 ring-butter-400' : ''"
          @click="toggleToolRoute(t.route)"
        >
          <div
            class="w-9 h-9 rounded-2xl flex items-center justify-center text-xl"
            :class="{
              'bg-sakura-100': t.color === 'sakura',
              'bg-mint-100': t.color === 'mint',
              'bg-sky2-100': t.color === 'sky2',
              'bg-butter-100': t.color === 'butter',
            }"
          >
            {{ t.icon }}
          </div>
          <div class="text-xs text-cocoa-700">
            {{ t.name }}
          </div>
        </button>
      </div>
      <template #footer>
        <button
          class="btn-secondary"
          @click="toolsEditorOpen = false"
        >
          <X :size="14" /> 取消
        </button>
        <button
          class="btn-primary"
          :disabled="draftSelected.length === 0"
          @click="saveToolsEditor"
        >
          <Check :size="14" /> 保存（{{ draftSelected.length }} 个）
        </button>
      </template>
    </Modal>
  </div>
</template>
