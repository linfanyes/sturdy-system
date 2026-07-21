<template>
  <view class="login" :class="{ dark }">
    <view class="logo">🌻</view>
    <view class="title">园丁工作台</view>
    <view class="sub">微信一键登录，开启你的班级管家</view>
    <button class="btn" @click="wechatLogin">微信登录</button>
    <view class="tip">首次登录将自动创建教师账号</view>
    <view class="parent-entry" @click="goParent">我是家长，去沟通 →</view>

    <!-- 首次设置弹框：补全学校 / 学期 / 任教学科 -->
    <view class="mask" v-if="showSetup" @click.stop>
      <view class="sheet">
        <view class="sh-t">欢迎，先完善资料</view>
        <view class="sh-sub">这些信息将用于个性化你的工作台</view>
        <input v-model="school" class="inp" placeholder="学校名称" />
        <input v-model="term" class="inp" placeholder="当前学期（如 2025-2026 学年第二学期）" />
        <view class="lab">任教学科（可多选）</view>
        <view class="chips">
          <text
            v-for="s in subjectOpts"
            :key="s"
            class="chip"
            :class="{ on: selected.includes(s) }"
            @click="toggle(s)"
          >{{ s }}</text>
        </view>
        <button class="ok" @click="saveSetup">开始使用</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../../common/request'
import { setAuth, setUser, theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

function goParent() {
  uni.navigateTo({ url: '/pages/parent-login/parent-login' })
}

const showSetup = ref(false)
const school = ref('')
const term = ref('')
const selected = ref([])
const subjectOpts = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治', '音乐', '体育', '美术', '信息技术', '其他']

function toggle(s) {
  const i = selected.value.indexOf(s)
  if (i >= 0) selected.value.splice(i, 1)
  else selected.value.push(s)
}

async function wechatLogin() {
  uni.showLoading({ title: '登录中' })
  try {
    const { code } = await uni.login()
    const res = await api.post('/auth/wechat-login', { code })
    setAuth(res.token, res.user)
    const u = res.user || {}
    const incomplete = !u.school || !u.term || !u.subjects || !u.subjects.length
    if (res.isNew || incomplete) {
      school.value = u.school || ''
      term.value = u.term || ''
      selected.value = Array.isArray(u.subjects)
        ? u.subjects
        : u.subject
          ? [u.subject]
          : []
      uni.hideLoading()
      showSetup.value = true
    } else {
      uni.hideLoading()
      uni.switchTab({ url: '/pages/dashboard/dashboard' })
    }
  } catch (e) {
    uni.hideLoading()
    const msg = (e && (e.message || e.errMsg)) || '登录失败，请重试'
    uni.showToast({ title: String(msg).slice(0, 40), icon: 'none' })
  }
}

async function saveSetup() {
  if (!school.value.trim() || !term.value.trim() || !selected.value.length) {
    return uni.showToast({ title: '请补全学校 / 学期 / 任教学科', icon: 'none' })
  }
  uni.showLoading({ title: '保存中' })
  try {
    const u = await api.put('/users/me', {
      school: school.value.trim(),
      term: term.value.trim(),
      subjects: selected.value,
    })
    setUser(u)
    uni.hideLoading()
    showSetup.value = false
    uni.switchTab({ url: '/pages/dashboard/dashboard' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}
</script>

<style scoped>
.login {
  background: var(--c-bg);
  color: var(--c-text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
  box-sizing: border-box;
}
.logo { font-size: 140rpx; }
.title { font-size: 52rpx; font-weight: 700; color: var(--c-title); margin-top: 20rpx; }
.sub { color: var(--c-sub); margin: 16rpx 0 60rpx; }
.btn {
  width: 80%;
  background: #07c160;
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
}
.tip { color: var(--c-sub); font-size: 24rpx; margin-top: 30rpx; }
.parent-entry { margin-top: 40rpx; font-size: 26rpx; color: #07c160; text-decoration: underline; }

/* 首次设置弹框 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; z-index: 60; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 36rpx 32rpx calc(36rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.sh-t { font-size: 34rpx; font-weight: 700; color: var(--c-title); }
.sh-sub { font-size: 24rpx; color: var(--c-sub); margin: 8rpx 0 24rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 18rpx 20rpx; margin-bottom: 18rpx; font-size: 28rpx; background: var(--c-input); color: var(--c-text); }
.lab { font-size: 26rpx; color: var(--c-sub); margin-bottom: 14rpx; }
.chips { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 28rpx; }
.chip { font-size: 26rpx; padding: 12rpx 26rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-sub); border: 1px solid var(--c-input-border); }
.chip.on { background: #07c160; color: #fff; border-color: transparent; }
.ok { width: 100%; background: #07c160; color: #fff; border-radius: 50rpx; font-size: 32rpx; height: 88rpx; line-height: 88rpx; }
.ok::after { border: none; }
</style>
