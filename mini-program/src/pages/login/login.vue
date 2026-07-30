<template>
  <view class="login" :class="{ dark }">
    <view class="logo">🌻</view>
    <view class="title">园丁工作台</view>

    <input v-model="username" class="inp2" placeholder="用户名 / 学号" placeholder-style="color:#b5a890;" confirm-type="next" @confirm="focusPwd = true" />
    <input v-model="password" class="inp2" :focus="focusPwd" confirm-type="done" placeholder="密码" password placeholder-style="color:#b5a890;" @confirm="doLogin" />
    <button class="btn" :disabled="loading" @click="doLogin">{{ loading ? '登录中…' : '登 录' }}</button>

    <view class="or">— 或 —</view>
    <button class="btn wechat" @click="doWechatLogin">微信登录</button>

    <!-- 微信绑定弹窗 -->
    <view class="mask" v-if="bindOpenid" @click="bindOpenid = ''">
      <view class="sheet" @click.stop>
        <view class="sh-bar">
          <view class="sh-t">绑定账号</view>
          <text class="sh-close" @click="bindOpenid = ''">✕</text>
        </view>
        <view class="sh-sub">请输入你的教师编号或学生学号完成绑定</view>
        <input v-model="bindNumber" class="inp" confirm-type="done" placeholder="教师请输入教师编号或家长请输入学生学号" placeholder-style="color:#b5a890;" @confirm="doBind" />
        <button class="ok" :disabled="bindLoading" @click="doBind">{{ bindLoading ? '绑定中…' : '完成绑定' }}</button>
      </view>
    </view>

    <!-- 角色选择弹层（教师兼家长身份二选一） -->
    <view class="role-mask" v-if="showRoleChoice">
      <view class="role-modal">
        <view class="role-title">选择登录身份</view>
        <view class="role-desc">该微信账号同时关联了教师和家长身份</view>
        <view class="role-buttons">
          <view class="role-btn teacher" @tap="selectRole('teacher')">
            <text>👨‍🏫 以老师身份进入</text>
          </view>
          <view class="role-btn parent" @tap="selectRole('parent')">
            <text>👨‍👩‍👧‍👦 以家长身份进入</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../../common/request'
import { setMockMode } from '../../common/request'
import { setAuth, setUser, setParent, setDualTokens, setFeatureProfile, theme, auth, parent } from '../../common/store'

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

/* -------- 微信登录 -------- */
const bindOpenid = ref(''), bindSessionKey = ref('')
const bindNumber = ref(''), bindLoading = ref(false)
let wechatNickName = ''  // 微信昵称（绑定教师时作默认称呼）

// 角色选择（教师兼家长）
const showRoleChoice = ref(false)
const roleChoiceData = ref(null)

async function doWechatLogin() {
  uni.showLoading({ title:'登录中' })
  try {
    const { code } = await uni.login()
    // 获取微信用户信息（昵称）
    try {
      const uinfo = await uni.getUserProfile({ desc: '用于显示用户昵称' })
      wechatNickName = uinfo?.userInfo?.nickName || ''
    } catch (e) { wechatNickName = '' }  // 用户拒绝或环境不支持
    const r = await api.post('/auth/wechat-login', { code })
    uni.hideLoading()
    if (r.needsRoleChoice) {
      // 教师兼家长身份，需要用户选择
      roleChoiceData.value = r
      showRoleChoice.value = true
      return
    }
    if (r.needsBind) {
      bindOpenid.value = r.openid || code
      bindSessionKey.value = r.sessionKey || ''
      bindNumber.value = ''
    } else {
      handleLoginResult(r)
    }
  } catch (e) { uni.hideLoading(); uni.showToast({ title: String(e?.message||'登录失败').slice(0,40), icon:'none' }) }
}

async function doBind() {
  if (!bindNumber.value.trim()) { return uni.showToast({ title:'请输入教师编号或学生学号', icon:'none' }) }
  bindLoading.value = true
  try {
    const { code } = await uni.login()
    const r = await api.post('/auth/bind-by-number', { code, number: bindNumber.value.trim(), nickName: wechatNickName })
    bindOpenid.value = ''
    handleLoginResult(r)
  } catch (e) { uni.showToast({ title: String(e?.message||'绑定失败').slice(0,40), icon:'none' }) }
  bindLoading.value = false
}

