<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view v-if="logging" class="login-card">
      <view class="login-title">🔐 正在以超级管理员身份进入…</view>
    </view>

    <template v-else-if="!adminToken">
      <view class="login-card">
        <view class="login-title">🔐 超级管理员</view>
        <button class="login-btn" :disabled="logging" @click="autoLogin">点击进入超管后台</button>
        <view class="hint">默认以 admin / admin 登录（可在后端环境变量配置）</view>
      </view>
    </template>

    <template v-else>
      <view class="head">
        <text class="h">👑 超级管理员</text>
        <text class="logout" @click="logout">退出</text>
      </view>

      <!-- 学校管理员管理 -->
      <view class="stats">
        <text class="sc">共 {{ schoolAdmins.length }} 个学校管理员</text>
        <text class="act" @click="openCreate">＋ 新增</text>
      </view>
      <view class="list">
        <view v-if="!schoolAdmins.length" class="empty">暂无学校管理员，点击右上角新增</view>
        <view class="row" v-for="a in schoolAdmins" :key="a.id">
          <view class="info">
            <text class="nm">{{ a.name }}
              <text class="badge" :class="a.enabled ? 'on' : 'off'">{{ a.enabled ? '开启' : '禁用' }}</text>
            </text>
            <text class="meta">学校：{{ a.schoolName || '未关联' }} · 编号：{{ a.schoolCode || '-' }}</text>
            <text class="meta">用户名：{{ a.username }}</text>
          </view>
          <view class="acts">
            <text class="act" @click="toggleEnabled(a)">{{ a.enabled ? '禁用' : '开启' }}</text>
            <text class="act" @click="openReset(a)">重置密码</text>
            <text class="act del" @click="delAdmin(a)">删除</text>
          </view>
        </view>
      </view>

      <!-- 新增学校管理员 -->
      <view v-if="showAdminForm" class="mask" @click="showAdminForm=false">
        <view class="sheet" @click.stop>
          <view class="sh-t">新增学校管理员</view>
          <view class="hint-block">
            系统将自动创建学校并生成 6 位字母+数字学校编号，管理员账号绑定到该学校。
          </view>
          <input v-model="adminForm.schoolName" class="inp" placeholder="学校名称（必填，如：阳光小学）" />
          <input v-model="adminForm.name" class="inp" placeholder="管理员姓名（必填）" />
          <input v-model="adminForm.username" class="inp" placeholder="用户名（必填，登录用）" />
          <input v-model="adminForm.password" class="inp" placeholder="密码（必填）" password />
          <view class="switch-row">
            <text class="switch-label">开启标志</text>
            <switch :checked="adminForm.enabled" color="#4CAF50" @change="onEnabledChange" />
            <text class="switch-val">{{ adminForm.enabled ? '开启（默认）' : '禁用' }}</text>
          </view>
          <button class="save-btn" :disabled="saving" @click="createAdmin">{{ saving ? '创建中…' : '创建（自动生成学校编号）' }}</button>
        </view>
      </view>

      <!-- 重置密码 -->
      <view v-if="resetTarget" class="mask" @click="resetTarget=null">
        <view class="sheet" @click.stop>
          <view class="sh-t">重置「{{ resetTarget.name }}」的密码</view>
          <input v-model="resetPassword" class="inp" placeholder="新密码（必填）" password />
          <button class="save-btn" :disabled="saving" @click="confirmReset">{{ saving ? '保存中…' : '确认重置' }}</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { theme } from '../../common/store'

const SERVER_URL = '/api'
const ADMIN_TOKEN_KEY = 'admin_token'
const adminToken = ref(uni.getStorageSync(ADMIN_TOKEN_KEY) || '')
const logging = ref(false)
const schoolAdmins = ref([])
const saving = ref(false)

const showAdminForm = ref(false)
const adminForm = ref({ schoolName: '', name: '', username: '', password: '', enabled: true })

const resetTarget = ref(null)
const resetPassword = ref('')

async function apiCall(method, path, data) {
  const cloud = typeof wx !== 'undefined' && wx.cloud
  return new Promise((resolve, reject) => {
    cloud.callContainer({
      config: { env: 'prod-d6g1zoq8c7be4ce53' },
      path: SERVER_URL + path, method, data,
      header: { Authorization: 'Bearer ' + adminToken.value, 'content-type': 'application/json' },
      success: (r) => resolve(r.data),
      fail: reject,
    })
  })
}

async function autoLogin() {
  if (logging.value) return
  logging.value = true
  try {
    const resp = await apiCall('POST', '/admin/login', { username: 'admin', password: 'admin' })
    adminToken.value = resp?.token || ''
    if (adminToken.value) { uni.setStorageSync(ADMIN_TOKEN_KEY, adminToken.value); await loadAdmins() }
    else uni.showToast({ title: '登录失败', icon: 'none' })
  } catch (e) { uni.showToast({ title: '登录失败', icon: 'none' }) }
  finally { logging.value = false }
}

