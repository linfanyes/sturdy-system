<template>
  <view class="header">
    <view class="h-orb h-orb-a" />
    <view class="h-orb h-orb-b" />
    <view class="h-avatar"><GrowthIcon :name="'bloom'" :size="40" /></view>
    <view class="h-main">
      <view class="hi">{{ greeting }}，<text class="hi-name">{{ auth.user?.name || '老师' }}</text></view>
      <view class="school">{{ auth.user?.school || '未设置学校' }}
        <picker v-if="semesterList.length" :range="semesterList" range-key="name" :value="semesterIdx" @change="onSemesterChange">
          <text class="sem">{{ semesterList[semesterIdx]?.name || semesterName }} ▾</text>
        </picker>
        <text v-else-if="semesterName" class="sem"> · {{ semesterName }}</text>
      </view>
    </view>
    <view class="bell" @click="goNotifications">
      <text class="bell-icon">🔔</text>
      <text v-if="unreadCount > 0" class="bell-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</text>
    </view>
    <view class="moods">
      <text class="mood" :class="currentMood === m && 'on'" v-for="(m, i) in moodOptions" :key="m" @click="pickMood(m)">{{ moodEmojis[i] }} {{ m }}</text>
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
  position: relative; overflow: hidden; padding: 28rpx 28rpx 20rpx; border-radius: 28rpx;
  background: linear-gradient(135deg, #fff3d6 0%, #ffe9b8 55%, #ffe0b2 100%);
  display: flex; flex-wrap: wrap; align-items: flex-start; gap: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(214, 148, 38, 0.14);
}
.h-orb { position: absolute; border-radius: 50%; pointer-events: none; }
.h-orb-a { width: 190rpx; height: 190rpx; right: -40rpx; top: -70rpx; background: radial-gradient(circle at 30% 30%, #fff6d8, #ffd479); opacity: 0.5; }
.h-orb-b { width: 130rpx; height: 130rpx; right: 130rpx; bottom: -50rpx; background: radial-gradient(circle at 30% 30%, #ffe3ec, #ffb8cc); opacity: 0.4; }
.h-avatar {
  width: 96rpx; height: 96rpx; border-radius: 28rpx;
  background: linear-gradient(135deg, #ffe7a8, #ffd479);
  display: flex; align-items: center; justify-content: center; font-size: 48rpx; flex-shrink: 0;
  box-shadow: 0 8rpx 20rpx rgba(214, 148, 38, 0.3);
}
.h-main { flex: 1; min-width: 0; }
.hi { font-size: 40rpx; font-weight: 700; color: var(--c-title); line-height: 1.35; }
.hi-name { color: #b9821f; }
.school { color: rgba(74, 63, 53, 0.72); margin-top: 6rpx; font-size: 24rpx; }
.sem { color: #d69426; font-weight: 600; }
.moods { width: 100%; display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 4rpx; }
.mood { font-size: 22rpx; padding: 8rpx 18rpx; border-radius: 30rpx; background: rgba(255, 255, 255, 0.7); color: rgba(74, 63, 53, 0.75); }
.mood.on { background: var(--c-primary); color: #fff; }
.bell { position: relative; margin-left: auto; padding: 0 10rpx; }
.bell-icon { font-size: 36rpx; }
.bell-badge { position: absolute; top: -4rpx; right: 0; background: #e64340; color: #fff; font-size: 18rpx; min-width: 28rpx; height: 28rpx; line-height: 28rpx; text-align: center; border-radius: 14rpx; padding: 0 4rpx; }
.dark .header { background: linear-gradient(135deg, #3a3020 0%, #4a3c22 55%, #573d22 100%); box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.25); }
.dark .h-orb-a { opacity: 0.3; }
.dark .h-orb-b { opacity: 0.25; }
.dark .h-avatar { background: linear-gradient(135deg, #6a5426, #8a6a2a); box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.3); }
.dark .hi { color: #f2e8d8; }
.dark .hi-name { color: #ffd479; }
.dark .school { color: rgba(242, 232, 216, 0.65); }
.dark .sem { color: #ffce54; }
.dark .mood { background: rgba(38, 43, 52, 0.65); color: rgba(242, 232, 216, 0.7); }
.dark .mood.on { background: var(--c-primary); color: #1a1c22; }
</style>
