<template>
  <view class="page" :class="{ dark }">
    <view class="topbar">
      <text class="mtitle">常用工具箱</text>
      <text class="mbtn" @click="manageMode = !manageMode">{{ manageMode ? '完成' : '管理' }}</text>
    </view>
    <view v-if="manageMode" class="hint">点击工具可隐藏/显示；点击分区 ↑↓ 调整顺序，改动自动保存</view>

    <view v-for="sec in viewSections" :key="sec.title" class="section">
      <view class="sec-head">
        <view class="sec-title">{{ sec.title }}</view>
        <view v-if="manageMode" class="sec-move">
          <text class="mv" @click="moveSection(-1, sec.title)">↑</text>
          <text class="mv" @click="moveSection(1, sec.title)">↓</text>
        </view>
      </view>
      <view class="grid">
        <view
          v-for="t in sec.items"
          :key="t.label"
          class="cell"
          :class="manageMode && hidden.has(t.label) && 'hidden'"
          @click="manageMode ? toggleHide(t) : go(t)"
        >
          <view v-if="manageMode" class="badge">{{ hidden.has(t.label) ? '已隐藏' : '显示' }}</view>
          <view class="ic">{{ t.icon }}</view>
          <view class="lb">{{ t.label }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { auth, theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const HIDDEN_KEY = 'tb_hidden'
const ORDER_KEY = 'tb_order'

const manageMode = ref(false)
const hidden = ref(new Set(loadHidden()))
const order = ref(loadOrder())

function loadHidden() {
  try {
    return JSON.parse(uni.getStorageSync(HIDDEN_KEY) || '[]')
  } catch (e) {
    return []
  }
}
function loadOrder() {
  try {
    const v = JSON.parse(uni.getStorageSync(ORDER_KEY) || 'null')
    return Array.isArray(v) ? v : null
  } catch (e) {
    return null
  }
}
function persist() {
  uni.setStorageSync(HIDDEN_KEY, JSON.stringify([...hidden.value]))
  if (order.value) uni.setStorageSync(ORDER_KEY, JSON.stringify(order.value))
}

const sections = ref([
  {
    title: '常用',
    items: [
      { label: '工作台', icon: '🏠', tab: '/pages/dashboard/dashboard' },
      { label: '班级管理', icon: '🏫', tab: '/pages/classes/classes' },
      { label: '学生管理', icon: '👧', tab: '/pages/students/students' },
      { label: '数据统计', icon: '📊', path: '/pages/analysis/analysis' },
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
      { label: '教案', icon: '📄', path: '/pages/ai-lesson/ai-lesson' },
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
      { label: '优质教案生成', icon: '📄', path: '/pages/ai-lesson/ai-lesson' },
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
      { label: '笔顺演示', icon: '✏️', path: '/pages/tools/stroke/stroke' },
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
      { label: '计分板', icon: '🎯', path: '/pages/tools/score-panel/score-panel' },
      { label: '奖励兑换', icon: '🎁', path: '/pages/tools/reward/reward' },
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
])

const viewSections = computed(() => {
  let secs = sections.value
  if (order.value && order.value.length) {
    secs = [...secs].sort((a, b) => order.value.indexOf(a.title) - order.value.indexOf(b.title))
  }
  return secs
    .map((sec) => {
      let items = sec.items
      if (!manageMode.value) items = items.filter((it) => !hidden.value.has(it.label))
      return { ...sec, items }
    })
    .filter((sec) => manageMode.value || sec.items.length)
})

function go(t) {
  if (t.tab) uni.switchTab({ url: t.tab })
  else if (t.crud) uni.navigateTo({ url: '/pages/crud/crud?type=' + encodeURIComponent(t.crud) })
  else if (t.subject) uni.navigateTo({ url: '/pages/subject/subject?type=' + encodeURIComponent(t.subject) })
  else if (t.quicktool) uni.navigateTo({ url: '/pages/quicktool/quicktool?type=' + encodeURIComponent(t.quicktool) })
  else uni.navigateTo({ url: t.path })
}

function toggleHide(t) {
  const ns = new Set(hidden.value)
  if (ns.has(t.label)) ns.delete(t.label)
  else ns.add(t.label)
  hidden.value = ns
  persist()
}
function moveSection(dir, title) {
  if (!order.value) order.value = sections.value.map((s) => s.title)
  const arr = order.value
  const i = arr.indexOf(title)
  const j = i + dir
  if (j < 0 || j >= arr.length) return
  const tmp = arr[i]
  arr[i] = arr[j]
  arr[j] = tmp
  order.value = [...arr]
  persist()
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { padding: 30rpx; }
.topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.mtitle { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.mbtn { font-size: 26rpx; color: #fff; background: var(--c-accent); padding: 10rpx 28rpx; border-radius: 30rpx; }
.hint { font-size: 22rpx; color: var(--c-sub); background: var(--c-card2); border-radius: 12rpx; padding: 14rpx 18rpx; margin-bottom: 18rpx; line-height: 1.5; }
.section { margin-bottom: 30rpx; }
.sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.sec-title { font-size: 28rpx; font-weight: 700; color: var(--c-accent); }
.sec-move { display: flex; gap: 16rpx; }
.mv { font-size: 30rpx; color: var(--c-title); background: var(--c-card2); border-radius: 12rpx; padding: 4rpx 20rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.cell { position: relative; background: var(--c-card); border-radius: 20rpx; padding: 30rpx 10rpx; display: flex; flex-direction: column; align-items: center; }
.cell.hidden { opacity: 0.45; }
.badge { position: absolute; top: 8rpx; right: 8rpx; font-size: 18rpx; color: #fff; background: #9aa0a6; padding: 2rpx 10rpx; border-radius: 16rpx; }
.cell.hidden .badge { background: #e06c75; }
.ic { font-size: 56rpx; }
.lb { margin-top: 10rpx; color: var(--c-title); font-size: 24rpx; }
.dark .mtitle { color: var(--c-title); }
.dark .cell { background: var(--c-card); }
.dark .mv { background: var(--c-card2); }
</style>
