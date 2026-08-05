<template>
  <view class="compare-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="back" @tap="uni.navigateBack">← 返回</view>
      <text class="title">📊 跨娃成绩比对</text>
    </view>

    <view class="notice">⚠️ 排名为各班内部排名，不可跨班比较</view>

    <!-- 加载态 -->
    <view class="status" v-if="loading">
      <text>加载中…</text>
    </view>

    <!-- 错误态 -->
    <view class="status" v-else-if="error">
      <text class="err-text">数据加载失败</text>
      <text class="retry" @tap="fetchData">点击重试</text>
    </view>

    <!-- 空态 -->
    <view class="status" v-else-if="!exams.length">
      <text>暂无考试数据</text>
    </view>

    <!-- 考试卡片 -->
    <view class="exam-card" v-for="exam in exams" :key="exam.examName">
      <view class="exam-header">
        <text class="exam-name">{{ exam.examName }}</text>
        <text class="exam-date">{{ exam.date }}</text>
      </view>

      <!-- 各娃总分 -->
      <view class="score-row" v-for="(score, sid) in exam.rows" :key="sid">
        <text class="kid-name">{{ getName(sid) }}</text>
        <text class="score">总分 {{ score.totalScore || '-' }}/{{ score.totalFullScore || '-' }}</text>
        <text class="rank" :class="score.classRank <= 5 ? 'good' : ''">
          排名 {{ score.classRank ? `第${score.classRank}名` : '-' }}
        </text>
      </view>

      <!-- 各科对比表 -->
      <view class="subject-table" v-if="hasSubjects(exam)">
        <view class="table-header">
          <text class="col-subject">科目</text>
          <text class="col-score" v-for="(score, sid) in exam.rows" :key="sid">{{ getName(sid) }}</text>
        </view>
        <view class="table-row" v-for="subject in getSubjects(exam)" :key="subject">
          <text class="col-subject">{{ subject }}</text>
          <text class="col-score" v-for="(score, sid) in exam.rows" :key="sid">
            {{ getSubjectScore(score, subject) }}
          </text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { parent } from '../../common/store'
import { parentApi } from '../../common/request'

const data = ref(null)
const loading = ref(true)
const error = ref(false)

const exams = computed(() => data.value?.exams || [])

function getName(studentId) {
  const kid = data.value?.kids?.find(k => k.studentId === studentId)
  return kid?.studentName || '未知'
}

function hasSubjects(exam) {
  return Object.values(exam.rows || {}).some(r => r.subjects?.length)
}

function getSubjects(exam) {
  const all = Object.values(exam.rows || {}).flatMap(r => r.subjects?.map(s => s.subject) || [])
  return [...new Set(all)]
}

function getSubjectScore(score, subject) {
  return score.subjects?.find(s => s.subject === subject)?.score || '-'
}

async function fetchData() {
  loading.value = true
  error.value = false
  try {
    const res = await parentApi.get('/parent-auth/compare-kids')
    data.value = res
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

onShow(() => {
  fetchData()
})
</script>

<style>
.compare-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 0 16rpx 30rpx;
}
.nav-bar {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  background: var(--c-card);
  position: sticky;
  top: 0;
  z-index: 10;
}
.back {
  font-size: 28rpx;
  color: #666;
  padding: 10rpx 20rpx;
}
.title {
  font-size: 34rpx;
  font-weight: bold;
  margin-left: 16rpx;
}
.notice {
  font-size: 24rpx;
  color: #999;
  padding: 10rpx 20rpx;
  background: var(--c-card2);
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}
.status {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
}
.err-text {
  display: block;
  color: #f56c6c;
  margin-bottom: 16rpx;
}
.retry {
  color: #07c160;
  text-decoration: underline;
}
.exam-card {
  background: var(--c-card);
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.exam-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.exam-name {
  font-weight: bold;
  font-size: 30rpx;
}
.exam-date {
  font-size: 24rpx;
  color: #999;
}
.score-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.kid-name {
  font-weight: 500;
  width: 120rpx;
}
.score {
  font-size: 26rpx;
  color: #666;
}
.rank {
  font-size: 26rpx;
  color: #666;
}
.rank.good {
  color: #07c160;
  font-weight: 500;
}
.subject-table {
  margin-top: 16rpx;
  border-top: 1rpx dashed #e0e0e0;
  padding-top: 12rpx;
}
.table-header {
  display: flex;
  font-size: 24rpx;
  color: #999;
  padding-bottom: 8rpx;
}
.table-row {
  display: flex;
  font-size: 26rpx;
  padding: 8rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}
.col-subject {
  width: 120rpx;
}
.col-score {
  flex: 1;
  text-align: right;
}
</style>
