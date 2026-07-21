<template>
  <view class="login" :class="{ dark }">
    <view class="logo">🌻</view>
    <view class="title">园丁工作台</view>

    <view class="roles">
      <view class="role" :class="role==='teacher'?'on':''" @click="role='teacher'">🧑‍🏫 教师</view>
      <view class="role" :class="role==='admin'?'on':''" @click="role='admin'">👤 管理员</view>
      <view class="role" :class="role==='parent'?'on':''" @click="role='parent'">👨‍👩‍👧 家长</view>
    </view>

    <!-- ====== 教师登录 ====== -->
    <template v-if="role==='teacher'">
      <button class="btn" @click="wechatLogin">微信登录</button>
      <view class="tip">首次登录将自动创建教师账号</view>
      <view class="or">— 或 —</view>
      <input v-model="schoolCode" class="inp2" placeholder="学校编号" />
      <input v-model="tUsername" class="inp2" placeholder="教师用户名" />
      <input v-model="tPassword" class="inp2" placeholder="密码" password />
      <button class="btn2" :disabled="tLoading" @click="teacherLogin">{{ tLoading ? '登录中…' : '账号登录' }}</button>
    </template>

    <!-- ====== 管理员登录 ====== -->
    <template v-if="role==='admin'">
      <input v-model="aUsername" class="inp2" placeholder="用户名" />
      <input v-model="aPassword" class="inp2" placeholder="密码" password />
      <button class="btn2" style="background:#e6a23c" :disabled="aLoading" @click="adminLogin">{{ aLoading ? '登录中…' : '管理员登录' }}</button>
      <view class="tip">账号由超级管理员分配</view>
    </template>

    <!-- ====== 家长登录 ====== -->
    <template v-if="role==='parent'">
      <input v-model="studentNo" class="inp2" type="number" maxlength="20" placeholder="输入学生学号" />
      <button class="btn2" style="background:#e06c75" :disabled="pLoading" @click="parentLogin">{{ pLoading ? '登录中…' : '家长登录' }}</button>
      <view class="tip">需老师已授权家长登录</view>
    </template>

    <!-- 首次设置弹框 -->
    <view class="mask" v-if="showSetup" @click.stop>
      <view class="sheet">
        <view class="sh-t">欢迎，先完善资料</view>
        <view class="sh-sub">这些信息将用于个性化你的工作台</view>
        <input v-model="school" class="inp" placeholder="学校名称" />
        <input v-model="term" class="inp" placeholder="当前学期（如 2025-2026 学年第二学期）" />
        <view class="lab">任教学科（可多选）</view>
        <view class="chips">
          <text v-for="s in subjectOpts" :key="s" class="chip" :class="{ on: selected.includes(s) }" @click="toggle(s)">{{ s }}</text>
        </view>
        <button class="ok" @click="saveSetup">开始使用</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import api from '../../common/request'
import { parentApi } from '../../common/request'
import { setAuth, setUser, setParent, theme } from '../../common/store'

const dark = computed(() => theme.mode === 'dark')
const role = ref('teacher')

// 教师
const schoolCode = ref(''), tUsername = ref(''), tPassword = ref(''), tLoading = ref(false)
// 管理员
const aUsername = ref(''), aPassword = ref(''), aLoading = ref(false)
// 家长
const studentNo = ref(''), pLoading = ref(false)

/* -------- 教师微信登录 -------- */
const showSetup = ref(false), school = ref(''), term = ref(''), selected = ref([])
const subjectOpts = ['语文','数学','英语','物理','化学','生物','历史','地理','政治','音乐','体育','美术','信息技术','其他']
function toggle(s) { const i=selected.value.indexOf(s); i>=0?selected.value.splice(i,1):selected.value.push(s) }

async function wechatLogin() {
  uni.showLoading({ title: '登录中' })
  try {
    const { code } = await uni.login()
    const res = await api.post('/auth/wechat-login', { code })
    setAuth(res.token, res.user)
    const u = res.user || {}
    if (res.isNew || !u.school || !u.term || !u.subjects?.length) {
      school.value = u.school || ''; term.value = u.term || ''
      selected.value = u.subjects || (u.subject ? [u.subject] : [])
      uni.hideLoading(); showSetup.value = true
    } else { uni.hideLoading(); uni.switchTab({ url: '/pages/dashboard/dashboard' }) }
  } catch (e) { uni.hideLoading(); uni.showToast({ title: String(e?.message||'登录失败').slice(0,40), icon:'none' }) }
}
async function saveSetup() {
  if (!school.value.trim() || !term.value.trim() || !selected.value.length) return uni.showToast({ title:'请补全信息', icon:'none' })
  uni.showLoading({ title:'保存中' })
  try {
    const u = await api.put('/users/me', { school:school.value.trim(), term:term.value.trim(), subjects:selected.value })
    setUser(u); uni.hideLoading(); showSetup.value=false; uni.switchTab({ url:'/pages/dashboard/dashboard' })
  } catch(e) { uni.hideLoading(); uni.showToast({ title:'保存失败', icon:'none' }) }
}

