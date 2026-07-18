<template>
  <view class="page" :class="{ dark }">
    <view v-for="sec in sections" :key="sec.title" class="section">
      <view class="sec-title">{{ sec.title }}</view>
      <view class="grid">
        <view v-for="t in sec.items" :key="t.label" class="cell" @click="go(t)">
          <view class="ic">{{ t.icon }}</view>
          <view class="lb">{{ t.label }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { auth, theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const sections = [
  {
    title: '常用',
    items: [
      { label: '工作台', icon: '🏠', tab: '/pages/dashboard/dashboard' },
      { label: '班级管理', icon: '🏫', tab: '/pages/classes/classes' },
      { label: '学生管理', icon: '👧', tab: '/pages/students/students' },
      { label: 'AI 助手', icon: '🤖', path: '/pages/ai/ai' },
      { label: '座位表', icon: '💺', path: '/pages/seats/seats' },
      { label: '随机分组', icon: '🎲', path: '/pages/group/group' },
    ],
  },
  {
    title: '教学备课',
    items: [
      { label: '考试管理', icon: '📊', path: '/pages/exams/exams' },
      { label: '成绩管理', icon: '📈', path: '/pages/grades/grades' },
      { label: '课表', icon: '🗓️', path: '/pages/schedule/schedule' },
      { label: '考勤', icon: '✅', path: '/pages/attendance/attendance' },
      { label: '作业', icon: '📝', path: '/pages/homework/homework' },
      { label: '公告', icon: '📢', path: '/pages/notice/notice' },
      { label: '资源', icon: '📚', path: '/pages/resource/resource' },
      { label: '教案', icon: '📄', crud: 'generated/lesson-plans' },
      { label: '教案模板', icon: '📋', crud: 'lesson-plan-templates' },
      { label: '知识点', icon: '💡', crud: 'generated/knowledges' },
      { label: '优选试卷', icon: '📃', crud: 'generated/papers' },
      { label: '试卷查询', icon: '🔍', crud: 'generated/queries' },
      { label: '听课记录', icon: '👀', path: '/pages/lesson-observation/lesson-observation' },
    ],
  },
  {
    title: 'AI 智能生成',
    items: [
      { label: '知识点生成', icon: '💡', path: '/pages/ai-knowledge/ai-knowledge' },
      { label: '优选试卷生成', icon: '📃', path: '/pages/ai-paper/ai-paper' },
      { label: '考试一键分析', icon: '📊', path: '/pages/ai-exam/ai-exam' },
    ],
  },
  {
    title: '语文专项',
    items: [
      { label: '古诗词助手', icon: '📜', subject: 'poetry' },
      { label: '汉字听写', icon: '🎧', subject: 'dictation' },
      { label: '阅读理解生成', icon: '📖', subject: 'reading' },
      { label: '小作文助手', icon: '✍️', subject: 'essay' },
      { label: '成语词典', icon: '🔤', subject: 'idiom' },
      { label: '拼音标注', icon: '🎵', subject: 'pinyin' },
      { label: '作文素材', icon: '📚', subject: 'writing-materials' },
    ],
  },
  {
    title: '数学专项',
    items: [
      { label: '口算生成', icon: '➕', path: '/pages/tools/math' },
      { label: '竖式计算', icon: '📐', path: '/pages/tools/vcalc' },
      { label: '口算答题卡', icon: '📋', path: '/pages/tools/anscard' },
      { label: '乘法口诀', icon: '🔢', path: '/pages/tools/multitable' },
      { label: '单位换算', icon: '⚖️', path: '/pages/tools/unit' },
      { label: '错题本', icon: '📕', path: '/pages/tools/mistakes' },
    ],
  },
  {
    title: '英语专项',
    items: [
      { label: '单词卡片', icon: '🃏', subject: 'word-card' },
      { label: '句型练习', icon: '✨', subject: 'sentence-practice' },
      { label: '英语听力', icon: '📻', subject: 'listening' },
      { label: '语法练习', icon: '🔡', subject: 'grammar' },
      { label: '情景对话', icon: '💬', subject: 'scene-dialogue' },
      { label: '单词拼写', icon: '⌨️', subject: 'spell' },
      { label: '口语练习', icon: '🎙️', subject: 'speaking' },
      { label: '英语爽文', icon: '📕', subject: 'english-story' },
    ],
  },
  {
    title: '文字办公',
    items: [
      { label: '翻译', icon: '🌐', quicktool: 'translate' },
      { label: '评语生成', icon: '✍️', quicktool: 'comment' },
      { label: '期末总结', icon: '📑', quicktool: 'summary' },
      { label: '演讲稿', icon: '🎤', quicktool: 'speech' },
      { label: '教育论文', icon: '📝', quicktool: 'paper' },
      { label: '黑板报', icon: '🟢', quicktool: 'blackboard' },
      { label: '文案模板库', icon: '📚', path: '/pages/tools/templates' },
    ],
  },
  {
    title: '小游戏合集',
    items: [
      { label: '小游戏合集', icon: '🎮', path: '/pages/games/index' },
      { label: '笑口常开', icon: '🌸', path: '/pages/tools/flower' },
    ],
  },
  {
    title: '课堂神器',
    items: [
      { label: '随机点名', icon: '🎯', path: '/pages/tools/picker' },
      { label: '倒计时', icon: '⏱️', path: '/pages/tools/timer' },
      { label: '课堂计算器', icon: '🧮', path: '/pages/tools/calc' },
      { label: '口算生成', icon: '➕', path: '/pages/tools/math' },
      { label: '随机决定器', icon: '🎲', path: '/pages/tools/decider' },
    ],
  },
  {
    title: '班级事务',
    items: [
      { label: '轮值表', icon: '📋', path: '/pages/duty-roster/duty-roster' },
      { label: '值日配置', icon: '🧹', crud: 'class-duty-configs' },
      { label: '班费', icon: '💰', path: '/pages/class-finance/class-finance' },
      { label: '班级活动', icon: '🎉', path: '/pages/class-activity/class-activity' },
      { label: '班级风采', icon: '🖼️', path: '/pages/gallery/gallery' },
      { label: '待办', icon: '✅', path: '/pages/todos/todos' },
      { label: '笔记', icon: '📓', path: '/pages/notes/notes' },
      { label: '抽签历史', icon: '🎰', path: '/pages/picker-history/picker-history' },
      { label: '个人中心', icon: '👤', path: '/pages/profile/profile' },
    ],
  },
  {
    title: '学生发展',
    items: [
      { label: '成长记录', icon: '🌱', path: '/pages/growth/growth' },
      { label: '行为记录', icon: '⭐', path: '/pages/behavior-record/behavior-record' },
      { label: '获奖记录', icon: '🏆', path: '/pages/award-record/award-record' },
      { label: '奖项类别', icon: '🎖️', crud: 'award-categories' },
      { label: '加减分', icon: '➕', crud: 'reward-records' },
      { label: '积分记录', icon: '💯', crud: 'score-records' },
      { label: '小组评分', icon: '👥', crud: 'group-scores' },
      { label: '家长联系', icon: '📞', path: '/pages/parent-contact/parent-contact' },
      { label: '通知模板', icon: '✉️', crud: 'notice-templates' },
    ],
  },
  {
    title: '教师行政',
    items: [
      { label: '教师通讯录', icon: '👨‍🏫', path: '/pages/teacher/teacher' },
      { label: '工作日志', icon: '🗒️', path: '/pages/work-log/work-log' },
    ],
  },
]

function go(t) {
  if (t.tab) uni.switchTab({ url: t.tab })
  else if (t.crud) uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent(t.crud) })
  else if (t.subject) uni.navigateTo({ url: '/pages/subject/subject?type=' + encodeURIComponent(t.subject) })
  else if (t.quicktool) uni.navigateTo({ url: '/pages/quicktool/quicktool?type=' + encodeURIComponent(t.quicktool) })
  else uni.navigateTo({ url: t.path })
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { padding: 30rpx; }
.section { margin-bottom: 30rpx; }
.sec-title { font-size: 28rpx; font-weight: 700; color: var(--c-accent); margin-bottom: 16rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.cell { background: var(--c-card); border-radius: 20rpx; padding: 30rpx 10rpx; display: flex; flex-direction: column; align-items: center; }
.ic { font-size: 56rpx; }
.lb { margin-top: 10rpx; color: var(--c-title); font-size: 24rpx; }
</style>
