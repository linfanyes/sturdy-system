<template>
  <view class="login" :class="{ dark: theme.mode === 'dark' }">
    <!-- 柔和光斑背景（半透明色块，小程序端不依赖 blur，保证低端机流畅） -->
    <view class="glow glow-pink" />
    <view class="glow glow-mint" />
    <view class="glow glow-butter" />

    <view class="inner">
    <!-- 品牌徽章（对齐 Web 端登录页） -->
    <view class="brand-chip pop-in">
      <text class="brand-spark">✨</text>
      <text class="brand-name">园丁工作台</text>
    </view>

    <!-- Logo + 标题 -->
    <view class="logo-wrap pop-in" style="--i:0.1s">
      <view class="logo-halo pulse-soft">
        <text class="logo">🌻</text>
      </view>
    </view>
    <view class="title pop-in" style="--i:0.2s">今天也要闪闪发光</view>
    <view class="slogan pop-in" style="--i:0.3s">用心看见每一个孩子 🌱</view>

    <!-- 表单 -->
    <view class="form-area">
      <input
        v-model="username"
        class="inp2 pop-in"
        style="--i:0.4s"
        placeholder="用户名 / 学号"
        placeholder-style="color:#b5a890;"
        confirm-type="next"
        @confirm="focusPwd = true"
      />
      <input
        v-model="password"
        class="inp2 pop-in"
        style="--i:0.5s"
        :focus="focusPwd"
        confirm-type="done"
        placeholder="密码"
        password
        placeholder-style="color:#b5a890;"
        @confirm="doLogin"
      />
    </view>

    <!-- 登录按钮：黄油琥珀渐变（与 Web 端 btn-primary 同源） -->
    <button class="btn btn-breathe pop-in" style="--i:0.6s" :disabled="loading" @click="doLogin">
      {{ loading ? '登录中…' : '开始工作 →' }}
    </button>

    <view class="foot pop-in" style="--i:0.7s">
      <text class="foot-text">登录后 token 将持久化，下次打开无需重新登录</text>
    </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { setMockMode } from '../../common/request'
import { setAuth, setParent, setRoleAuth, setFeatureProfile, theme, auth } from '../../common/store'
import { unifiedLogin } from '@/api/user'

const dark = computed(() => theme.mode === 'dark')
const username = ref(''), password = ref(''), loading = ref(false)
const focusPwd = ref(false)  // 用户名框回车后聚焦密码框

/* -------- 统一登录 -------- */
async function doLogin() {
  if (!username.value.trim() || !password.value) return uni.showToast({ title:'请输入用户名和密码', icon:'none' })
  loading.value = true
  try {
    const r = await unifiedLogin({ username: username.value.trim(), password: password.value })
    handleLoginResult(r)
  } catch (e) { uni.showToast({ title: String(e?.message||'登录失败').slice(0,40), icon:'none' }) }
  loading.value = false
}

function handleLoginResult(r) {
  setMockMode(false)  // 正常登录始终退出演示模式
  // 各登录路径响应均含 effectiveFeatures（= 学校级 ∩ 教师级），统一写入登录态
  setFeatureProfile(r)
  switch (r.role) {
    // 超管/校管通过 setRoleAuth 走共享状态机（按角色分 key 持久化 + machine/reactive 同步），
    // 不再直接写 token key 绕过 machine；超管同时补齐 admin_user，保证冷启动可恢复。
    case 'super':
      setRoleAuth(r.token, r.user, 'super')
      uni.redirectTo({ url:'/pages/admin/admin' })
      break
    case 'school_admin':
      setRoleAuth(r.token, r.user, 'school_admin')
      uni.redirectTo({ url:'/pages/school-admin/school-admin' })
      break
    case 'teacher':
      setAuth(r.token, r.user)
      uni.switchTab({ url:'/pages/dashboard/dashboard' })
      break
    case 'parent': {
      // 缺陷修复：登录响应含 effectiveFeatures（当前孩子班级家长功能包），
      // 需并入 parent.user，否则家长页 hasPf() 读到 undefined → 全部功能可见（不限制）。
      const p = r.parent || {}
      setParent(r.token, Array.isArray(r.effectiveFeatures) ? { ...p, effectiveFeatures: r.effectiveFeatures } : p)
      uni.redirectTo({ url:'/pages/parent/parent' })
      break
    }
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

/* ========= 入场动效 ========= */
.pop-in {
  animation: pop-in 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: var(--i, 0s);
}
@keyframes pop-in {
  from { opacity: 0; transform: translateY(24rpx) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* Logo 光晕呼吸 */
.pulse-soft {
  animation: pulse-soft 3s ease-in-out infinite;
}
@keyframes pulse-soft {
  0%, 100% { box-shadow: 0 12rpx 40rpx rgba(245, 179, 66, 0.35); }
  50% { box-shadow: 0 12rpx 50rpx rgba(245, 179, 66, 0.55); }
}

/* 登录按钮呼吸光晕 */
.btn-breathe:not([disabled]) {
  animation: btn-breathe 2.5s ease-in-out infinite;
}
@keyframes btn-breathe {
  0%, 100% { box-shadow: 0 10rpx 30rpx rgba(214, 148, 38, 0.28); }
  50% { box-shadow: 0 14rpx 40rpx rgba(214, 148, 38, 0.45); }
}

/* 输入框聚焦态增强 */
.inp2:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 6rpx rgba(245, 179, 66, 0.18);
}

/* 表单区域 */
.form-area {
  width: 100%;
  max-width: 620rpx;
}

/* 减少动态效果 */
@media (prefers-reduced-motion: reduce) {
  .pop-in,
  .pulse-soft,
  .btn-breathe:not([disabled]) {
    animation: none !important;
  }
}
</style>
