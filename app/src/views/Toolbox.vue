<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToolboxStore } from '../stores/toolbox'
import type { ToolItem, ToolCategory } from '../types/toolbox'
import { Settings, X } from 'lucide-vue-next'

const router = useRouter()
const toolboxStore = useToolboxStore()

const CATEGORY_LABELS: Record<ToolCategory, string> = {
  dialogue: '对话工具',
  text: '文字工具',
  chinese: '语文',
  math: '数学',
  english: '英语',
  game: '游戏',
  other: '其他',
}

const CATEGORY_ORDER: ToolCategory[] = [
  'dialogue',
  'text',
  'chinese',
  'math',
  'english',
  'game',
  'other',
]

const CATEGORY_BTN_CLASS: Record<ToolCategory, string> = {
  dialogue: 'bg-butter-100 text-butter-600',
  text: 'bg-mint-100 text-mint-600',
  chinese: 'bg-rose-100 text-rose-600',
  math: 'bg-amber-100 text-amber-600',
  english: 'bg-sky2-100 text-sky2-600',
  game: 'bg-sakura-100 text-sakura-600',
  other: 'bg-cocoa-100 text-cocoa-600',
}

/** 每个分类统一的卡片背景色 + 文字色 (一个类一个颜色, 覆盖工具项自带的 bg/text) */
const CATEGORY_CARD_STYLE: Record<ToolCategory, { bg: string; text: string }> = {
  dialogue: { bg: 'bg-gradient-to-br from-butter-100 to-butter-200', text: 'text-butter-600' },
  text: { bg: 'bg-gradient-to-br from-mint-100 to-mint-200', text: 'text-mint-600' },
  chinese: { bg: 'bg-gradient-to-br from-rose-100 to-rose-200', text: 'text-rose-600' },
  math: { bg: 'bg-gradient-to-br from-amber-100 to-amber-200', text: 'text-amber-600' },
  english: { bg: 'bg-gradient-to-br from-sky2-100 to-sky2-200', text: 'text-sky2-600' },
  game: { bg: 'bg-gradient-to-br from-sakura-100 to-sakura-200', text: 'text-sakura-600' },
  other: { bg: 'bg-gradient-to-br from-cocoa-100 to-cocoa-200', text: 'text-cocoa-600' },
}

/** 按分类获取工具卡片样式 (统一颜色) */
function cardStyle(t: ToolItem): { bg: string; text: string } {
  return CATEGORY_CARD_STYLE[t.category] || { bg: t.bg, text: t.text }
}

/** 根据路由自动判断默认分类：新增工具只要符合规则即可自动归类 */
function autoCategory(route: string): ToolCategory {
  if (route === 'tool-ai') return 'dialogue'
  if (route === 'games' || route.startsWith('game-') || route === 'tool-flower') return 'game'
  // 语文工具
  if (
    [
      'tool-stroke-order',
      'tool-writing-materials',
      'tool-poetry',
      'tool-dictation',
      'tool-reading',
      'tool-essay',
      'tool-idiom',
      'tool-pinyin',
    ].includes(route)
  )
    return 'chinese'
  // 数学工具
  if (
    [
      'tool-math',
      'tool-vertical-calc',
      'tool-answer-card',
      'tool-multiplication-table',
      'tool-unit-conversion',
      'tool-math-mistakes',
    ].includes(route)
  )
    return 'math'
  // 英语工具
  if (
    [
      'tool-word-card',
      'tool-sentence-practice',
      'tool-listening',
      'tool-grammar',
      'tool-scene-dialogue',
      'tool-spell',
      'tool-speaking',
      'tool-english-story',
    ].includes(route)
  )
    return 'english'
  // 文字工具
  if (
    [
      'tool-comment',
      'tool-notice-tpl',
      'tool-plan-tpl',
      'tool-paper',
      'tool-knowledge',
      'tool-lesson-plan',
      'tool-test-paper',
      'tool-summary',
      'tool-speech',
    ].includes(route)
  )
    return 'text'
  // 翻译按用户要求移到「其他」类
  return 'other'
}

