<template>
  <view class="page" :class="{ dark }">
    <view class="hd">📥 消息中心</view>

    <view class="tabs">
      <view v-for="t in tabs" :key="t.k" class="tab" :class="{ on: tab === t.k }" @click="tab = t.k">
        {{ t.n }}<text v-if="t.count" class="badge">{{ t.count }}</text>
      </view>
    </view>

    <view v-if="loading" class="loading">
      <Skeleton :rows="3" />
    </view>

    <EmptyState v-else-if="!shown.length" icon="📭" text="这里还没有消息" hint="公告、通知、消息都会显示在这里" />

    <view v-else>
      <view v-for="(it, i) in shown" :key="i" class="item" :class="['t-' + it.type, !it.read && 'unread']" @click="open(it)">
        <view class="it-top">
          <text class="tag">{{ it.tag }}</text>
          <text v-if="!it.read" class="unread-dot">●</text>
          <text v-if="it.pinned" class="pin">📌</text>
          <text class="time">{{ it.time }}</text>
        </view>
        <view class="it-title">{{ it.title }}</view>
        <view v-if="it.sub" class="it-sub clamp">{{ it.sub }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'
const dark = computed(() => theme.mode === 'dark')

const notifications = ref([])
const messages = ref([])
const loading = ref(false)

const tabs = computed(() => [
  { k: 'all', n: '全部', count: unreadCount.value },
  { k: 'notice', n: '公告', count: noticesUnread.value },
  { k: 'notification', n: '通知', count: notificationsUnread.value },
  { k: 'message', n: '消息', count: messagesUnread.value },
])
const tab = ref('all')

const unreadCount = computed(() => {
  return noticesUnread.value + notificationsUnread.value + messagesUnread.value
})

function fmt(ts) {
  if (!ts) return ''
  const d = new Date(typeof ts === 'number' ? ts : ts)
  if (isNaN(d)) return ''
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

const notices = ref([])
const todos = ref([])
const notes = ref([])

const items = computed(() => {
  const arr = []
  // 公告
  notices.value.forEach((n) => arr.push({
    type: 'notice', tag: n.pinned ? '置顶公告' : '班级公告', pinned: n.pinned, read: true,
    title: n.title, sub: n.content, time: fmt(n.createdAt || n.updatedAt),
    ts: n.createdAt || n.updatedAt,
    raw: n,
  }))
  // 通知（来自 /notifications）
  notifications.value.forEach((n) => arr.push({
    type: 'notification', tag: nTypeTag(n.type), pinned: false, read: n.read,
    title: n.title, sub: n.content, time: fmt(n.createdAt),
    ts: n.createdAt, link: n.link,
    raw: n,
  }))
  // 消息（来自 /messages）
  messages.value.forEach((m) => arr.push({
    type: 'message', tag: mTypeTag(m.type), pinned: false, read: m.read,
    title: m.title, sub: m.content, time: fmt(m.createdAt),
    ts: m.createdAt,
    raw: m,
  }))
  // 待办
  todos.value.forEach((t) => arr.push({
    type: 'todo', tag: t.done ? '已完成' : '待办', pinned: false, read: true,
    title: t.title, sub: t.date ? '日期：' + t.date : '', time: fmt(t.createdAt || t.updatedAt),
    ts: t.createdAt || t.updatedAt,
    raw: t,
  }))
  // 笔记
  notes.value.forEach((n) => arr.push({
    type: 'note', tag: '笔记' + (n.favorite ? '·收藏' : ''), pinned: n.favorite, read: true,
    title: n.title, sub: n.content, time: fmt(n.updatedAt),
    ts: n.updatedAt,
    raw: n,
  }))
  return arr.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
})

const noticesUnread = computed(() => items.value.filter(i => i.type === 'notice' && !i.read).length)
const notificationsUnread = computed(() => items.value.filter(i => i.type === 'notification' && !i.read).length)
const messagesUnread = computed(() => items.value.filter(i => i.type === 'message' && !i.read).length)

const shown = computed(() => {
  if (tab.value === 'all') return items.value
  if (tab.value === 'notice') return items.value.filter(x => x.type === 'notice')
  if (tab.value === 'notification') return items.value.filter(x => x.type === 'notification')
  if (tab.value === 'message') return items.value.filter(x => x.type === 'message')
  if (tab.value === 'todo') return items.value.filter(x => x.type === 'todo')
  if (tab.value === 'note') return items.value.filter(x => x.type === 'note')
  return items.value
})

function nTypeTag(t) {
  const map = { notice: '公告', parent: '家长', homework: '作业', attendance: '考勤', grade: '成绩', system: '系统' }
  return map[t] || '通知'
}

function mTypeTag(t) {
  const map = { system: '系统', parent: '家长', notice: '公告' }
  return map[t] || '消息'
}

function open(it) {
  // 标记已读
  if (!it.read) {
    it.read = true
    if (it.type === 'notification') {
      api.patch('/notifications/' + it.raw.id + '/read').catch(() => {})
    }
  }
  // 跳转
  if (it.link) {
    uni.navigateTo({ url: it.link })
  } else if (it.type === 'notice') {
    uni.navigateTo({ url: '/pages/notice/notice' })
  } else if (it.type === 'todo') {
    uni.navigateTo({ url: '/pages/todos/todos' })
  } else if (it.type === 'note') {
    uni.navigateTo({ url: '/pages/notes/notes' })
  } else if (it.type === 'message' && it.raw.type === 'parent') {
    uni.navigateTo({ url: '/pages/im/im' })
  }
}

async function load() {
  loading.value = true
  try {
    const [n, t, k, nf, msg] = await Promise.all([
      api.get('/notices').catch(() => []),
      api.get('/todos').catch(() => []),
      api.get('/notes').catch(() => []),
      api.get('/notifications').catch(() => []),
      api.get('/messages').catch(() => []),
    ])
    notices.value = Array.isArray(n) ? n : (n.items || [])
    todos.value = Array.isArray(t) ? t : (t.items || [])
    notes.value = Array.isArray(k) ? k : (k.items || [])
    notifications.value = Array.isArray(nf) ? nf : (nf.items || [])
    messages.value = Array.isArray(msg) ? msg : (msg.items || [])
  } finally {
    loading.value = false
  }
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.loading { display:flex; justify-content:center; padding:30rpx 0; }
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.tabs { display: flex; gap: 14rpx; margin-bottom: 20rpx; flex-wrap: wrap; }
.tab { background: var(--c-card); border-radius: 40rpx; padding: 12rpx 26rpx; font-size: 26rpx; color: var(--c-accent); display: flex; align-items: center; gap: 6rpx; }
.tab.on { background: #e6a23c; color: #fff; }
.badge { background: #e64340; color: #fff; border-radius: 20rpx; font-size: 18rpx; padding: 0 10rpx; min-width: 28rpx; text-align: center; }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.item.unread { background: #fffbf0; }
.t-notice { border-left: 6rpx solid #e06c75; }
.t-notification { border-left: 6rpx solid #07c160; }
.t-message { border-left: 6rpx solid #9c27b0; }
.t-todo { border-left: 6rpx solid #e6a23c; }
.t-note { border-left: 6rpx solid #409eff; }
.it-top { display: flex; align-items: center; gap: 12rpx; }
.tag { font-size: 22rpx; color: var(--c-accent); background: var(--c-card2); border-radius: 8rpx; padding: 4rpx 14rpx; }
.pin { font-size: 22rpx; }
.unread-dot { font-size: 16rpx; color: #e64340; }
.time { margin-left: auto; font-size: 22rpx; color: var(--c-sub); }
.it-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin: 12rpx 0 6rpx; }
.it-sub { font-size: 24rpx; color: var(--c-sub); }
.clamp { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; }
.empty-icon { font-size: 60rpx; display: block; margin-bottom: 16rpx; }
.empty-text { font-size: 26rpx; }
.loading { text-align: center; padding: 40rpx 0; }
.loading-text { font-size: 26rpx; color: var(--c-sub); }
</style>
