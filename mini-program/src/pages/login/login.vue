<template>
  <view class="login" :class="{ dark: theme.mode === 'dark' }">
    <!-- 柔和光斑背景（半透明色块，小程序端不依赖 blur，保证低端机流畅） -->
    <view class="glow glow-pink" />
    <view class="glow glow-mint" />
    <view class="glow glow-butter" />

    <view class="inner">
      <!-- 品牌徽章（对齐 Web 端登录页） -->
      <view class="brand-chip">
        <text class="brand-spark">✨</text>
        <text class="brand-name">园丁工作台</text>
      </view>

      <!-- Logo + 标题 -->
      <view class="logo-wrap">
        <view class="logo-halo">
          <text class="logo">🌻</text>
        </view>
      </view>
      <view class="title">今天也要闪闪发光</view>
      <view class="slogan">用心看见每一个孩子 🌱</view>

      <!-- 表单 -->
      <input
        v-model="username"
        class="inp2"
        placeholder="用户名 / 学号"
        placeholder-style="color:#b5a890;"
        confirm-type="next"
        @confirm="focusPwd = true"
      />
      <input
        v-model="password"
        class="inp2"
        :focus="focusPwd"
        confirm-type="done"
        placeholder="密码"
        password
        placeholder-style="color:#b5a890;"
        @confirm="doLogin"
      />

      <!-- 登录按钮：黄油琥珀渐变（与 Web 端 btn-primary 同源） -->
      <button class="btn" :disabled="loading" @click="doLogin">
        {{ loading ? '登录中…' : '开始工作 →' }}
      </button>

      <view class="foot">
        <text class="foot-text">登录后 token 将持久化，下次打开无需重新登录</text>
      </view>
    </view>
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
    // 注意：超管/校管不再写 g_token（教师 token key）。
    // 通用 api 层的 Bearer 由 auth.token 提供，冷启动则由 store.js readToken()
    // 按 admin_token > sa_token > g_token 优先级恢复，避免角色被降级误识别为教师。
    case 'super':
      uni.setStorageSync('admin_token', r.token)
      auth.token = r.token
      auth.user = r.user || null
      uni.redirectTo({ url:'/pages/admin/admin' })
      break
    case 'school_admin':
      uni.setStorageSync('sa_token', r.token)
      uni.setStorageSync('sa_user', JSON.stringify(r.user))
      auth.token = r.token
      auth.user = r.user || null
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
.login {
  position: relative;
  background: linear-gradient(160deg, #fff0e6 0%, #fff8f0 45%, #eafaf1 100%);
  color: var(--c-text);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx;
  box-sizing: border-box;
  overflow: hidden;
}

/* 柔和光斑（对齐 Web 端登录页的 sakura/mint/butter 三色） */
.glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0.5;
}
.glow-pink { width: 520rpx; height: 520rpx; background: #f4a5b8; top: -140rpx; left: -140rpx; }
.glow-mint { width: 600rpx; height: 600rpx; background: #7dd1a3; top: 32%; right: -220rpx; }
.glow-butter { width: 480rpx; height: 480rpx; background: #ffd479; bottom: -140rpx; left: 12%; }

.login.dark {
  background: linear-gradient(160deg, #1a1c22 0%, #22262e 45%, #1c2620 100%);
}
.login.dark .glow { opacity: 0.22; }

.inner {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 620rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 品牌徽章 */
.brand-chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 26rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.85);
  border: 1rpx solid rgba(255, 255, 255, 0.7);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 30rpx;
}
.dark .brand-chip { background: rgba(38, 43, 52, 0.85); border-color: rgba(44, 49, 58, 0.7); }
.brand-spark { font-size: 24rpx; }
.brand-name { font-size: 26rpx; font-weight: 600; color: var(--c-title); }

/* Logo 光晕 */
.logo-wrap { margin-bottom: 20rpx; }
.logo-halo {
  width: 148rpx;
  height: 148rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(145deg, #ffd479 0%, #f5b342 100%);
  box-shadow: 0 12rpx 40rpx rgba(245, 179, 66, 0.35);
}
.logo { font-size: 84rpx; line-height: 1; }
.dark .logo-halo { box-shadow: 0 12rpx 40rpx rgba(255, 206, 84, 0.25); }

.title {
  font-size: 44rpx;
  font-weight: 700;
  color: var(--c-title);
  margin-bottom: 10rpx;
  text-align: center;
}
.slogan {
  font-size: 26rpx;
  color: var(--c-sub);
  margin-bottom: 46rpx;
  text-align: center;
}

/* 输入框 */
.inp2 {
  border: 1rpx solid var(--c-input-border);
  border-radius: 18rpx;
  padding: 26rpx 30rpx;
  margin-bottom: 22rpx;
  font-size: 32rpx;
  width: 100%;
  max-width: 620rpx;
  min-height: 96rpx;
  box-sizing: border-box;
  background: var(--c-input);
  color: var(--c-text);
  flex-shrink: 0;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.inp2:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 6rpx rgba(245, 179, 66, 0.18);
}

/* 登录按钮：黄油琥珀渐变（对齐 Web 端 btn-primary） */
.btn {
  width: 100%;
  max-width: 620rpx;
  background: linear-gradient(135deg, #ffce54 0%, #f5b342 60%, #d69426 100%);
  color: #fff;
  border-radius: 50rpx;
  font-size: 34rpx;
  font-weight: 600;
  height: 96rpx;
  line-height: 96rpx;
  margin-top: 14rpx;
  flex-shrink: 0;
  box-shadow: 0 10rpx 30rpx rgba(214, 148, 38, 0.28);
  transition: transform 0.15s, box-shadow 0.15s;
}
.btn:active { transform: scale(0.97); box-shadow: 0 6rpx 18rpx rgba(214, 148, 38, 0.24); }
.btn[disabled] { opacity: 0.65; }

.foot { margin-top: 40rpx; }
.foot-text { font-size: 22rpx; color: var(--c-sub); }
</style>
