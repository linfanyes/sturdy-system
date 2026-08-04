<template>
  <view class="login">
    <view class="logo">🌻</view>
    <view class="title">园丁工作台</view>

    <input v-model="username" class="inp2" placeholder="用户名 / 学号" placeholder-style="color:#b5a890;" confirm-type="next" @confirm="focusPwd = true" />
    <input v-model="password" class="inp2" :focus="focusPwd" confirm-type="done" placeholder="密码" password placeholder-style="color:#b5a890;" @confirm="doLogin" />
    <button class="btn" :disabled="loading" @click="doLogin">{{ loading ? '登录中…' : '登 录' }}</button>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../../common/request'
import { setMockMode } from '../../common/request'
import { setAuth, setParent, setFeatureProfile, theme, auth } from '../../common/store'

const dark = computed(() => theme.mode === 'dark')
const username = ref(''), password = ref(''), loading = ref(false)
const focusPwd = ref(false)  // 用户名框回车后聚焦密码框

/* -------- 统一登录 -------- */
async function doLogin() {
  if (!username.value.trim() || !password.value) return uni.showToast({ title:'请输入用户名和密码', icon:'none' })
  loading.value = true
  try {
    const r = await api.post('/auth/unified-login', { username: username.value.trim(), password: password.value })
    handleLoginResult(r)
  } catch (e) { uni.showToast({ title: String(e?.message||'登录失败').slice(0,40), icon:'none' }) }
  loading.value = false
}

function handleLoginResult(r) {
  setMockMode(false)  // 正常登录始终退出演示模式
  // 各登录路径响应均含 effectiveFeatures（= 学校级 ∩ 教师级），统一写入登录态
  setFeatureProfile(r)
  switch (r.role) {
    case 'super':
      uni.setStorageSync('admin_token', r.token)
      // 同时写入共享 token，使通用 API 层（request.js 的 api）在管理员页面也能携带 Bearer
      uni.setStorageSync('g_token', r.token)
      auth.token = r.token
      uni.redirectTo({ url:'/pages/admin/admin' })
      break
    case 'school_admin':
      uni.setStorageSync('sa_token', r.token)
      uni.setStorageSync('sa_user', JSON.stringify(r.user))
      uni.setStorageSync('g_token', r.token)
      auth.token = r.token
      uni.redirectTo({ url:'/pages/school-admin/school-admin' })
      break
    case 'teacher':
      setAuth(r.token, r.user)
      uni.switchTab({ url:'/pages/dashboard/dashboard' })
      break
    case 'parent':
      setParent(r.token, r.parent)
      uni.redirectTo({ url:'/pages/parent/parent' })
      break
  }
}
</script>

<style scoped>
.login { background:var(--c-bg); color:var(--c-text); min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60rpx; box-sizing:border-box; }
.logo { font-size:140rpx; }
.title { font-size:52rpx; font-weight:700; color:var(--c-title); margin-top:20rpx; margin-bottom:50rpx; }
.inp2 { border:1px solid var(--c-input-border); border-radius:14rpx; padding:24rpx; margin-bottom:20rpx; font-size:32rpx; width:100%; max-width:620rpx; min-height:96rpx; box-sizing:border-box; background:var(--c-input); color:var(--c-text); flex-shrink:0; }
.btn { width:100%; max-width:620rpx; background:#07c160; color:#fff; border-radius:50rpx; font-size:34rpx; height:96rpx; line-height:96rpx; margin-top:10rpx; flex-shrink:0; }
.btn[disabled] { opacity:.6; }
</style>
