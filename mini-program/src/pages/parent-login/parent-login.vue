<template>
  <view class="login" :class="{ dark }">
    <view class="logo">🏡</view>
    <view class="title">家长中心</view>
    <view class="sub">用孩子档案里登记的家长手机号登录，即可与老师实时沟通</view>
    <input v-model="phone" class="inp" type="number" maxlength="20" placeholder="请输入家长手机号" />
    <button class="btn" :disabled="loading" @click="login">{{ loading ? '登录中…' : '登录' }}</button>
    <view class="tip" @click="back">我是老师，返回登录</view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parentApi } from '../../common/request'
import { setParent, theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const phone = ref('')
const loading = ref(false)

async function login() {
  const p = phone.value.trim()
  if (!/^\d{6,20}$/.test(p)) {
    return uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
  }
  loading.value = true
  try {
    const res = await parentApi.post('/parent-auth/login', { phone: p })
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
  width: 80%;
  background: var(--c-input);
  border: 1px solid var(--c-input-border);
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  font-size: 30rpx;
  color: var(--c-text);
  margin-bottom: 30rpx;
}
.btn {
  width: 80%;
  background: #07c160;
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
}
.btn[disabled] { opacity: 0.6; }
.tip { color: var(--c-sub); font-size: 24rpx; margin-top: 40rpx; text-decoration: underline; }
</style>
