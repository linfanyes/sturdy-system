<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import {
  LayoutDashboard, School, LogOut, User, Search,
  Bot, Briefcase, Wrench, Home, ChevronRight,
} from 'lucide-vue-next'
import { search as searchAll, type SearchResult } from '@/api/school-admin'
import type { Role } from '@/types/user'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

/** 角色中文标签 */
const roleLabel: Record<Role, string> = {
  super: '超级管理员',
  school_admin: '学校管理员',
  teacher: '教师',
  parent: '家长',
}

/** 教师菜单三级结构：分类（一级）→ 子分组（二级）→ 功能页（三级） */
interface MenuItem { name: string; label: string; to: string; feature?: string }
interface MenuSubGroup { label: string; items: MenuItem[] }
interface MenuCategory { label: string; icon: any; groups: MenuSubGroup[] }

const teacherMenu: MenuCategory[] = [
  {
    label: '工作台', icon: LayoutDashboard,
    groups: [{ label: '', items: [{ name: 'teacher-dashboard', label: '教师工作台', to: '/teacher' }] }],
  },
  {
    label: '教学管理', icon: School,
    groups: [
      {
        label: '班级',
        items: [
          { name: 'teacher-classes', label: '班级成员', to: '/teacher/classes', feature: 'classes' },
          { name: 'teacher-duty-roster', label: '轮值表', to: '/teacher/duty-roster', feature: 'duty' },
          { name: 'teacher-class-finance', label: '班费', to: '/teacher/class-finance', feature: 'finance' },
          { name: 'teacher-class-activities', label: '班级活动', to: '/teacher/class-activities', feature: 'activities' },
          { name: 'teacher-gallery', label: '班级风采', to: '/teacher/gallery', feature: 'gallery' },
          { name: 'teacher-my-gallery', label: '我的相册', to: '/teacher/my-gallery', feature: 'gallery' },
        ],
      },
      {
        label: '学情与考试',
        items: [
          { name: 'teacher-exams', label: '考试管理', to: '/teacher/exams', feature: 'exams' },
          { name: 'teacher-grades', label: '成绩管理', to: '/teacher/grades', feature: 'grades' },
          { name: 'teacher-exam-analysis', label: '考试分析', to: '/teacher/exam-analysis', feature: 'analysis' },
          { name: 'teacher-data-dashboard', label: '数据看板', to: '/teacher/data-dashboard', feature: 'analysis' },
          { name: 'teacher-attendance', label: '考勤', to: '/teacher/attendance', feature: 'attendance' },
          { name: 'teacher-homework', label: '作业', to: '/teacher/homework', feature: 'homework' },
        ],
      },
      {
        label: '学生评价',
        items: [
          { name: 'teacher-rewards', label: '奖励记录', to: '/teacher/rewards', feature: 'rewards' },
          { name: 'teacher-score-records', label: '加减分记录', to: '/teacher/score-records', feature: 'rewards' },
          { name: 'teacher-group-scores', label: '小组评分', to: '/teacher/group-scores', feature: 'rewards' },
          { name: 'teacher-leaderboard', label: '排行榜', to: '/teacher/leaderboard', feature: 'rewards' },
          { name: 'teacher-growth', label: '成长记录', to: '/teacher/growth', feature: 'growth' },
          { name: 'teacher-behavior', label: '行为记录', to: '/teacher/behavior', feature: 'behavior' },
          { name: 'teacher-reading-log', label: '课外阅读', to: '/teacher/reading-log', feature: 'reading' },
          { name: 'teacher-checkin', label: '学生打卡', to: '/teacher/checkin', feature: 'checkin' },
          { name: 'teacher-awards', label: '我获奖啦', to: '/teacher/awards', feature: 'rewards' },
        ],
      },
      {
        label: '家校沟通',
        items: [
          { name: 'teacher-parent-contacts', label: '家长联系', to: '/teacher/parent-contacts', feature: 'parents' },
          { name: 'teacher-im', label: '家校沟通', to: '/teacher/im', feature: 'im' },
          { name: 'teacher-notices', label: '公告', to: '/teacher/notices', feature: 'notices' },
          { name: 'teacher-notice-templates', label: '通知模板', to: '/teacher/notice-templates', feature: 'notices' },
        ],
      },
    ],
  },
  {
    label: 'AI 与备课', icon: Bot,
    groups: [
      {
        label: 'AI 工具',
        items: [
          { name: 'teacher-ai-chat', label: 'AI 对话', to: '/teacher/ai-chat', feature: 'ai' },
          { name: 'teacher-ai-image', label: 'AI 文生图', to: '/teacher/ai-image', feature: 'ai' },
          { name: 'teacher-ai-lesson', label: '优质教案生成', to: '/teacher/ai-generator/lesson', feature: 'ai' },
          { name: 'teacher-ai-knowledge', label: '知识点生成', to: '/teacher/ai-generator/knowledge', feature: 'ai' },
          { name: 'teacher-ai-paper', label: '优选试卷生成', to: '/teacher/ai-generator/paper', feature: 'ai' },
        ],
      },
      {
        label: '资源库',
        items: [
          { name: 'teacher-lesson-plans', label: '教案库', to: '/teacher/lesson-plans', feature: 'ai' },
          { name: 'teacher-knowledges', label: '知识点库', to: '/teacher/knowledges', feature: 'ai' },
          { name: 'teacher-papers', label: '试卷库', to: '/teacher/papers', feature: 'ai' },
          { name: 'teacher-ai-resources', label: '教学资源', to: '/teacher/ai-resources', feature: 'ai' },
          { name: 'teacher-schedule', label: '课表', to: '/teacher/schedule', feature: 'schedule' },
        ],
      },
    ],
  },
  {
    label: '课堂工具', icon: Wrench,
    groups: [
      {
        label: '通用',
        items: [
          { name: 'tool-picker', label: '随机点名', to: '/teacher/tools/picker', feature: 'tools' },
          { name: 'tool-grouper', label: '随机分组', to: '/teacher/tools/grouper', feature: 'tools' },
          { name: 'tool-dice', label: '随机决定器', to: '/teacher/tools/dice', feature: 'tools' },
          { name: 'tool-timer', label: '倒计时', to: '/teacher/tools/timer', feature: 'tools' },
          { name: 'tool-calc', label: '课堂计算器', to: '/teacher/tools/calc', feature: 'tools' },
          { name: 'tool-seat-map', label: '座位表', to: '/teacher/tools/seat-map', feature: 'seats' },
          { name: 'tool-score-panel', label: '加减分', to: '/teacher/tools/score-panel', feature: 'rewards' },
          { name: 'tool-comment', label: '评语生成', to: '/teacher/tools/comment', feature: 'tools' },
          { name: 'tool-summary', label: '期末总结', to: '/teacher/tools/summary', feature: 'tools' },
          { name: 'tool-class-duty', label: '班级职务', to: '/teacher/tools/class-duty', feature: 'duty' },
          { name: 'tool-schedule-maker', label: '课表排版', to: '/teacher/tools/schedule-maker', feature: 'schedule' },
        ],
      },
      {
        label: '语文工具',
        items: [
          { name: 'tool-stroke-order', label: '汉字笔顺', to: '/teacher/tools/stroke-order', feature: 'tools' },
          { name: 'tool-writing-materials', label: '作文素材', to: '/teacher/tools/writing-materials', feature: 'tools' },
          { name: 'tool-poetry', label: '古诗词助手', to: '/teacher/tools/poetry', feature: 'tools' },
          { name: 'tool-dictation', label: '汉字听写', to: '/teacher/tools/dictation', feature: 'tools' },
          { name: 'tool-reading', label: '阅读理解', to: '/teacher/tools/reading', feature: 'tools' },
          { name: 'tool-essay', label: '小作文助手', to: '/teacher/tools/essay', feature: 'tools' },
          { name: 'tool-idiom', label: '成语词典', to: '/teacher/tools/idiom', feature: 'tools' },
          { name: 'tool-pinyin', label: '拼音标注', to: '/teacher/tools/pinyin', feature: 'tools' },
        ],
      },
      {
        label: '数学工具',
        items: [
          { name: 'tool-math', label: '口算生成', to: '/teacher/tools/math', feature: 'tools' },
          { name: 'tool-vertical-calc', label: '竖式计算', to: '/teacher/tools/vertical-calc', feature: 'tools' },
          { name: 'tool-answer-card', label: '口算答题卡', to: '/teacher/tools/answer-card', feature: 'tools' },
          { name: 'tool-multiplication-table', label: '乘法口诀', to: '/teacher/tools/multiplication-table', feature: 'tools' },
          { name: 'tool-unit-conversion', label: '单位换算', to: '/teacher/tools/unit-conversion', feature: 'tools' },
          { name: 'tool-math-mistakes', label: '错题本', to: '/teacher/tools/math-mistakes', feature: 'tools' },
        ],
      },
      {
        label: '英语工具',
        items: [
          { name: 'tool-word-card', label: '单词卡片', to: '/teacher/tools/word-card', feature: 'tools' },
          { name: 'tool-sentence-practice', label: '句型练习', to: '/teacher/tools/sentence-practice', feature: 'tools' },
          { name: 'tool-listening', label: '英语听力', to: '/teacher/tools/listening', feature: 'tools' },
          { name: 'tool-grammar', label: '语法练习', to: '/teacher/tools/grammar', feature: 'tools' },
          { name: 'tool-scene-dialogue', label: '情景对话', to: '/teacher/tools/scene-dialogue', feature: 'tools' },
          { name: 'tool-spell', label: '单词拼写', to: '/teacher/tools/spell', feature: 'tools' },
          { name: 'tool-speaking', label: '口语练习', to: '/teacher/tools/speaking', feature: 'tools' },
          { name: 'tool-english-story', label: '英语爽文', to: '/teacher/tools/english-story', feature: 'tools' },
        ],
      },
      {
        label: '小游戏',
        items: [
          { name: 'games', label: '游戏合集', to: '/teacher/games', feature: 'games' },
          { name: 'tool-flower', label: '笑口常开', to: '/teacher/tools/flower', feature: 'games' },
        ],
      },
    ],
  },
  {
    label: '教师办公', icon: Briefcase,
    groups: [
      {
        label: '',
        items: [
          { name: 'teacher-work-log', label: '工作日志', to: '/teacher/work-log', feature: 'worklog' },
          { name: 'teacher-lesson-obs', label: '听课记录', to: '/teacher/lesson-obs', feature: 'observation' },
          { name: 'teacher-teaching-calendar', label: '教学日历', to: '/teacher/teaching-calendar', feature: 'calendar' },
          { name: 'teacher-directory', label: '教师通讯录', to: '/teacher/teacher-directory', feature: 'teachers' },
          { name: 'teacher-office-translate', label: '翻译', to: '/teacher/office-translate', feature: 'worklog' },
          { name: 'teacher-office-paper', label: '教育论文', to: '/teacher/office-paper', feature: 'worklog' },
          { name: 'teacher-office-blackboard', label: '黑板报', to: '/teacher/office-blackboard', feature: 'worklog' },
          { name: 'teacher-office-speech', label: '演讲稿', to: '/teacher/office-speech', feature: 'worklog' },
          { name: 'teacher-plan-template-lib', label: '文案模板库', to: '/teacher/plan-template-lib', feature: 'worklog' },
        ],
      },
    ],
  },
  {
    label: '个人空间', icon: User,
    groups: [
      {
        label: '',
        items: [
          { name: 'teacher-messages', label: '消息中心', to: '/teacher/messages' },
          { name: 'teacher-notifications', label: '通知中心', to: '/teacher/notifications' },
          { name: 'teacher-todos', label: '待办事项', to: '/teacher/todos', feature: 'todos' },
          { name: 'teacher-notes', label: '笔记', to: '/teacher/notes', feature: 'notes' },
          { name: 'teacher-profile', label: '个人资料', to: '/teacher/profile' },
          { name: 'teacher-config', label: '设置', to: '/teacher/config' },
        ],
      },
    ],
  },
]

