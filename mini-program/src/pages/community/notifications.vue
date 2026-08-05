<template>
  <view class="page" :class="{ dark }">
    <view class="hd">🔔 通知中心</view>

    <view v-if="loading" class="loading">
      <text class="loading-text">加载中…</text>
    </view>

    <view v-else-if="!list.length" class="empty">
      <text class="empty-icon">🔕</text>
      <text class="empty-text">暂无通知</text>
    </view>

    <view v-else>
      <view class="bar">
        <text class="bar-text">共 {{ list.length }} 条通知</text>
        <text v-if="hasUnread" class="mark-all" @click="markAll">全部已读</text>
      </view>
      <view v-for="n in list" :key="n.id" class="item" :class="!n.read && 'unread'" @click="open(n)">
        <view class="ico" :class="'c-' + n.type">{{ icon(n.type) }}</view>
        <view class="body">
          <text class="title">{{ n.title }}</text>
          <text v-if="n.content" class="content">{{ n.content }}</text>
          <text class="time">{{ fmt(n.createdAt) }}</text>
        </view>
        <view v-if="!n.read" class="dot">●</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const list = ref([])
const loading = ref(false)

const hasUnread = computed(() => list.value.some(n => !n.read))

function icon(t) {
  const map = { notice: '📢', parent: '💬', homework: '📝', attendance: '📋', grade: '📊', system: '⚙️' }
  return map[t] || '🔔'
}

function fmt(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  if (isNaN(d)) return ''
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function open(n) {
  if (!n.read) {
    n.read = true
    api.patch('/notifications/' + n.id + '/read').catch(() => {})
  }
  if (n.link) {
    uni.navigateTo({ url: n.link })
  }
}

async function load() {
  loading.value = true
  try {
    const r = await api.get('/notifications').catch(() => [])
    list.value = Array.isArray(r) ? r : (r.items || [])
  } finally {
    loading.value = false
  }
}

async function markAll() {
  list.value.forEach(n => (n.read = true))
  api.post('/notifications/mark-all-read').catch(() => {})
}

onShow(load)
onPullDownRefresh(async () => { await load(); uni.stopPullDownRefresh() })
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.bar-text { font-size: 26rpx; color: var(--c-sub); }
.mark-all { font-size: 26rpx; color: var(--c-primary); cursor: pointer; }
.item { display: flex; align-items: flex-start; gap: 16rpx; background: var(--c-card); border-radius: 16rpx; padding: 20rpx; margin-bottom: 14rpx; box-shadow: 0 2rpx 8rpx var(--c-shadow); }
.item.unread { background: #fffbf0; }
.ico { width: 60rpx; height: 60rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28rpx; flex-shrink: 0; }
.c-notice { background: rgba(230,162,60,.15); }
.c-parent { background: rgba(7,193,96,.15); }
.c-homework { background: rgba(64,158,255,.15); }
.c-attendance { background: rgba(234,100,64,.15); }
.c-grade { background: rgba(156,39,176,.15); }
.c-system { background: rgba(158,158,158,.15); }
.body { flex: 1; min-width: 0; }
.title { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.content { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; line-height: 1.5; }
.time { display: block; font-size: 20rpx; color: var(--c-sub); margin-top: 8rpx; }
.dot { font-size: 16rpx; color: #e64340; margin-top: 8rpx; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.empty-icon { font-size: 60rpx; display: block; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; }
.loading { text-align: center; padding: 40rpx 0; }
.loading-text { font-size: 26rpx; color: var(--c-sub); }
</style>
