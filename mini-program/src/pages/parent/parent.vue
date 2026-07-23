<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="t">🏡 家长中心</view>
      <view class="hd-actions">
        <text class="out" @click="bindPhone">📱 绑定</text>
        <text class="out" @click="logout">退出</text>
      </view>
    </view>

    <view class="kids" v-if="kids.length">
      <view class="kid" v-for="k in kids" :key="k.studentId">
        <view class="kn">{{ k.studentName }}<text v-if="k.studentNo" class="sno"> · {{ k.studentNo }}</text></view>
        <view class="kc">{{ k.parentName ? k.parentName + ' · ' : '' }}{{ k.className || '班级 ' + k.classId }}<text v-if="k.nickName" class="wechat-badge">已微信绑 {{ k.nickName }}</text></view>
      </view>
    </view>

    <!-- Tab 切换 -->
    <view class="tabs">
      <text class="tab" :class="{ on: tab === 'pending' }" @click="tab = 'pending'">📋 待办公告</text>
      <text class="tab" :class="{ on: tab === 'scores' }" @click="tab = 'scores'">📊 成绩查询</text>
    </view>

    <!-- 订阅消息引导 -->
    <view class="subscribe-card" v-if="showSubscribeGuide">
      <view class="sub-icon">🔔</view>
      <view class="sub-text">
        <text class="sub-title">开启微信通知</text>
        <text class="sub-desc">作业提醒、新公告、成绩发布即时推送到微信</text>
      </view>
      <text class="sub-btn" @click="subscribeGuide">去开启</text>
      <text class="sub-close" @click="showSubscribeGuide = false">×</text>
    </view>

    <!-- ===== Tab 1：待办公告 ===== -->
    <scroll-view scroll-y class="tab-body" v-if="tab === 'pending'">
      <!-- 班级作业 -->
      <view class="sec">
        <view class="st">📝 待完成作业 <text v-if="homework.length" class="sc-badge">{{ homework.length }}项</text></view>
        <view v-if="!homework.length" class="empty-card">
          <text class="empty-icon">🎉</text>
          <text class="empty-text">暂无待完成作业</text>
        </view>
        <view class="nitem" v-for="h in homework" :key="h.id">
          <view class="nt">{{ h.subject }} · {{ h.title }}
            <text class="ndate">{{ h.deadline || h.startDate }}</text>
            <text class="hwstatus">{{ h.status }}</text>
          </view>
          <view class="nc">{{ h.content }}</view>
        </view>
      </view>

      <!-- 班级通知 -->
      <view class="sec">
        <view class="st">📢 班级公告 <text v-if="notices.length" class="sc-badge">{{ notices.length }}条</text></view>
        <view v-if="!notices.length" class="empty-card">
          <text class="empty-icon">📭</text>
          <text class="empty-text">暂无班级公告</text>
        </view>
        <view class="nitem" v-for="n in notices" :key="n.id">
          <view class="nt">{{ n.title }}<text v-if="n.pinned" class="npin">置顶</text></view>
          <view class="nc">{{ n.content }}</view>
        </view>
      </view>
    </scroll-view>

    <!-- ===== Tab 2：成绩查询 ===== -->
    <scroll-view scroll-y class="tab-body" v-if="tab === 'scores'">
      <view class="sec">
        <view class="st">📊 考试成绩</view>
        <view v-if="!exams.length" class="empty-card">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无考试成绩</text>
        </view>

        <template v-if="exams.length">
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
              <text v-if="selectedExam.classRank != null" class="tr">
                （班级第 {{ selectedExam.classRank }} 名
                <text v-if="selectedExam.gradeRank != null"> / 年级第 {{ selectedExam.gradeRank }} 名</text>）
              </text>
            </view>

            <view class="subject-list">
              <view v-for="s in orderedSubjects" :key="s.subject" class="srow">
                <text class="ssubject">{{ s.subject }}</text>
                <text class="sscore">{{ s.score != null ? s.score + ' / ' + s.fullScore : '暂未录入' }}</text>
                <text class="srank">班级第{{ s.classRank ?? '--' }}名</text>
              </view>
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
        </template>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme, parent, logoutParent } from '../../common/store'
import { parentApi } from '../../common/request'