/** 非教师角色菜单（扁平） */
const flatNavItems: Record<Exclude<Role, 'teacher'>, MenuItem[]> = {
  super: [
    { name: 'super-dashboard', label: '工作台', to: '/super' },
    { name: 'super-schools', label: '学校管理', to: '/super/schools' },
    { name: 'super-admins', label: '管理员管理', to: '/super/admins' },
    { name: 'super-audit-logs', label: '审计日志', to: '/super/audit-logs' },
    { name: 'super-config', label: '平台配置', to: '/super/config' },
  ],
  school_admin: [
    { name: 'school-admin-dashboard', label: '工作台', to: '/school-admin' },
    { name: 'school-admin-teachers', label: '教师管理', to: '/school-admin/teachers' },
    { name: 'school-admin-classes', label: '班级管理', to: '/school-admin/classes' },
    { name: 'school-admin-students', label: '学生管理', to: '/school-admin/students' },
    { name: 'school-admin-notices', label: '学校公告', to: '/school-admin/notices' },
  ],
  parent: [{ name: 'parent-dashboard', label: '孩子动态', to: '/parent' }],
}

/** 功能权限检查：features 为空数组或包含空串时全部放行 */
function hasFeature(feature?: string): boolean {
  if (!feature) return true
  const features = auth.user?.features || []
  return features.length === 0 || features.includes('') || features.includes(feature)
}

