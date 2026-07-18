<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">
      <text class="avatar">{{ me.avatar || '🍎' }}</text>
      <view class="info">
        <text class="name">{{ me.name || '老师' }}</text>
        <text class="sub">{{ me.subject }} · {{ me.school || '未填学校' }}</text>
      </view>
    </view>

    <view class="card">
      <view class="row"><text class="lab">姓名</text><input v-model="form.name" class="val" /></view>
      <view class="row"><text class="lab">任教科目</text><input v-model="form.subject" class="val" /></view>
      <view class="row"><text class="lab">学校</text><input v-model="form.school" class="val" /></view>
      <view class="row"><text class="lab">学期</text><input v-model="form.term" class="val" /></view>
      <view class="row col">
        <text class="lab">个性签名</text>
        <textarea v-model="form.motto" class="val area" placeholder="一句话签名" />
      </view>
      <view class="row"><text class="lab">头像 emoji</text><input v-model="form.avatar" class="val" placeholder="如 🍎" /></view>
    </view>

    <view class="card">
      <view class="row">
        <text class="lab">深色模式</text>
        <switch :checked="theme.mode === 'dark'" @change="onTheme" color="#3fd07f" />
      </view>
    </view>

    <button class="save" :disabled="saving" @click="save">保存资料</button>
    <button class="logout" @click="logout">退出登录</button>
  </view>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import api from '../../common/request'
import { theme, setTheme, setUser, logout as doLogout } from '../../common/store'

const me = reactive({})
const form = reactive({ name: '', subject: '', school: '', term: '', motto: '', avatar: '' })
const saving = ref(false)

async function load() {
  try {
    const u = await api.get('/users/me')
    Object.assign(me, u)
    Object.assign(form, {
      name: u.name || '',
      subject: u.subject || '',
      school: u.school || '',
      term: u.term || '',
      motto: u.motto || '',
      avatar: u.avatar || '',
    })
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}
onShow(load)

function onTheme(e) {
  setTheme(e.detail.value ? 'dark' : 'light')
}

async function save() {
  saving.value = true
  try {
    const u = await api.put('/users/me', { ...form })
    Object.assign(me, u)
    setUser(u)
    uni.showToast({ title: '已保存', icon: 'none' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || ''), icon: 'none' })
  } finally {
    saving.value = false
  }
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    success: (r) => {
      if (!r.confirm) return
      doLogout()
      uni.reLaunch({ url: '/pages/login/login' })
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; }
.hd { display: flex; align-items: center; gap: 24rpx; margin-bottom: 24rpx; }
.avatar { font-size: 96rpx; }
.info { display: flex; flex-direction: column; }
.name { font-size: 38rpx; font-weight: 800; color: #4a3f35; }
.sub { font-size: 26rpx; color: #9aa0a6; margin-top: 6rpx; }
.card { background: #fff; border-radius: 18rpx; padding: 10rpx 24rpx; margin-bottom: 20rpx; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0; border-bottom: 1px solid #f3f3f3; }
.row:last-child { border-bottom: none; }
.row.col { flex-direction: column; align-items: stretch; }
.lab { font-size: 28rpx; color: #5a5048; }
.val { font-size: 28rpx; text-align: right; color: #333; flex: 1; margin-left: 20rpx; }
.area { text-align: left; height: 100rpx; margin-top: 10rpx; border: 1px solid #eee; border-radius: 12rpx; padding: 12rpx; }
.save { background: #07c160; color: #fff; border-radius: 50rpx; margin-bottom: 16rpx; }
.logout { background: #f3f3f3; color: #e06c75; border-radius: 50rpx; }
/* 深色 */
.dark .page { background: var(--c-bg); }
.dark .card { background: var(--c-card); }
.dark .name { color: var(--c-title); }
.dark .sub { color: var(--c-sub); }
.dark .lab { color: var(--c-sub); }
.dark .val { color: var(--c-text); }
.dark .row { border-color: var(--c-input-border); }
.dark .area { border-color: var(--c-input-border); background: var(--c-input); }
.dark .logout { background: var(--c-card2); }
</style>
