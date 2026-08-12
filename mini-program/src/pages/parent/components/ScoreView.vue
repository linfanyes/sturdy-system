<template>
  <scroll-view scroll-y class="tab-body">
    <view class="sec">
      <view class="st">📊 考试成绩</view>
      <view v-if="!exams.length" class="empty-card">
        <text class="empty-icon">📋</text>
        <text class="empty-text">暂无考试成绩</text>
      </view>

      <template v-if="exams.length">
        <!-- 筛选下拉框 -->
        <view class="filter-row">
          <picker v-if="termOptions.length" :range="['全部学期', ...termOptions]" @change="emit('term-change', $event)">
            <view class="filter-picker">{{ filterTerm || '全部学期' }}</view>
          </picker>
          <picker v-if="examNameOptions.length" :range="['全部考试', ...examNameOptions]" @change="emit('exam-name-change', $event)">
            <view class="filter-picker">{{ filterExamName || '全部考试' }}</view>
          </picker>
          <picker v-if="subjectOptions.length" :range="['全部科目', ...subjectOptions]" @change="emit('subject-change', $event)">
            <view class="filter-picker">{{ filterSubject || '全部科目' }}</view>
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
              <text class="sscore" :class="{ 'below': s.score != null && s.classAvg != null && s.score < s.classAvg }">
                {{ s.score != null ? s.score + ' / ' + s.fullScore : '暂未录入' }}
              </text>
              <text class="srank">班级第{{ s.classRank ?? '--' }}名</text>
              <text v-if="s.classAvg != null" class="savg">均分{{ s.classAvg }}</text>
              <text v-if="s.score != null && s.classAvg != null" class="s-diff" :class="s.score >= s.classAvg ? 'up' : 'down'">
                {{ s.score >= s.classAvg ? '↑' : '↓' }}{{ Math.abs(s.score - s.classAvg).toFixed(1) }}
              </text>
            </view>
          </view>

          <!-- 学情诊断卡 -->
          <view v-if="aiInsight" class="ai-insight" :class="aiInsight.level">
            <view class="ai-title" :class="aiInsight.level">
              {{ aiInsight.level === 'good' ? '🎉 表现优秀' : aiInsight.level === 'warn' ? '⚠️ 需要关注' : '💡 学情诊断' }}
            </view>
            <view class="ai-summary">{{ aiInsight.summary }}</view>
            <view v-if="aiInsight.tips && aiInsight.tips.length" class="ai-tips">
              <view v-for="(tip, idx) in aiInsight.tips" :key="idx" class="ai-tip">{{ tip }}</view>
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
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  exams: { type: Array, default: () => [] },
  filterTerm: { type: String, default: '' },
  filterExamName: { type: String, default: '' },
  filterSubject: { type: String, default: '' },
})
defineEmits(['term-change', 'exam-name-change', 'subject-change'])

const termOptions = computed(() => {
  const set = new Set()
  for (const e of props.exams) { if (e.term) set.add(e.term) }
  return Array.from(set)
})
const examNameOptions = computed(() => {
  const set = new Set()
  for (const e of props.exams) {
    if (props.filterTerm && e.term !== props.filterTerm) continue
    if (e.examName) set.add(e.examName)
  }
  return Array.from(set)
})
const subjectOptions = computed(() => {
  const set = new Set()
  for (const e of props.exams) {
    if (props.filterTerm && e.term !== props.filterTerm) continue
    for (const s of (e.subjects || [])) { if (s.subject) set.add(s.subject) }
  }
  return Array.from(set)
})

const filteredExams = computed(() => {
  return props.exams.filter(e => {
    if (props.filterTerm && e.term !== props.filterTerm) return false
    if (props.filterExamName && e.examName !== props.filterExamName) return false
    return true
  })
})

const selectedExam = computed(() => {
  const list = filteredExams.value
  if (!list.length) return null
  return list[0] || null
})

