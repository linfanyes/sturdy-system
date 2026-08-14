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
import { auth, theme, flushTabBarStyle } from '../../common/store'
import { getTeacherSubjects, isTeacherSubjectVisible } from '../../common/subject-schema'
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
    title: '我的工作台',
    items: [
      { label: '待办', icon: '✅', path: '/pages/community/todos' },
      { label: '笔记', icon: '📓', path: '/pages/community/notes' },
      { label: '课表', icon: '🗓️', path: '/pages/community/schedule' },
      { label: '公告', icon: '📢', path: '/pages/community/notice' },
      { label: '个人中心', icon: '👤', path: '/pages/community/profile' },
    ],
  },
  {
    title: 'AI 备课中心',
    items: [
      { label: 'AI 备课中心', icon: '🤖', path: '/pages/ai-center/index' },
      { label: 'AI 助手', icon: '💬', path: '/pages/ai/ai' },
      { label: '优质教案生成', icon: '📄', path: '/pages/ai/ai-lesson' },
      { label: '知识点生成', icon: '💡', path: '/pages/ai/ai-knowledge' },
      { label: '优选试卷生成', icon: '📃', path: '/pages/ai/ai-paper' },
      { label: '互动讲义', icon: '🎯', path: '/pages/ai/ai-interactive' },
      { label: '图像创造', icon: '🎨', path: '/pages/community/image-creation' },
      { label: '教案模板', icon: '📋', crud: 'lesson-plan-templates' },
      { label: '资源', icon: '📚', path: '/pages/community/resource' },
    ],
  },
  {
    title: '学科工具',
    items: [
      // 语文工具
      { label: '拼音标注', icon: '🔊', quicktool: 'pinyin', subject: '语文' },
      { label: '成语词典', icon: '🔤', quicktool: 'idiom', subject: '语文' },
      { label: '作文素材', icon: '✏️', quicktool: 'writingMaterials', subject: '语文' },
      { label: '古诗词', icon: '📜', quicktool: 'poetry', subject: '语文' },
      { label: '阅读理解', icon: '📖', quicktool: 'reading', subject: '语文' },
      { label: '汉字听写', icon: '🎯', quicktool: 'dictation', subject: '语文' },
      { label: '笔顺演示', icon: '✍️', path: '/pages/tools/strokeOrder', subject: '语文' },
      // 数学工具
      { label: '口算练习', icon: '🧮', path: '/pages/tools/math', subject: '数学' },
      { label: '竖式计算', icon: '📐', path: '/pages/tools/verticalCalc', subject: '数学' },
      { label: '乘法口诀', icon: '✖️', path: '/pages/tools/multiplicationTable', subject: '数学' },
      { label: '单位换算', icon: '📏', path: '/pages/tools/unitConversion', subject: '数学' },
      { label: '错题本', icon: '❌', path: '/pages/tools/mathMistakes', subject: '数学' },
      // 英语工具
      { label: '单词卡片', icon: '🃏', quicktool: 'wordCard', subject: '英语' },
      { label: '句型练习', icon: '💬', quicktool: 'sentencePractice', subject: '英语' },
      { label: '语法练习', icon: '📐', quicktool: 'grammar', subject: '英语' },
      { label: '英语听力', icon: '🎧', quicktool: 'listening', subject: '英语' },
      { label: '单词拼写', icon: '🔤', quicktool: 'spell', subject: '英语' },
      { label: '口语练习', icon: '🎤', quicktool: 'speaking', subject: '英语' },
      { label: '英语爽文', icon: '📚', quicktool: 'englishStory', subject: '英语' },
      { label: '情景对话', icon: '💬', quicktool: 'sceneDialogue', subject: '英语' },
    ],
  },
  {
    title: '办公工具',
    items: [
      { label: '翻译助手', icon: '🌐', quicktool: 'translate' },
      { label: '教育论文', icon: '📝', quicktool: 'paper' },
      { label: '黑板报', icon: '🎨', quicktool: 'blackboard' },
      { label: '演讲稿', icon: '🎤', quicktool: 'speech' },
      { label: '评语生成', icon: '💬', quicktool: 'comment' },
      { label: '期末总结', icon: '📋', quicktool: 'summary' },
      { label: '通知模板', icon: '✉️', crud: 'notice-templates' },
    ],
  },
  {
    title: '学情与考试',
    items: [
      { label: '考试管理', icon: '📊', path: '/pages/teaching/exams' },
      { label: '考试一键分析', icon: '📊', path: '/pages/ai/ai-exam' },
      { label: '成绩管理', icon: '📈', path: '/pages/teaching/grades' },
      { label: '成绩雷达图', icon: '📡', path: '/pages/teaching/radar' },
      { label: '数据统计', icon: '📉', path: '/pages/teaching/analysis' },
      { label: '数据看板', icon: '📊', path: '/pages/teaching/data-dashboard' },
      { label: '试卷查询', icon: '🔍', crud: 'generated/queries' },
      { label: '作业', icon: '📝', path: '/pages/community/homework' },
      { label: '考勤', icon: '✅', path: '/pages/community/attendance' },
    ],
  },
  {
    title: '课堂互动',
    items: [
      { label: '随机点名', icon: '🎯', path: '/pages/tools/picker' },
      { label: '随机分组', icon: '🎲', path: '/pages/community/grouper' },
      { label: '随机决定器', icon: '🎲', path: '/pages/tools/decider' },
      { label: '倒计时', icon: '⏱️', path: '/pages/tools/timer' },
      { label: '课堂计算器', icon: '🧮', path: '/pages/tools/calc' },
      { label: '座位表', icon: '💺', path: '/pages/teaching/seatMap' },
      { label: '计分板', icon: '🎯', path: '/pages/tools/scorePanel' },
      { label: '抽签历史', icon: '🎰', path: '/pages/community/picker-history' },
      { label: '小游戏合集', icon: '🎮', path: '/pages/games/index' },
      { label: '笑口常开', icon: '🌸', path: '/pages/tools/flower' },
    ],
  },
  {
    title: '学生评价与积分',
    items: [
      { label: '成长记录', icon: '🌱', path: '/pages/community/growth' },
      { label: '行为记录', icon: '⭐', path: '/pages/community/behavior-record' },
      { label: '获奖记录', icon: '🏆', path: '/pages/community/award-record' },
      { label: '奖项类别', icon: '🎖️', crud: 'award-categories' },
      { label: '课外阅读', icon: '📖', path: '/pages/teaching/reading-log' },
      { label: '学生打卡', icon: '✅', path: '/pages/teaching/checkin' },
      { label: '评语生成', icon: '✍️', quicktool: 'comment' },
      { label: '期末总结', icon: '📑', quicktool: 'summary' },
      { label: '加减分', icon: '➕', crud: 'reward-records' },
      { label: '积分记录', icon: '💯', crud: 'score-records' },
      { label: '积分排行榜', icon: '🏆', path: '/pages/teaching/leaderboard' },
      { label: '小组评分', icon: '👥', crud: 'group-scores' },
      { label: '奖励兑换', icon: '🎁', path: '/pages/tools/reward/reward' },
    ],
  },
  {
    title: '班级管理',
    items: [
      { label: '班级成员', icon: '👥', tab: '/pages/classes/classes' },
      { label: '信息审核', icon: '📝', path: '/pages/community/student-info-review' },
      { label: '轮值表', icon: '📋', path: '/pages/community/duty-roster' },
      { label: '值日配置', icon: '🧹', crud: 'class-duty-configs' },
      { label: '班费', icon: '💰', path: '/pages/community/class-finance' },
      { label: '班级活动', icon: '🎉', path: '/pages/community/class-activities' },
      { label: '班级风采', icon: '🖼️', path: '/pages/community/gallery' },
      { label: '我的相册', icon: '📷', path: '/pages/community/my-gallery' },
    ],
  },
  {
    title: '家校沟通',
    items: [
      { label: '家长联系', icon: '📞', path: '/pages/community/parent-contact' },
      { label: '家校沟通', icon: '💬', path: '/pages/community/im' },
      { label: '通知模板', icon: '✉️', crud: 'notice-templates' },
    ],
  },
  {
    title: '学科工具',
    items: [
      { label: '语文', icon: '📜', subjectEntry: '语文' },
      { label: '数学', icon: '🔢', subjectEntry: '数学' },
      { label: '英语', icon: '🔤', subjectEntry: '英语' },
      { label: '科学', icon: '🔬', subjectEntry: '科学' },
      { label: '道德与法治', icon: '⚖️', subjectEntry: '道德与法治' },
    ],
  },
  {
    title: '教师办公',
    items: [
      { label: '工作日志', icon: '🗒️', path: '/pages/community/work-log' },
      { label: '听课记录', icon: '👀', path: '/pages/community/lesson-observation' },
      { label: '教学日历', icon: '📅', path: '/pages/teaching/teaching-calendar' },
      { label: '教师通讯录', icon: '👨‍🏫', path: '/pages/community/teacher' },
      { label: '翻译', icon: '🌐', quicktool: 'translate' },
      { label: '教育论文', icon: '📝', quicktool: 'paper' },
      { label: '黑板报', icon: '🟢', quicktool: 'blackboard' },
      { label: '演讲稿', icon: '🎤', quicktool: 'speech' },
      { label: '文案模板库', icon: '📚', path: '/pages/tools/planTemplates' },
    ],
  },
])

