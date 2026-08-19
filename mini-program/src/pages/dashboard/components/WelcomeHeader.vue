<template>
  <view class="header">
    <!-- 装饰光斑 -->
    <view class="h-orb h-orb-a"></view>
    <view class="h-orb h-orb-b"></view>
    <view class="h-orb h-orb-c"></view>
    <view class="h-avatar pulse-soft">
      <GrowthIcon :name="'bloom'" :size="40" />
    </view>
    <view class="h-main">
      <view class="hi">{{ greeting }}，<text class="hi-name">{{ auth.user?.name || '老师' }}</text></view>
      <view class="school">
        <text class="school-name">{{ auth.user?.school || '未设置学校' }}</text>
        <picker v-if="semesterList.length" :range="semesterList" range-key="name" :value="semesterIdx" @change="onSemesterChange">
          <text class="sem">{{ semesterList[semesterIdx]?.name || semesterName }} ▾</text>
        </picker>
        <text v-else-if="semesterName" class="sem"> · {{ semesterName }}</text>
      </view>
    </view>
    <view class="bell" @click="goNotifications">
      <text class="bell-icon">🔔</text>
      <view v-if="unreadCount > 0" class="bell-badge pulse-dot">{{ unreadCount > 99 ? '99+' : unreadCount }}</view>
    </view>
    <view class="moods">
      <text class="mood press-feedback" :class="currentMood === m && 'on'" v-for="(m, i) in moodOptions" :key="m" @click="pickMood(m)" :style="{ '--i': i }">
        <text class="mood-emoji">{{ moodEmojis[i] }}</text>
        <text class="mood-text">{{ m }}</text>
      </text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { auth, theme } from '../../../common/store'
import GrowthIcon from '../../../components/GrowthIcon/GrowthIcon.vue'

const props = defineProps({
  semesterList: { type: Array, default: () => [] },
  semesterIdx: { type: Number, default: 0 },
  semesterName: { type: String, default: '' },
  unreadCount: { type: Number, default: 0 },
})
const emit = defineEmits(['semesterChange', 'notifications'])

const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 11 ? '早上好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好'
})

const moodOptions = ['元气满满', '有些小累', '需要鼓励', '灵感爆棚']
const moodEmojis = ['🌟', '🥱', '🤗', '💡']
const currentMood = ref('')
const todayStr = new Date().toISOString().slice(0, 10)

function pickMood(m) {
  currentMood.value = m
  uni.setStorageSync('mood_' + todayStr, m)
  uni.showToast({ title: '已记录：' + m, icon: 'none' })
}
function onSemesterChange(e) { emit('semesterChange', e) }
function goNotifications() { emit('notifications') }
</script>

<style scoped>
.header {
  position: relative;
  overflow: hidden;
  padding: 28rpx 28rpx 20rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #fff3d6 0%, #ffe9b8 55%, #ffe0b2 100%);
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(214, 148, 38, 0.14);
}
/* 装饰光斑 */
.h-orb {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(2rpx);
}
.h-orb-a {
  width: 190rpx; height: 190rpx;
  right: -40rpx; top: -70rpx;
  background: radial-gradient(circle at 30% 30%, #fff6d8, #ffd479);
  opacity: 0.5;
  animation: float-orb 8s ease-in-out infinite;
}
.h-orb-b {
  width: 130rpx; height: 130rpx;
  right: 130rpx; bottom: -50rpx;
  background: radial-gradient(circle at 30% 30%, #ffe3ec, #ffb8cc);
  opacity: 0.4;
  animation: float-orb 10s ease-in-out infinite reverse;
}
.h-orb-c {
  width: 80rpx; height: 80rpx;
  left: 40%; top: -30rpx;
  background: radial-gradient(circle at 30% 30%, #e0f0fc, #b0d4f5);
  opacity: 0.35;
  animation: float-orb 12s ease-in-out infinite;
}
@keyframes float-orb {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(10rpx, -15rpx) rotate(5deg); }
  66% { transform: translate(-8rpx, 10rpx) rotate(-3deg); }
}
/* 头像 */
.h-avatar {
  width: 96rpx; height: 96rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #ffe7a8, #ffd479);
  display: flex; align-items: center; justify-content: center;
  font-size: 48rpx; flex-shrink: 0;
  box-shadow: 0 8rpx 20rpx rgba(214, 148, 38, 0.3);
}
.pulse-soft {
  animation: pulse-soft 3s ease-in-out infinite;
}
@keyframes pulse-soft {
  0%, 100% { box-shadow: 0 8rpx 20rpx rgba(214, 148, 38, 0.3); }
  50% { box-shadow: 0 8rpx 30rpx rgba(214, 148, 38, 0.45); }
}
/* 主内容 */
.h-main { flex: 1; min-width: 0; }
.hi {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--c-title);
  line-height: 1.35;
}
.hi-name { color: #b9821f; }
.school {
  color: rgba(74, 63, 53, 0.72);
  margin-top: 6rpx;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.school-name {
  max-width: 280rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sem { color: #d69426; font-weight: 600; }
/* 通知铃 */
.bell { position: relative; margin-left: auto; padding: 0 10rpx; cursor: pointer; }
.bell-icon { font-size: 36rpx; }
.bell-badge {
  position: absolute;
  top: -4rpx; right: 0;
  background: #e64340;
  color: #fff;
  font-size: 18rpx;
  min-width: 28rpx; height: 28rpx;
  line-height: 28rpx;
  text-align: center;
  border-radius: 14rpx;
  padding: 0 4rpx;
  font-weight: 600;
}
/* 脉冲红点 */
.pulse-dot::before {
  content: '';
  position: absolute;
  inset: -4rpx;
  border-radius: 18rpx;
  background: rgba(230, 67, 64, 0.3);
  animation: pulse-ring 1.5s ease-out infinite;
  z-index: -1;
}
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.6); opacity: 0; }
}
/* 心情 */
.moods { width: 100%; display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 4rpx; }
.mood {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 22rpx;
  padding: 10rpx 18rpx;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, 0.7);
  color: rgba(74, 63, 53, 0.75);
  transition: all 0.2s;
  animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  animation-delay: calc(var(--i, 0) * 0.06s + 0.3s);
}
.mood:active {
  transform: scale(0.92);
}
.mood.on {
  background: var(--c-primary);
  color: #fff;
  box-shadow: 0 4rpx 12rpx rgba(214, 148, 38, 0.35);
}
.mood-emoji { font-size: 24rpx; }
.mood-text { font-weight: 500; }
.press-feedback { transition: transform 0.15s, opacity 0.15s; }
.press-feedback:active { transform: scale(0.92); opacity: 0.9; }
@keyframes pop-in { from { opacity: 0; transform: scale(0.8); } to { opacity: 1; transform: scale(1); } }
/* 暗色 */
.dark .header {
  background: linear-gradient(135deg, #3a3020 0%, #4a3c22 55%, #573d22 100%);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.25);
}
.dark .h-orb-a { opacity: 0.3; }
.dark .h-orb-b { opacity: 0.25; }
.dark .h-orb-c { opacity: 0.2; }
.dark .h-avatar { background: linear-gradient(135deg, #6a5426, #8a6a2a); }
.dark .hi { color: #f2e8d8; }
.dark .hi-name { color: #ffd479; }
.dark .school { color: rgba(242, 232, 216, 0.65); }
.dark .sem { color: #ffce54; }
.dark .mood { background: rgba(38, 43, 52, 0.65); color: rgba(242, 232, 216, 0.7); }
.dark .mood.on { background: var(--c-primary); color: #1a1c22; }
</style>
