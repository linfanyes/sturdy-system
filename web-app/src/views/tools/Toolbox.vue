<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getTeacherSubjects, isTeacherSubjectVisible } from '@gardener/shared/schemas/subject-schema'
import {
  Sparkles, BookOpen, Calculator as CalcIcon, Languages, FileText,
  LayoutGrid, Bot, Briefcase, Gamepad2,
  Target, Users, Dices, Timer, Trophy, Flower2,
  PenTool, Pencil, BookText, FileEdit, BookMarked, Type,
  Hash, FileQuestion, Ruler, AlertCircle,
  StickyNote, AlignLeft, Headphones, SpellCheck, MessagesSquare, Mic,
  MessageSquare, Notebook, Eye, CalendarDays, Contact, SquarePen, Library,
  Image as ImageIcon, Lightbulb, FileStack, Calendar,
} from 'lucide-vue-next'

const auth = useAuthStore()

interface ToolItem { label: string; icon: any; to: string; feature?: string }
interface ToolSection { title: string; icon: any; items: ToolItem[]; subject?: string }

const sections: ToolSection[] = [
  {
    title: '课堂互动', icon: Sparkles,
    items: [
      { label: '随机点名', icon: Target, to: '/teacher/tools/picker', feature: 'tools' },
      { label: '随机分组', icon: Users, to: '/teacher/tools/grouper', feature: 'tools' },
      { label: '随机决定器', icon: Dices, to: '/teacher/tools/decider', feature: 'tools' },
      { label: '倒计时', icon: Timer, to: '/teacher/tools/timer', feature: 'tools' },
      { label: '课堂计算器', icon: CalcIcon, to: '/teacher/tools/calc', feature: 'tools' },
      { label: '加减分', icon: Trophy, to: '/teacher/tools/scorePanel', feature: 'rewards' },
      { label: '笑口常开', icon: Flower2, to: '/teacher/tools/flower', feature: 'games' },
    ],
  },
  {
    title: '语文工具', icon: BookOpen, subject: '语文',
    items: [
      { label: '汉字笔顺', icon: PenTool, to: '/teacher/tools/strokeOrder', feature: 'tools' },
      { label: '作文素材', icon: FileText, to: '/teacher/tools/writingMaterials', feature: 'tools' },
      { label: '古诗词助手', icon: BookOpen, to: '/teacher/tools/poetry', feature: 'tools' },
      { label: '汉字听写', icon: Pencil, to: '/teacher/tools/dictation', feature: 'tools' },
      { label: '阅读理解生成', icon: BookText, to: '/teacher/tools/reading', feature: 'tools' },
      { label: '小作文助手', icon: FileEdit, to: '/teacher/tools/essay', feature: 'tools' },
      { label: '成语词典', icon: BookMarked, to: '/teacher/tools/idiom', feature: 'tools' },
      { label: '拼音标注', icon: Type, to: '/teacher/tools/pinyin', feature: 'tools' },
    ],
  },
  {
    title: '数学工具', icon: CalcIcon, subject: '数学',
    items: [
      { label: '口算生成', icon: CalcIcon, to: '/teacher/tools/math', feature: 'tools' },
      { label: '竖式计算', icon: Hash, to: '/teacher/tools/verticalCalc', feature: 'tools' },
      { label: '口算答题卡', icon: FileQuestion, to: '/teacher/tools/answerCard', feature: 'tools' },
      { label: '乘法口诀', icon: FileText, to: '/teacher/tools/multiplicationTable', feature: 'tools' },
      { label: '单位换算', icon: Ruler, to: '/teacher/tools/unitConversion', feature: 'tools' },
      { label: '错题本', icon: AlertCircle, to: '/teacher/tools/mathMistakes', feature: 'tools' },
    ],
  },
  {
    title: '英语工具', icon: Languages, subject: '英语',
    items: [
      { label: '单词卡片', icon: StickyNote, to: '/teacher/tools/wordCard', feature: 'tools' },
      { label: '句型练习', icon: AlignLeft, to: '/teacher/tools/sentencePractice', feature: 'tools' },
      { label: '英语听力', icon: Headphones, to: '/teacher/tools/listening', feature: 'tools' },
      { label: '语法练习', icon: SpellCheck, to: '/teacher/tools/grammar', feature: 'tools' },
      { label: '情景对话', icon: MessagesSquare, to: '/teacher/tools/sceneDialogue', feature: 'tools' },
      { label: '单词拼写', icon: Type, to: '/teacher/tools/spell', feature: 'tools' },
      { label: '口语练习', icon: Mic, to: '/teacher/tools/speaking', feature: 'tools' },
      { label: '英语爽文', icon: BookOpen, to: '/teacher/tools/englishStory', feature: 'tools' },
    ],
  },
  {
    title: '文字工具', icon: FileText,
    items: [
      { label: '评语生成', icon: MessageSquare, to: '/teacher/tools/comment', feature: 'tools' },
      { label: '期末总结', icon: FileText, to: '/teacher/tools/summary', feature: 'tools' },
    ],
  },
  {
    title: '班级管理', icon: LayoutGrid,
    items: [
      { label: '座位表', icon: LayoutGrid, to: '/teacher/tools/seatMap', feature: 'seats' },
      { label: '班级职务', icon: Library, to: '/teacher/tools/classDuty', feature: 'duty' },
      { label: '课表排版', icon: Calendar, to: '/teacher/tools/scheduleMaker', feature: 'schedule' },
    ],
  },
  {
    title: 'AI 备课', icon: Bot,
    items: [
      { label: 'AI 对话', icon: Bot, to: '/teacher/ai-chat', feature: 'ai' },
      { label: 'AI 文生图', icon: ImageIcon, to: '/teacher/ai-image', feature: 'ai' },
      { label: '优质教案生成', icon: FileText, to: '/teacher/ai-generator/lesson', feature: 'ai' },
      { label: '知识点生成', icon: Lightbulb, to: '/teacher/ai-generator/knowledge', feature: 'ai' },
      { label: '优选试卷生成', icon: FileStack, to: '/teacher/ai-generator/paper', feature: 'ai' },
    ],
  },
  {
    title: '教师办公', icon: Briefcase,
    items: [
      { label: '工作日志', icon: Notebook, to: '/teacher/work-log', feature: 'worklog' },
      { label: '听课记录', icon: Eye, to: '/teacher/tools/lessonObservation', feature: 'tools' },
      { label: '教学日历', icon: CalendarDays, to: '/teacher/teaching-calendar', feature: 'calendar' },
      { label: '教师通讯录', icon: Contact, to: '/teacher/teacher-directory', feature: 'teachers' },
      { label: '翻译', icon: Languages, to: '/teacher/office-translate', feature: 'worklog' },
      { label: '教育论文', icon: FileText, to: '/teacher/tools/thesis', feature: 'tools' },
      { label: '黑板报', icon: SquarePen, to: '/teacher/office-blackboard', feature: 'worklog' },
      { label: '演讲稿', icon: Mic, to: '/teacher/office-speech', feature: 'worklog' },
      { label: '文案模板', icon: Library, to: '/teacher/tools/planTemplates', feature: 'tools' },
    ],
  },
  {
    title: '小游戏', icon: Gamepad2,
    items: [
      { label: '游戏合集', icon: Gamepad2, to: '/teacher/games', feature: 'games' },
      { label: '笑口常开', icon: Flower2, to: '/teacher/tools/flower', feature: 'games' },
    ],
  },
]

