<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRoleSwitchStore } from '@/stores/roleSwitch'
import {
  LayoutDashboard, School, LogOut, User, Search, Repeat,
  Bot, Briefcase, Wrench, Home, ChevronRight,
  Users, BookOpen, ClipboardList, Wallet, Camera,
  Vote, Award, ListTodo, Send, Phone, Image as ImageIcon,
  GraduationCap, Sparkles, FileText, FileQuestion,
  CalendarCheck, MessageSquare, Bell, Megaphone, Settings,
  Pencil, BookMarked, Languages, PencilLine, Calculator,
  Gamepad2, LanguagesIcon, ScrollText, Mail,
} from 'lucide-vue-next'
import { search as searchAll, type SearchResult } from '@/api/school-admin'
import type { Role } from '@/types/user'

const auth = useAuthStore()
const roleSwitchStore = useRoleSwitchStore()
const router = useRouter()
const route = useRoute()

/** 角色中文标签 */
const roleLabel: Record<Role, string> = {
  super_admin: '超级管理员',
  school_admin: '学校管理员',
  teacher: '教师',
  parent: '家长',
}

/** 菜单图标类型：lucide Component 或 emoji string */
type IconType = any
/** 菜单项图标配色（带浅色背景 + 深色前景） */
type ColorTone = 'butter' | 'rose' | 'blue' | 'green' | 'purple' | 'cocoa' | 'cream' | 'sky'

interface MenuItem {
  name: string
  label: string
  to: string
  feature?: string
  icon?: IconType         // 菜单项图标
  color?: ColorTone        // 配色
  emoji?: string           // emoji 风格图标（与 lucide 二选一）
}

interface MenuSubGroup {
  label: string
  /** 二级子项也展示为一级图标卡（has 多个 items 时显示） */
  asGrid?: boolean
  items: MenuItem[]
}

interface MenuCategory {
  label: string
  icon: IconType
  color: ColorTone
  emoji?: string
  groups: MenuSubGroup[]
}

/* ============ 配色辅助 ============ */
const colorClassMap: Record<ColorTone, { bg: string; ring: string; text: string; soft: string }> = {
  butter: { bg: 'bg-butter-100', ring: 'ring-butter-300', text: 'text-butter-700', soft: 'bg-butter-50/60' },
  rose:   { bg: 'bg-rose-100',   ring: 'ring-rose-300',   text: 'text-rose-700',   soft: 'bg-rose-50/60' },
  blue:   { bg: 'bg-blue-100',   ring: 'ring-blue-300',   text: 'text-blue-700',   soft: 'bg-blue-50/60' },
  green:  { bg: 'bg-emerald-100',ring: 'ring-emerald-300',text: 'text-emerald-700',soft: 'bg-emerald-50/60' },
  purple: { bg: 'bg-purple-100', ring: 'ring-purple-300', text: 'text-purple-700', soft: 'bg-purple-50/60' },
  cocoa:  { bg: 'bg-cocoa-100',  ring: 'ring-cocoa-300',  text: 'text-cocoa-700',  soft: 'bg-cocoa-50/60' },
  cream:  { bg: 'bg-cream-100',  ring: 'ring-cream-300',  text: 'text-cocoa-600',  soft: 'bg-cream-50' },
  sky:    { bg: 'bg-sky-100',    ring: 'ring-sky-300',    text: 'text-sky-700',    soft: 'bg-sky-50/60' },
}
const palette = (t: ColorTone) => colorClassMap[t] || colorClassMap.cream

