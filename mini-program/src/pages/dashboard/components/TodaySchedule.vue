<template>
  <view class="card pop-in">
    <view class="card-h" @click="$emit('goCrud', 'schedules')">
      <text class="ch-t">🗓️ 今日课程（{{ dow[todayDow - 1] }}）</text>
      <text class="ch-m">课表 ›</text>
    </view>
    <view v-if="todayLessons.length" class="lesson-list">
      <view v-for="(l, i) in todayLessons" :key="i" class="li pop-in" :style="{ '--i': i }">
        <view class="li-dot" :class="i === 0 && 'active'"></view>
        <view class="li-main">
          <text class="li-t">{{ l.subject || '—' }}</text>
          <text class="li-s" v-if="l.teacher">{{ l.teacher }}</text>
        </view>
        <text class="li-pos">{{ l.section || ('第' + l.period + '节') }}</text>
      </view>
    </view>
    <view v-else class="empty">
      <text class="empty-icon">🏖️</text>
      <text class="empty-text">今天没有课程安排</text>
    </view>
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
.card {
  margin-top: 20rpx;
  background: var(--c-card);
  border-radius: var(--r-lg);
  padding: 24rpx;
  box-shadow: var(--c-shadow-paper);
  position: relative;
  overflow: hidden;
}
.card::before {
  content: '';
  position: absolute;
  top: 0; left: 15%; right: 15%;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
}
.card-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.ch-t { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.ch-m { font-size: 22rpx; color: var(--c-sub); }
.lesson-list { display: flex; flex-direction: column; gap: 2rpx; }
.li {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 0;
  border-bottom: 1px solid var(--c-border);
}
.li:last-child { border-bottom: none; }
.li-dot {
  width: 12rpx; height: 12rpx;
  border-radius: 50%;
  background: var(--c-border);
  flex-shrink: 0;
}
.li-dot.active {
  background: var(--c-success);
  box-shadow: 0 0 8rpx rgba(7, 193, 96, 0.4);
}
.li-main { flex: 1; min-width:: 0; }
.li-t { font-size: 26rpx; color: var(--c-title); display: block; }
.li-s { font-size: 22rpx; color: var(--c-sub); display: block; margin-top: 2rpx; }
.li-pos {
  font-size: 22rpx;
  color: var(--c-accent);
  font-weight: 600;
  flex-shrink: 0;
}
.empty {
  text-align: center;
  padding: 40rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}
.empty-icon { font-size: 48rpx; }
.empty-text { font-size: 24rpx; color: var(--c-sub); }
/* 弹出动画 */
.pop-in {
  animation: pop-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i, 0) * 0.06s);
}
@keyframes pop-in {
  from { opacity: 0; transform: translateX(-14rpx); }
  to { opacity: 1; transform: translateX(0); }
}
</style>