/** 教师可见的三级菜单（按 feature 过滤组与组内项） */
const visibleTeacherMenu = computed<MenuCategory[]>(() => {
  return teacherMenu
    .map((cat) => ({
      ...cat,
      groups: cat.groups
        .map((g) => ({ ...g, items: g.items.filter((it) => hasFeature(it.feature)) }))
        .filter((g) => g.items.length > 0),
    }))
    .filter((cat) => cat.groups.length > 0)
})

/** 非教师可见菜单 */
const flatItems = computed<MenuItem[]>(() => (auth.role && auth.role !== 'teacher' ? flatNavItems[auth.role] : []))

/** 折叠状态：一级分类、二级子分组各自独立展开 */
const openCats = ref<string[]>([])
const openGroups = ref<string[]>([])
function catOpen(label: string) { return openCats.value.includes(label) }
function groupKey(cat: string, g: string) { return `${cat}::${g}` }
function groupOpen(cat: string, g: string) { return openGroups.value.includes(groupKey(cat, g)) }
function toggleCat(label: string) {
  openCats.value = catOpen(label) ? openCats.value.filter((x) => x !== label) : [...openCats.value, label]
}
function toggleGroup(cat: string, g: string) {
  const k = groupKey(cat, g)
  openGroups.value = groupOpen(cat, g) ? openGroups.value.filter((x) => x !== k) : [...openGroups.value, k]
}

