<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="topbar"><text class="mtitle">📚 学科工具</text></view>
    <view class="grid">
      <view
        v-for="s in subjects"
        :key="s.subject"
        class="cell"
        @click="go(s.subject)"
      >
        <view class="ic">{{ s.icon }}</view>
        <view class="lb">{{ s.subject }}工具</view>
      </view>
    </view>
    <view v-if="!subjects.length" class="empty">暂无可用的学科工具</view>
  </view>
</template>
<script setup>
import { computed } from 'vue'
import { auth, theme } from '../../common/store'
import { SUBJECT_LIST, getTeacherSubjects } from '../../common/subject-schema'

// P1：学科工具入口按教师任教学科过滤（subjects 优先，回退 subject，都空=全部学科）
const teacherSubjects = getTeacherSubjects(auth.user?.subject, auth.user?.subjects)
const subjects = computed(() => SUBJECT_LIST.filter((s) => teacherSubjects.includes(s.subject)))

function go(subject) {
  uni.navigateTo({ url: '/pages/quick/subject-list?subject=' + encodeURIComponent(subject) })
}
</script>
<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.topbar { margin-bottom: 20rpx; }
.mtitle { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.cell { background: var(--c-card); border-radius: 16rpx; padding: 24rpx 16rpx; text-align: center; }
.ic { font-size: 48rpx; margin-bottom: 8rpx; }
.lb { font-size: 24rpx; color: var(--c-text); font-weight: 600; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; font-size: 28rpx; }
</style>