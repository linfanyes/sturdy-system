<template>
  <view class="card">
    <view class="card-h" @click="$emit('goCrud', 'schedules')">
      <text class="ch-t">🗓️ 今日课程（{{ dow[todayDow - 1] }}）</text><text class="ch-m">课表 ›</text>
    </view>
    <view v-if="todayLessons.length">
      <view v-for="(l, i) in todayLessons" :key="i" class="li">
        <text class="li-pos">{{ l.section || ('第' + l.period + '节') }}</text>
        <text class="li-t">{{ l.subject || '—' }}</text>
        <text class="li-s" v-if="l.teacher">{{ l.teacher }}</text>
      </view>
    </view>
    <view v-else class="empty">今天没有课程安排</view>
  </view>
</template>

<script setup>
defineProps({
  todayLessons: { type: Array, default: () => [] },
  todayDow: { type: Number, default: 1 },
})
defineEmits(['goCrud'])

const dow = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
</script>

<style scoped>
.card { margin-top: 20rpx; background: var(--c-card); border-radius: 20rpx; padding: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.card-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12rpx; }
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.li { display: flex; align-items: center; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 26rpx; }
.li:last-child { border-bottom: none; }
.li-pos { width: 110rpx; color: var(--c-accent); font-weight: 600; flex-shrink: 0; }
.li-t { flex: 1; color: var(--c-title); }
.li-s { color: var(--c-sub); font-size: 22rpx; margin-left: 16rpx; flex-shrink: 0; }
.empty { text-align: center; color: var(--c-sub); padding: 30rpx 0; font-size: 24rpx; }
</style>