const SUBJECT_ORDER = ['语文', '数学', '英语', '科学', '品德']
const orderedSubjects = computed(() => {
  const subs = (selectedExam.value?.subjects || []).slice()
    .filter(s => !props.filterSubject || s.subject === props.filterSubject)
  subs.sort((a, b) => {
    const ai = SUBJECT_ORDER.indexOf(a.subject)
    const bi = SUBJECT_ORDER.indexOf(b.subject)
    if (ai >= 0 && bi >= 0) return ai - bi
    if (ai >= 0) return -1
    if (bi >= 0) return 1
    return (a.subject || '').localeCompare(b.subject || '')
  })
  // 为每个科目计算/获取班级均分
  const classStats = selectedExam.value?.classStats || {}
  const subjectAvgs = classStats.subjectAvgs || {}
  return subs.map(s => {
    let classAvg = null
    if (subjectAvgs[s.subject]) {
      classAvg = subjectAvgs[s.subject].avg ?? subjectAvgs[s.subject]
    } else if (s.classAvg != null) {
      classAvg = s.classAvg
    }
    return { ...s, classAvg }
  })
})

/* ===== AI 学情诊断（简易版） ===== */
const aiInsight = computed(() => {
  const exam = selectedExam.value
  if (!exam) return null
  const tips = []
  const subjects = exam.subjects || []
  const classStats = exam.classStats || {}
  let lowCount = 0
  let highCount = 0

  for (const s of subjects) {
    if (s.score == null || !s.fullScore) continue
    const pct = s.score / s.fullScore
    const subjectAvgs = classStats.subjectAvgs || {}
    const classAvg = subjectAvgs[s.subject]?.avg ?? s.classAvg

    if (classAvg != null && s.score < classAvg) lowCount++
    else if (classAvg != null && s.score > classAvg) highCount++

    if (pct < 0.6) tips.push(`📕 ${s.subject} 成绩偏弱（${s.score}/${s.fullScore}），建议加强基础概念训练`)
    else if (pct < 0.75) tips.push(`📘 ${s.subject} 成绩中等（${s.score}/${s.fullScore}），有提升空间`)
    else if (pct >= 0.85) tips.push(`📗 ${s.subject} 表现优秀（${s.score}/${s.fullScore}），继续保持`)
  }

  let level = 'info'
  let summary = ''
  if (lowCount >= 2) {
    level = 'warn'
    summary = `本次考试有 ${lowCount} 科低于班级均分，需要重点关注薄弱环节`
  } else if (highCount >= Math.ceil(subjects.length / 2) && subjects.length > 0) {
    level = 'good'
    summary = `本次考试发挥出色，${highCount} 科高于班级均分，整体水平领先`
  } else {
    summary = '本次考试整体表现平稳，建议重点突破薄弱学科'
  }

  // 排名变化（如果有数据）
  if (exam.classRank != null && exam.prevClassRank != null) {
    const dRank = exam.prevClassRank - exam.classRank
    if (dRank > 0) tips.push(`📈 班级排名上升 ${dRank} 名，继续保持良好学习势头`)
    else if (dRank < 0) tips.push(`📉 班级排名下降 ${Math.abs(dRank)} 名，需要调整学习策略`)
  }

  return { summary, tips, level }
})

const EXCELLENT_RATIO = 0.8
const rankedSubjects = computed(() => {
  const subs = (selectedExam.value?.subjects || []).filter(s => !props.filterSubject || s.subject === props.filterSubject)
  return subs
    .filter(s => s.score != null && s.fullScore)
    .map(s => ({ subject: s.subject, pct: s.score / s.fullScore }))
    .sort((a, b) => b.pct - a.pct)
})

const strengths = computed(() => rankedSubjects.value.filter(s => s.pct >= EXCELLENT_RATIO).map(s => s.subject))
const weaknesses = computed(() => rankedSubjects.value.filter(s => s.pct < EXCELLENT_RATIO).sort((a, b) => a.pct - b.pct).slice(0, 3).map(s => s.subject))

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
</script>

