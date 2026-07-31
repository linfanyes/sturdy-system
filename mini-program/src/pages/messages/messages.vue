<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">💬 留言板</view>

    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'inbox' }" @click="switchTab('inbox')">
        收件箱<text v-if="unreadCount" class="badge">{{ unreadCount }}</text>
      </view>
      <view class="tab" :class="{ on: tab === 'sent' }" @click="switchTab('sent')">已发送</view>
    </view>

    <view class="toolbar">
      <text v-if="tab === 'inbox' && unreadCount" class="act" @click="markAllRead">📭 一键全部已读</text>
      <text class="act" @click="showCompose = true">✏️ 写留言</text>
    </view>

    <Skeleton v-if="loading" :rows="3" />

    <EmptyState v-else-if="!shown.length" icon="💬" :text="tab === 'inbox' ? '收件箱为空' : '还没有发送过留言'" hint="点击右上角写留言" />

    <view v-else class="list">
      <view
        v-for="it in shown"
        :key="it.id"
        class="item"
        :class="{ unread: !it.read }"
        @click="openDetail(it)"
      >
        <view class="it-top">
          <text class="sender">{{ tab === 'inbox' ? it.senderName : '发给 ' + it.recipientName }}</text>
          <text v-if="!it.read && tab === 'inbox'" class="unread-dot">●</text>
          <text class="time">{{ fmt(it.createdAt) }}</text>
        </view>
        <view class="it-title">{{ it.title }}</view>
        <view v-if="it.content" class="it-sub clamp">{{ it.content }}</view>
      </view>
    </view>

    <!-- 写留言弹窗 -->
    <view v-if="showCompose" class="mask" @click="showCompose = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">写留言</view>
        <view class="field" v-if="!isParent">
          <text class="label">收件人</text>
          <picker :range="recipientOptions" range-key="label" @change="onRecipientPick">
            <view class="picker">{{ recipientLabel }}</view>
          </picker>
        </view>
        <view class="field" v-else>
          <text class="label">收件人（教师）</text>
          <view class="readonly">教师</view>
        </view>
        <view class="field">
          <text class="label">标题</text>
          <input v-model="composeForm.title" class="inp" placeholder="留言标题" maxlength="100" />
        </view>
        <view class="field">
          <text class="label">内容</text>
          <textarea v-model="composeForm.content" class="inp area" placeholder="留言内容" maxlength="2000" />
        </view>
        <view class="btn-row">
          <button class="btn cancel" @click="showCompose = false">取消</button>
          <button class="btn send" :disabled="sending" @click="sendMessage">{{ sending ? '发送中…' : '发送' }}</button>
        </view>
      </view>
    </view>

    <!-- 留言详情弹窗 -->
    <view v-if="detailMsg" class="mask" @click="detailMsg = null">
      <view class="sheet" @click.stop>
        <view class="sh-t">{{ detailMsg.title }}</view>
        <view class="sh-meta">
          <text>{{ tab === 'inbox' ? '来自 ' + detailMsg.senderName : '发给 ' + detailMsg.recipientName }}</text>
          <text class="sh-time">{{ fmt(detailMsg.createdAt) }}</text>
        </view>
        <view class="sh-content">{{ detailMsg.content || '暂无内容' }}</view>
        <view class="sh-acts">
          <text v-if="tab === 'inbox' && !detailMsg.read" class="sh-act" @click="markRead(detailMsg)">标记已读</text>
          <text class="sh-act del" @click="deleteMsg(detailMsg)">删除</text>
        </view>
        <button class="btn cancel" @click="detailMsg = null">关闭</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow, onPullDownRefresh } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme, auth } from '../../common/store'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const tab = ref('inbox')
const inboxList = ref([])
const sentList = ref([])
const loading = ref(false)
const showCompose = ref(false)
const detailMsg = ref(null)
const sending = ref(false)
const recipients = ref([])

