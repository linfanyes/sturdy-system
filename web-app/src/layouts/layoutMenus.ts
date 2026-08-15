import {
  LayoutDashboard, School, User, Bot, Briefcase, Wrench,
  Users, BookOpen, ClipboardList, Wallet, Camera,
  Award, ListTodo, Send, Phone, Image as ImageIcon,
  GraduationCap, Sparkles, FileText, FileQuestion,
  CalendarCheck, MessageSquare, Bell, Megaphone, Settings,
  BookMarked, Languages, Calculator,
  Gamepad2, ScrollText, Trash2,
  ToggleLeft, Home, Library, BarChart3, ClipboardCheck,
  Code2,
} from 'lucide-vue-next'
import type { Role } from '@/types/user'

export type IconType = any
export type ColorTone = 'butter' | 'rose' | 'blue' | 'green' | 'purple' | 'cocoa' | 'cream' | 'sky'

export interface MenuItem {
  name: string
  label: string
  to: string
  feature?: string
  icon?: IconType
  color?: ColorTone
  emoji?: string
}

export interface MenuSubGroup {
  label: string
  asGrid?: boolean
  subject?: string
  items: MenuItem[]
}

export interface MenuCategory {
  label: string
  icon: IconType
  color: ColorTone
  emoji?: string
  groups: MenuSubGroup[]
  direct?: boolean
  to?: string
}

export const colorClassMap: Record<ColorTone, { bg: string; ring: string; text: string; soft: string }> = {
  butter: { bg: 'bg-butter-100', ring: 'ring-butter-300', text: 'text-butter-700', soft: 'bg-butter-50/60' },
  rose:   { bg: 'bg-rose-100',   ring: 'ring-rose-300',   text: 'text-rose-700',   soft: 'bg-rose-50/60' },
  blue:   { bg: 'bg-blue-100',   ring: 'ring-blue-300',   text: 'text-blue-700',   soft: 'bg-blue-50/60' },
  green:  { bg: 'bg-emerald-100',ring: 'ring-emerald-300',text: 'text-emerald-700',soft: 'bg-emerald-50/60' },
  purple: { bg: 'bg-purple-100', ring: 'ring-purple-300', text: 'text-purple-700', soft: 'bg-purple-50/60' },
  cocoa:  { bg: 'bg-cocoa-100',  ring: 'ring-cocoa-300',  text: 'text-cocoa-700',  soft: 'bg-cocoa-50/60' },
  cream:  { bg: 'bg-cream-100',  ring: 'ring-cream-300',  text: 'text-cocoa-600',  soft: 'bg-cream-50' },
  sky:    { bg: 'bg-sky-100',    ring: 'ring-sky-300',    text: 'text-sky-700',    soft: 'bg-sky-50/60' },
}

export const palette = (t: ColorTone) => colorClassMap[t] || colorClassMap.cream

export const roleLabel: Record<Role, string> = {
  super: '超级管理员',
  school_admin: '学校管理员',
  teacher: '教师',
  parent: '家长',
}

