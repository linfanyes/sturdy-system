<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="t">🏡 家长中心</view>
      <view class="out" @click="bindPhone">📱 绑定手机</view>
      <view class="out" @click="logout">退出</view>
    </view>

    <view class="kids" v-if="kids.length">
      <view class="kid" v-for="k in kids" :key="k.studentId">
        <view class="kn">{{ k.studentName }}<text v-if="k.studentNo" class="sno"> · {{ k.studentNo }}</text></view>
        <view class="kc">{{ k.parentName ? k.parentName + ' · ' : '' }}{{ k.className || '班级 ' + k.classId }}<text v-if="k.nickName" class="wechat-badge">已微信绑 {{ k.nickName }}</text></view>
      </view>
    </view>

    <view class="sec" v-if="notices.length">
      <view class="st">📢 班级通知</view>
      <view class="nitem" v-for="n in notices" :key="n.id">
        <view class="nt">{{ n.title }}<text v-if="n.pinned" class="npin">置顶</text></view>
        <view class="nc">{{ n.content }}</view>
      </view>
    </view>

    <view class="sec" v-if="exams.length">
      <view class="st">📊 考试成绩</view>

      <view class="exam-selector">
        <picker :value="selectedExamIndex" :range="examOptions" @change="onExamChange">
          <view class="picker">{{ examOptions[selectedExamIndex] || '— 请选择考试 —' }}</view>
        </picker>
      </view>

      <view v-if="selectedExam" class="exam-detail">
        <view class="exam-header">
          <text class="exam-name">{{ selectedExam.examName }}</text>
          <text class="exam-date">{{ selectedExam.date }}</text>
        </view>

        <view class="exam-total">
          总分
          <text class="tv">{{ selectedExam.totalScore ?? '--' }}</text>
          /
          <text class="tv">{{ selectedExam.totalFullScore ?? '--' }}</text>
          分
          <text v-if="selectedExam.classRank != null" class="tr">（班级第 {{ selectedExam.classRank }} 名</text>
          <text v-if="selectedExam.gradeRank != null"> / 年级第 {{ selectedExam.gradeRank }} 名）</text>
        </view>

        <view v-if="strengths.length || weaknesses.length" class="sw-section">
          <view v-if="strengths.length" class="sw-row">
            <text class="sw-label sw-strong">优势学科</text>
            <text class="sw-list">{{ strengths.join('、') }}</text>
          </view>
          <view v-if="weaknesses.length" class="sw-row">
            <text class="sw-label sw-weak">薄弱学科</text>
            <text class="sw-list">{{ weaknesses.join('、') }}</text>
          </view>
        </view>

        <view class="subject-list">
          <view v-for="s in selectedExam.subjects || []" :key="s.subject" class="srow">
            <text class="ssubject">{{ s.subject }}</text>
            <text class="sscore">{{ s.score != null ? s.score + ' / ' + s.fullScore : '暂未录入' }}</text>
            <text class="srank">班级第{{ s.classRank ?? '--' }}名</text>
          </view>
        </view>

        <view v-if="histogram.length" class="chart-section">
          <view class="chart-title">总分分布（{{ histogram.length > 1 ? histogram[0].label + ' ~ ' + histogram[histogram.length - 1].label : '' }}）</view>
          <scroll-view scroll-x class="chart-scroll">
            <view class="chart">
              <view v-for="seg in histogram" :key="seg.label" class="bar-col">
                <view class="bar" :style="{ height: seg.pct + '%' }" :class="seg.isStudent && 'highlight'"></view>
                <text class="bar-label">{{ seg.label }}</text>
                <text class="bar-count">{{ seg.count }}人</text>
              </view>
            </view>
          </scroll-view>
        </view>
        <view class="exam-analysis">
          <text class="ea-label">📝 本次考试分析：</text>
          <text class="ea-text">{{ selectedExam.analysisNote || '继续加油努力！' }}</text>
        </view>
      </view>
    </view>

    <view class="sec" v-if="homework.length">
      <view class="st">📝 班级作业</view>
      <view class="nitem" v-for="h in homework" :key="h.id">
        <view class="nt">{{ h.subject }} · {{ h.title }}
          <text class="ndate">{{ h.deadline || h.startDate }}</text>
          <text class="hwstatus">{{ h.status }}</text>
        </view>
        <view class="nc">{{ h.content }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { onShow, onReady } from '@dcloudio/uni-app'
import { theme, parent, logoutParent } from '../../common/store'
import { parentApi } from '../../common/request'

const dark = computed(() => theme.mode === 'dark')

const kids = ref([])
const notices = ref([])
const exams = ref([])
const homework = ref([])
const selectedExamIndex = ref(0)

const examOptions = computed(() => exams.value.map((e, i) => e.examName || ('考试' + (i + 1))))

const selectedExam = computed(() => exams.value[selectedExamIndex.value] || null)

const rankedSubjects = computed(() => {
  const subs = selectedExam.value?.subjects || []
  return subs
    .filter(s => s.score != null && s.fullScore)
    .map(s => ({ subject: s.subject, score: s.score, fullScore: s.fullScore, pct: s.score / s.fullScore, raw: s }))
    .sort((a, b) => b.pct - a.pct)
})

const strengths = computed(() => {
  const arr = rankedSubjects.value
  if (!arr.length) return []
  const topPct = arr[0].pct
  return arr.filter(s => s.pct === topPct || (s.pct >= topPct - 0.05 && strengths.value.length < 3)).slice(0, 3).map(s => s.subject)
})

const weaknesses = computed(() => {
  const arr = rankedSubjects.value
  if (!arr.length) return []
  const bot = arr[arr.length - 1]
  return arr.filter(s => s.pct === bot.pct || s.pct <= bot.pct + 0.05).slice(-3).reverse().map(s => s.subject)
})

const histogram = computed(() => {
  const exam = selectedExam.value
  if (!exam?.distribution?.length) return []
  const maxCount = Math.max(...exam.distribution.map(d => d.count), 1)
  const studentTotal = exam.totalScore ?? 0
  return exam.distribution.map(d => {
    const label = d.label || d.scoreRange || ''
    const parts = label.split('-')
    const lo = parseInt(parts[0])
    const hi = parseInt(parts[1])
    const isStudent = !isNaN(lo) && !isNaN(hi) && lo <= studentTotal && studentTotal <= hi
    return {
      label,
      count: d.count,
      pct: (d.count / maxCount) * 100,
      isStudent
    }
  })
})

function onExamChange(e) {
  selectedExamIndex.value = e.detail.value
}

function bindPhone() {
  // 尝试获取微信昵称并绑定
  uni.showLoading({ title: '绑定微信…', mask: true })
  uni.getUserProfile({
    desc: '用于家校联系',
    success: async (res) => {
      const nickName = res.userInfo?.nickName || ''
      try {
        const { code } = await uni.login()
        await parentApi.post('/parent-auth/bind-wechat', { code, nickName })
        uni.hideLoading()
        uni.showToast({ title: '微信绑定成功' + (nickName ? '：' + nickName : ''), icon: 'success' })
        // 重新加载页面数据使nickName显示
        const me = await parentApi.get('/parent-auth/me')
        kids.value = (me && me.kids) || []
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '绑定失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '取消绑定', icon: 'none' })
    },
  })
}

function logout() {
  logoutParent()
  uni.reLaunch({ url: '/pages/login/login' })
}

onShow(async () => {
  if (!parent.token) {
    uni.reLaunch({ url: '/pages/parent-login/parent-login' })
    return
  }
})

// 首次加载在 onReady，避免首帧渲染冲突
onReady(async () => {
  if (!parent.token) return

  if (parent.user && !parent.user.wechatOpenid) {
    try {
      const { code } = await uni.login()
      // 尝试获取用户昵称
      let nickName = ''
      try {
        const up = await uni.getUserProfile({ desc: '用于家校联系' })
        nickName = up?.userInfo?.nickName || ''
      } catch {}
      await parentApi.post('/parent-auth/bind-wechat', { code, nickName })
    } catch (e) {
      // 静默处理
    }
  }

  try {
    const me = await parentApi.get('/parent-auth/me')
    kids.value = (me && me.kids) || []
    const ns = await parentApi.get('/parent-auth/notices')
    notices.value = Array.isArray(ns) ? ns : []
    const edata = await parentApi.get('/parent-auth/exams')
    exams.value = (edata && edata.exams) || []
    const hw = await parentApi.get('/parent-auth/homework')
    homework.value = Array.isArray(hw) ? hw : []
  } catch (e) {}
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; padding: 24rpx; box-sizing: border-box; }
.hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.out { font-size: 24rpx; color: #9aa0a6; }
.kids { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 14rpx; }
.kid { background: var(--c-card); border-radius: 14rpx; padding: 14rpx 20rpx; }
.kn { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.sno { font-size: 22rpx; font-weight: 400; color: var(--c-sub); }
.wechat-badge { font-size: 20rpx; color: #07c160; background: #e8f5e9; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 8rpx; }
.kc { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; }
.nitem { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 12rpx; }
.nt { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.npin { font-size: 20rpx; color: #e6a23c; background: #fef3e6; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 10rpx; }
.nc { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; line-height: 1.5; white-space: pre-wrap; }
.ndate { font-size: 20rpx; color: var(--c-sub); margin-left: 12rpx; font-weight: 400; }
.hwstatus { font-size: 20rpx; color: #e6a23c; margin-left: 12rpx; }

/* Exam Selector */
.exam-selector { margin-bottom: 14rpx; }
.picker { background: var(--c-card); border-radius: 12rpx; padding: 16rpx 24rpx; font-size: 26rpx; color: var(--c-title); font-weight: 600; text-align: center; }

/* Exam Detail */
.exam-detail { background: var(--c-card); border-radius: 14rpx; padding: 20rpx; margin-bottom: 14rpx; }
.exam-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12rpx; margin-bottom: 10rpx; }
.exam-name { font-size: 30rpx; font-weight: 800; color: var(--c-title); }
.exam-date { font-size: 22rpx; color: var(--c-sub); }
.exam-total { font-size: 26rpx; color: var(--c-sub); margin-bottom: 12rpx; line-height: 1.6; }
.tv { color: #07c160; font-weight: 700; font-size: 28rpx; }
.tr { margin-left: 4rpx; }

/* Strengths & Weaknesses */
.sw-section { background: var(--c-input); border-radius: 10rpx; padding: 14rpx 16rpx; margin-bottom: 14rpx; }
.sw-row { display: flex; align-items: baseline; gap: 10rpx; line-height: 1.8; }
.sw-label { font-size: 22rpx; padding: 2rpx 12rpx; border-radius: 8rpx; font-weight: 600; flex-shrink: 0; }
.sw-strong { background: #e8f9e8; color: #07c160; }
.sw-weak { background: #fde8e8; color: #e06c75; }
.sw-list { font-size: 24rpx; color: var(--c-title); }

/* Subject Rows */
.subject-list { margin-bottom: 14rpx; }
.srow { display: flex; align-items: center; padding: 8rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.srow:last-child { border-bottom: none; }
.ssubject { width: 100rpx; font-size: 24rpx; color: var(--c-title); font-weight: 600; flex-shrink: 0; }
.sscore { flex: 1; font-size: 24rpx; color: var(--c-sub); text-align: center; }
.srank { width: 130rpx; font-size: 22rpx; color: #9aa0a6; text-align: right; flex-shrink: 0; }

/* Histogram Chart */
.chart-section { margin-top: 6rpx; }
.chart-title { font-size: 22rpx; color: var(--c-sub); margin-bottom: 10rpx; }
.chart-scroll { overflow-x: auto; white-space: nowrap; }
.chart { display: flex; align-items: flex-end; gap: 6rpx; padding: 0 10rpx 0 0; min-height: 240rpx; }
.bar-col { display: flex; flex-direction: column; align-items: center; width: 52rpx; flex-shrink: 0; }
.bar { width: 36rpx; min-height: 4rpx; border-radius: 6rpx 6rpx 0 0; background: #c8e6c9; transition: height 0.3s; }
.bar.highlight { background: #07c160; }
.bar-label { font-size: 18rpx; color: #9aa0a6; margin-top: 6rpx; }
.bar-count { font-size: 18rpx; color: var(--c-sub); margin-top: 2rpx; }
.exam-analysis { margin-top: 14rpx; padding: 14rpx; background: var(--c-input); border-radius: 10rpx; }
.ea-label { font-size: 22rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 6rpx; }
.ea-text { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; }

/* Dark Mode */
.dark .t { color: var(--c-title); }
.dark .page { background: var(--c-bg); }
.dark .kid, .dark .exam-detail, .dark .nitem { background: var(--c-card); }
.dark .picker, .dark .sw-section { background: var(--c-input); }
</style>
