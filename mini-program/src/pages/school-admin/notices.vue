<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">📢 公告管理</view>

    <view class="bar">
      <text class="sc">共 {{ notices.length }} 条公告</text>
      <text class="act" @click="showNoticeForm = !showNoticeForm">{{ showNoticeForm ? '收起' : '写公告' }}</text>
    </view>

    <view v-if="showNoticeForm" class="form">
      <input v-model="noticeForm.title" class="inp" placeholder="公告标题（必填）" />
      <textarea v-model="noticeForm.content" class="inp area" placeholder="公告内容（选填）" />
      <button class="btn send" :disabled="saving" @click="sendNotice">{{ saving ? '发送中…' : '发送公告' }}</button>
    </view>

    <Skeleton v-if="loading" :rows="3" />

    <EmptyState v-else-if="!notices.length" icon="📢" text="暂无学校公告" hint="写一条公告发给全体教师" />

    <view v-else class="list">
      <view class="notice-item" v-for="n in notices" :key="n.id">
        <view class="notice-item-hd">
          <text class="notice-item-title">{{ n.title }}</text>
          <text class="act del" @click.stop="delNotice(n)">删除</text>
        </view>
        <text class="notice-item-content" v-if="n.content">{{ n.content }}</text>
        <text class="notice-item-time">{{ n.createdAt ? n.createdAt.slice(0, 10) : '' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const notices = ref([])
const loading = ref(false)
const saving = ref(false)
const showNoticeForm = ref(false)
const noticeForm = ref({ title: '', content: '' })

function getToken() { return uni.getStorageSync('sa_token') }

function apiCall(method, path, data) {
  const token = getToken()
  if (!token) { uni.reLaunch({ url: '/pages/login/login' }); throw new Error('未登录') }
  return new Promise((resolve, reject) => {
    const cloud = typeof wx !== 'undefined' && wx.cloud
    if (!cloud || typeof cloud.callContainer !== 'function') {
      return reject(new Error('当前环境不支持云托管私有链路'))
    }
    const opts = {
      config: { env: 'cloud1-3gqx8dzh2e4f2532' },
      path: '/api' + path,
      method,
      header: { 'content-type': 'application/json', 'X-WX-SERVICE': 'gardener', Authorization: 'Bearer ' + token },
      success: (r) => {
        const status = r.statusCode || (r.data && r.data.statusCode) || 200
        if (status === 401) {
          uni.removeStorageSync('sa_token'); uni.removeStorageSync('sa_user')
          uni.reLaunch({ url: '/pages/login/login' }); return reject(new Error('登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(r.data)
        else reject(new Error((r.data && (r.data.message || r.data.error)) || ('请求失败(' + status + ')')))
      },
      fail: (e) => reject(new Error((e && (e.errMsg || e.message)) || '网络异常')),
    }
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') opts.data = data
    cloud.callContainer(opts)
  })
}

async function loadNotices() {
  loading.value = true
  try {
    const r = await apiCall('GET', '/school-admin/notices') || { items: [], total: 0 }
    notices.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { notices.value = [] } finally { loading.value = false }
}

async function sendNotice() {
  if (!noticeForm.value.title) return uni.showToast({ title: '公告标题必填', icon: 'none' })
  saving.value = true
  try {
    await apiCall('POST', '/school-admin/notices', { title: noticeForm.value.title, content: noticeForm.value.content })
    showNoticeForm.value = false
    noticeForm.value = { title: '', content: '' }
    await loadNotices()
    uni.showToast({ title: '公告已发送', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '发送失败', icon: 'none' }) }
  saving.value = false
}

async function delNotice(n) {
  uni.showModal({
    title: '删除公告', content: '确定删除「' + n.title + '」？', confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/notices/' + n.id)
        notices.value = notices.value.filter(x => x.id !== n.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) }
    },
  })
}

onShow(loadNotices)
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 34rpx; font-weight: 800; color: var(--c-title); margin-bottom: 18rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: #e64340; }
.form { margin-bottom: 16rpx; background: var(--c-card); border-radius: 16rpx; padding: 24rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 14rpx 16rpx; margin-bottom: 14rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
.area { height: 150rpx; }
.btn.send { background: var(--c-primary); color: #fff; border-radius: 50rpx; height: 72rpx; line-height: 72rpx; font-size: 28rpx; }
.btn.send[disabled] { opacity: 0.6; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 6rpx 20rpx; }
.notice-item { padding: 14rpx 0; border-bottom: 1px solid var(--c-border); }
.notice-item:last-child { border-bottom: none; }
.notice-item-hd { display: flex; justify-content: space-between; align-items: center; }
.notice-item-title { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.notice-item-content { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.notice-item-time { display: block; font-size: 20rpx; color: var(--c-sub); margin-top: 4rpx; }
.loading { text-align: center; padding: 40rpx 0; }
</style>