/* -------- 教师密码登录 -------- */
async function teacherLogin() {
  if (!schoolCode.value.trim() || !tUsername.value.trim() || !tPassword.value) return uni.showToast({ title:'请填学校编号/用户名/密码', icon:'none' })
  tLoading.value = true
  try {
    const res = await api.post('/auth/password-login', { schoolCode:schoolCode.value.trim(), username:tUsername.value.trim(), password:tPassword.value })
    setAuth(res.token, res.user); uni.switchTab({ url:'/pages/dashboard/dashboard' })
  } catch(e) { uni.showToast({ title: String(e?.message||'登录失败').slice(0,40), icon:'none' }) }
  tLoading.value = false
}

/* -------- 管理员登录 -------- */
async function adminLogin() {
  if (!aUsername.value.trim() || !aPassword.value) return uni.showToast({ title:'请输入用户名和密码', icon:'none' })
  aLoading.value = true
  try {
    const res = await api.post('/school-admin/login', { username:aUsername.value.trim(), password:aPassword.value })
    uni.setStorageSync('sa_token', res.token); uni.setStorageSync('sa_user', JSON.stringify(res.admin))
    uni.showToast({ title:'登录成功', icon:'success' })
    setTimeout(() => uni.redirectTo({ url:'/pages/school-admin/school-admin' }), 600)
  } catch(e) { uni.showToast({ title: String(e?.message||'登录失败').slice(0,40), icon:'none' }) }
  aLoading.value = false
}

/* -------- 家长登录 -------- */
async function parentLogin() {
  const no = studentNo.value.trim()
  if (!no || !/^\d+$/.test(no)) return uni.showToast({ title:'请输入正确学号', icon:'none' })
  pLoading.value = true
  try {
    const res = await parentApi.post('/parent-auth/login', { studentNo:no })
    setParent(res.token, res.parent)
    uni.showToast({ title:'登录成功', icon:'success' })
    setTimeout(() => uni.redirectTo({ url:'/pages/parent/parent' }), 600)
  } catch(e) { uni.showToast({ title: String(e?.message||'登录失败').slice(0,40), icon:'none' }) }
  pLoading.value = false
}
</script>

<style scoped>
.login { background:var(--c-bg); color:var(--c-text); min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60rpx; box-sizing:border-box; }
.logo { font-size:140rpx; }
.title { font-size:52rpx; font-weight:700; color:var(--c-title); margin-top:20rpx; }
.roles { display:flex; gap:14rpx; margin:30rpx 0 24rpx; }
.role { font-size:26rpx; padding:14rpx 30rpx; border-radius:30rpx; background:var(--c-card2); color:var(--c-sub); }
.role.on { background:var(--c-accent); color:#fff; font-weight:700; }
.btn { width:80%; background:#07c160; color:#fff; border-radius:50rpx; font-size:32rpx; }
.tip { color:var(--c-sub); font-size:22rpx; margin-top:14rpx; }
.or { margin-top:30rpx; font-size:24rpx; color:var(--c-sub); }
.inp2 { border:1px solid var(--c-input-border); border-radius:14rpx; padding:18rpx 20rpx; margin-bottom:14rpx; margin-top:8rpx; font-size:28rpx; width:80%; background:var(--c-input); color:var(--c-text); }
.btn2 { width:80%; background:#409eff; color:#fff; border-radius:50rpx; font-size:30rpx; height:80rpx; line-height:80rpx; margin-top:8rpx; }
.btn2[disabled] { opacity:.6; }
.mask { position:fixed; inset:0; background:rgba(0,0,0,.45); display:flex; align-items:flex-end; z-index:60; }
.sheet { width:100%; background:var(--c-card); border-radius:24rpx 24rpx 0 0; padding:36rpx 32rpx calc(36rpx + env(safe-area-inset-bottom)); box-sizing:border-box; }
.sh-t { font-size:34rpx; font-weight:700; color:var(--c-title); }
.sh-sub { font-size:24rpx; color:var(--c-sub); margin:8rpx 0 24rpx; }
.inp { border:1px solid var(--c-input-border); border-radius:12rpx; padding:18rpx 20rpx; margin-bottom:18rpx; font-size:28rpx; background:var(--c-input); color:var(--c-text); }
.lab { font-size:26rpx; color:var(--c-sub); margin-bottom:14rpx; }
.chips { display:flex; flex-wrap:wrap; gap:16rpx; margin-bottom:28rpx; }
.chip { font-size:26rpx; padding:12rpx 26rpx; border-radius:30rpx; background:var(--c-card2); color:var(--c-sub); border:1px solid var(--c-input-border); }
.chip.on { background:#07c160; color:#fff; border-color:transparent; }
.ok { width:100%; background:#07c160; color:#fff; border-radius:50rpx; font-size:32rpx; height:88rpx; line-height:88rpx; }
.ok::after { border:none; }
</style>