/* ============ 教师三级菜单 ============ */
const teacherMenu: MenuCategory[] = [
  {
    label: '工作台', color: 'cream', icon: LayoutDashboard,
    groups: [{
      label: '', items: [
        { name: 'teacher-dashboard', label: '教师工作台', to: '/teacher', icon: Home, color: 'butter' },
      ],
    }],
  },
  {
    label: '教学管理', color: 'blue', icon: School,
    groups: [
      {
        label: '班级与学生', asGrid: true,
        items: [
          { name: 'teacher-classes', label: '班级成员', to: '/teacher/classes', feature: 'classes', emoji: '👥', color: 'blue' },
          { name: 'teacher-duty-roster', label: '轮值表', to: '/teacher/duty-roster', feature: 'duty', emoji: '📋', color: 'butter' },
          { name: 'teacher-class-finance', label: '班费', to: '/teacher/class-finance', feature: 'finance', emoji: '💰', color: 'green' },
          { name: 'teacher-class-activities', label: '班级活动', to: '/teacher/class-activities', feature: 'activities', emoji: '🎉', color: 'rose' },
          { name: 'teacher-gallery', label: '班级风采', to: '/teacher/gallery', feature: 'gallery', emoji: '🏆', color: 'purple' },
          { name: 'teacher-my-gallery', label: '我的相册', to: '/teacher/my-gallery', feature: 'gallery', icon: Camera, color: 'sky' },
        ],
      },
      {
        label: '学情与考试', asGrid: true,
        items: [
          { name: 'teacher-exams', label: '考试管理', to: '/teacher/exams', feature: 'exams', emoji: '📝', color: 'butter' },
          { name: 'teacher-grades', label: '成绩管理', to: '/teacher/grades', feature: 'grades', emoji: '📊', color: 'blue' },
          { name: 'teacher-exam-analysis', label: '考试分析', to: '/teacher/exam-analysis', feature: 'analysis', emoji: '📈', color: 'green' },
          { name: 'teacher-data-dashboard', label: '数据看板', to: '/teacher/data-dashboard', feature: 'analysis', emoji: '🎯', color: 'purple' },
          { name: 'teacher-attendance', label: '考勤', to: '/teacher/attendance', feature: 'attendance', emoji: '✅', color: 'sky' },
          { name: 'teacher-homework', label: '作业', to: '/teacher/homework', feature: 'homework', emoji: '📓', color: 'rose' },
        ],
      },
      {
        label: '学生评价', asGrid: true,
        items: [
          { name: 'teacher-rewards', label: '奖励记录', to: '/teacher/rewards', feature: 'rewards', emoji: '🏅', color: 'butter' },
          { name: 'teacher-score-records', label: '加减分记录', to: '/teacher/score-records', feature: 'rewards', emoji: '➕', color: 'green' },
          { name: 'teacher-group-scores', label: '小组评分', to: '/teacher/group-scores', feature: 'rewards', emoji: '👨‍👩‍👧‍👦', color: 'purple' },
          { name: 'teacher-leaderboard', label: '排行榜', to: '/teacher/leaderboard', feature: 'rewards', icon: Award, color: 'rose' },
          { name: 'teacher-growth', label: '成长记录', to: '/teacher/growth', feature: 'growth', emoji: '🌱', color: 'green' },
          { name: 'teacher-behavior', label: '行为记录', to: '/teacher/behavior', feature: 'behavior', emoji: '📝', color: 'butter' },
          { name: 'teacher-reading-log', label: '课外阅读', to: '/teacher/reading-log', feature: 'reading', emoji: '📚', color: 'sky' },
          { name: 'teacher-checkin', label: '学生打卡', to: '/teacher/checkin', feature: 'checkin', emoji: '🌅', color: 'rose' },
          { name: 'teacher-awards', label: '我获奖啦', to: '/teacher/awards', feature: 'rewards', emoji: '🎉', color: 'butter' },
        ],
      },
      {
        label: '家校沟通', asGrid: true,
        items: [
          { name: 'teacher-parent-contacts', label: '家长联系', to: '/teacher/parent-contacts', feature: 'parents', icon: Phone, color: 'green' },
          { name: 'teacher-im', label: '家校沟通', to: '/teacher/im', feature: 'im', icon: MessageSquare, color: 'blue' },
          { name: 'teacher-notices', label: '公告', to: '/teacher/notices', feature: 'notices', icon: Megaphone, color: 'butter' },
          { name: 'teacher-notice-templates', label: '通知模板', to: '/teacher/notice-templates', feature: 'notices', icon: ScrollText, color: 'cocoa' },
        ],
      },
    ],
  },
  {
    label: 'AI 与备课', color: 'purple', icon: Bot,
    groups: [
      {
        label: 'AI 工具', asGrid: true,
        items: [
          { name: 'teacher-ai-chat', label: 'AI 对话', to: '/teacher/ai-chat', feature: 'ai', icon: Sparkles, color: 'purple' },
          { name: 'teacher-ai-image', label: 'AI 文生图', to: '/teacher/ai-image', feature: 'ai', icon: ImageIcon, color: 'butter' },
          { name: 'teacher-ai-lesson', label: '优质教案生成', to: '/teacher/ai-generator/lesson', feature: 'ai', icon: FileText, color: 'blue' },
          { name: 'teacher-ai-knowledge', label: '知识点生成', to: '/teacher/ai-generator/knowledge', feature: 'ai', icon: BookOpen, color: 'green' },
          { name: 'teacher-ai-paper', label: '优选试卷生成', to: '/teacher/ai-generator/paper', feature: 'ai', icon: FileQuestion, color: 'rose' },
        ],
      },
      {
        label: '资源库', asGrid: true,
        items: [
          { name: 'teacher-lesson-plans', label: '教案库', to: '/teacher/lesson-plans', feature: 'ai', icon: BookMarked, color: 'blue' },
          { name: 'teacher-knowledges', label: '知识点库', to: '/teacher/knowledges', feature: 'ai', icon: GraduationCap, color: 'green' },
          { name: 'teacher-papers', label: '试卷库', to: '/teacher/papers', feature: 'ai', icon: ScrollText, color: 'purple' },
          { name: 'teacher-ai-resources', label: '教学资源', to: '/teacher/ai-resources', feature: 'ai', icon: BookOpen, color: 'sky' },
          { name: 'teacher-schedule', label: '课表', to: '/teacher/schedule', feature: 'schedule', icon: CalendarCheck, color: 'butter' },
        ],
      },
    ],
  },
  {
    label: '课堂工具', color: 'rose', icon: Wrench,
    groups: [
      {
        label: '通用工具', asGrid: true,
        items: [
          { name: 'toolPicker', label: '随机点名', to: '/teacher/tools/picker', feature: 'tools', emoji: '🎯', color: 'rose' },
          { name: 'toolGrouper', label: '随机分组', to: '/teacher/tools/grouper', feature: 'tools', emoji: '🎲', color: 'blue' },
          { name: 'toolDecider', label: '随机决定器', to: '/teacher/tools/decider', feature: 'tools', emoji: '🎰', color: 'purple' },
          { name: 'toolTimer', label: '倒计时', to: '/teacher/tools/timer', feature: 'tools', emoji: '⏱️', color: 'cocoa' },
          { name: 'toolCalc', label: '课堂计算器', to: '/teacher/tools/calc', feature: 'tools', emoji: '🧮', color: 'butter' },
          { name: 'toolSeatMap', label: '座位表', to: '/teacher/tools/seatMap', feature: 'seats', emoji: '💺', color: 'green' },
          { name: 'toolScorePanel', label: '加减分', to: '/teacher/tools/scorePanel', feature: 'rewards', emoji: '➕', color: 'purple' },
          { name: 'toolComment', label: '评语生成', to: '/teacher/tools/comment', feature: 'tools', emoji: '✍️', color: 'rose' },
          { name: 'toolSummary', label: '期末总结', to: '/teacher/tools/summary', feature: 'tools', emoji: '📝', color: 'butter' },
          { name: 'toolClassDuty', label: '班级职务', to: '/teacher/tools/classDuty', feature: 'duty', emoji: '🧑‍🎓', color: 'sky' },
          { name: 'toolScheduleMaker', label: '课表排版', to: '/teacher/tools/scheduleMaker', feature: 'schedule', emoji: '📅', color: 'green' },
        ],
      },
      {
        label: '语文工具', asGrid: true,
        items: [
          { name: 'toolStrokeOrder', label: '汉字笔顺', to: '/teacher/tools/strokeOrder', feature: 'tools', emoji: '✏️', color: 'cocoa' },
          { name: 'toolWritingMaterials', label: '作文素材', to: '/teacher/tools/writingMaterials', feature: 'tools', emoji: '📝', color: 'butter' },
          { name: 'toolPoetry', label: '古诗词助手', to: '/teacher/tools/poetry', feature: 'tools', emoji: '🏯', color: 'rose' },
          { name: 'toolDictation', label: '汉字听写', to: '/teacher/tools/dictation', feature: 'tools', icon: BookOpen, color: 'green' },
          { name: 'toolReading', label: '阅读理解', to: '/teacher/tools/reading', feature: 'tools', emoji: '📖', color: 'sky' },
          { name: 'toolEssay', label: '小作文助手', to: '/teacher/tools/essay', feature: 'tools', emoji: '📓', color: 'purple' },
          { name: 'toolIdiom', label: '成语词典', to: '/teacher/tools/idiom', feature: 'tools', emoji: '📜', color: 'butter' },
          { name: 'toolPinyin', label: '拼音标注', to: '/teacher/tools/pinyin', feature: 'tools', emoji: '🔤', color: 'blue' },
        ],
      },
      {
        label: '数学工具', asGrid: true,
        items: [
          { name: 'toolMath', label: '口算生成', to: '/teacher/tools/math', feature: 'tools', icon: Calculator, color: 'rose' },
          { name: 'toolVerticalCalc', label: '竖式计算', to: '/teacher/tools/verticalCalc', feature: 'tools', emoji: '📐', color: 'blue' },
          { name: 'toolAnswerCard', label: '口算答题卡', to: '/teacher/tools/answerCard', feature: 'tools', emoji: '📝', color: 'butter' },
          { name: 'toolMultiplicationTable', label: '乘法口诀', to: '/teacher/tools/multiplicationTable', feature: 'tools', emoji: '✖️', color: 'green' },
          { name: 'toolUnitConversion', label: '单位换算', to: '/teacher/tools/unitConversion', feature: 'tools', icon: Calculator, color: 'purple' },
          { name: 'toolMathMistakes', label: '错题本', to: '/teacher/tools/mathMistakes', feature: 'tools', emoji: '📚', color: 'sky' },
        ],
      },
      {
        label: '英语工具', asGrid: true,
        items: [
          { name: 'toolWordCard', label: '单词卡片', to: '/teacher/tools/wordCard', feature: 'tools', icon: LanguagesIcon, color: 'blue' },
          { name: 'toolSentencePractice', label: '句型练习', to: '/teacher/tools/sentencePractice', feature: 'tools', emoji: '📝', color: 'green' },
          { name: 'toolListening', label: '英语听力', to: '/teacher/tools/listening', feature: 'tools', emoji: '🎧', color: 'rose' },
          { name: 'toolGrammar', label: '语法练习', to: '/teacher/tools/grammar', feature: 'tools', icon: LanguagesIcon, color: 'butter' },
          { name: 'toolSceneDialogue', label: '情景对话', to: '/teacher/tools/sceneDialogue', feature: 'tools', emoji: '💬', color: 'purple' },
          { name: 'toolSpell', label: '单词拼写', to: '/teacher/tools/spell', feature: 'tools', emoji: '✍️', color: 'sky' },
          { name: 'toolSpeaking', label: '口语练习', to: '/teacher/tools/speaking', feature: 'tools', icon: MessageSquare, color: 'cocoa' },
          { name: 'toolEnglishStory', label: '英语爽文', to: '/teacher/tools/englishStory', feature: 'tools', emoji: '📖', color: 'rose' },
        ],
      },
      {
        label: '小游戏', asGrid: true,
        items: [
          { name: 'games', label: '游戏合集', to: '/teacher/games', feature: 'games', icon: Gamepad2, color: 'purple' },
          { name: 'toolFlower', label: '笑口常开', to: '/teacher/tools/flower', feature: 'games', emoji: '🌸', color: 'rose' },
        ],
      },
    ],
  },
  {
    label: '教师办公', color: 'green', icon: Briefcase,
    groups: [{
      label: '', items: [
        { name: 'teacher-work-log', label: '工作日志', to: '/teacher/work-log', feature: 'worklog', emoji: '📓', color: 'green' },
        { name: 'teacher-lesson-obs', label: '听课记录', to: '/teacher/lesson-obs', feature: 'observation', emoji: '🎧', color: 'butter' },
        { name: 'teacher-teaching-calendar', label: '教学日历', to: '/teacher/teaching-calendar', feature: 'calendar', icon: CalendarCheck, color: 'blue' },
        { name: 'teacher-directory', label: '教师通讯录', to: '/teacher/teacher-directory', feature: 'teachers', emoji: '👥', color: 'purple' },
        { name: 'teacher-office-translate', label: '翻译', to: '/teacher/office-translate', feature: 'worklog', emoji: '🌐', color: 'sky' },
        { name: 'teacher-office-paper', label: '教育论文', to: '/teacher/office-paper', feature: 'worklog', emoji: '📄', color: 'cocoa' },
        { name: 'teacher-office-blackboard', label: '黑板报', to: '/teacher/office-blackboard', feature: 'worklog', emoji: '🎨', color: 'rose' },
        { name: 'teacher-office-speech', label: '演讲稿', to: '/teacher/office-speech', feature: 'worklog', emoji: '🎤', color: 'purple' },
        { name: 'teacher-plan-template-lib', label: '文案模板库', to: '/teacher/plan-template-lib', feature: 'worklog', icon: BookOpen, color: 'green' },
      ],
    }],
  },
  {
    label: '个人空间', color: 'cocoa', icon: User,
    groups: [{
      label: '', items: [
        { name: 'teacher-messages', label: '消息中心', to: '/teacher/messages', icon: Mail, color: 'blue' },
        { name: 'teacher-notifications', label: '通知中心', to: '/teacher/notifications', icon: Bell, color: 'butter' },
        { name: 'teacher-todos', label: '待办事项', to: '/teacher/todos', feature: 'todos', icon: ListTodo, color: 'rose' },
        { name: 'teacher-notes', label: '笔记', to: '/teacher/notes', feature: 'notes', icon: BookOpen, color: 'green' },
        { name: 'teacher-profile', label: '个人资料', to: '/teacher/profile', icon: User, color: 'cream' },
        { name: 'teacher-config', label: '设置', to: '/teacher/config', icon: Settings, color: 'cocoa' },
      ],
    }],
  },
]

