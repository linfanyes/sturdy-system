<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRoleSwitchStore } from '@/stores/roleSwitch'
import {
  LayoutDashboard, School, LogOut, User, Search, Repeat,
  Bot, Briefcase, Wrench, Home, ChevronRight, ToggleLeft,
  Users, BookOpen, ClipboardList, Wallet, Camera,
  Vote, Award, ListTodo, Send, Phone, Image as ImageIcon,
  GraduationCap, Sparkles, FileText, FileQuestion,
  CalendarCheck, MessageSquare, Bell, Megaphone, Settings,
  Pencil, BookMarked, Languages, PencilLine, Calculator,
  Gamepad2, ScrollText, Trash2, ChevronLeft,
} from 'lucide-vue-next'
import { search as searchAll, type SearchResult } from '@/api/school-admin'
import type { Role } from '@/types/user'

const auth = useAuthStore()
const roleSwitchStore = useRoleSwitchStore()
const router = useRouter()
const route = useRoute()

/** 角色中文标签 */
const roleLabel: Record<Role, string> = {
  super: '超级管理员',
  school_admin: '学校管理员',
  teacher: '教师',
  parent: '家长',
}

/** 右上角角色显示（教师优先显示职务：班主任/科任老师等） */
const roleDisplay = computed(() => {
  if (auth.role === 'teacher') {
    const pos = (auth.user as any)?.position
    return pos || '教师'
  }
  return roleLabel[auth.role || 'teacher']
})

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
  /** 学科归属：标记后仅对应学科教师可见（如 '语文'/'数学'/'英语'），不标记则为公共 */
  subject?: string
  items: MenuItem[]
}

interface MenuCategory {
  label: string
  icon: IconType
  color: ColorTone
  emoji?: string
  groups: MenuSubGroup[]
  /** 直达分类：点击直接跳转，to 存在则跳 to，否则跳首个子项；不在内容区展开二级瓷砖（如超管「工作台」/校管「人员管理」「资源与设置」） */
  direct?: boolean
  to?: string
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
    label: '工作台', color: 'butter', icon: LayoutDashboard, direct: true, to: '/teacher',
    groups: [{ label: '', items: [
      { name: 'teacher-dashboard', label: '工作台', to: '/teacher', icon: LayoutDashboard, color: 'butter' },
    ] }],
  },
  {
    label: '教学管理', color: 'blue', icon: School,
    groups: [
      {
        label: '班级与学生', asGrid: true,
        items: [
          { name: 'teacher-classes', label: '班级成员', to: '/teacher/classes', feature: 'classes', emoji: '👥', color: 'blue' },
          { name: 'teacher-students', label: '学生管理', to: '/teacher/students', feature: 'students', emoji: '🎒', color: 'green' },
          { name: 'teacher-duty-roster', label: '轮值表', to: '/teacher/duty-roster', feature: 'duty', emoji: '📋', color: 'butter' },
          { name: 'teacher-class-finance', label: '班费', to: '/teacher/class-finance', feature: 'finance', emoji: '💰', color: 'green' },
          { name: 'teacher-class-activities', label: '班级活动', to: '/teacher/class-activities', feature: 'activities', emoji: '🎉', color: 'rose' },
          { name: 'teacher-gallery', label: '班级风采', to: '/teacher/gallery', feature: 'gallery', emoji: '🏆', color: 'purple' },
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
        ],
      },
      {
        label: '家校沟通', asGrid: true,
        items: [
          { name: 'teacher-parent-contacts', label: '家长联系', to: '/teacher/parent-contacts', feature: 'parents', icon: Phone, color: 'green' },
          { name: 'teacher-message-board', label: '留言板', to: '/teacher/messages', feature: 'im', icon: MessageSquare, color: 'blue' },
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
          { name: 'teacher-textbook', label: '教材知识库', to: '/teacher/textbook', feature: 'ai', icon: BookOpen, color: 'sky' },
          { name: 'teacher-resource-library', label: '专项资源库', to: '/teacher/resource-library', feature: 'ai', icon: BookOpen, color: 'butter' },
          { name: 'teacher-papers', label: '试卷库', to: '/teacher/papers', feature: 'ai', icon: ScrollText, color: 'purple' },
          { name: 'teacher-ai-resources', label: '在线资源', to: '/teacher/ai-resources', feature: 'ai', icon: BookOpen, color: 'sky' },
          { name: 'teacher-zhxue', label: '智慧中小学', to: '/teacher/zhzx', feature: 'ai', icon: GraduationCap, color: 'green' },
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
        label: '语文工具', asGrid: true, subject: '语文',
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
        label: '数学工具', asGrid: true, subject: '数学',
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
        label: '英语工具', asGrid: true, subject: '英语',
        items: [
          { name: 'toolWordCard', label: '单词卡片', to: '/teacher/tools/wordCard', feature: 'tools', icon: Languages, color: 'blue' },
          { name: 'toolSentencePractice', label: '句型练习', to: '/teacher/tools/sentencePractice', feature: 'tools', emoji: '📝', color: 'green' },
          { name: 'toolListening', label: '英语听力', to: '/teacher/tools/listening', feature: 'tools', emoji: '🎧', color: 'rose' },
          { name: 'toolGrammar', label: '语法练习', to: '/teacher/tools/grammar', feature: 'tools', icon: Languages, color: 'butter' },
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
        { name: 'teacher-notifications', label: '通知中心', to: '/teacher/notifications', icon: Bell, color: 'butter' },
        { name: 'teacher-todos', label: '待办事项', to: '/teacher/todos', feature: 'todos', icon: ListTodo, color: 'rose' },
        { name: 'teacher-notes', label: '笔记', to: '/teacher/notes', feature: 'notes', icon: BookOpen, color: 'green' },
        { name: 'teacher-my-gallery', label: '我的相册', to: '/teacher/my-gallery', feature: 'gallery', icon: Camera, color: 'sky' },
        { name: 'teacher-awards', label: '我获奖啦', to: '/teacher/awards', feature: 'rewards', emoji: '🎉', color: 'butter' },
        { name: 'teacher-profile', label: '个人资料', to: '/teacher/profile', icon: User, color: 'cream' },
        { name: 'teacher-config', label: '设置', to: '/teacher/config', icon: Settings, color: 'cocoa' },
      ],
    }],
  },
]

