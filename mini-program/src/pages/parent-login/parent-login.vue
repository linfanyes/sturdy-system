<template>
  <view class="login" :class="{ dark }">
    <view class="logo">🎒</view>
    <view class="title">家长中心</view>
    <view class="sub">输入孩子学号，即可查看成绩、班级通知，并与老师沟通</view>
    <input v-model="studentNo" class="inp" type="number" maxlength="20" placeholder="请输入学生学号" />
    <button class="btn" :disabled="loading" @click="login">{{ loading ? '登录中…' : '用学号登录' }}</button>
    <view class="or">— 或 —</view>
    <button class="btn wechat-btn" @click="wxLogin">微信一键登录</button>
    <view class="tip-row">
      <text class="tip" @click="back">返回教师登录</text>
      <text class="tip" @click="goUnified">统一登录</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { parentApi } from '../../common/request'
import { setParent, theme } from '../../common/store'
const dark = computed(() => theme.mode === 'dark')

const studentNo = ref('')
const loading = ref(false)

async function login() {
  const no = studentNo.value.trim()
  if (!no || !/^\d+$/.test(no)) {
    return uni.showToast({ title: '请输入正确的学号', icon: 'none' })
  }
  loading.value = true
  try {
    const res = await parentApi.post('/parent-auth/login', { studentNo: no })
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
async function wxLogin() {
  loading.value = true
  try {
    const { code } = await uni.login()
    const res = await parentApi.post('/auth/wechat-login', { code })
    if (res.needsBind) {
      uni.showToast({ title: '请先用学号登录后绑定微信', icon: 'none' })
    } else if (res.role === 'parent') {
      setParent(res.token, res.parent || res)
      uni.redirectTo({ url: '/pages/parent/parent' })
    } else {
      uni.showToast({ title: '微信未绑定家长账号', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '微信登录失败', icon: 'none' })
  }
  loading.value = false
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
  box-sizing: border-box;
}
.btn {
  width: 80%;
  background: #07c160;
  color: #fff;
  border-radius: 50rpx;
  font-size: 32rpx;
}
.btn[disabled] { opacity: 0.6; }
.wechat-btn { background: #409eff; margin-bottom: 30rpx; }
.or { color: var(--c-sub); font-size: 24rpx; margin: 14rpx 0; }
.tip-row { display: flex; gap: 30rpx; margin-top: 40rpx; }
.tip { color: var(--c-sub); font-size: 24rpx; text-decoration: underline; }
</style>