/* 非教师角色扁平菜单（保留原结构） */
const flatNavItems: Record<Exclude<Role, 'teacher'>, MenuItem[]> = {
  super_admin: [
    { name: 'super-dashboard', label: '工作台', to: '/super', icon: LayoutDashboard, color: 'butter' },
    { name: 'super-schools', label: '学校管理', to: '/super/schools', icon: School, color: 'blue' },
    { name: 'super-admins', label: '管理员管理', to: '/super/admins', icon: Users, color: 'purple' },
    { name: 'super-audit-logs', label: '审计日志', to: '/super/audit-logs', icon: ClipboardList, color: 'cocoa' },
    { name: 'super-config', label: '平台配置', to: '/super/config', icon: Settings, color: 'cream' },
    { name: 'super-ai-providers', label: 'AI 服务商', to: '/super/ai-providers', icon: Bot, color: 'green' },
  ],
  school_admin: [
    { name: 'school-admin-dashboard', label: '工作台', to: '/school-admin', icon: LayoutDashboard, color: 'butter' },
    { name: 'school-admin-teachers', label: '教师管理', to: '/school-admin/teachers', icon: Users, color: 'blue' },
    { name: 'school-admin-classes', label: '班级管理', to: '/school-admin/classes', icon: School, color: 'green' },
    { name: 'school-admin-students', label: '学生管理', to: '/school-admin/students', icon: GraduationCap, color: 'rose' },
    { name: 'school-admin-notices', label: '学校公告', to: '/school-admin/notices', icon: Megaphone, color: 'purple' },
  ],
  parent: [{ name: 'parent-dashboard', label: '孩子动态', to: '/parent', icon: Home, color: 'butter' }],
}

