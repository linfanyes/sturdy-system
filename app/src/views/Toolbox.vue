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
  game: '游戏',
  other: '其他',
}

const CATEGORY_ORDER: ToolCategory[] = ['dialogue', 'text', 'game', 'other']

const CATEGORY_BTN_CLASS: Record<ToolCategory, string> = {
  dialogue: 'bg-butter-100 text-butter-600',
  text: 'bg-mint-100 text-mint-600',
  game: 'bg-sakura-100 text-sakura-600',
  other: 'bg-sky2-100 text-sky2-600',
}

/** 根据路由自动判断默认分类：新增工具只要符合规则即可自动归类 */
function autoCategory(route: string): ToolCategory {
  if (route === 'tool-ai') return 'dialogue'
  if (route === 'games' || route.startsWith('game-') || route === 'tool-flower') return 'game'
  if (
    [
      'tool-translate',
      'tool-comment',
      'tool-notice-tpl',
      'tool-plan-tpl',
      'tool-paper',
      'tool-knowledge',
      'tool-lesson-plan',
    ].includes(route)
  )
    return 'text'
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
    desc: '12款经典小游戏，课间放松摸鱼必备',
    icon: '🎮',
    bg: 'bg-gradient-to-br from-sakura-100 to-mint-100',
    text: 'text-cocoa-700',
    route: 'games',
    tag: '12合1',
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
              :class="t.bg"
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
              :class="t.bg + ' ' + t.text + ' text-[10px] opacity-0 group-hover:opacity-100 transition'"
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
