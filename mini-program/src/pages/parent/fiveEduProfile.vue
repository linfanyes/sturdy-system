<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getFiveEduProfile } from '../../api/fiveEdu'

const loading = ref(true)
const data = ref(null)
const DIM = [
  { key: 'moral', label: '德' },
  { key: 'intellectual', label: '智' },
  { key: 'physical', label: '体' },
  { key: 'aesthetic', label: '美' },
  { key: 'labour', label: '劳' },
]

onShow(load)

async function load() {
  loading.value = true
  try {
    const res = await getFiveEduProfile()
    data.value = res
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="head">
      <text class="title">📊 五育综合素质档案</text>
      <text class="sub">看见孩子全面的成长，而不只是分数</text>
    </view>

    <view v-if="loading" class="tip">加载中…</view>
    <view v-else-if="!data || !data.students || !data.students.length" class="empty">暂无档案数据</view>

    <block v-else>
      <view class="card" v-for="s in data.students" :key="s.studentId">
        <view class="card-top">
          <text class="name">{{ s.studentName }}</text>
          <text class="avg">综合 {{ s.avg }}</text>
        </view>
        <view class="bars">
          <view class="bar-row" v-for="d in DIM" :key="d.key">
            <text class="bar-label">{{ d.label }}</text>
            <view class="bar-track">
              <view class="bar-fill" :style="{ width: (s.radar[d.key] || 0) + '%' }"></view>
            </view>
            <text class="bar-val">{{ s.radar[d.key] || 0 }}</text>
          </view>
        </view>

        <view class="records" v-if="data.records && data.records.length">
          <text class="rec-title">过程性评价（{{ data.records.length }}）</text>
          <view class="rec" v-for="(r, i) in data.records.slice(0, 8)" :key="i">
            <text class="rec-dim">{{ ['德','智','体','美','劳'][DIM.findIndex(x=>x.key===r.dimension)] || r.dimension }}</text>
            <text class="rec-score">{{ r.score }}/5</text>
            <text class="rec-content">{{ r.content || r.evalType }}</text>
          </view>
        </view>
      </view>
    </block>
  </view>
</template>

<style scoped>
.page { min-height: 100vh; background: #f6f7fb; padding: 24rpx; }
.head { padding: 16rpx 8rpx 24rpx; }
.title { font-size: 34rpx; font-weight: 700; color: #1f2937; }
.sub { display: block; margin-top: 6rpx; font-size: 24rpx; color: #9ca3af; }
.tip, .empty { text-align: center; color: #9ca3af; font-size: 26rpx; padding: 60rpx 0; }
.card { background: #fff; border-radius: 20rpx; padding: 28rpx; margin-bottom: 24rpx; }
.card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.name { font-size: 30rpx; font-weight: 700; color: #1f2937; }
.avg { font-size: 26rpx; font-weight: 600; color: #d97706; }
.bar-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 14rpx; }
.bar-label { width: 40rpx; text-align: center; font-size: 26rpx; color: #6b7280; }
.bar-track { flex: 1; height: 18rpx; background: #f1f2f6; border-radius: 10rpx; overflow: hidden; }
.bar-fill { height: 100%; background: linear-gradient(90deg, #fbbf24, #f59e0b); border-radius: 10rpx; }
.bar-val { width: 56rpx; text-align: right; font-size: 24rpx; color: #9ca3af; }
.records { margin-top: 20rpx; border-top: 1rpx solid #f0f1f5; padding-top: 16rpx; }
.rec-title { font-size: 24rpx; color: #9ca3af; }
.rec { display: flex; align-items: center; gap: 16rpx; margin-top: 12rpx; font-size: 24rpx; color: #4b5563; }
.rec-dim { width: 40rpx; text-align: center; background: #fff7ed; color: #d97706; border-radius: 8rpx; padding: 2rpx 0; }
.rec-score { color: #6b7280; }
.rec-content { flex: 1; }
</style>