const composeForm = ref({
  recipientId: '',
  recipientRole: 'teacher',
  title: '',
  content: '',
})

const isParent = computed(() => {
  return !!(auth.user && auth.user.role === 'parent')
})

const recipientOptions = computed(() =>
  recipients.value.map(r => ({ id: r.id, label: r.name + (r.role ? '（' + r.role + '）' : '') }))
)
const recipientLabel = computed(() => {
  const r = recipients.value.find(x => x.id === composeForm.value.recipientId)
  return r ? r.name + (r.role ? '（' + r.role + '）' : '') : '请选择收件人'
})

function onRecipientPick(e) {
  const idx = e.detail.value
  const opt = recipientOptions.value[idx]
  if (opt) {
    composeForm.value.recipientId = opt.id
    const r = recipients.value.find(x => x.id === opt.id)
    composeForm.value.recipientRole = r ? (r.role === 'parent' ? 'parent' : 'teacher') : 'teacher'
  }
}

const unreadCount = computed(() => inboxList.value.filter(m => !m.read).length)

const shown = computed(() => tab.value === 'inbox' ? inboxList.value : sentList.value)

function fmt(ts) {
  if (!ts) return ''
  const d = new Date(typeof ts === 'number' ? ts : ts)
  if (isNaN(d.getTime())) return ''
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const pad = (n) => String(n).padStart(2, '0')
  const time = pad(d.getHours()) + ':' + pad(d.getMinutes())
  if (isToday) return '今天 ' + time
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return '昨天 ' + time
  return (d.getMonth() + 1) + '-' + d.getDate() + ' ' + time
}

function switchTab(t) {
  tab.value = t
}

async function load() {
  loading.value = true
  try {
    const [inbox, sent] = await Promise.all([
      api.get('/messages?skip=0&take=20').catch(() => []),
      api.get('/messages/sent?skip=0&take=20').catch(() => []),
    ])
    inboxList.value = Array.isArray(inbox) ? inbox : (inbox.items || [])
    sentList.value = Array.isArray(sent) ? sent : (sent.items || [])
  } catch (e) {
    inboxList.value = []
    sentList.value = []
  } finally {
    loading.value = false
  }
}

async function loadRecipients() {
  try {
    const r = await api.get('/messages/recipients').catch(() => [])
    recipients.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) {
    recipients.value = []
  }
}

