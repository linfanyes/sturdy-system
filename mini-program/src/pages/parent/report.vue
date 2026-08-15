<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getParentReport } from '../../api/report'

const type = ref('weekly')
const report = ref(null)
const metrics = ref(null)

async function load() {
  try {
    const r = await getParentReport(type.value)
    report.value = r || null
    metrics.value = r && r.metrics ? JSON.parse(r.metrics) : null
  } catch (e) {
    report.value = null
    metrics.value = null
  }
}
function switchType(t) {
  type.value = t
  load()
}
onShow(load)
</script>

<template>
  <view class="page">
    <view class="hd">📋 班级{{ type === 'weekly' ? '周报' : '月报' }}</view>
    <view class="tabs">
      <view class="tab" :class="{ on: type === 'weekly' }" @click="switchType('weekly')">周报</view>
      <view class="tab" :class="{ on: type === 'monthly' }" @click="switchType('monthly')">月报</view>
    </view>

    <view v-if="!report" class="empty">暂无{{ type === 'weekly' ? '周报' : '月报' }}</view>
    <view v-else class="card">
      <view class="title">{{ report.title }}</view>
      <view v-if="metrics" class="grid">
        <view class="m"><view class="num">{{ metrics.studentCount }}</view><view class="lbl">学生</view></view>
        <view class="m"><view class="num">{{ metrics.gradeCount }}</view><view class="lbl">成绩记录</view></view>
        <view class="m"><view class="num rose">{{ metrics.moodAlert }}</view><view class="lbl">情绪关注</view></view>
        <view class="m"><view class="num green">{{ metrics.habitCheckins }}</view><view class="lbl">习惯打卡</view></view>
        <view class="m"><view class="num amber">{{ metrics.safetyOpen }}</view><view class="lbl">安全事项</view></view>
      </view>
      <view class="content">{{ report.content }}</view>
    </view>
  </view>
</template>

<style scoped>
.page { padding: 24rpx; background: #f7f8fa; min-height: 100vh; }
.hd { font-size: 34rpx; font-weight: 700; color: #1f2937; margin: 12rpx 8rpx 16rpx; }
.tabs { display: flex; gap: 16rpx; margin-bottom: 20rpx; }
.tab { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 12rpx; background: #fff; color: #6b7280; font-size: 28rpx; }
.tab.on { background: #2563eb; color: #fff; font-weight: 600; }
.empty { text-align: center; color: #9ca3af; padding: 80rpx 0; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; }
.title { font-size: 30rpx; font-weight: 700; color: #1f2937; margin-bottom: 16rpx; }
.grid { display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 20rpx; }
.m { flex: 1 1 18%; min-width: 120rpx; background: #f3f4f6; border-radius: 12rpx; padding: 14rpx 0; text-align: center; }
.num { font-size: 34rpx; font-weight: 700; color: #1f2937; }
.num.rose { color: #e11d48; }
.num.green { color: #059669; }
.num.amber { color: #d97706; }
.lbl { font-size: 20rpx; color: #6b7280; margin-top: 4rpx; }
.content { font-size: 26rpx; line-height: 1.7; color: #374151; white-space: pre-wrap; }
</style>