const allTools: ToolItem[] = [
  {
    name: 'AI 对话',
    desc: '向 AI 老师提问，让它帮你分析学生、设计教案',
    icon: '🤖',
    bg: 'bg-gradient-to-br from-butter-100 to-sakura-100',
    text: 'text-cocoa-700',
    route: 'tool-ai',
    tag: '热门',
    category: autoCategory('tool-ai'),
  },
  {
    name: '翻译',
    desc: '中英日韩等多语种互译，适合英语教研 / 班级公告',
    icon: '🌐',
    bg: 'bg-gradient-to-br from-mint-100 to-sky2-100',
    text: 'text-cocoa-700',
    route: 'tool-translate',
    tag: '新增',
    category: autoCategory('tool-translate'),
  },
  {
    name: '随机点名',
    desc: '摇一摇，公平又刺激的课堂互动',
    icon: '🎯',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-picker',
    category: autoCategory('tool-picker'),
  },
  {
    name: '倒计时',
    desc: '小组讨论 / 课堂练习的得力助手',
    icon: '⏱️',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-timer',
    category: autoCategory('tool-timer'),
  },
  {
    name: '笑口常开',
    desc: '点 8 下让花朵从花骨朵到盛开, 给心情放个假',
    icon: '🌸',
    bg: 'bg-gradient-to-br from-sakura-200 to-butter-200',
    text: 'text-sakura-500',
    route: 'tool-flower',
    tag: '新增',
    category: autoCategory('tool-flower'),
  },
  {
    name: '课堂计算器',
    desc: '大屏显示，醒目又方便',
    icon: '🧮',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-calc',
    category: autoCategory('tool-calc'),
  },
  {
    name: '评语生成',
    desc: '根据特点一键生成期末评语',
    icon: '✍️',
    bg: 'bg-butter-100',
    text: 'text-butter-600',
    route: 'tool-comment',
    category: autoCategory('tool-comment'),
  },
  {
    name: '优选试卷',
    desc: '按年级学科题型，AI 出一套完整试卷',
    icon: '📝',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-test-paper',
    tag: '新增',
    category: autoCategory('tool-test-paper'),
  },
  {
    name: '知识点',
    desc: '按年级/科目/教材版本/学期，AI 梳理课本知识点',
    icon: '💡',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-knowledge',
    tag: '新增',
    category: autoCategory('tool-knowledge'),
  },
  {
    name: '优质教案',
    desc: '多篇候选教案，勾选后整合为新教案',
    icon: '📚',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-lesson-plan',
    tag: '新增',
    category: autoCategory('tool-lesson-plan'),
  },
  {
    name: '期末总结生成',
    desc: 'AI 基于本地数据生成学生评语、班级、学科总结',
    icon: '📑',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-summary',
    tag: '文字',
    category: autoCategory('tool-summary'),
  },
  {
    name: '演讲稿生成',
    desc: '国旗下讲话、班会、家长会等场景演讲稿',
    icon: '🎤',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-speech',
    tag: '文字',
    category: autoCategory('tool-speech'),
  },
  {
    name: '口算生成',
    desc: '加减乘除，按难度自动出题',
    icon: '➕',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-math',
    category: autoCategory('tool-math'),
  },
  {
    name: '竖式计算',
    desc: '加减法进退位、乘法除法竖式练习',
    icon: '📐',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-vertical-calc',
    tag: '数学',
    category: autoCategory('tool-vertical-calc'),
  },
  {
    name: '口算答题卡',
    desc: '标准答题卡格式，每行10题共200题',
    icon: '📋',
    bg: 'bg-butter-100',
    text: 'text-butter-600',
    route: 'tool-answer-card',
    tag: '数学',
    category: autoCategory('tool-answer-card'),
  },
  {
    name: '乘法口诀',
    desc: '可视化乘法口诀表，支持学习和测试',
    icon: '🔢',
    bg: 'bg-amber-100',
    text: 'text-amber-600',
    route: 'tool-multiplication-table',
    tag: '数学',
    category: autoCategory('tool-multiplication-table'),
  },
  {
    name: '单位换算',
    desc: '长度、重量、时间、人民币单位换算练习',
    icon: '⚖️',
    bg: 'bg-cocoa-100',
    text: 'text-cocoa-600',
    route: 'tool-unit-conversion',
    tag: '数学',
    category: autoCategory('tool-unit-conversion'),
  },
  {
    name: '错题本',
    desc: '记录学生做错的题目，方便针对性复习',
    icon: '📝',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-math-mistakes',
    tag: '数学',
    category: autoCategory('tool-math-mistakes'),
  },
  {
    name: '课表排版',
    desc: '可视化排课，导出打印样样行',
    icon: '🗓️',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-schedule',
    category: autoCategory('tool-schedule'),
  },
  {
    name: '随机分组',
    desc: '快速将学生随机分组，支持男女均衡、分配角色',
    icon: '👥',
    bg: 'bg-butter-100',
    text: 'text-butter-600',
    route: 'tool-grouper',
    tag: '新增',
    category: autoCategory('tool-grouper'),
  },
  {
    name: '奖惩记录',
    desc: '表扬加分、批评减分，记录成长',
    icon: '🏅',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-reward',
    category: autoCategory('tool-reward'),
  },
  {
    name: '我获奖啦',
    desc: '记录每一份荣誉，AI识别奖状自动填写',
    icon: '🏆',
    bg: 'bg-gradient-to-br from-butter-100 to-sakura-100',
    text: 'text-cocoa-700',
    route: 'tool-award',
    tag: '新增',
    category: autoCategory('tool-award'),
  },
  {
    name: '小游戏合集',
    desc: '18款经典小游戏，课间放松摸鱼必备',
    icon: '🎮',
    bg: 'bg-gradient-to-br from-sakura-100 to-mint-100',
    text: 'text-cocoa-700',
    route: 'games',
    tag: '18合1',
    category: autoCategory('games'),
  },
  {
    name: '座位表',
    desc: '可视化编排座位，支持多套布局方案',
    icon: '💺',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-seat',
    tag: '新增',
    category: autoCategory('tool-seat'),
  },
  {
    name: '课堂加减分',
    desc: '个人加分扣分、小组竞赛积分，实时排行',
    icon: '🏅',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-score',
    tag: '新增',
    category: autoCategory('tool-score'),
  },
  {
    name: '通知模板',
    desc: '常用通知模板，一键复制快速发送',
    icon: '📋',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-notice-tpl',
    tag: '新增',
    category: autoCategory('tool-notice-tpl'),
  },
  {
    name: '文案模板库',
    desc: '收藏和管理常用文案模板，快速复用',
    icon: '📑',
    bg: 'bg-butter-100',
    text: 'text-butter-600',
    route: 'tool-plan-tpl',
    tag: '新增',
    category: autoCategory('tool-plan-tpl'),
  },
  {
    name: '教育论文',
    desc: '搜索论文参考，AI 辅助撰写教育教学论文',
    icon: '📝',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-paper',
    tag: '新增',
    category: autoCategory('tool-paper'),
  },
  {
    name: '轮值表',
    desc: '排布值日 / 值周安排，一目了然人人有责',
    icon: '📋',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'duty-roster',
    tag: '新增',
    category: autoCategory('duty-roster'),
  },
  {
    name: '班级职务',
    desc: '配置班干部、课代表、组长等职务并分配学生',
    icon: '🎖️',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-class-duty',
    tag: '新增',
    category: autoCategory('tool-class-duty'),
  },
  // ============ 语文工具 ============
  {
    name: '古诗词助手',
    desc: '按年级/主题检索古诗词，含译文、赏析、默写练习',
    icon: '📜',
    bg: 'bg-gradient-to-br from-rose-100 to-butter-100',
    text: 'text-rose-600',
    route: 'tool-poetry',
    tag: '语文',
    category: autoCategory('tool-poetry'),
  },
  {
    name: '汉字听写',
    desc: '自定义词库，浏览器语音播报，学生默写自检',
    icon: '🎧',
    bg: 'bg-gradient-to-br from-rose-100 to-sakura-100',
    text: 'text-rose-600',
    route: 'tool-dictation',
    tag: '语文',
    category: autoCategory('tool-dictation'),
  },
  {
    name: '阅读理解生成',
    desc: '按年级/文体 AI 生成阅读理解文章与试题',
    icon: '📚',
    bg: 'bg-gradient-to-br from-rose-100 to-mint-100',
    text: 'text-rose-600',
    route: 'tool-reading',
    tag: '语文',
    category: autoCategory('tool-reading'),
  },
  {
    name: '小作文助手',
    desc: 'AI 生成范文、智能批改学生作文',
    icon: '✍️',
    bg: 'bg-gradient-to-br from-rose-100 to-butter-100',
    text: 'text-rose-600',
    route: 'tool-essay',
    tag: '语文',
    category: autoCategory('tool-essay'),
  },
  {
    name: '成语词典',
    desc: '成语查询、出处造句、AI 成语接龙',
    icon: '🔤',
    bg: 'bg-gradient-to-br from-rose-100 to-sakura-100',
    text: 'text-rose-600',
    route: 'tool-idiom',
    tag: '语文',
    category: autoCategory('tool-idiom'),
  },
  {
    name: '拼音标注',
    desc: '汉字文本自动标注拼音，支持多种模式',
    icon: '🎵',
    bg: 'bg-gradient-to-br from-rose-100 to-mint-100',
    text: 'text-rose-600',
    route: 'tool-pinyin',
    tag: '语文',
    category: autoCategory('tool-pinyin'),
  },
  // ============ 英语工具 ============
  {
    name: '英语听力',
    desc: 'AI 生成听力材料与题目，浏览器 TTS 朗读',
    icon: '📻',
    bg: 'bg-gradient-to-br from-sky2-100 to-mint-100',
    text: 'text-sky2-500',
    route: 'tool-listening',
    tag: '英语',
    category: autoCategory('tool-listening'),
  },
  {
    name: '英语语法练习',
    desc: '时态、句型转换、单选填空等语法专项',
    icon: '🔤',
    bg: 'bg-gradient-to-br from-sky2-100 to-butter-100',
    text: 'text-sky2-500',
    route: 'tool-grammar',
    tag: '英语',
    category: autoCategory('tool-grammar'),
  },
  {
    name: '英语情景对话',
    desc: '购物/问路/就餐等情景对话生成与角色扮演',
    icon: '💬',
    bg: 'bg-gradient-to-br from-sky2-100 to-sakura-100',
    text: 'text-sky2-500',
    route: 'tool-scene-dialogue',
    tag: '英语',
    category: autoCategory('tool-scene-dialogue'),
  },
  {
    name: '单词拼写',
    desc: '听音拼写、看中拼英、看英写中三种模式',
    icon: '🔡',
    bg: 'bg-gradient-to-br from-sky2-100 to-mint-100',
    text: 'text-sky2-500',
    route: 'tool-spell',
    tag: '英语',
    category: autoCategory('tool-spell'),
  },
  {
    name: '口语练习',
    desc: 'AI 生成朗读文本，范读跟读录音对比',
    icon: '🎙️',
    bg: 'bg-gradient-to-br from-sky2-100 to-butter-100',
    text: 'text-sky2-500',
    route: 'tool-speaking',
    tag: '英语',
    category: autoCategory('tool-speaking'),
  },
  {
    name: '英语爽文',
    desc: 'AI 生成趣味英语故事，含生词表和翻译',
    icon: '📖',
    bg: 'bg-gradient-to-br from-sky2-100 to-sakura-100',
    text: 'text-sky2-500',
    route: 'tool-english-story',
    tag: '英语',
    category: autoCategory('tool-english-story'),
  },
  // ============ 其他工具 ============
  {
    name: '黑板报生成',
    desc: '按主题 AI 生成 3 套黑板报方案，模拟黑板展示',
    icon: '🟢',
    bg: 'bg-gradient-to-br from-cocoa-100 to-mint-100',
    text: 'text-cocoa-600',
    route: 'tool-blackboard',
    tag: '其他',
    category: autoCategory('tool-blackboard'),
  },
  {
    name: '随机决定器',
    desc: '转盘/抽签/掷骰子/抛硬币，课堂随机神器',
    icon: '🎲',
    bg: 'bg-gradient-to-br from-cocoa-100 to-sakura-100',
    text: 'text-cocoa-600',
    route: 'tool-dice',
    tag: '其他',
    category: autoCategory('tool-dice'),
  },
]

