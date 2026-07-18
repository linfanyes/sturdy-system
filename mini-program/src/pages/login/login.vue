<template>
  <view class="login">
    <view class="logo">🌻</view>
    <view class="title">园丁工作台</view>
    <view class="sub">微信一键登录，开启你的班级管家</view>
    <button class="btn" @click="wechatLogin">微信登录</button>
    <view class="tip">首次登录将自动创建教师账号</view>
  </view>
</template>

<script setup>
import api from '../../common/request'
import { setAuth } from '../../common/store'

async function wechatLogin() {
  uni.showLoading({ title: '登录中' })
  try {
    const { code } = await uni.login()
    const res = await api.post('/auth/wechat-login', { code })
    setAuth(res.token, res.user)
    uni.hideLoading()
    if (res.isNew) {
      uni.showToast({ title: '欢迎！请先完善资料', icon: 'none' })
      uni.switchTab({ url: '/pages/config/config' })
    } else {
      uni.switchTab({ url: '/pages/dashboard/dashboard' })
    }
  } catch (e) {
    uni.hideLoading()
    const msg = (e && (e.message || e.errMsg)) || '登录失败，请重试'
    uni.showToast({ title: String(msg).slice(0, 40), icon: 'none' })
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
}
.logo {
  font-size: 140rpx;
}
.title {
  font-size: 52rpx;
  font-weight: 700;
  color: #4a3f35;
  margin-top: 20rpx;
}
.sub {
  color: #9aa0a6;
  margin: 16rpx 0 60rpx;
}
.btn {
  width: 80%;
  background: #07c160;
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
}
.tip {
  color: #c0c4cc;
  font-size: 24rpx;
  margin-top: 30rpx;
}
</style>
