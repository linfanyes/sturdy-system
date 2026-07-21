<template>
  <view class="page" :class="{ dark }">
    <view class="hd">
      <view class="hd-left">
        <view class="t">🏫 {{ schoolName || '学校管理' }}</view>
        <view class="sub" v-if="schoolCode">编号：{{ schoolCode }}</view>
      </view>
      <view class="out" @click="logout">退出</view>
    </view>

    <view class="tabs">
      <view class="tab" :class="tab==='teachers'&&'on'" @click="tab='teachers'">👥 教师管理</view>
      <view class="tab" :class="tab==='features'&&'on'" @click="tab='features'">⚙️ 功能管理</view>
    </view>

    <!-- 教师管理 -->
    <template v-if="tab==='teachers'">
      <view class="bar">
        <text class="sc">共 {{ teachers.length }} 位教师</text>
        <text class="act" @click="openCreate">＋ 新增教师</text>
      </view>
      <view class="list">
        <view v-if="!teachers.length" class="empty">暂无教师，点击右上角「新增」</view>
        <view class="row" v-for="u in teachers" :key="u.id">
          <view class="info" @click="openEdit(u)">
            <view class="nm-line">
              <text class="nm">{{ u.name }}</text>
              <text class="badge" :class="u.enabled ? 'on' : 'off'">{{ u.enabled ? '启用' : '禁用' }}</text>
            </view>
            <view class="meta">用户名：{{ u.username || '微信登录' }}</view>
            <view class="meta" v-if="u.phone">电话：{{ u.phone }}</view>
            <view class="acts">
              <text class="act" @click.stop="openFeatures(u)">功能配置</text>
              <text class="act" @click.stop="resetPwd(u)">重置密码</text>
              <text class="act del" @click.stop="delTeacher(u)">删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 新增/编辑教师（全屏） -->
      <view v-if="showForm" class="full-mask">
        <view class="full-page">
          <view class="full-head">
            <text class="full-back" @click="showForm=false">← 返回</text>
            <text class="full-title">{{ editingId ? '编辑教师' : '新增教师' }}</text>
            <text class="full-placeholder"></text>
          </view>
          <scroll-view scroll-y class="full-body">
            <view class="form-item">
              <text class="label">用户名 <text class="req">*</text></text>
              <input v-model="form.username" class="inp" placeholder="登录用，如：zhangsan" />
              <text class="tip">用户名不可重复，系统会自动校验</text>
            </view>
            <view class="form-item">
              <text class="label">姓名 <text class="req">*</text></text>
              <input v-model="form.name" class="inp" placeholder="如：张老师" />
            </view>
            <view v-if="!editingId" class="form-item">
              <text class="label">密码 <text class="req">*</text></text>
              <input v-model="form.password" class="inp" placeholder="登录密码" password />
            </view>
            <view v-else class="form-item">
              <text class="label">新密码 <text class="opt">（留空则不修改）</text></text>
              <input v-model="form.password" class="inp" placeholder="输入新密码可重置" password />
            </view>
            <view class="form-item">
              <text class="label">手机号</text>
              <input v-model="form.phone" class="inp" placeholder="可选" />
            </view>
            <view class="form-item switch-item">
              <view class="label-line">
                <text class="label">启用标志</text>
                <text class="switch-val">{{ form.enabled ? '启用' : '禁用' }}</text>
              </view>
              <switch :checked="form.enabled" color="#4CAF50" @change="onEnabledChange" />
            </view>
          </scroll-view>
          <view class="full-foot">
            <button class="btn" :disabled="saving" @click="saveForm">{{ saving ? '保存中…' : (editingId ? '保存修改' : '确认创建') }}</button>
          </view>
        </view>
      </view>
    </template>

    <!-- 功能管理 -->
    <template v-if="tab==='features'">
      <view class="bar">
        <text class="sc">共 {{ teachers.length }} 位教师</text>
      </view>
      <view class="hint-block">点击教师可配置其可用功能，未勾选的功能该教师将无法使用。</view>
      <view class="list">
        <view v-if="!teachers.length" class="empty">暂无教师</view>
        <view class="row" v-for="u in teachers" :key="u.id">
          <view class="info" @click="openFeatures(u)">
            <view class="nm-line">
              <text class="nm">{{ u.name }}</text>
              <text class="badge" :class="u.enabled ? 'on' : 'off'">{{ u.enabled ? '启用' : '禁用' }}</text>
            </view>
            <view class="meta">用户名：{{ u.username || '微信登录' }}</view>
            <view class="feat-line">
              <text class="feat-count">{{ getFeatCount(u) }}/{{ allFeatures.length }} 项</text>
              <text class="act">配置 →</text>
            </view>
          </view>
        </view>
      </view>
    </template>

    <!-- 功能配置（全屏） -->
    <view v-if="featUser" class="full-mask">
      <view class="full-page">
        <view class="full-head">
          <text class="full-back" @click="featUser=null">← 返回</text>
          <text class="full-title">{{ featUser.name }} 功能配置</text>
          <text class="full-placeholder"></text>
        </view>
        <scroll-view scroll-y class="full-body">
          <view class="feat-toolbar">
            <text class="act" @click="selectAll">全选</text>
            <text class="act" @click="selectNone">全不选</text>
            <text class="sc">{{ sel.length }}/{{ allFeatures.length }} 项已启用</text>
          </view>
          <view class="flist">
            <label class="frow" v-for="f in allFeatures" :key="f.key" @click="toggleFeat(f.key)">
              <text class="ck" :class="sel.includes(f.key)&&'on'"></text>
              <text class="frow-label">{{ f.label }}</text>
            </label>
          </view>
        </scroll-view>
        <view class="full-foot">
          <button class="btn" :disabled="saving" @click="saveFeatures">{{ saving ? '保存中…' : '保存配置' }}</button>
        </view>
      </view>
    </view>

    <!-- 密码重置弹窗 -->
    <view v-if="pwdUser" class="mask" @click="pwdUser=null">
      <view class="sheet" @click.stop>
        <view class="sh-t">重置「{{ pwdUser.name }}」密码</view>
        <input v-model="newPwd" class="inp" placeholder="新密码" password />
        <button class="btn" :disabled="saving" @click="doResetPwd">确认重置</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'

