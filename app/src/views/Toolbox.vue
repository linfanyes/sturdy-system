<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const tools = [
  {
    name: 'AI 对话',
    desc: '向 AI 老师提问，让它帮你分析学生、设计教案',
    icon: '🤖',
    bg: 'bg-gradient-to-br from-butter-100 to-sakura-100',
    text: 'text-cocoa-700',
    route: 'tool-ai',
    tag: '热门',
  },
  {
    name: '翻译',
    desc: '中英日韩等多语种互译，适合英语教研 / 班级公告',
    icon: '🌐',
    bg: 'bg-gradient-to-br from-mint-100 to-sky2-100',
    text: 'text-cocoa-700',
    route: 'tool-translate',
    tag: '新增',
  },
  {
    name: '随机点名',
    desc: '摇一摇，公平又刺激的课堂互动',
    icon: '🎯',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-picker',
  },
  {
    name: '倒计时',
    desc: '小组讨论 / 课堂练习的得力助手',
    icon: '⏱️',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-timer',
  },
  {
    name: '笑口常开',
    desc: '点 8 下让花朵从花骨朵到盛开, 给心情放个假',
    icon: '🌸',
    bg: 'bg-gradient-to-br from-sakura-200 to-butter-200',
    text: 'text-sakura-500',
    route: 'tool-flower',
    tag: '新增',
  },
  {
    name: '课堂计算器',
    desc: '大屏显示，醒目又方便',
    icon: '🧮',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-calc',
  },
  {
    name: '评语生成',
    desc: '根据特点一键生成期末评语',
    icon: '✍️',
    bg: 'bg-butter-100',
    text: 'text-butter-600',
    route: 'tool-comment',
  },
  {
    name: '优选试卷',
    desc: '按年级学科题型，AI 出一套完整试卷',
    icon: '📝',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-test-paper',
    tag: '新增',
  },
  {
    name: '优质教案',
    desc: '多篇候选教案，勾选后整合为新教案',
    icon: '📚',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-lesson-plan',
    tag: '新增',
  },
  {
    name: '口算生成',
    desc: '加减乘除，按难度自动出题',
    icon: '➕',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-math',
  },
  {
    name: '课表排版',
    desc: '可视化排课，导出打印样样行',
    icon: '🗓️',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-schedule',
  },
  {
    name: '取色器',
    desc: '一眼看出颜色的色值',
    icon: '🎨',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-color',
  },
  {
    name: '奖惩记录',
    desc: '表扬加分、批评减分，记录成长',
    icon: '🏅',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-reward',
  },
  {
    name: '获奖记录',
    desc: '记录每一份荣誉，AI识别奖状自动填写',
    icon: '🏆',
    bg: 'bg-gradient-to-br from-butter-100 to-sakura-100',
    text: 'text-cocoa-700',
    route: 'tool-award',
    tag: '新增',
  },
  {
    name: '小游戏合集',
    desc: '12款经典小游戏，课间放松摸鱼必备',
    icon: '🎮',
    bg: 'bg-gradient-to-br from-sakura-100 to-mint-100',
    text: 'text-cocoa-700',
    route: 'games',
    tag: '12合1',
  },
  {
    name: '我的课表',
    desc: '一周课程一目了然',
    icon: '📅',
    bg: 'bg-cream-200',
    text: 'text-cocoa-700',
    route: 'schedule',
  },
  {
    name: '座位表',
    desc: '可视化编排座位，支持多套布局方案',
    icon: '💺',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-seat',
    tag: '新增',
  },
  {
    name: '课堂加减分',
    desc: '个人加分扣分、小组竞赛积分，实时排行',
    icon: '🏅',
    bg: 'bg-sakura-100',
    text: 'text-sakura-500',
    route: 'tool-score',
    tag: '新增',
  },
  {
    name: '通知模板',
    desc: '常用通知模板，一键复制快速发送',
    icon: '📋',
    bg: 'bg-mint-100',
    text: 'text-mint-500',
    route: 'tool-notice-tpl',
    tag: '新增',
  },
  {
    name: '文案模板库',
    desc: '收藏和管理常用文案模板，快速复用',
    icon: '📑',
    bg: 'bg-butter-100',
    text: 'text-butter-600',
    route: 'tool-plan-tpl',
    tag: '新增',
  },
  {
    name: '教育论文',
    desc: '搜索论文参考，AI 辅助撰写教育教学论文',
    icon: '📝',
    bg: 'bg-sky2-100',
    text: 'text-sky2-500',
    route: 'tool-paper',
    tag: '新增',
  },
]
</script>

<template>
  <div class="space-y-5">
    <section
      class="card-soft p-6 bg-gradient-to-br from-butter-100 via-cream-50 to-mint-100 relative overflow-hidden"
    >
      <div class="absolute -top-10 right-6 text-7xl opacity-20 select-none">
        🧰
      </div>
      <h2 class="title-display text-2xl">
        常用工具箱
      </h2>
      <p class="text-sm text-cocoa-500 mt-1 max-w-md">
        备课、上课、批改、评价，所有高频小工具都在这里 👇
      </p>
    </section>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <button
        v-for="t in tools"
        :key="t.name"
        class="card-soft p-5 text-left hover:-translate-y-1 transition group relative"
        @click="router.push({ name: t.route })"
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
      </button>
    </div>
  </div>
</template>