/* 超管菜单：工作台（直达）/ 账户管理（学校管理·校管理员·学校功能包）/ 设置（平台配置·AI 服务商）
   复用「侧边栏图标分类 + 内容区二级瓷砖」模式；教师/学生/审计日志按需求从菜单移除（页面与路由保留）。 */
const superMenu: MenuCategory[] = [
  {
    label: '工作台', color: 'butter', icon: LayoutDashboard, direct: true,
    groups: [{ label: '', items: [
      { name: 'super-dashboard', label: '工作台', to: '/super', icon: LayoutDashboard, color: 'butter' },
    ] }],
  },
  {
    label: '账户管理', color: 'blue', icon: Users,
    groups: [{ label: '', items: [
      { name: 'super-schools', label: '学校管理', to: '/super/schools', icon: School, color: 'blue' },
      { name: 'super-admins', label: '校管理员', to: '/super/admins', icon: Users, color: 'purple' },
      { name: 'super-school-features', label: '学校功能包', to: '/super/school-features', icon: ToggleLeft, color: 'green' },
      { name: 'super-account-clear', label: '清除业务数据', to: '/super/account-clear', icon: Trash2, color: 'cocoa' },
    ] }],
  },
  {
    label: '审计日志', color: 'cocoa', icon: ScrollText, direct: true,
    groups: [{ label: '', items: [
      { name: 'super-audit-logs', label: '审计日志', to: '/super/audit-logs', icon: ScrollText, color: 'cocoa' },
    ] }],
  },
  {
    label: '设置', color: 'cream', icon: Settings,
    groups: [{ label: '', items: [
      { name: 'super-config', label: '平台配置', to: '/super/config', icon: Settings, color: 'cream' },
      { name: 'super-ai-providers', label: 'AI 服务商', to: '/super/ai-providers', icon: Bot, color: 'green' },
    ] }],
  },
]
/** 超管侧边栏中的可展开分类（排除直达的「仪表盘」） */
const superCats = computed(() => superMenu.filter((c) => !c.direct))