/** 功能权限检查 */
function hasFeature(feature?: string): boolean {
  if (!feature) return true
  const features = auth.user?.features || []
  return features.length === 0 || features.includes('') || features.includes(feature)
}

/** 教师可见的三级菜单（按 feature 过滤） */
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

const flatItems = computed<MenuItem[]>(() => (auth.role && auth.role !== 'teacher' ? flatNavItems[auth.role] : []))

/** 当前激活的一级分类（一级目录） */
const activeCategory = ref<string>('')
/** 折叠状态 */
const openCats = ref<string[]>([])
/** 自动展开当前路由对应的分类 */
function findCategoryForRoute(targetName: any) {
  for (const cat of visibleTeacherMenu.value) {
    for (const g of cat.groups) {
      if (g.items.some((it) => it.name === targetName)) return cat.label
    }
  }
  return ''
}

onMounted(() => {
  activeCategory.value = findCategoryForRoute(route.name)
  if (activeCategory.value) openCats.value = [activeCategory.value]
})
watch(() => route.name, () => {
  const c = findCategoryForRoute(route.name)
  if (c) {
    activeCategory.value = c
    if (!openCats.value.includes(c)) openCats.value = [...openCats.value, c]
  }
})

function toggleCat(label: string) {
  if (activeCategory.value === label) {
    activeCategory.value = ''
  } else {
    activeCategory.value = label
  }
  openCats.value = activeCategory.value
    ? [activeCategory.value]
    : []
}