const dark = computed(() => theme.mode === 'dark')
const tab = ref('teachers')
const teachers = ref([])
const saving = ref(false)

// 从本地存储读取学校管理员信息（登录时保存）
const saUser = (() => {
  try { return JSON.parse(uni.getStorageSync('sa_user') || '{}') } catch (e) { return {} }
})()
const schoolName = ref(saUser.schoolName || '')
const schoolCode = ref(saUser.schoolCode || '')

// 统一表单（新增/编辑）
const showForm = ref(false)
const editingId = ref('')
const form = ref({ username: '', password: '', name: '', phone: '', enabled: true })

const featUser = ref(null), sel = ref([])
const pwdUser = ref(null), newPwd = ref('')

const CLOUDRUN_ENV = 'prod-d6g1zoq8c7be4ce53'
const CLOUDRUN_SERVICE = 'tec-work'

const allFeatures = [
  { key:'classes',label:'班级管理' },{ key:'students',label:'学生管理' },{ key:'exams',label:'考试管理' },
  { key:'grades',label:'成绩管理' },{ key:'attendance',label:'考勤' },{ key:'schedule',label:'课表' },
  { key:'homework',label:'作业' },{ key:'notices',label:'公告' },{ key:'ai',label:'AI助手/备课' },
  { key:'tools',label:'课堂工具' },{ key:'games',label:'小游戏' },{ key:'finance',label:'班费' },
  { key:'activities',label:'班级活动' },{ key:'rewards',label:'奖励/积分' },{ key:'parents',label:'家长联系' },
  { key:'teachers',label:'教师通讯录' },
]