/* ============ 教师三级菜单 ============ */
export const teacherMenu: MenuCategory[] = [
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
          { name: 'student-info-review', label: '信息修改审核', to: '/teacher/student-info-review', feature: 'students', icon: ClipboardCheck, color: 'sky' },
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
          { name: 'teacher-award-categories', label: '奖项管理', to: '/teacher/award-categories', feature: 'rewards', icon: Award, color: 'cream' },
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
          { name: 'teacher-im', label: '家校沟通', to: '/teacher/im', feature: 'im', icon: MessageSquare, color: 'purple' },
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
          { name: 'teacher-ai-interactive', label: '互动答疑', to: '/teacher/ai-interactive', feature: 'ai', icon: Bot, color: 'sky' },
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
        label: '科学工具', asGrid: true, subject: '科学',
        items: [
          { name: 'toolExperimentDesign', label: '实验设计助手', to: '/teacher/tools/ai?key=experiment-design', feature: 'tools', emoji: '🧪', color: 'purple' },
          { name: 'toolScienceKnowledge', label: '科学知识图解', to: '/teacher/tools/ai?key=science-knowledge', feature: 'tools', emoji: '🔬', color: 'sky' },
          { name: 'toolObservationRecord', label: '观察记录生成', to: '/teacher/tools/ai?key=observation-record', feature: 'tools', emoji: '📝', color: 'green' },
        ],
      },
      {
        label: '道法工具', asGrid: true, subject: '道德与法治',
        items: [
          { name: 'toolMoralCase', label: '案例分析', to: '/teacher/tools/ai?key=moral-case', feature: 'tools', emoji: '⚖️', color: 'rose' },
          { name: 'toolMoralDiscussion', label: '情境讨论', to: '/teacher/tools/ai?key=moral-discussion', feature: 'tools', emoji: '💬', color: 'blue' },
          { name: 'toolMoralValue', label: '价值观辨析', to: '/teacher/tools/ai?key=moral-value', feature: 'tools', emoji: '🌟', color: 'butter' },
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
    label: '少儿编程', color: 'green', icon: Code2,
    groups: [
      {
        label: '', asGrid: true,
        items: [
          { name: 'teacher-kids-coding', label: '少儿编程', to: '/teacher/kids-coding', feature: 'kids-coding', icon: Code2, color: 'green' },
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

/* 超管菜单 */
export const superMenu: MenuCategory[] = [
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
	      { name: 'super-school-features', label: '学校功能包', to: '/super/school-features', icon: ToggleLeft, color: 'green' },
	      { name: 'super-account-clear', label: '清除业务数据', to: '/super/account-clear', icon: Trash2, color: 'cocoa' },
	    ] }],
  },
  {
    label: '少儿编程', color: 'green', icon: Send,
    groups: [{ label: '', items: [
      { name: 'super-kids-coding', label: '周报批量推送', to: '/super/kids-coding', icon: Send, color: 'green' },
    ] }],
  },
]

/* 校管菜单 */
export const schoolAdminMenu: MenuCategory[] = [
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
	      { name: 'school-admin-academic', label: '成绩查询与汇总', to: '/school-admin/academic', icon: GraduationCap, color: 'purple' },
	    ] }],
	  },
	  {
	    label: '资源', color: 'green', icon: BookOpen,
	    groups: [{ label: '', items: [
	      { name: 'school-admin-notices', label: '学校公告', to: '/school-admin/notices', icon: Megaphone, color: 'butter' },
	      { name: 'school-admin-textbooks', label: '教材知识库', to: '/school-admin/textbooks', icon: BookOpen, color: 'sky' },
	      { name: 'school-admin-resource-library', label: '专项资源库', to: '/school-admin/resource-library', icon: BookOpen, color: 'green' },
	      { name: 'school-admin-zhxue', label: '智慧中小学', to: '/school-admin/zhzx', icon: GraduationCap, color: 'blue' },
	    ] }],
	  },
	  {
	    label: '设置', color: 'cream', icon: Settings,
	    groups: [{ label: '', items: [
	      { name: 'school-admin-ai-config', label: 'AI 配置', to: '/school-admin/ai-config', icon: Bot, color: 'blue' },
	      { name: 'school-admin-features', label: '学校功能包', to: '/school-admin/features', icon: ToggleLeft, color: 'purple' },
	    ] }],
	  },
]

/* 非教师角色扁平菜单 */
export const flatNavItems: Record<Exclude<Role, 'teacher'>, MenuItem[]> = {
  super: [],
  school_admin: [],
  parent: [
    { name: 'parent-dashboard', label: '孩子动态', to: '/parent', icon: Home, color: 'butter' },
    { name: 'parent-textbook', label: '教材知识点', to: '/parent/textbook', icon: BookOpen, color: 'green' },
    { name: 'parent-resource-library', label: '专项资源库', to: '/parent/resources', icon: Library, color: 'sky' },
    { name: 'parent-compare', label: '跨娃比对', to: '/parent/compare', icon: BarChart3, color: 'purple' },
    { name: 'parent-kids-coding', label: '少儿编程', to: '/parent/kids-coding', icon: Code2, color: 'green', feature: 'kids-coding' },
  ],
}