const dark = computed(() => theme.mode === 'dark')
const tab = ref('pending')  // pending = 待办公告, scores = 成绩查询
const showSubscribeGuide = ref(true)

// 微信订阅消息引导
async function subscribeGuide() {
  try {
    const { accept } = await wx.requestSubscribeMessage({
      tmplIds: ['NOTICE_TEMPLATE_ID', 'HOMEWORK_TEMPLATE_ID'],
    })
    const count = Object.values(accept || {}).filter(v => v === 'accept').length
    if (count > 0) {
      uni.showToast({ title: `已订阅 ${count} 项通知`, icon: 'success' })
      showSubscribeGuide.value = false
    }
  } catch (e) {
    // 用户取消授权
  }
}

const kids = ref([])
const notices = ref([])
const exams = ref([])
const homework = ref([])
const selectedExamIndex = ref(0)

const examOptions = computed(() => exams.value.map((e, i) => e.examName || ('考试' + (i + 1))))
const selectedExam = computed(() => exams.value[selectedExamIndex.value] || null)

const SUBJECT_ORDER = ['语文', '数学', '英语', '科学', '品德']
const orderedSubjects = computed(() => {
  const subs = (selectedExam.value?.subjects || []).slice()
  subs.sort((a, b) => {
    const ai = SUBJECT_ORDER.indexOf(a.subject)
    const bi = SUBJECT_ORDER.indexOf(b.subject)
    if (ai >= 0 && bi >= 0) return ai - bi
    if (ai >= 0) return -1
    if (bi >= 0) return 1
    return (a.subject || '').localeCompare(b.subject || '')
  })
  return subs
})

const EXCELLENT_RATIO = 0.8
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
  return arr.filter(s => s.pct >= EXCELLENT_RATIO).map(s => s.subject)
})

const weaknesses = computed(() => {
  const arr = rankedSubjects.value
  if (!arr.length) return []
  const below = arr.filter(s => s.pct < EXCELLENT_RATIO).sort((a, b) => a.pct - b.pct)
  return below.slice(0, 3).map(s => s.subject)
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
    return { label, count: d.count, pct: (d.count / maxCount) * 100, isStudent }
  })
})

function onExamChange(e) { selectedExamIndex.value = e.detail.value }

function bindPhone() {
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
        const me = await parentApi.get('/parent-auth/me')
        kids.value = (me && me.kids) || []
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: '绑定失败', icon: 'none' })
      }
    },
    fail: () => { uni.hideLoading() },
  })
}

function logout() { logoutParent(); uni.reLaunch({ url: '/pages/login/login' }) }