/** 是否显示二级图标瓷砖面板（仅当已激活分类且页面是一级工作台根） */
const showTilesPanel = computed(() =>
  auth.role === 'teacher' && !!activeCategory.value && route.name === 'teacher-dashboard'
)

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}

/** 切换到家长端（仅当 roleSwitchStore 有 teacherToken 时启用） */
const canSwitchToParent = computed(() => !!roleSwitchStore.teacherToken && auth.role === 'teacher')

function switchToParent() {
  roleSwitchStore.switchTo('parent', auth.setAuth)
  router.push('/parent')
}

/* 全局搜索（仅校管） */
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

const pageTitle = computed(() => (route.meta.title as string | undefined) || '')

const today = computed(() =>
  new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
)

/** 当前激活分类的二级组 */
const activeGroups = computed(() => {
  if (!activeCategory.value) return []
  const cat = visibleTeacherMenu.value.find((c) => c.label === activeCategory.value)
  return cat?.groups || []
})

function navigateTo(to: string) {
  router.push(to)
}
</script>

<template>
  <div class="flex h-full bg-cream-50">
    <!-- 侧边栏：紧凑版本 -->
    <aside class="w-20 shrink-0 border-r border-cream-200 bg-gradient-to-b from-cream-100/95 to-cream-50/95 backdrop-blur flex flex-col items-center py-4">
      <!-- Logo（顶部圆形） -->
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-butter-300 to-butter-500 flex items-center justify-center text-white font-bold text-lg shadow-soft mb-6">
        园
      </div>

      <!-- 一级分类图标按钮 -->
      <nav class="flex-1 w-full px-2 overflow-y-auto space-y-2">
        <!-- 教师三级菜单的二级组作为一级入口 -->
        <template v-if="auth.role === 'teacher'">
          <button
            v-for="cat in visibleTeacherMenu"
            :key="cat.label"
            class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
            :class="activeCategory === cat.label ? 'bg-white shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
            @click="toggleCat(cat.label)"
          >
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
              :class="activeCategory === cat.label ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text"
            >
              <component :is="cat.icon" class="w-5 h-5" />
            </div>
            <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ cat.label }}</span>
          </button>
        </template>
        <!-- 非教师扁平菜单 -->
        <template v-else>
          <router-link
            v-for="item in flatItems"
            :key="item.name"
            :to="item.to"
            class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
            :class="route.name === item.name ? 'bg-white shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
          >
            <div
              class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
              :class="route.name === item.name ? palette(item.color || 'cream').bg : palette(item.color || 'cream').soft + ' ' + palette(item.color || 'cream').text"
            >
              <component :is="item.icon || User" class="w-5 h-5" />
            </div>
            <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ item.label }}</span>
          </router-link>
        </template>
      </nav>

      <!-- 用户信息底部 -->
      <div class="border-t border-cream-200/60 pt-3 w-full flex flex-col items-center gap-2">
        <div class="w-9 h-9 rounded-full bg-butter-300 flex items-center justify-center">
          <User class="w-4 h-4 text-cocoa-700" />
        </div>
        <!-- 师兼家：切换到家长端 -->
        <button
          v-if="canSwitchToParent"
          class="p-1.5 rounded-lg hover:bg-cream-200 text-[#E6A23C] relative group"
          title="切换至家长端"
          @click="switchToParent"
        >
          <Repeat class="w-4 h-4" />
          <span class="absolute left-full ml-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-cocoa-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            切换至家长端
          </span>
        </button>
        <button class="p-1.5 rounded-lg hover:bg-cream-200 text-cocoa-500" title="退出登录" @click="handleLogout">
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </aside>

    <!-- 二级菜单图标瓷砖面板（仅教师工作台根页面） -->
    <transition name="slide">
      <aside v-if="showTilesPanel" class="w-80 shrink-0 border-r border-cream-200 bg-white/80 backdrop-blur overflow-y-auto">
        <div class="px-5 py-5 border-b border-cream-200/60">
          <div class="flex items-center gap-2 text-xs text-cocoa-500">
            <button @click="activeCategory = ''" class="hover:text-cocoa-700 transition-colors">园丁工作台</button>
            <ChevronRight class="w-3 h-3" />
            <span class="text-cocoa-700 font-medium">{{ activeCategory }}</span>
          </div>
          <h2 class="text-lg font-bold text-cocoa-900 mt-1">{{ activeCategory }}</h2>
          <p class="text-xs text-cocoa-500 mt-1">点击图标进入相应功能</p>
        </div>

        <div v-for="g in activeGroups" :key="g.label || 'main'" class="px-4 pt-4">
          <div v-if="g.label" class="flex items-center gap-2 mb-3">
            <h3 class="text-xs font-semibold text-cocoa-700 uppercase tracking-wider">{{ g.label }}</h3>
            <div class="flex-1 h-px bg-cream-200"></div>
            <span class="text-xs text-cocoa-400">{{ g.items.length }}</span>
          </div>
          <div class="grid grid-cols-3 gap-3 pb-2">
            <button
              v-for="item in g.items"
              :key="item.name"
              class="group relative flex flex-col items-center justify-center aspect-square rounded-2xl transition-all border-2 border-transparent hover:scale-105"
              :class="route.name === item.name ? ['ring-2', palette(item.color || 'butter').ring, palette(item.color || 'butter').bg] : ['hover:shadow-soft', palette(item.color || 'butter').soft]"
              @click="navigateTo(item.to)"
            >
              <!-- 圆形图标背景 -->
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                :class="palette(item.color || 'butter').bg + ' ' + palette(item.color || 'butter').text"
              >
                <span v-if="item.emoji" class="text-2xl">{{ item.emoji }}</span>
                <component v-else :is="item.icon || User" class="w-5 h-5" />
              </div>
              <span class="mt-1.5 text-[11px] font-medium text-cocoa-800 text-center leading-tight px-1 truncate w-full">{{ item.label }}</span>
            </button>
          </div>
        </div>
      </aside>
    </transition>

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
          <div v-if="searchKeyword && (searchLoading || hasResults || (!searchLoading && !hasResults))" class="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-soft border border-cream-200 max-h-96 overflow-y-auto">
            <div v-if="searchLoading" class="px-4 py-3 text-sm text-cocoa-400">搜索中…</div>
            <div v-else-if="!hasResults" class="px-4 py-3 text-sm text-cocoa-400">未找到匹配结果</div>
            <template v-else>
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
            <template v-if="activeCategory && auth.role === 'teacher'">
              <ChevronRight class="w-3 h-3 text-cocoa-300" />
              <span>{{ activeCategory }}</span>
            </template>
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

      <!-- 实际页面内容 -->
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

<style scoped>
/* 二级面板的滑入动画 */
.slide-enter-active,
.slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
  transform: translateX(-12px);
  opacity: 0;
}
</style>