/** 自动展开当前路由所在的分类与子分组，保持侧栏整洁且当前页可达 */
function expandActive() {
  for (const cat of visibleTeacherMenu.value) {
    for (const g of cat.groups) {
      if (g.items.some((it) => it.name === route.name)) {
        if (!catOpen(cat.label)) openCats.value = [...openCats.value, cat.label]
        if (!groupOpen(cat.label, g.label)) openGroups.value = [...openGroups.value, groupKey(cat.label, g.label)]
        return
      }
    }
  }
}
onMounted(expandActive)
watch(() => route.name, expandActive)

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}

/* ============ 全局搜索（仅校管） ============ */
const searchKeyword = ref('')
const searchResult = ref<SearchResult | null>(null)
const searchLoading = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | null = null

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  if (!searchKeyword.value || searchKeyword.value.length < 1) {
    searchResult.value = null
    return
  }
  searchTimer = setTimeout(async () => {
    searchLoading.value = true
    try {
      searchResult.value = await searchAll(searchKeyword.value)
    } catch {
      searchResult.value = null
    } finally {
      searchLoading.value = false
    }
  }, 300)
}

function closeSearch() {
  searchKeyword.value = ''
  searchResult.value = null
}

function goTeachers() { closeSearch(); router.push('/school-admin/teachers') }
function goClasses() { closeSearch(); router.push('/school-admin/classes') }
function goStudents() { closeSearch(); router.push('/school-admin/students') }

const hasResults = computed(() => {
  const r = searchResult.value
  if (!r) return false
  return (r.teachers?.length || 0) + (r.classes?.length || 0) + (r.students?.length || 0) > 0
})