function getToken() { return uni.getStorageSync('sa_token') }

async function apiCall(method, path, data) {
  const token = getToken()
  if (!token) { uni.reLaunch({ url: '/pages/login/login' }); throw new Error('未登录') }
  const cloud = typeof wx !== 'undefined' && wx.cloud
  if (!cloud || typeof cloud.callContainer !== 'function') {
    throw new Error('当前环境不支持云托管私有链路')
  }
  return new Promise((resolve, reject) => {
    const opts = {
      config: { env: CLOUDRUN_ENV },
      path: '/api' + path,
      method,
      header: {
        'content-type': 'application/json',
        'X-WX-SERVICE': CLOUDRUN_SERVICE,
        Authorization: 'Bearer ' + token,
      },
      success: (r) => {
        const status = r.statusCode || (r.data && r.data.statusCode) || 200
        if (status === 401) {
          uni.removeStorageSync('sa_token')
          uni.removeStorageSync('sa_user')
          uni.reLaunch({ url: '/pages/login/login' })
          return reject(new Error('登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(r.data)
        else {
          const msg = (r.data && (r.data.message || r.data.error)) || ('请求失败(' + status + ')')
          reject(new Error(msg))
        }
      },
      fail: (e) => {
        const msg = (e && (e.errMsg || e.message)) || '网络异常'
        reject(new Error(msg))
      },
    }
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') {
      opts.data = data
    }
    cloud.callContainer(opts)
  })
}

async function loadTeachers() {
  try { teachers.value = await apiCall('GET', '/school-admin/teachers') || [] }
  catch (e) { teachers.value = []; console.error('loadTeachers', e) }
}

function openCreate() {
  editingId.value = ''
  form.value = { username: '', password: '', name: '', phone: '', enabled: true }
  showForm.value = true
}

function openEdit(u) {
  editingId.value = u.id
  form.value = {
    username: u.username || '',
    password: '',
    name: u.name || '',
    phone: u.phone || '',
    enabled: u.enabled !== false,
  }
  showForm.value = true
}

function onEnabledChange(e) {
  form.value.enabled = e.detail.value
}

async function saveForm() {
  const f = form.value
  if (!f.username || !f.name) return uni.showToast({ title: '用户名/姓名必填', icon: 'none' })
  if (!editingId.value && !f.password) return uni.showToast({ title: '新增时密码必填', icon: 'none' })
  saving.value = true
  try {
    if (editingId.value) {
      const payload = { username: f.username, name: f.name, phone: f.phone, enabled: f.enabled }
      await apiCall('PATCH', '/school-admin/teachers/' + editingId.value, payload)
      if (f.password) {
        await apiCall('POST', '/school-admin/teachers/' + editingId.value + '/reset-password', { password: f.password })
      }
      showForm.value = false
      await loadTeachers()
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await apiCall('POST', '/school-admin/teachers', {
        username: f.username, name: f.name, password: f.password,
        phone: f.phone, enabled: f.enabled,
      })
      showForm.value = false
      await loadTeachers()
      uni.showToast({ title: '已创建', icon: 'success' })
    }
  } catch (e) {
    console.error('saveForm error', e)
    uni.showToast({ title: e.message || '操作失败', icon: 'none', duration: 3000 })
  }
  saving.value = false
}

async function delTeacher(u) {
  uni.showModal({
    title: '删除教师',
    content: '确定删除「' + u.name + '」？该教师的所有关联数据将无法访问。',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/teachers/' + u.id)
        teachers.value = teachers.value.filter(x => x.id !== u.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => { loadTeachers() }, 500)
      } catch (e) {
        console.error('delTeacher', e)
        uni.showToast({ title: e.message || '删除失败', icon: 'none', duration: 3000 })
      }
    },
  })
}

function getFeatCount(u) {
  if (!u.features || !u.features.length) return allFeatures.length
  return u.features.length
}