/** 功能权限检查（基于 effectiveFeatures = 学校级 ∩ 教师级 实际可用） */
function hasFeature(feature?: string): boolean {
  if (!feature) return true
  const features = auth.user?.effectiveFeatures
  if (!features) return true
  return features.includes(feature)
}

/**
 * 教师任教学科（用于过滤学科工具分区）：
 * - 语/数/英等学科分区仅对任教学科教师可见
 * - 公共分区（课堂互动/文字工具/班级管理/AI备课/教师办公/小游戏）对所有人可见
 */
const teacherSubjects = computed<string[]>(() =>
  getTeacherSubjects(auth.user?.subject as string | undefined, auth.user?.subjects as string[] | undefined),
)

/** 学科分区对当前教师是否可见 */
function subjectVisible(sec: ToolSection): boolean {
  if (!sec.subject) return true
  return isTeacherSubjectVisible(sec.subject, teacherSubjects.value)
}

/** 按 feature + 学科过滤后的可见分区（自动隐藏空分区） */
const visibleSections = computed<ToolSection[]>(() => {
  return sections
    .map(sec => ({ ...sec, items: sec.items.filter(it => hasFeature(it.feature)) }))
    .filter(sec => sec.items.length > 0 && subjectVisible(sec))
})
</script>

<template>
  <div class="space-y-6 grow-in">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Sparkles class="w-6 h-6 text-butter-500" /> 工具箱
      </h1>
      <span class="text-sm text-cocoa-400">常用工具一站直达</span>
    </div>

    <section
      v-for="sec in visibleSections"
      :key="sec.title"
      class="bg-surface rounded-2xl p-6 shadow-softer"
    >
      <div class="flex items-center gap-2 mb-4">
        <component :is="sec.icon" class="w-5 h-5 text-butter-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">{{ sec.title }}</h2>
        <span class="text-sm text-cocoa-400 ml-auto">共 {{ sec.items.length }} 项</span>
      </div>
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <router-link
          v-for="t in sec.items"
          :key="t.to"
          :to="t.to"
          class="flex flex-col items-center gap-2 p-4 rounded-xl bg-cream-50 hover:bg-cream-100 hover:shadow-softer transition-all"
        >
          <div class="w-10 h-10 rounded-xl bg-surface flex items-center justify-center shadow-softer">
            <component :is="t.icon" class="w-5 h-5 text-butter-600" />
          </div>
          <span class="text-sm text-cocoa-700 text-center">{{ t.label }}</span>
        </router-link>
      </div>
    </section>
  </div>
</template>