async function sendMessage() {
  if (sending.value) return
  if (!composeForm.value.title.trim()) return uni.showToast({ title: '请填写标题', icon: 'none' })
  if (!composeForm.value.content.trim()) return uni.showToast({ title: '请填写内容', icon: 'none' })

  if (isParent.value) {
    // 家长发送消息：直接给教师发送
    if (!composeForm.value.recipientId && !auth.user?.teacherId) {
      return uni.showToast({ title: '无法确定收件人教师', icon: 'none' })
    }
  } else {
    if (!composeForm.value.recipientId) return uni.showToast({ title: '请选择收件人', icon: 'none' })
  }

  sending.value = true
  try {
    const payload = {
      title: composeForm.value.title.trim(),
      content: composeForm.value.content.trim(),
    }
    if (isParent.value) {
      payload.recipientId = composeForm.value.recipientId || auth.user?.teacherId
      payload.recipientRole = 'teacher'
      payload.type = 'direct'
    } else {
      payload.recipientId = composeForm.value.recipientId
      payload.recipientRole = composeForm.value.recipientRole
    }
    await api.post('/messages', payload)
    showCompose.value = false
    composeForm.value = { recipientId: '', recipientRole: 'teacher', title: '', content: '' }
    uni.showToast({ title: '留言已发送', icon: 'success' })
    load()
  } catch (e) {
    uni.showToast({ title: '发送失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    sending.value = false
  }
}

async function markRead(msg) {
  try {
    await api.patch('/messages/' + msg.id + '/read')
    msg.read = true
    const item = inboxList.value.find(m => m.id === msg.id)
    if (item) item.read = true
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function markAllRead() {
  uni.showLoading({ title: '标记中…', mask: true })
  try {
    await api.patch('/messages/mark-all-read')
    inboxList.value.forEach(m => { m.read = true })
    uni.showToast({ title: '已全部标记为已读', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '操作失败：' + (e.message || ''), icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

async function deleteMsg(msg) {
  uni.showModal({
    title: '删除留言',
    content: '确定删除这条留言吗？',
    confirmColor: '#e64340',
    success: async (r) => {
      if (!r.confirm) return
      try {
        await api.del('/messages/' + msg.id)
        if (tab.value === 'inbox') {
          inboxList.value = inboxList.value.filter(m => m.id !== msg.id)
        } else {
          sentList.value = sentList.value.filter(m => m.id !== msg.id)
        }
        detailMsg.value = null
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '删除失败：' + (e.message || ''), icon: 'none' })
      }
    },
  })
}

function openDetail(msg) {
  detailMsg.value = msg
  if (tab.value === 'inbox' && !msg.read) {
    markRead(msg)
  }
}

onShow(async () => {
  await Promise.all([load(), loadRecipients()])
})
onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 36rpx; font-weight: 800; color: var(--c-accent); text-align: center; margin-bottom: 20rpx; }
.tabs { display: flex; gap: 14rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; background: var(--c-card); border-radius: 40rpx; padding: 14rpx 0; font-size: 28rpx; color: var(--c-sub); font-weight: 600; position: relative; }
.tab.on { background: #e6a23c; color: #fff; }
.badge { position: absolute; top: -8rpx; right: 20rpx; background: #e64340; color: #fff; border-radius: 20rpx; font-size: 18rpx; padding: 0 10rpx; min-width: 28rpx; text-align: center; line-height: 1.6; }
.toolbar { display: flex; justify-content: space-between; margin-bottom: 16rpx; }
.act { font-size: 26rpx; color: #409eff; padding: 8rpx 20rpx; background: var(--c-card); border-radius: 30rpx; }
.list { }
.item { background: var(--c-card); border-radius: 16rpx; padding: 22rpx; margin-bottom: 16rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.item.unread { background: #fffbf0; border-left: 6rpx solid #e6a23c; }
.it-top { display: flex; align-items: center; gap: 12rpx; }
.sender { font-size: 24rpx; color: var(--c-accent); font-weight: 600; }
.unread-dot { font-size: 16rpx; color: #e64340; }
.time { margin-left: auto; font-size: 22rpx; color: var(--c-sub); }
.it-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin: 12rpx 0 6rpx; }
.it-sub { font-size: 24rpx; color: var(--c-sub); }
.clamp { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 写留言弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 60; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 36rpx; box-sizing: border-box; max-height: 85vh; overflow-y: auto; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 20rpx; text-align: center; }
.sh-meta { display: flex; justify-content: space-between; font-size: 24rpx; color: var(--c-sub); margin-bottom: 16rpx; }
.sh-time { color: var(--c-sub); }
.sh-content { font-size: 28rpx; color: var(--c-title); line-height: 1.8; white-space: pre-wrap; margin-bottom: 20rpx; padding: 20rpx; background: var(--c-card2); border-radius: 12rpx; }
.sh-acts { display: flex; gap: 24rpx; margin-bottom: 16rpx; }
.sh-act { font-size: 26rpx; color: #409eff; padding: 8rpx 20rpx; background: var(--c-card2); border-radius: 24rpx; }
.sh-act.del { color: #e64340; }
.field { margin-bottom: 18rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; }
.readonly { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-sub); background: var(--c-input); min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.area { height: 200rpx; }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.send { background: var(--c-primary); color: #fff; }
.btn.send[disabled] { opacity: 0.6; }
.loading { text-align: center; padding: 40rpx 0; }
</style>