function openFeatures(u) {
  featUser.value = u
  sel.value = u.features && u.features.length ? [...u.features] : allFeatures.map(f => f.key)
}

function toggleFeat(key) {
  const i = sel.value.indexOf(key)
  if (i >= 0) sel.value.splice(i, 1)
  else sel.value.push(key)
}

function selectAll() { sel.value = allFeatures.map(f => f.key) }
function selectNone() { sel.value = [] }

async function saveFeatures() {
  saving.value = true
  try {
    await apiCall('PATCH', '/school-admin/teachers/' + featUser.value.id + '/features', { features: sel.value })
    featUser.value = null
    await loadTeachers()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
  saving.value = false
}

function resetPwd(u) { pwdUser.value = u; newPwd.value = '' }
async function doResetPwd() {
  if (!newPwd.value) return uni.showToast({ title: '请输入新密码', icon: 'none' })
  saving.value = true
  try {
    await apiCall('POST', '/school-admin/teachers/' + pwdUser.value.id + '/reset-password', { password: newPwd.value })
    pwdUser.value = null
    uni.showToast({ title: '已重置', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '重置失败', icon: 'none' })
  }
  saving.value = false
}

function logout() {
  uni.removeStorageSync('sa_token')
  uni.removeStorageSync('sa_user')
  uni.reLaunch({ url: '/pages/login/login' })
}

onShow(() => { loadTeachers() })
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; }
.hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; }
.hd-left { flex: 1; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.out { font-size: 26rpx; color: var(--c-accent); }
.tabs { display: flex; gap: 12rpx; margin-bottom: 18rpx; }
.tab { font-size: 26rpx; padding: 14rpx 26rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-sub); }
.tab.on { background: var(--c-accent); color: #fff; font-weight: 700; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: #e64340; }
.hint-block { font-size: 24rpx; color: var(--c-sub); background: var(--c-card2, #f5f5f5); padding: 14rpx 18rpx; border-radius: 12rpx; margin-bottom: 16rpx; line-height: 1.6; border-left: 4rpx solid var(--c-accent, #4CAF50); }
.list { background: var(--c-card); border-radius: 16rpx; padding: 6rpx 20rpx; }
.empty { padding: 60rpx 0; text-align: center; font-size: 26rpx; color: var(--c-sub); }
.row { padding: 16rpx 0; border-bottom: 1px solid var(--c-border); }
.info { flex: 1; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 2rpx 14rpx; border-radius: 16rpx; }
.badge.on { background: rgba(76, 175, 80, .15); color: #4CAF50; }
.badge.off { background: rgba(230, 67, 64, .15); color: #e64340; }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.acts { display: flex; gap: 24rpx; margin-top: 10rpx; }
.feat-line { display: flex; align-items: center; justify-content: space-between; margin-top: 8rpx; }
.feat-count { font-size: 24rpx; color: var(--c-sub); }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 80vh; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 14rpx 16rpx; margin-bottom: 6rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
.btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; }
.btn[disabled] { opacity: .6; }
/* 全屏表单 */
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 88rpx; background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; padding: 24rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 16rpx 30rpx 30rpx; background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.form-item { margin-bottom: 18rpx; }
.label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.req { color: #e64340; }
.opt { color: var(--c-sub); font-weight: 400; font-size: 22rpx; }
.tip { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
.switch-item { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 0; }
.label-line { flex: 1; }
.switch-val { font-size: 24rpx; color: var(--c-sub); display: block; margin-top: 4rpx; }
/* 功能配置 */
.feat-toolbar { display: flex; align-items: center; gap: 24rpx; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); margin-bottom: 10rpx; }
.flist { padding: 4rpx 0; }
.frow { display: flex; align-items: center; gap: 14rpx; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); font-size: 28rpx; color: var(--c-title); }
.frow-label { flex: 1; }
.ck { width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.ck.on { background: var(--c-primary); border-color: var(--c-primary); }
</style>