function logout() { adminToken.value=''; uni.removeStorageSync(ADMIN_TOKEN_KEY); uni.reLaunch({ url:'/pages/login/login' }) }

onMounted(() => {
  if (adminToken.value) {
    loadAdmins()
  } else {
    // 无 token 时自动以默认超管身份登录
    autoLogin()
  }
})

async function loadAdmins() {
  try { schoolAdmins.value = await apiCall('GET', '/admin/school-admins') || [] }
  catch (e) { schoolAdmins.value = [] }
}

function openCreate() {
  adminForm.value = { schoolName: '', name: '', username: '', password: '', enabled: true }
  showAdminForm.value = true
}

function onEnabledChange(e) {
  adminForm.value.enabled = e.detail.value
}

async function createAdmin() {
  const f = adminForm.value
  if (!f.schoolName || !f.name || !f.username || !f.password) {
    return uni.showToast({ title: '学校名称/姓名/用户名/密码必填', icon: 'none' })
  }
  saving.value = true
  try {
    await apiCall('POST', '/admin/school-admins', f)
    showAdminForm.value = false
    await loadAdmins()
    uni.showToast({ title: '创建成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e?.data?.message || '创建失败', icon: 'none' })
  }
  saving.value = false
}

async function toggleEnabled(a) {
  const next = !a.enabled
  uni.showModal({
    title: next ? '开启账号' : '禁用账号',
    content: `确定${next ? '开启' : '禁用'}「${a.name}」？${next ? '' : '禁用后该管理员将无法登录'}`,
    confirmColor: next ? '#4CAF50' : '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('PATCH', '/admin/school-admins/' + a.id + '/enabled', { enabled: next })
        await loadAdmins()
        uni.showToast({ title: '已更新', icon: 'success' })
      } catch (e) { uni.showToast({ title: '操作失败', icon: 'none' }) }
    },
  })
}

function openReset(a) {
  resetTarget.value = a
  resetPassword.value = ''
}

async function confirmReset() {
  if (!resetPassword.value) return uni.showToast({ title: '请输入新密码', icon: 'none' })
  saving.value = true
  try {
    await apiCall('PATCH', '/admin/school-admins/' + resetTarget.value.id + '/password', { password: resetPassword.value })
    resetTarget.value = null
    uni.showToast({ title: '密码已重置', icon: 'success' })
  } catch (e) { uni.showToast({ title: '重置失败', icon: 'none' }) }
  saving.value = false
}

async function delAdmin(a) {
  uni.showModal({
    title: '删除学校管理员',
    content: `确定删除「${a.name}」？该操作不会删除学校数据，但管理员账号将无法登录。`,
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/admin/school-admins/' + a.id)
        await loadAdmins()
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: '删除失败', icon: 'none' }) }
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.login-card { background: var(--c-card); border-radius: 24rpx; padding: 40rpx 30rpx; width: 560rpx; margin: 80rpx auto; }
.login-title { font-size: 36rpx; font-weight: 800; color: var(--c-title); text-align: center; margin-bottom: 30rpx; }
.inp { border: 1px solid var(--c-border); border-radius: 14rpx; padding: 18rpx; margin-bottom: 16rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.login-btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 30rpx; height: 84rpx; line-height: 84rpx; }
.hint { font-size: 22rpx; color: var(--c-sub); text-align: center; margin-top: 16rpx; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.logout { font-size: 26rpx; color: var(--c-accent); }
.stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: #e64340; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 10rpx 24rpx; }
.empty { padding: 60rpx 0; text-align: center; font-size: 26rpx; color: var(--c-sub); }
.row { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-bottom: 1px solid var(--c-border); gap: 12rpx; }
.info { flex: 1; }
.nm { display: block; font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 2rpx 12rpx; border-radius: 16rpx; margin-left: 12rpx; vertical-align: middle; }
.badge.on { background: rgba(76, 175, 80, .15); color: #4CAF50; }
.badge.off { background: rgba(230, 67, 64, .15); color: #e64340; }
.meta { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.acts { display: flex; gap: 18rpx; flex-shrink: 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 80vh; display: flex; flex-direction: column; box-sizing: border-box; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.hint-block { font-size: 24rpx; color: var(--c-sub); background: var(--c-bg); padding: 14rpx; border-radius: 12rpx; margin-bottom: 16rpx; line-height: 1.6; }
.switch-row { display: flex; align-items: center; gap: 14rpx; padding: 14rpx 0; margin-bottom: 12rpx; }
.switch-label { font-size: 28rpx; color: var(--c-title); flex: 1; }
.switch-val { font-size: 24rpx; color: var(--c-sub); }
.save-btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
</style>