// 功能键 → 工具箱分区 & 具体工具的映射（管理员配置激活时生效）
const secItemsFeatureMap = {
  exams: new Set(['学情与考试']),
  grades: new Set(['学情与考试']),
  analysis: new Set(['学情与考试']),
  attendance: new Set(['学情与考试']),
  homework: new Set(['学情与考试']),
  schedule: new Set(['我的工作台']),
  todos: new Set(['我的工作台']),
  notes: new Set(['我的工作台']),
  notices: new Set(['我的工作台', '家校沟通']),
  ai: new Set(['AI 备课', '学科工具', '教师办公']),
  tools: new Set(['课堂互动', '学科工具']),
  seats: new Set(['课堂互动']),
  games: new Set(['课堂互动']),
  finance: new Set(['班级管理']),
  activities: new Set(['班级管理']),
  duty: new Set(['班级管理']),
  gallery: new Set(['班级管理']),
  rewards: new Set(['学生评价与积分']),
  growth: new Set(['学生评价与积分']),
  behavior: new Set(['学生评价与积分']),
  reading: new Set(['学生评价与积分']),
  checkin: new Set(['学生评价与积分']),
  parents: new Set(['家校沟通']),
  im: new Set(['家校沟通']),
  worklog: new Set(['教师办公']),
  observation: new Set(['教师办公']),
  calendar: new Set(['教师办公']),
  teachers: new Set(['教师办公']),
}
const itemFeatureMap = {
  exams: new Set(['考试管理']),
  grades: new Set(['成绩管理', '成绩雷达图', '数据统计', '数据看板']),
  analysis: new Set(['考试一键分析', '试卷查询']),
  attendance: new Set(['考勤']),
  schedule: new Set(['课表']),
  homework: new Set(['作业']),
  todos: new Set(['待办']),
  notes: new Set(['笔记']),
  notices: new Set(['公告', '通知模板']),
  // 学科工具分区下的5个学科入口都归入 ai/tools 功能键（语文/英语用 AI 生成，数学用独立工具）
  ai: new Set(['AI 助手', '优质教案生成', '知识点生成', '优选试卷生成', '互动讲义', '图像创造', '教案模板', '资源', '评语生成', '期末总结', '翻译', '教育论文', '黑板报', '文案模板库', '语文', '英语', '科学', '道德与法治']),
  tools: new Set(['随机点名', '倒计时', '课堂计算器', '随机决定器', '随机分组', '计分板', '数学']),
  seats: new Set(['座位表', '抽签历史']),
  games: new Set(['小游戏合集', '笑口常开']),
  finance: new Set(['班费']),
  activities: new Set(['班级活动', '班级成员']),
  duty: new Set(['轮值表', '值日配置']),
  gallery: new Set(['班级风采', '我的相册']),
  rewards: new Set(['获奖记录', '奖项类别', '加减分', '积分记录', '积分排行榜', '小组评分', '奖励兑换']),
  growth: new Set(['成长记录']),
  behavior: new Set(['行为记录']),
  reading: new Set(['课外阅读']),
  checkin: new Set(['学生打卡']),
  parents: new Set(['家长联系']),
  im: new Set(['家校沟通']),
  worklog: new Set(['工作日志']),
  observation: new Set(['听课记录']),
  calendar: new Set(['教学日历']),
  teachers: new Set(['教师通讯录', '演讲稿']),
}