/* 校管菜单：工作台（直达）/ 人员管理 / 资源与设置（均展开二级瓷砖）
   与超管 superMenu 同构，一级≤3，二级为页面入口，对齐超管菜单风格。 */
const schoolAdminMenu: MenuCategory[] = [
  {
    label: '工作台', color: 'butter', icon: LayoutDashboard, direct: true,
    groups: [{ label: '', items: [
      { name: 'school-admin-dashboard', label: '工作台', to: '/school-admin', icon: LayoutDashboard, color: 'butter' },
    ] }],
  },
  {
    label: '人员管理', color: 'blue', icon: Users,
    groups: [{ label: '', items: [
      { name: 'school-admin-teachers', label: '教师管理', to: '/school-admin/teachers', icon: Users, color: 'blue' },
      { name: 'school-admin-classes', label: '班级管理', to: '/school-admin/classes', icon: School, color: 'green' },
      { name: 'school-admin-students', label: '学生管理', to: '/school-admin/students', icon: GraduationCap, color: 'rose' },
      { name: 'school-admin-features', label: '学校功能包', to: '/school-admin/features', icon: ToggleLeft, color: 'purple' },
    ] }],
  },
  {
    label: '资源与设置', color: 'cream', icon: Settings,
    groups: [{ label: '', items: [
      { name: 'school-admin-notices', label: '学校公告', to: '/school-admin/notices', icon: Megaphone, color: 'butter' },
      { name: 'school-admin-textbooks', label: '教材知识库', to: '/school-admin/textbooks', icon: BookOpen, color: 'sky' },
      { name: 'school-admin-resource-library', label: '专项资源库', to: '/school-admin/resource-library', icon: BookOpen, color: 'green' },
      { name: 'school-admin-zhxue', label: '智慧中小学', to: '/school-admin/zhzx', icon: GraduationCap, color: 'blue' },
      { name: 'school-admin-ai-config', label: 'AI 配置', to: '/school-admin/ai-config', icon: Bot, color: 'blue' },
    ] }],
  },
]
/** 校管侧边栏中的可展开分类（排除直达的「工作台」） */
const schoolAdminCats = computed(() => schoolAdminMenu.filter((c) => !c.direct))

/* 非教师角色扁平菜单（保留原结构；super 已迁至 superMenu） */
const flatNavItems: Record<Exclude<Role, 'teacher'>, MenuItem[]> = {
  super: [],
  // 校管一级/二级菜单已迁至 schoolAdminMenu（对齐超管菜单风格），此处置空避免歧义
  school_admin: [],
  parent: [
    { name: 'parent-dashboard', label: '孩子动态', to: '/parent', icon: Home, color: 'butter' },
    { name: 'parent-textbook', label: '教材知识点', to: '/parent/textbook', icon: BookOpen, color: 'green' },
  ],
}

/** 功能权限检查（基于 effectiveFeatures = 学校级 ∩ 教师级 实际可用） */
function hasFeature(feature?: string): boolean {
  if (!feature) return true
  const features = auth.user?.effectiveFeatures
  // 未加载 effectiveFeatures 时放行（兼容）；否则按实际可用集合判定
  if (!features) return true
  return features.includes(feature)
}