<style scoped>
.tab-body { flex: 1; overflow-y: auto; padding-bottom: 20rpx; }
.sec { margin-bottom: 14rpx; }
.st { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 10rpx; display: flex; align-items: center; gap: 10rpx; }
.empty-card { background: var(--c-card); border-radius: 14rpx; padding: 40rpx; display: flex; flex-direction: column; align-items: center; gap: 10rpx; margin-bottom: 12rpx; }
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 26rpx; color: var(--c-sub); }
.filter-row { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 16rpx; }
.filter-picker { background: var(--c-card); border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 12rpx 20rpx; font-size: 24rpx; color: var(--c-title); min-width: 160rpx; text-align: center; }
.exam-detail { background: var(--c-card); border-radius: 14rpx; padding: 20rpx; margin-bottom: 14rpx; }
.exam-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 12rpx; margin-bottom: 10rpx; }
.exam-name { font-size: 30rpx; font-weight: 800; color: var(--c-title); }
.exam-date { font-size: 22rpx; color: var(--c-sub); }
.exam-total { font-size: 26rpx; color: var(--c-sub); margin-bottom: 12rpx; line-height: 1.6; }
.tv { color: #07c160; font-weight: 700; font-size: 28rpx; }
.tr { margin-left: 4rpx; }
.subject-list { margin-bottom: 14rpx; }
.srow { display: flex; align-items: center; padding: 8rpx 0; border-bottom: 1rpx solid var(--c-input-border); }
.srow:last-child { border-bottom: none; }
.ssubject { width: 100rpx; font-size: 24rpx; color: var(--c-title); font-weight: 600; flex-shrink: 0; }
.sscore { flex: 1; font-size: 24rpx; color: var(--c-sub); text-align: center; font-weight: 600; }
.sscore.below { color: #e06c75; }
.srank { width: 130rpx; font-size: 22rpx; color: #9aa0a6; text-align: right; flex-shrink: 0; }
.savg { width: 100rpx; font-size: 22rpx; color: var(--c-sub); text-align: right; flex-shrink: 0; }
.s-diff { width: 60rpx; text-align: right; font-size: 22rpx; font-weight: 600; flex-shrink: 0; }
.s-diff.up { color: #07c160; }
.s-diff.down { color: #e06c75; }

/* ===== AI 学情诊断卡 ===== */
.ai-insight { border-radius: 16rpx; padding: 20rpx; margin-bottom: 20rpx; border-left: 6rpx solid #07c160; }
.ai-insight.good { background: #e8f9e8; border-color: #07c160; }
.ai-insight.warn { background: #fde8e8; border-color: #e06c75; }
.ai-insight.info { background: #e8f4fd; border-color: #1c6fb3; }
.ai-title { font-size: 26rpx; font-weight: 700; margin-bottom: 10rpx; }
.ai-title.good { color: #07c160; }
.ai-title.warn { color: #e06c75; }
.ai-title.info { color: #1c6fb3; }
.ai-summary { font-size: 24rpx; color: var(--c-title); line-height: 1.6; margin-bottom: 12rpx; font-weight: 500; }
.ai-tips { display: flex; flex-direction: column; gap: 8rpx; }
.ai-tip { font-size: 22rpx; color: var(--c-sub); line-height: 1.6; padding-left: 10rpx; border-left: 2rpx solid rgba(0,0,0,0.1); }

.sw-section { background: var(--c-input); border-radius: 10rpx; padding: 14rpx 16rpx; margin-bottom: 14rpx; }
.sw-row { display: flex; align-items: baseline; gap: 10rpx; line-height: 1.8; }
.sw-label { font-size: 22rpx; padding: 2rpx 12rpx; border-radius: 8rpx; font-weight: 600; flex-shrink: 0; }
.sw-strong { background: #e8f9e8; color: #07c160; }
.sw-weak { background: #fde8e8; color: #e06c75; }
.sw-list { font-size: 24rpx; color: var(--c-title); }
.chart-section { margin-top: 6rpx; }
.chart-title { font-size: 22rpx; color: var(--c-sub); margin-bottom: 10rpx; }
.chart-scroll { overflow-x: auto; white-space: nowrap; }
.chart { display: flex; align-items: flex-end; gap: 6rpx; padding: 0 10rpx 0 0; min-height: 240rpx; }
.bar-col { display: flex; flex-direction: column; align-items: center; width: 52rpx; flex-shrink: 0; }
.bar { width: 36rpx; min-height: 4rpx; border-radius: 6rpx 6rpx 0 0; background: #c8e6c9; transition: height 0.3s; }
.bar.highlight { background: var(--c-primary); }
.bar-label { font-size: 18rpx; color: #9aa0a6; margin-top: 6rpx; }
.bar-count { font-size: 18rpx; color: var(--c-sub); margin-top: 2rpx; }
.exam-analysis { margin-top: 14rpx; padding: 14rpx; background: var(--c-input); border-radius: 10rpx; }
.ea-label { font-size: 22rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 6rpx; }
.ea-text { font-size: 24rpx; color: var(--c-sub); line-height: 1.6; }
</style>