onShow(async () => {
  if (!parent.token) { uni.reLaunch({ url: '/pages/parent-login/parent-login' }); return }
  try {
    const me = await parentApi.get('/parent-auth/me')
    kids.value = (me && me.kids) || []
  } catch (e) { console.error('[parent] me error:', e) }
  try {
    const edata = await parentApi.get('/parent-auth/exams')
    exams.value = (edata && edata.exams) || []
  } catch (e) { console.error('[parent] exams error:', e) }
  try {
    const ns = await parentApi.get('/parent-auth/notices')
    notices.value = Array.isArray(ns) ? ns : []
    const hw = await parentApi.get('/parent-auth/homework')
    homework.value = Array.isArray(hw) ? hw : []
  } catch (e) { console.error('[parent] notices/hw error:', e) }
})
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; padding: 24rpx; box-sizing: border-box; }
.hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.hd-actions { display: flex; gap: 16rpx; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.out { font-size: 24rpx; color: #9aa0a6; }
.kids { display: flex; flex-wrap: wrap; gap: 14rpx; margin-bottom: 14rpx; }
.kid { background: var(--c-card); border-radius: 14rpx; padding: 14rpx 20rpx; }
.kn { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.sno { font-size: 22rpx; font-weight: 400; color: var(--c-sub); }
.wechat-badge { font-size: 20rpx; color: #07c160; background: #e8f5e9; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 8rpx; }
.kc { font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
/* Tabs */
.tabs { display: flex; gap: 10rpx; margin-bottom: 14rpx; }
.tab { flex: 1; text-align: center; font-size: 28rpx; padding: 16rpx 0; border-radius: 12rpx; background: var(--c-card); color: var(--c-sub); font-weight: 600; }
.tab.on { background: var(--c-primary); color: #fff; }
.tab-body { flex: 1; overflow-y: auto; padding-bottom: 20rpx; }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; display: flex; align-items: center; gap: 10rpx; }
.sc-badge { font-size: 20rpx; color: #fff; background: var(--c-primary); padding: 2rpx 12rpx; border-radius: 20rpx; font-weight: 400; }
.nitem { background: var(--c-card); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 12rpx; }
.nt { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.npin { font-size: 20rpx; color: #e6a23c; background: #fef3e6; padding: 2rpx 10rpx; border-radius: 8rpx; margin-left: 10rpx; }
.nc { font-size: 24rpx; color: var(--c-sub); margin-top: 8rpx; line-height: 1.5; white-space: pre-wrap; }
.ndate { font-size: 20rpx; color: var(--c-sub); margin-left: 12rpx; font-weight: 400; }
.hwstatus { font-size: 20rpx; color: #e6a23c; margin-left: 12rpx; }
.empty-card { background: var(--c-card); border-radius: 14rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 26rpx; color: var(--c-sub); }
/* Exam Selector */
.exam-selector { margin-bottom: 14rpx; }
.picker { background: var(--c-card); border-radius: 12rpx; padding: 16rpx 24rpx; font-size: 26rpx; color: var(--c-title); font-weight: 600; text-align: center; }
.exam-detail { background: var(--c-card); border-radius: 14rpx; padding: 20rpx; margin-bottom: 14rpx; }
.exam-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12rpx; margin-bottom: 10rpx; }
.exam-name { font-size: 30rpx; font-weight: 800; color: var(--c-title); }
.exam-date { font-size: 22rpx; color: var(--c-sub); }
.exam-total { font-size: 26rpx; color: var(--c-sub); margin-bottom: 12rpx; line-height: 1.6; }
.tv { color: #07c160; font-weight: 700; font-size: 28rpx; }
.tr { margin-left: 4rpx; }
.sw-section { background: var(--c-input); border-radius: 10rpx; padding: 14rpx 16rpx; margin-bottom: 14rpx; }
.sw-row { display: flex; align-items: baseline; gap: 10rpx; line-height: 1.8; }
.sw-label { font-size: 22rpx; padding: 2rpx 12rpx; border-radius: 8rpx; font-weight: 600; flex-shrink: 0; }
.sw-strong { background: #e8f9e8; color: #07c160; }
.sw-weak { background: #fde8e8; color: #e06c75; }
.sw-list { font-size: 24rpx; color: var(--c-title); }
.subject-list { margin-bottom: 14rpx; }
.srow { display: flex; align-items: center; padding: 8rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.srow:last-child { border-bottom: none; }
.ssubject { width: 100rpx; font-size: 24rpx; color: var(--c-title); font-weight: 600; flex-shrink: 0; }
.sscore { flex: 1; font-size: 24rpx; color: var(--c-sub); text-align: center; }
.srank { width: 130rpx; font-size: 22rpx; color: #9aa0a6; text-align: right; flex-shrink: 0; }
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
/* 订阅引导卡 */
.subscribe-card { display: flex; align-items: center; gap: 12rpx; background: linear-gradient(135deg, #e8f5e9, #f1f8e9); border-radius: 14rpx; padding: 16rpx 20rpx; margin-bottom: 14rpx; position: relative; }
.sub-icon { font-size: 36rpx; flex-shrink: 0; }
.sub-text { flex: 1; min-width: 0; }
.sub-title { font-size: 26rpx; font-weight: 700; color: #2e7d32; display: block; }
.sub-desc { font-size: 22rpx; color: #558b2f; margin-top: 2rpx; }
.sub-btn { flex-shrink: 0; font-size: 24rpx; color: #fff; background: #43a047; padding: 8rpx 20rpx; border-radius: 30rpx; font-weight: 600; }
.sub-close { position: absolute; top: 6rpx; right: 12rpx; font-size: 28rpx; color: #9e9e9e; line-height: 1; }
.ea-label { font-size: 22rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 6rpx; }
.ea-text { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; }
</style>
