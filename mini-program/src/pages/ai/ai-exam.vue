<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="head">
      <view>
        <view class="h">📊 AI 考试分析</view>
        <view class="sub">基于成绩数据自动生成分析报告</view>
      </view>
    </view>

    <!-- 考试选择 -->
    <view class="card">
      <view class="card-title">选择考试</view>
      <view v-if="!exams.length" class="empty">暂无考试数据</view>
      <view v-else class="exam-list">
        <view
          v-for="e in exams"
          :key="e.id"
          class="exam-item"
          :class="selectedExam === e.id && 'on'"
          @click="selectExam(e)"
        >
          <view class="exam-name">{{ e.name }}</view>
          <view class="exam-meta">{{ e.date }} · {{ (e.subjects || []).join('、') }}</view>
        </view>
      </view>
    </view>

    <!-- 分析结果 -->
    <view class="card" v-if="analyzing">
      <view class="loading-box">
        <text class="loading-dot">●</text><text class="loading-dot">●</text><text class="loading-dot">●</text>
        <text class="loading-text">AI 正在分析考试数据…</text>
      </view>
    </view>

    <view class="card" v-if="report">
      <view class="card-title">📋 AI 分析报告</view>
      <view class="report-box">
        <rich-text class="report-text" :nodes="formatReport(report)"></rich-text>
      </view>
      <view class="report-acts">
        <text class="act-btn" @click="copyReport">📋 复制</text>
        <text class="act-btn" @click="saveToNotes">📝 存笔记</text>
        <text class="act-btn primary" @click="reanalyze">🔄 重新分析</text>
      </view>
    </view>

    <!-- 历史分析记录 -->
    <view class="card" v-if="history.length">
      <view class="card-title">📚 历史分析</view>
      <view
        v-for="h in history"
        :key="h.id"
        class="history-item"
        @click="showHistoryDetail(h)"
      >
        <view class="h-name">{{ h.examName }}</view>
        <view class="h-date">{{ h.createdAt }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { marked } from 'marked'
import api from '../../common/request'
import { theme } from '../../common/store'

marked.setOptions({ gfm: true, breaks: true })

const exams = ref([])
const selectedExam = ref('')
const analyzing = ref(false)
const report = ref('')
const history = ref([])

function formatReport(md) {
  try {
    return marked.parse(md || '')
  } catch {
    return md || ''
  }
}

async function loadExams() {
  try {
    const res = await api.get('/exams')
    exams.value = res.items || []
    if (exams.value.length > 0 && !selectedExam.value) {
      selectedExam.value = exams.value[0].id
    }
  } catch {
    exams.value = []
  }
}

async function loadHistory() {
  try {
    const res = await api.get('/generated-papers', { type: 'exam-analysis' })
    history.value = (res.items || []).slice(0, 5)
  } catch {
    history.value = []
  }
}

function selectExam(e) {
  selectedExam.value = e.id
  report.value = ''
}

async function analyze() {
  if (!selectedExam.value) return uni.showToast({ title: '请先选择考试', icon: 'none' })
  analyzing.value = true
  report.value = ''
  try {
    const res = await api.post('/ai/analyze-exam', { examId: selectedExam.value })
    report.value = res.content || '未生成报告'
    loadHistory()
  } catch (e) {
    uni.showToast({ title: '分析失败：' + (e.message || ''), icon: 'none' })
  } finally {
    analyzing.value = false
  }
}

function reanalyze() {
  analyze()
}

function copyReport() {
  if (!report.value) return
  uni.setClipboardData({
    data: report.value,
    success: () => uni.showToast({ title: '已复制', icon: 'none' })
  })
}

async function saveToNotes() {
  if (!report.value) return
  try {
    await api.post('/notes', {
      title: '考试分析报告 - ' + (exams.value.find(e => e.id === selectedExam.value)?.name || ''),
      content: report.value,
      category: 'AI 分析'
    })
    uni.showToast({ title: '已存到笔记', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

function showHistoryDetail(h) {
  report.value = h.content || h.analysisNote || ''
}

onMounted(() => {
  loadExams()
  loadHistory()
})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.head { margin-bottom: 20rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 24rpx; color: var(--c-sub); margin-top: 4rpx; }

.card { background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 16rpx; }
.card-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }

.empty { text-align: center; color: var(--c-sub); padding: 30rpx 0; font-size: 26rpx; }

.exam-list { display: flex; flex-direction: column; gap: 12rpx; }
.exam-item { padding: 20rpx; background: var(--c-card2); border-radius: 12rpx; border: 2rpx solid transparent; }
.exam-item.on { border-color: var(--c-primary); background: rgba(7,193,96,0.06); }
.exam-name { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.exam-meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }

.loading-box { display: flex; align-items: center; gap: 12rpx; padding: 30rpx; justify-content: center; flex-wrap: wrap; }
.loading-dot { font-size: 30rpx; color: var(--c-primary); animation: blink 1.2s infinite; }
.loading-dot:nth-child(2) { animation-delay: 0.2s; }
.loading-dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%,100% { opacity: 0.2; } 50% { opacity: 1; } }
.loading-text { font-size: 26rpx; color: var(--c-sub); margin-left: 12rpx; }

.report-box { background: var(--c-card2); border-radius: 12rpx; padding: 20rpx; margin-bottom: 16rpx; }
.report-text { font-size: 26rpx; color: var(--c-text); line-height: 1.7; }

.report-acts { display: flex; gap: 12rpx; flex-wrap: wrap; }
.act-btn { font-size: 24rpx; padding: 10rpx 24rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-text); }
.act-btn.primary { background: var(--c-primary); color: #fff; }

.history-item { display: flex; justify-content: space-between; align-items: center; padding: 18rpx 0; border-bottom: 1px solid var(--c-border); }
.history-item:last-child { border-bottom: none; }
.h-name { font-size: 26rpx; color: var(--c-title); }
.h-date { font-size: 22rpx; color: var(--c-sub); }
</style>
