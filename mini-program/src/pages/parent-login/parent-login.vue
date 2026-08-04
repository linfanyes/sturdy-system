<template>
  <view class="login" :class="{ dark }">
    <view class="logo">🎒</view>
    <view class="title">家长中心</view>
    <view class="sub">输入孩子学号与密码，即可查看成绩、班级通知，并与老师沟通</view>
    <input v-model="studentNo" class="inp" type="number" maxlength="20" placeholder="请输入学生学号" />
    <input v-model="password" class="inp" password placeholder="请输入密码（默认 123456）" />
    <button class="btn" :disabled="loading" @click="login">{{ loading ? '登录中…' : '用学号登录' }}</button>
    <view class="tip-row">
      <text class="tip" @click="back">返回教师登录</text>
      <text class="tip" @click="goUnified">统一登录</text>
    </view>
    <view class="hint-card">
      <text class="hint-title">💡 登录说明</text>
      <text class="hint-text">· 家长使用学号与密码登录</text>
      <text class="hint-text">· 教师请返回使用账号密码登录</text>
    </view>

    </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parentApi } from '../../common/request'
import { setParent, theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const studentNo = ref('')
const password = ref('')
const loading = ref(false)

async function login() {
  const no = studentNo.value.trim()
  if (!no || !/^\d+$/.test(no)) {
    return uni.showToast({ title: '请输入正确的学号', icon: 'none' })
  }
  if (!password.value) {
    return uni.showToast({ title: '请输入密码', icon: 'none' })
  }
  loading.value = true
  try {
    const res = await parentApi.post('/parent-auth/login', { studentNo: no, password: password.value })
    setParent(res.token, res.parent)
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: '/pages/parent/parent' }), 600)
  } catch (e) {
    const msg = (e && (e.message || e.errMsg)) || '登录失败'
    uni.showToast({ title: String(msg).slice(0, 40), icon: 'none' })
  }
  loading.value = false
}

function back() {
  uni.navigateBack({ fail: () => uni.reLaunch({ url: '/pages/login/login' }) })
}
function goUnified() {
  uni.reLaunch({ url: '/pages/login/login' })
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
.sub { color: var(--c-sub); margin: 16rpx 0 60rpx; font-size: 26rpx; text-align: center; line-height: 1.6; }
.inp {
  width: 100%;
  max-width: 620rpx;
  background: var(--c-input);
  border: 1px solid var(--c-input-border);
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  font-size: 30rpx;
  color: var(--c-text);
  margin-bottom: 24rpx;
  box-sizing: border-box;
}
.btn {
  width: 100%;
  max-width: 620rpx;
  background: #07c160;
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
}
.btn[disabled] { opacity: 0.6; }
.tip-row { display: flex; gap: 30rpx; margin-top: 40rpx; }
.tip { color: var(--c-sub); font-size: 24rpx; text-decoration: underline; }
.hint-card {
  margin-top: 40rpx;
  padding: 24rpx 28rpx;
  background: var(--c-input);
  border-radius: 16rpx;
  max-width: 620rpx;
  width: 100%;
  box-sizing: border-box;
}
.hint-title { font-size: 26rpx; font-weight: 600; color: var(--c-title); display: block; margin-bottom: 10rpx; }
.hint-text { font-size: 24rpx; color: var(--c-sub); display: block; line-height: 1.7; }
/* 绑定弹窗 */
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: flex; align-items: flex-end; z-index: 60; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 36rpx 32rpx calc(36rpx + env(safe-area-inset-bottom)); box-sizing: border-box; }
.sh-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.sh-t { font-size: 34rpx; font-weight: 700; color: var(--c-title); }
.sh-close { font-size: 36rpx; color: var(--c-sub); padding: 0 8rpx; }
.sh-sub { font-size: 26rpx; color: var(--c-sub); margin: 8rpx 0 20rpx; line-height: 1.5; }
.ok { width: 100%; background: #07c160; color: #fff; border-radius: 50rpx; font-size: 32rpx; height: 96rpx; line-height: 96rpx; margin-top: 10rpx; }
.ok[disabled] { opacity: .6; }
.ok::after { border: none; }
</style>
