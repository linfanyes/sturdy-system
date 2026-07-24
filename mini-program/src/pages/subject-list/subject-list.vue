<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="hd-icon" :style="{ background: subjectMeta.color + '22', color: subjectMeta.color }">
        {{ subjectMeta.icon }}
      </view>
      <view class="hd-info">
        <view class="hd-title">{{ subject }}工具</view>
        <view class="hd-desc">{{ subjectMeta.desc }}</view>
      </view>
    </view>

    <view class="grid">
      <view
        v-for="t in tools"
        :key="t.key"
        class="cell"
        @click="go(t)"
      >
        <view class="ic">{{ t.icon }}</view>
        <view class="lb">{{ t.title }}</view>
      </view>
    </view>

    <view v-if="!tools.length" class="empty">该学科暂无工具</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { auth, theme } from '../../common/store'
import { SUBJECT_LIST, getToolsBySubject } from '../../common/subject-schema'

const dark = computed(() => theme.mode === 'dark')
const subject = ref('')
const tools = ref([])

const subjectMeta = computed(() => {
  return SUBJECT_LIST.find((s) => s.subject === subject.value) || { icon: '📚', color: '#9aa0a6', desc: '' }
})

onLoad((q) => {
  subject.value = q && q.subject ? decodeURIComponent(q.subject) : ''
  tools.value = getToolsBySubject(subject.value)
  uni.setNavigationBarTitle({ title: subject.value + '工具' })
})

function go(t) {
  // 数学工具跳独立页面，其他学科工具跳 subject 页面
  if (t.path) {
    uni.navigateTo({ url: t.path })
  } else if (t.subjectKey) {
    uni.navigateTo({ url: '/pages/subject/subject?type=' + encodeURIComponent(t.subjectKey) })
  }
}

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})
</script>

<style scoped>
.page { padding: 30rpx; }
.hd { display: flex; align-items: center; gap: 20rpx; margin-bottom: 30rpx; }
.hd-icon { width: 96rpx; height: 96rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; font-size: 52rpx; }
.hd-info { flex: 1; }
.hd-title { font-size: 34rpx; font-weight: 700; color: var(--c-title); }
.hd-desc { font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.cell { background: var(--c-card); border-radius: 20rpx; padding: 30rpx 10rpx; display: flex; flex-direction: column; align-items: center; }
.ic { font-size: 56rpx; }
.lb { margin-top: 10rpx; color: var(--c-title); font-size: 24rpx; text-align: center; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; font-size: 28rpx; }
</style>
