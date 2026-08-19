<template>
  <view class="card">
    <view class="card-h">
      <text class="ch-t">🏫 班级工作台</text>
      <text class="ch-m" @click="$emit('goCrud', 'students')">学生管理 ›</text>
    </view>
    <view class="ww-grid">
      <view class="ww-item" @click="$emit('goCrud', 'attendances')">
        <text class="ww-num">{{ weekAttRate }}%</text>
        <text class="ww-lb">本周出勤</text>
      </view>
      <view class="ww-item" @click="$emit('goCrud', 'homework')">
        <text class="ww-num warn">{{ pendingBySubject.length }}</text>
        <text class="ww-lb">待批科目</text>
      </view>
      <view class="ww-item" @click="$emit('goCrud', 'behavior')">
        <text class="ww-num">{{ weekBehaviorCount }}</text>
        <text class="ww-lb">行为记录</text>
      </view>
      <view class="ww-item" @click="$emit('goCrud', 'grades')">
        <text class="ww-num">{{ gradeList.length }}</text>
        <text class="ww-lb">考试次数</text>
      </view>
    </view>
    <view class="ww-detail" v-if="pendingBySubject.length">
      <text class="ww-detail-title">待批改作业：</text>
      <text class="ww-detail-text">{{ pendingBySubject.slice(0, 4).join('、') }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  weekAttRate: { type: Number, default: 100 },
  pendingBySubject: { type: Array, default: () => [] },
  weekBehaviorCount: { type: Number, default: 0 },
  gradeList: { type: Array, default: () => [] },
})
defineEmits(['goCrud'])
</script>

<style scoped>
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.ww-grid { display: flex; gap: 12rpx; margin-bottom: 10rpx; }
.ww-item { flex: 1; text-align: center; padding: 14rpx 0; background: var(--c-input); border-radius: 12rpx; }
.ww-num { display: block; font-size: 36rpx; font-weight: 800; color: var(--c-accent); }
.ww-num.warn { color: #e6a23c; }
.ww-lb { display: block; font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.ww-detail { padding: 8rpx 0 0; border-top: 1rpx solid var(--c-border); }
.ww-detail-title { font-size: 22rpx; color: var(--c-sub); }
.ww-detail-text { font-size: 22rpx; color: var(--c-title); }
</style>
