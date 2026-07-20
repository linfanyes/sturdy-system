<template>
  <view class="page" :class="{ dark }">
    <view class="hd">📥 消息中心</view>

    <view class="tabs">
      <view v-for="t in tabs" :key="t.k" class="tab" :class="{ on: tab === t.k }" @click="tab = t.k">
        {{ t.n }}<text v-if="t.count" class="badge">{{ t.count }}</text>
      </view>
    </view>

    <view v-if="!shown.length" class="empty">这里还没有消息</view>

    <view v-for="(it, i) in shown" :key="i" class="item" :class="'t-' + it.type" @click="open(it)">
      <view class="it-top">
        <text class="tag">{{ it.tag }}</text>
        <text v-if="it.pinned" class="pin">📌</text>
        <text class="time">{{ it.time }}</text>
      </view>
      <view class="it-title">{{ it.title }}</view>
      <view v-if="it.sub" class="it-sub clamp">{{ it.sub }}</view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const notices = ref([])
const todos = ref([])
const notes = ref([])

const tabs = computed(() => [
  { k: 'all', n: '全部' },
  { k: 'notice', n: '公告', count: notices.value.filter((n) => !n.endedAt).length },
  { k: 'todo', n: '待办', count: todos.value.filter((t) => !t.done).length },
  { k: 'note', n: '笔记', count: notes.value.filter((n) => n.favorite).length },
])
const tab = ref('all')

function fmt(ts) {
  if (!ts) return ''
  const d = new Date(typeof ts === 'number' ? ts : ts)
  if (isNaN(d)) return ''
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

const items = computed(() => {
  const arr = []
  notices.value.forEach((n) => arr.push({
    type: 'notice', tag: n.pinned ? '置顶公告' : '班级公告', pinned: n.pinned,
    title: n.title, sub: n.content, time: fmt(n.createdAt || n.updatedAt),
    ts: n.createdAt || n.updatedAt,
    raw: n,
  }))
  todos.value.forEach((t) => arr.push({
    type: 'todo', tag: t.done ? '已完成' : '待办', pinned: false,
    title: t.title, sub: t.date ? '日期：' + t.date : '', time: fmt(t.createdAt || t.updatedAt),
    ts: t.createdAt || t.updatedAt,
    raw: t,
  }))
  notes.value.forEach((n) => arr.push({
    type: 'note', tag: '笔记' + (n.favorite ? '·收藏' : ''), pinned: n.favorite,
    title: n.title, sub: n.content, time: fmt(n.updatedAt),
    ts: n.updatedAt,
    raw: n,
  }))
  return arr.sort((a, b) => new Date(b.ts || 0) - new Date(a.ts || 0))
})
const shown = computed(() => (tab.value === 'all' ? items.value : items.value.filter((x) => x.type === tab.value)))

function open(it) {
  if (it.type === 'notice') uni.navigateTo({ url: '/pages/notice/notice' })
  else if (it.type === 'todo') uni.navigateTo({ url: '/pages/todos/todos' })
  else uni.navigateTo({ url: '/pages/notes/notes' })
}

async function load() {
  const [n, t, k] = await Promise.all([
    api.get('/notices').catch(() => []),
    api.get('/todos').catch(() => []),
    api.get('/notes').catch(() => []),
  ])
  notices.value = Array.isArray(n) ? n : (n.items || [])
  todos.value = Array.isArray(t) ? t : (t.items || [])
  notes.value = Array.isArray(k) ? k : (k.items || [])
}
onShow(load)
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.tabs { display: flex; gap: 14rpx; margin-bottom: 20rpx; flex-wrap: wrap; }
.tab { background: var(--c-card); border-radius: 40rpx; padding: 12rpx 26rpx; font-size: 26rpx; color: var(--c-accent); display: flex; align-items: center; gap: 6rpx; }
.tab.on { background: #e6a23c; color: #fff; }
.badge { background: #e64340; color: #fff; border-radius: 20rpx; font-size: 18rpx; padding: 0 10rpx; min-width: 28rpx; text-align: center; }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.t-notice { border-left: 6rpx solid #e06c75; }
.t-todo { border-left: 6rpx solid #e6a23c; }
.t-note { border-left: 6rpx solid #409eff; }
.it-top { display: flex; align-items: center; gap: 12rpx; }
.tag { font-size: 22rpx; color: var(--c-accent); background: var(--c-card2); border-radius: 8rpx; padding: 4rpx 14rpx; }
.pin { font-size: 22rpx; }
.time { margin-left: auto; font-size: 22rpx; color: var(--c-sub); }
.it-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin: 12rpx 0 6rpx; }
.it-sub { font-size: 24rpx; color: var(--c-sub); }
.clamp { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty { text-align: center; color: var(--c-sub); padding: 80rpx 0; font-size: 26rpx; }
</style>