/** 教师可见的三级菜单（按 feature + 学科过滤） */
const visibleTeacherMenu = computed<MenuCategory[]>(() => {
  // 教师主学科（语数外三科老师一般只任一科；多学科时 subjects 数组优先）
  const teacherSubject = auth.user?.subjects?.[0] || auth.user?.subject || ''
  return teacherMenu
    .map((cat) => ({
      ...cat,
      groups: cat.groups
        .map((g) => {
          // 学科工具分组：仅本学科教师可见（校管/超管全可见）
          if (g.subject && teacherSubject && g.subject !== teacherSubject) {
            return { ...g, items: [] }
          }
          return { ...g, items: g.items.filter((it) => hasFeature(it.feature)) }
        })
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
    if (cat.direct) continue
    for (const g of cat.groups) {
      if (g.items.some((it) => it.name === targetName)) return cat.label
    }
  }
  for (const cat of superMenu) {
    if (cat.direct) continue
    for (const g of cat.groups) {
      if (g.items.some((it) => it.name === targetName)) return cat.label
    }
  }
  for (const cat of schoolAdminMenu) {
    if (cat.direct) continue
    for (const g of cat.groups) {
      if (g.items.some((it) => it.name === targetName)) return cat.label
    }
  }
  return ''
}

function syncActiveCat() {
  const rootNames = ['teacher-dashboard', 'super-dashboard', 'school-admin-dashboard']
  // 根路由不覆盖已选分类：支持从三级页面通过 backToTiles()/goBackUp() 返回时正确展示瓷砖面板。
  // 非根路由进入时（含刷新页面）才更新 activeCategory，确保面包屑正确反映当前页面所属分类。
  if (rootNames.includes(route.name as string)) return
  const c = findCategoryForRoute(route.name)
  activeCategory.value = c
  if (c && !openCats.value.includes(c)) openCats.value = [...openCats.value, c]
}
onMounted(syncActiveCat)
watch(() => route.name, syncActiveCat)

function toggleCat(label: string) {
  const role = auth.role
  const menu = role === 'super' ? superMenu : role === 'school_admin' ? schoolAdminMenu : visibleTeacherMenu.value
  const cat = menu.find((c) => c.label === label)
  // 直达分类（如超管「工作台」/校管「工作台」）：点击直接跳转，并收起所有展开
  if (cat?.direct) {
    activeCategory.value = ''
    openCats.value = []
    router.push(cat.to || cat.groups[0]?.items[0]?.to || '/')
    return
  }
  // 统一 toggle：已展开则收起，未展开则展开
  if (activeCategory.value === label) {
    activeCategory.value = ''
    openCats.value = []
  } else {
    activeCategory.value = label
    openCats.value = [label]
  }
  router.push(role === 'super' ? '/super' : role === 'school_admin' ? '/school-admin' : '/teacher')
}

/** 是否在内容区展示二级菜单瓷砖（教师/超管/校管 + 已选分类 + 工作台根页面） */
const showTilesPanel = computed(() =>
  ((auth.role === 'teacher' && !!activeCategory.value && route.name === 'teacher-dashboard') ||
   (auth.role === 'super' && !!activeCategory.value && route.name === 'super-dashboard') ||
   (auth.role === 'school_admin' && !!activeCategory.value && route.name === 'school-admin-dashboard'))
)

/** 返回首页（清除分类选择，展示仪表盘内容）。按角色跳转，避免跨角色误跳 */
function backToDashboard() {
  activeCategory.value = ''
  openCats.value = []
  if (auth.role === 'super' && route.name !== 'super-dashboard') router.push('/super')
  else if (auth.role === 'school_admin' && route.name !== 'school-admin-dashboard') router.push('/school-admin')
  else if (auth.role === 'teacher' && route.name !== 'teacher-dashboard') router.push('/teacher')
}

/** 点击面包屑「二级分类」返回该分类的二级菜单（瓷砖面板）。
 *  保留 activeCategory，仅跳回对应角色的工作台根，showTilesPanel 随即展示该分类瓷砖，
 *  从而满足「从路径显示点击返回二级菜单」。 */
function backToTiles() {
  if (auth.role === 'super') router.push('/super')
  else if (auth.role === 'school_admin') router.push('/school-admin')
  else router.push('/teacher')
}

/** 三级页面「返回上级」：有分类则回分类瓷砖面板，否则回工作台根 */
function goBackUp() {
  if (activeCategory.value) backToTiles()
  else backToDashboard()
}

async function handleLogout() {
  if (!await confirm('确定要退出登录吗？')) return
  auth.logout()
  router.push({ name: 'login' })
}

/** 切换到家长端（仅当 roleSwitchStore 有 teacherToken 时启用） */
const canSwitchToParent = computed(() => !!roleSwitchStore.teacherToken && auth.role === 'teacher')

async function switchToParent() {
  roleSwitchStore.switchTo('parent', auth.setAuth)
  await auth.fetchMe()
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
/** 是否处于仪表盘首页根路由（首页不重复渲染 pageTitle，避免「仪表盘 / 仪表盘」） */
const isHome = computed(() => route.name === 'super-dashboard' || route.name === 'school-admin-dashboard' || route.name === 'teacher-dashboard')

const today = computed(() =>
  new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
)

/** 根据当前时间生成问候语 */
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6) return '夜深了，早点休息'
  if (h < 9) return '早上好'
  if (h < 12) return '上午好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
})

/** 当前用户显示名（教师用姓名，其他角色用角色标签） */
const displayName = computed(() => {
  const u = auth.user
  if (!u) return roleLabel[auth.role || 'teacher']
  if (auth.role === 'teacher') return u.name || '老师'
  if (auth.role === 'school_admin') return u.name || '校管'
  if (auth.role === 'super') return '超级管理员'
  return u.name || roleLabel[auth.role || 'teacher']
})

/** 当前激活分类的二级组 */
const activeGroups = computed(() => {
  if (!activeCategory.value) return []
  if (auth.role === 'super') {
    const cat = superMenu.find((c) => c.label === activeCategory.value)
    return cat?.groups || []
  }
  if (auth.role === 'school_admin') {
    const cat = schoolAdminMenu.find((c) => c.label === activeCategory.value)
    return cat?.groups || []
  }
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
      <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-butter-300 to-butter-500 flex items-center justify-center text-white font-bold text-sm shadow-soft mb-6 leading-none">
        园丁
      </div>

      <!-- 一级分类图标按钮 -->
      <nav class="flex-1 w-full px-2 overflow-y-auto space-y-2">
        <!-- 教师三级菜单的二级组作为一级入口 -->
        <template v-if="auth.role === 'teacher'">
          <button
            v-for="cat in visibleTeacherMenu"
            :key="cat.label"
            class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
            :class="activeCategory === cat.label ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
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
        <!-- 超管：仪表盘直达 + 账户管理/设置 可展开分类 -->
        <template v-else-if="auth.role === 'super'">
          <template v-for="cat in superMenu" :key="cat.label">
            <router-link
              v-if="cat.direct"
              :to="(cat.groups[0]?.items[0]?.to) || '#'"
              @click="activeCategory = ''; openCats = []"
              class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
              :class="route.name === (cat.groups[0]?.items[0]?.name) ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
            >
              <div
                class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                :class="route.name === (cat.groups[0]?.items[0]?.name) ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text"
              >
                <component :is="cat.icon" class="w-5 h-5" />
              </div>
              <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ cat.label }}</span>
            </router-link>
            <button
              v-else
              class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
              :class="activeCategory === cat.label ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
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
        </template>
        <!-- 校管：工作台直达 + 人员管理/资源与设置 可展开分类（对齐超管菜单风格） -->
        <template v-else-if="auth.role === 'school_admin'">
          <template v-for="cat in schoolAdminMenu" :key="cat.label">
            <router-link
              v-if="cat.direct"
              :to="(cat.groups[0]?.items[0]?.to) || '#'"
              @click="activeCategory = ''; openCats = []"
              class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
              :class="route.name === (cat.groups[0]?.items[0]?.name) ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
            >
              <div
                class="w-11 h-11 rounded-xl flex items-center justify-center transition-all"
                :class="route.name === (cat.groups[0]?.items[0]?.name) ? palette(cat.color).bg : palette(cat.color).soft + ' ' + palette(cat.color).text"
              >
                <component :is="cat.icon" class="w-5 h-5" />
              </div>
              <span class="text-[10px] font-medium text-cocoa-700 mt-1 truncate max-w-[60px]">{{ cat.label }}</span>
            </router-link>
            <button
              v-else
              class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
              :class="activeCategory === cat.label ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
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
        </template>
        <!-- 其他非教师扁平菜单（家长） -->
        <template v-else>
          <router-link
            v-for="item in flatItems"
            :key="item.name"
            :to="item.to"
            class="group flex flex-col items-center w-full py-2 rounded-xl transition-all"
            :class="route.name === item.name ? 'bg-surface shadow-soft ring-1 ring-butter-200' : 'hover:bg-cream-200/60'"
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

    <!-- 主内容区 -->
    <main class="flex-1 overflow-hidden bg-cream-50 flex flex-col">
      <!-- 顶栏：全局搜索（仅校管可见） -->
      <div v-if="auth.role === 'school_admin'" class="border-b border-cream-200 bg-surface/80 backdrop-blur px-6 py-2.5 shrink-0 no-print">
        <div class="max-w-7xl mx-auto relative">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
            <input
              v-model="searchKeyword"
              placeholder="全局搜索：教师 / 班级 / 学生"
              class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
              @input="onSearchInput"
            />
          </div>
          <div v-if="searchKeyword && (searchLoading || hasResults || (!searchLoading && !hasResults))" class="absolute z-20 mt-1 w-full bg-surface rounded-xl shadow-soft border border-cream-200 max-h-96 overflow-y-auto">
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
      <header class="shrink-0 border-b border-cream-100 bg-surface/80 px-6 py-4 backdrop-blur">
        <div class="flex items-center justify-between">
          <div>
            <div class="flex items-center gap-3">
              <h1 class="text-2xl font-bold text-cocoa-900">{{ displayName }}</h1>
              <span class="chip bg-butter-100 text-butter-700">{{ greeting }}</span>
            </div>
            <!-- 子页面显示简洁面包屑：仅保留当前页标题，去掉「工作台 > 分类」冗余路径 -->
            <nav v-if="!showTilesPanel && !isHome" aria-label="breadcrumb" class="mt-1.5 flex items-center text-xs text-cocoa-500">
              <span class="font-medium text-cocoa-700">{{ pageTitle }}</span>
            </nav>
          </div>
          <div class="text-right">
            <div class="text-sm font-medium text-cocoa-700">{{ roleDisplay }}</div>
            <div class="mt-0.5 text-xs text-cocoa-400">{{ today }}</div>
          </div>
        </div>
      </header>

      <!-- 实际页面内容 -->
      <div class="flex-1 overflow-auto">
        <div class="w-full min-h-full px-4 py-4 sm:px-6 sm:py-6 lg:px-8 flex flex-col">
          <!-- 教师工作台：二级菜单瓷砖铺满内容区 -->
          <template v-if="showTilesPanel">
            <div class="flex items-center gap-2 text-sm text-cocoa-700 font-medium mb-4">
              {{ activeCategory }}
            </div>
            <div v-for="g in activeGroups" :key="g.label || 'main'" class="mb-6">
              <div v-if="g.label" class="flex items-center gap-2 mb-3">
                <h3 class="text-sm font-semibold text-cocoa-700 tracking-wider">{{ g.label }}</h3>
                <div class="flex-1 h-px bg-cream-200"></div>
                <span class="text-xs text-cocoa-400">{{ g.items.length }} 项</span>
              </div>
              <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                <button
                  v-for="item in g.items"
                  :key="item.name"
                  class="group flex flex-col items-center justify-center rounded-2xl transition-all border-2 border-transparent hover:scale-105 p-4"
                  :class="route.name === item.name ? ['ring-2', palette(item.color || 'butter').ring, palette(item.color || 'butter').bg] : ['hover:shadow-soft', palette(item.color || 'butter').soft]"
                  @click="navigateTo(item.to)"
                >
                  <div
                    class="w-14 h-14 rounded-full flex items-center justify-center transition-all"
                    :class="palette(item.color || 'butter').bg + ' ' + palette(item.color || 'butter').text"
                  >
                    <span v-if="item.emoji" class="text-2xl">{{ item.emoji }}</span>
                    <component v-else :is="item.icon || User" class="w-6 h-6" />
                  </div>
                  <span class="mt-2 text-xs font-medium text-cocoa-800 text-center leading-tight">{{ item.label }}</span>
                </button>
              </div>
            </div>
          </template>
          <!-- 常规页面内容：三级/二级页面统一提供「返回上级」条（首页与瓷砖面板不显示） -->
          <template v-else>
            <div v-if="!isHome" class="flex items-center gap-2 mb-4 flex-wrap">
              <button
                type="button"
                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 active:scale-95 transition-all text-sm font-medium shadow-sm"
                title="返回上级"
                @click="goBackUp"
              >
                <ChevronLeft class="w-4 h-4 shrink-0" />
                <span class="hidden sm:inline">返回</span>
              </button>
              <span class="text-xs text-cocoa-400 truncate">{{ pageTitle || '' }}</span>
            </div>
            <router-view />
          </template>
          <footer class="mt-auto pt-8 pb-2 text-center text-xs text-cocoa-400">
            © 2026 园丁工作台 · Web 管理端
          </footer>
        </div>
      </div>
    </main>
  </div>
</template>