/** 当前页面标题（来自路由 meta） */
const pageTitle = computed(() => (route.meta.title as string | undefined) || '')

/** 当前日期：用于页头展示 */
const today = computed(() =>
  new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
)
</script>

<template>
  <div class="flex h-full bg-cream-50">
    <!-- 侧边栏 -->
    <aside class="w-56 shrink-0 border-r border-cream-200 bg-gradient-to-b from-cream-100/90 to-cream-50/90 backdrop-blur flex flex-col">
      <div class="px-5 py-6 border-b border-cream-200/60">
        <div class="text-lg font-bold text-cocoa-900 flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-butter-400 inline-block" />
          园丁工作台
          <span class="w-2 h-2 rounded-full bg-butter-400 inline-block" />
        </div>
        <div class="text-xs text-cocoa-500 mt-0.5">用爱浇灌 · 静待花开</div>
      </div>
      <nav class="flex-1 px-3 space-y-2 overflow-y-auto">
        <!-- 教师三级折叠菜单 -->
        <template v-if="auth.role === 'teacher'">
          <div v-for="cat in visibleTeacherMenu" :key="cat.label" class="pb-1">
            <!-- 一级：分类（可折叠） -->
            <button
              class="flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs font-semibold text-cocoa-500 hover:bg-cream-200 transition-colors"
              @click="toggleCat(cat.label)"
            >
              <span class="flex items-center gap-1.5">
                <component :is="cat.icon" class="w-3.5 h-3.5" />
                {{ cat.label }}
              </span>
              <ChevronRight class="w-3.5 h-3.5 transition-transform duration-200" :class="catOpen(cat.label) ? 'rotate-90' : ''" />
            </button>
            <!-- 二级 + 三级 -->
            <div v-if="catOpen(cat.label)" class="mt-0.5 space-y-1">
              <div v-for="g in cat.groups" :key="g.label">
                <!-- 二级：子分组标题（可折叠，空 label 不显示） -->
                <button
                  v-if="g.label"
                  class="flex items-center justify-between w-full px-3 py-1 text-[11px] font-medium text-cocoa-400 hover:text-cocoa-600"
                  @click="toggleGroup(cat.label, g.label)"
                >
                  <span>{{ g.label }}</span>
                  <ChevronRight class="w-3 h-3 transition-transform duration-200" :class="groupOpen(cat.label, g.label) ? 'rotate-90' : ''" />
                </button>
                <div v-if="!g.label || groupOpen(cat.label, g.label)" class="space-y-0.5">
                  <router-link
                    v-for="item in g.items"
                    :key="item.name"
                    :to="item.to"
                    :class="[
                      'flex items-center gap-2 pl-5 pr-3 py-1.5 rounded-lg text-sm transition-colors',
                      route.name === item.name
                        ? 'bg-butter-400 text-white font-semibold'
                        : 'text-cocoa-700 hover:bg-cream-200',
                    ]"
                  >
                    {{ item.label }}
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </template>
        <!-- 非教师扁平菜单 -->
        <div v-else class="space-y-1">
          <router-link
            v-for="item in flatItems"
            :key="item.name"
            :to="item.to"
            :class="[
              'flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-colors',
              route.name === item.name
                ? 'bg-butter-400 text-white font-semibold'
                : 'text-cocoa-700 hover:bg-cream-200',
            ]"
          >
            {{ item.label }}
          </router-link>
        </div>
      </nav>
      <!-- 底部用户信息 -->
      <div class="p-3 border-t border-cream-200">
        <div class="flex items-center gap-2 px-2 py-1.5">
          <div class="w-8 h-8 rounded-full bg-butter-300 flex items-center justify-center">
            <User class="w-4 h-4 text-cocoa-700" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-cocoa-900 truncate">{{ auth.user?.name }}</div>
            <div class="text-xs text-cocoa-500">{{ auth.role ? roleLabel[auth.role] : '' }}</div>
          </div>
          <button class="p-1.5 rounded-lg hover:bg-cream-200 text-cocoa-500" title="退出登录" @click="handleLogout">
            <LogOut class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
    <!-- 主内容区 -->
    <main class="flex-1 overflow-hidden bg-cream-50 flex flex-col">
      <!-- 顶栏：全局搜索（仅校管可见） -->
      <div v-if="auth.role === 'school_admin'" class="border-b border-cream-200 bg-white/80 backdrop-blur px-6 py-2.5 shrink-0 no-print">
        <div class="max-w-7xl mx-auto relative">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
            <input
              v-model="searchKeyword"
              placeholder="全局搜索：教师 / 班级 / 学生"
              class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
              @input="onSearchInput"
            />
          </div>
          <!-- 搜索结果下拉 -->
          <div v-if="searchKeyword && (searchLoading || hasResults || (!searchLoading && !hasResults))" class="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-soft border border-cream-200 max-h-96 overflow-y-auto">
            <div v-if="searchLoading" class="px-4 py-3 text-sm text-cocoa-400">搜索中…</div>
            <div v-else-if="!hasResults" class="px-4 py-3 text-sm text-cocoa-400">未找到匹配结果</div>
            <template v-else>
              <!-- 教师结果 -->
              <div v-if="searchResult?.teachers?.length" class="py-1">
                <div class="px-4 py-1 text-xs text-cocoa-400 bg-cream-50">教师</div>
                <button
                  v-for="t in searchResult.teachers"
                  :key="t.id"
                  class="w-full text-left px-4 py-2 hover:bg-cream-50 flex items-center justify-between text-sm"
                  @click="goTeachers"
                >
                  <span class="text-cocoa-900 font-medium">{{ t.name }}</span>
                  <span class="text-cocoa-400 text-xs">{{ t.subject || t.username }}</span>
                </button>
              </div>
              <!-- 班级结果 -->
              <div v-if="searchResult?.classes?.length" class="py-1">
                <div class="px-4 py-1 text-xs text-cocoa-400 bg-cream-50">班级</div>
                <button
                  v-for="c in searchResult.classes"
                  :key="c.id"
                  class="w-full text-left px-4 py-2 hover:bg-cream-50 flex items-center justify-between text-sm"
                  @click="goClasses"
                >
                  <span class="text-cocoa-900 font-medium">{{ c.name }}</span>
                  <span class="text-cocoa-400 text-xs">{{ c.grade }} · {{ c.headTeacher }}</span>
                </button>
              </div>
              <!-- 学生结果 -->
              <div v-if="searchResult?.students?.length" class="py-1">
                <div class="px-4 py-1 text-xs text-cocoa-400 bg-cream-50">学生</div>
                <button
                  v-for="s in searchResult.students"
                  :key="s.id"
                  class="w-full text-left px-4 py-2 hover:bg-cream-50 flex items-center justify-between text-sm"
                  @click="goStudents"
                >
                  <span class="text-cocoa-900 font-medium">{{ s.name }}</span>
                  <span class="text-cocoa-400 text-xs">{{ s.className }} · {{ s.studentNo }}</span>
                </button>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- 统一页头 -->
      <header class="bg-white border-b border-cream-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <nav aria-label="breadcrumb" class="flex items-center gap-1.5 text-xs text-cocoa-500 mb-1">
            <Home class="w-3.5 h-3.5" />
            <span>园丁工作台</span>
            <ChevronRight class="w-3 h-3 text-cocoa-300" />
            <span class="text-cocoa-700 font-medium">{{ pageTitle }}</span>
          </nav>
          <h1 class="text-xl font-bold text-cocoa-900">{{ pageTitle }}</h1>
        </div>
        <div class="text-sm text-cocoa-500 text-right">
          <div>{{ roleLabel[auth.role || 'teacher'] }}</div>
          <div class="text-xs text-cocoa-400 mt-0.5">{{ today }}</div>
        </div>
      </header>

      <!-- 实际页面内容（铺满宽度，不再居中留白） -->
      <div class="flex-1 overflow-auto">
        <div class="w-full min-h-full px-8 py-6 flex flex-col">
          <router-view />
          <footer class="mt-auto pt-8 pb-2 text-center text-xs text-cocoa-400">
            © 2026 园丁工作台 · Web 管理端
          </footer>
        </div>
      </div>
    </main>
  </div>
</template>