const editMode = ref(false)

const effectiveTools = computed<ToolItem[]>(() =>
  allTools.map((t) => ({
    ...t,
    category: toolboxStore.getCategory(t.route, autoCategory(t.route)),
  })),
)

const groupedTools = computed(() => {
  const map = new Map<ToolCategory, ToolItem[]>()
  for (const c of CATEGORY_ORDER) map.set(c, [])
  for (const t of effectiveTools.value) {
    const list = map.get(t.category) || []
    list.push(t)
    map.set(t.category, list)
  }
  return map
})

function setToolCategory(route: string, category: ToolCategory) {
  toolboxStore.setCategory(route, category)
}

function resetToolCategory(route: string) {
  toolboxStore.resetCategory(route)
}

function isOverridden(route: string) {
  return !!toolboxStore.overrides[route]
}
</script>

<template>
  <div class="space-y-5">
    <section
      class="card-soft p-6 bg-gradient-to-br from-butter-100 via-cream-50 to-mint-100 relative overflow-hidden"
    >
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">
        🧰
      </div>
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="title-display text-2xl">
            常用工具箱
          </h2>
          <p class="text-sm text-cocoa-500 mt-1 max-w-md">
            备课、上课、批改、评价，所有高频小工具都在这里 👇
          </p>
        </div>
        <button
          class="btn-ghost !px-3 text-xs"
          @click="editMode = !editMode"
        >
          <Settings :size="14" />
          {{ editMode ? '完成' : '管理分类' }}
        </button>
      </div>
    </section>

    <div class="space-y-6">
      <div
        v-for="category in CATEGORY_ORDER"
        :key="category"
      >
        <div class="flex items-center gap-2 mb-3">
          <span
            class="chip text-xs"
            :class="CATEGORY_BTN_CLASS[category]"
          >
            {{ CATEGORY_LABELS[category] }}
          </span>
          <span class="text-xs text-cocoa-400">
            {{ groupedTools.get(category)?.length || 0 }} 个
          </span>
        </div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="t in groupedTools.get(category)"
            :key="t.route"
            class="card-soft p-5 text-left hover:-translate-y-1 transition group relative cursor-pointer"
            role="button"
            tabindex="0"
            @click="!editMode && router.push({ name: t.route })"
            @keydown.enter="!editMode && router.push({ name: t.route })"
          >
            <div
              class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-softer group-hover:scale-110 transition-transform"
              :class="cardStyle(t).bg"
            >
              {{ t.icon }}
            </div>
            <div class="mt-3 flex items-center gap-2 flex-wrap">
              <h3 class="title-display text-lg">
                {{ t.name }}
              </h3>
              <span
                v-if="t.tag"
                class="chip text-[10px] !py-0.5"
                :class="t.tag === '热门' ? 'bg-sakura-100 text-sakura-500' : 'bg-mint-100 text-mint-500'"
              >
                {{ t.tag }}
              </span>
            </div>
            <p class="text-sm text-cocoa-500 mt-1.5 leading-relaxed">
              {{ t.desc }}
            </p>
            <div
              class="absolute right-4 top-4 chip"
              :class="cardStyle(t).bg + ' ' + cardStyle(t).text + ' text-[10px] opacity-0 group-hover:opacity-100 transition'"
            >
              立即使用 →
            </div>

            <!-- 分类编辑 -->
            <div
              v-if="editMode"
              class="mt-3 pt-3 border-t border-cocoa-100/50"
              @click.stop
            >
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="c in CATEGORY_ORDER"
                  :key="c"
                  class="text-[10px] px-2 py-1 rounded-lg transition"
                  :class="
                    t.category === c
                      ? CATEGORY_BTN_CLASS[c]
                      : 'bg-cocoa-50 text-cocoa-400 hover:bg-cocoa-100'
                  "
                  @click="setToolCategory(t.route, c)"
                >
                  {{ CATEGORY_LABELS[c] }}
                </button>
              </div>
              <button
                v-if="isOverridden(t.route)"
                class="text-[10px] text-cocoa-400 hover:text-cocoa-600 mt-2 flex items-center gap-0.5"
                @click="resetToolCategory(t.route)"
              >
                <X :size="10" /> 恢复自动分类
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