// 角色选择（教师兼家长身份）
function selectRole(role) {
  const data = roleChoiceData.value
  if (!data) return
  if (role === 'teacher') {
    // 登录为教师
    setAuth(data.teacher.token, data.teacher.user)
    // 教师身份的实际可用功能包（学校级 ∩ 教师级）
    setFeatureProfile(data.teacher)
    // 存储双角色数据到 parent store，供后续切换使用
    setDualTokens(data.teacher.token, data.parent.token, data.parent)
    uni.reLaunch({ url: '/pages/dashboard/dashboard' })
  } else if (role === 'parent') {
    // 登录为家长
    setFeatureProfile(data.parent)
    setDualTokens(data.teacher.token, data.parent.token, data.parent)
    // 同步 auth.token 让部分通用 API 也能工作
    auth.token = data.parent.token
    uni.setStorageSync('g_token', data.parent.token)
    uni.reLaunch({ url: '/pages/parent/parent' })
  }
  showRoleChoice.value = false
  roleChoiceData.value = null
}
</script>

<style scoped>
.login { background:var(--c-bg); color:var(--c-text); min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60rpx; box-sizing:border-box; }
.logo { font-size:140rpx; }
.title { font-size:52rpx; font-weight:700; color:var(--c-title); margin-top:20rpx; margin-bottom:50rpx; }
.inp2 { border:1px solid var(--c-input-border); border-radius:14rpx; padding:24rpx; margin-bottom:20rpx; font-size:32rpx; width:100%; max-width:620rpx; min-height:96rpx; box-sizing:border-box; background:var(--c-input); color:var(--c-text); flex-shrink:0; }
.btn { width:100%; max-width:620rpx; background:#07c160; color:#fff; border-radius:50rpx; font-size:34rpx; height:96rpx; line-height:96rpx; margin-top:10rpx; flex-shrink:0; }
.btn[disabled] { opacity:.6; }
.btn.wechat { background:#409eff; margin-top:14rpx; }
.or { margin-top:44rpx; font-size:26rpx; color:var(--c-sub); margin-bottom:6rpx; }
.mask { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; z-index:60; }
.sheet { width:100%; background:var(--c-card); border-radius:24rpx 24rpx 0 0; padding:36rpx 32rpx calc(36rpx + env(safe-area-inset-bottom)); box-sizing:border-box; }
.sh-t { font-size:34rpx; font-weight:700; color:var(--c-title); }
.sh-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8rpx; }
.sh-close { font-size: 36rpx; color: var(--c-sub); padding: 0 8rpx; }
.sh-sub { font-size:26rpx; color:var(--c-sub); margin:8rpx 0 20rpx; line-height:1.5; }
.roles2 { display:flex; gap:14rpx; margin-bottom:18rpx; }
.r2 { flex:1; text-align:center; font-size:28rpx; padding:18rpx 0; border-radius:14rpx; background:var(--c-card2); color:var(--c-sub); min-width:0; }
.r2.on { background:var(--c-accent); color:#fff; font-weight:700; }
.inp { border:1px solid var(--c-input-border); border-radius:12rpx; padding:22rpx 20rpx; margin-bottom:14rpx; font-size:30rpx; background:var(--c-input); color:var(--c-text); width:100%; box-sizing:border-box; min-height:88rpx; }
.ok { width:100%; background:#07c160; color:#fff; border-radius:50rpx; font-size:32rpx; height:96rpx; line-height:96rpx; margin-top:10rpx; }
.ok[disabled] { opacity:.6; }
.ok::after { border:none; }
.dark .inp2, .dark .inp { background:var(--c-input); }
.dark .r2 { background:var(--c-card2); color:var(--c-sub); }
/* 角色选择弹层 */
.role-mask { position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.4); z-index:999; display:flex; align-items:center; justify-content:center; }
.role-modal { background:#fff; border-radius:32rpx; padding:48rpx; width:600rpx; text-align:center; }
.role-title { font-size:36rpx; font-weight:bold; margin-bottom:16rpx; }
.role-desc { font-size:26rpx; color:#999; margin-bottom:40rpx; }
.role-buttons { display:flex; flex-direction:column; gap:24rpx; }
.role-btn { padding:24rpx; border-radius:20rpx; font-size:30rpx; font-weight:500; }
.role-btn.teacher { border:2rpx solid #07c160; color:#07c160; }
.role-btn.parent { border:2rpx solid #E6A23C; color:#E6A23C; }
</style>