const viewSections = computed(() => {
  let secs = sections.value
  if (order.value && order.value.length) {
    secs = [...secs].sort((a, b) => order.value.indexOf(a.title) - order.value.indexOf(b.title))
  }
  // 教师任教学科（P1：支持多学科，subjects 优先，回退 subject，都空=全部学科）
  // 学科过滤始终生效（与 Web 端 Toolbox 对齐），不受功能包开关影响
  const teacherSubjects = getTeacherSubjects(auth.user?.subject, auth.user?.subjects)
  const bySubject = (it) => {
    // 带 subject 的工具仅本学科可见；subjectEntry 学科入口同样按任教学科过滤
    if (it.subject && !isTeacherSubjectVisible(it.subject, teacherSubjects)) return false
    if (it.subjectEntry && !isTeacherSubjectVisible(it.subjectEntry, teacherSubjects)) return false
    return true
  }
  // 功能过滤：优先用后端下发的 effectiveFeatures（= 学校级 ∩ 教师级实际可用），
  // 未加载时回退旧的 auth.features（向后兼容）。本地仅做 UX 显隐，安全边界在后端 @Feature。
  const ftrs = (auth.effectiveFeatures && auth.effectiveFeatures.length)
    ? auth.effectiveFeatures
    : auth.features
  if (ftrs && ftrs.length) {
    secs = secs.filter((sec) => {
      // 我的工作台+教师办公始终可见
      if (sec.title === '我的工作台' || sec.title === '教师办公') return true
      return ftrs.some((f) => secItemsFeatureMap[f] && secItemsFeatureMap[f].has(sec.title))
    }).map((sec) => {
      // 过滤分区内的具体工具
      const filteredItems = sec.items.filter((it) => {
        const label = it.label
        // 学科工具按教师任教学科过滤（带 subject / subjectEntry 的工具）
        if (!bySubject(it)) return false
        // quicktool 工具不占用功能分区，始终保留（子页面单独处理权限）
        if (it.quicktool) return true
        // subjectEntry 学科入口按学科名走 feature 过滤
        // （语文/英语/科学/道德归 ai，数学归 tools）
        for (const f of ftrs) {
          if (itemFeatureMap[f] && itemFeatureMap[f].has(label)) return true
        }
        // 未分类的新工具默认显示
        return true
      })
      return { ...sec, items: filteredItems }
    })
  } else {
    // 无功能包开关：仅按任教学科过滤，其余工具全部可见
    secs = secs.map((sec) => ({ ...sec, items: sec.items.filter(bySubject) }))
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
  else if (t.subjectEntry) uni.navigateTo({ url: '/pages/quick/subject-list?subject=' + encodeURIComponent(t.subjectEntry) })
  else if (t.subject) uni.navigateTo({ url: '/pages/quick/subject?type=' + encodeURIComponent(t.subject) })
  else if (t.quicktool) uni.navigateTo({ url: '/pages/quick/quicktool?type=' + encodeURIComponent(t.quicktool) })
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
  if (!auth.token) { uni.reLaunch({ url: '/pages/login/login' }); return }
  flushTabBarStyle()
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
