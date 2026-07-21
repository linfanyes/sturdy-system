<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view v-if="!adminToken" class="login-card">
      <view class="login-title">🔐 超级管理员登录</view>
      <input v-model="username" class="inp" placeholder="用户名" />
      <input v-model="password" class="inp" placeholder="密码" password />
      <button class="login-btn" :disabled="logging" @click="doLogin">{{ logging ? '登录中…' : '登 录' }}</button>
      <view class="hint">默认 admin / admin（后端环境变量 SUPER_ADMIN_USER / SUPER_ADMIN_PASSWORD 可配）</view>
    </view>

    <template v-else>
      <view class="head">
        <text class="h">👑 超级管理员</text>
        <text class="logout" @click="logout">退出</text>
      </view>
      <view class="tabs">
        <text class="tab" :class="tab==='schools'&&'on'" @click="tab='schools'">🏫 学校管理</text>
        <text class="tab" :class="tab==='admins'&&'on'" @click="tab='admins'">👤 学校管理员</text>
        <text class="tab" :class="tab==='users'&&'on'" @click="tab='users'">👥 教师管理</text>
      </view>

      <!-- 学校管理 -->
      <template v-if="tab==='schools'">
        <view class="stats"><text class="sc">共 {{ schools.length }} 所学校</text>
          <text class="act" @click="showSchoolForm=true; schoolForm={name:'',address:'',contact:'',phone:''}">＋ 新增</text>
        </view>
        <view class="list">
          <view class="row" v-for="s in schools" :key="s.id">
            <view class="info"><text class="nm">{{ s.name }}</text><text class="meta">编号 {{ s.code }} · {{ s.status }}</text></view>
            <view class="acts"><text class="act del" @click="delSchool(s)">删除</text></view>
          </view>
        </view>
        <view v-if="showSchoolForm" class="mask" @click="showSchoolForm=false">
          <view class="sheet" @click.stop>
            <view class="sh-t">新增学校</view>
            <input v-model="schoolForm.name" class="inp" placeholder="学校名称（必填）" />
            <input v-model="schoolForm.address" class="inp" placeholder="地址" />
            <input v-model="schoolForm.contact" class="inp" placeholder="联系人" />
            <input v-model="schoolForm.phone" class="inp" placeholder="电话" />
            <button class="save-btn" :disabled="saving" @click="createSchool">{{ saving ? '创建中…' : '创建学校（自动生成编号）' }}</button>
          </view>
        </view>
      </template>

      <!-- 学校管理员 -->
      <template v-if="tab==='admins'">
        <view class="stats"><text class="sc">共 {{ schoolAdmins.length }} 个管理员</text>
          <text class="act" @click="showAdminForm=true; adminForm={username:'',password:'',name:'',schoolId:schools[0]?.id||''}">＋ 新增</text>
        </view>
        <view class="list">
          <view class="row" v-for="a in schoolAdmins" :key="a.id">
            <view class="info"><text class="nm">{{ a.name }}</text><text class="meta">{{ a.username }} · 学校 {{ a.schoolId }}</text></view>
            <view class="acts"><text class="act del" @click="delAdmin(a)">删除</text></view>
          </view>
        </view>
        <view v-if="showAdminForm" class="mask" @click="showAdminForm=false">
          <view class="sheet" @click.stop>
            <view class="sh-t">新增学校管理员</view>
            <input v-model="adminForm.username" class="inp" placeholder="用户名（必填）" />
            <input v-model="adminForm.password" class="inp" placeholder="密码（必填）" password />
            <input v-model="adminForm.name" class="inp" placeholder="姓名（必填）" />
            <picker :range="schoolNames" :value="schoolIdx" @change="onSchoolPick">
              <view class="inp">{{ schoolNames[schoolIdx] || '选择学校' }}</view>
            </picker>
            <button class="save-btn" :disabled="saving" @click="createAdmin">{{ saving ? '创建中…' : '创建管理员' }}</button>
          </view>
        </view>
      </template>

      <!-- 教师管理 -->
      <template v-if="tab==='users'">
        <view class="stats"><text class="sc">共 {{ users.length }} 个教师</text></view>
        <view class="list">
          <view class="row" v-for="u in users" :key="u.id">
            <view class="info"><text class="nm">{{ u.name }}</text><text class="meta">{{ u.school || '未设学校' }} · {{ u.username || '微信登录' }}</text></view>
            <view class="acts"><text class="act" @click="toggleFeatures(u)">功能</text><text class="act del" @click="delUser(u)">删除</text></view>
          </view>
        </view>
      </template>

      <!-- 功能弹窗同前 -->
      <view v-if="featureUser" class="mask" @click="featureUser=null">
        <view class="sheet" @click.stop>
          <view class="sh-t">{{ featureUser.name }} 功能配置</view>
          <scroll-view scroll-y class="feat-list">
            <label class="feat-row" v-for="f in allFeatures" :key="f.key" @click="selFeatures.includes(f.key)?selFeatures.splice(selFeatures.indexOf(f.key),1):selFeatures.push(f.key)">
              <text class="ck" :class="selFeatures.includes(f.key)&&'on'"></text><text>{{ f.label }}</text>
            </label>
          </scroll-view>
          <button class="save-btn" :disabled="savingFeat" @click="saveFeatures">{{ savingFeat?'保存中…':'保存' }}</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { theme } from '../../common/store'

const SERVER_URL = '/api'
const ADMIN_TOKEN_KEY = 'admin_token'
const adminToken = ref(uni.getStorageSync(ADMIN_TOKEN_KEY) || '')
const username = ref('admin'), password = ref('admin'), logging = ref(false)
const tab = ref('schools')
const users = ref([]), schools = ref([]), schoolAdmins = ref([])
const saving = ref(false)

const showSchoolForm = ref(false), schoolForm = ref({ name: '', address: '', contact: '', phone: '' })
const showAdminForm = ref(false), adminForm = ref({ username: '', password: '', name: '', schoolId: '' })
const schoolNames = computed(() => schools.value.map(s => s.name))
const schoolIdx = ref(0)

const featureUser = ref(null), selFeatures = ref([]), savingFeat = ref(false)
const allFeatures = [
  { key: 'classes', label: '班级管理' },{ key: 'students', label: '学生管理' },{ key: 'exams', label: '考试管理' },
  { key: 'grades', label: '成绩管理' },{ key: 'attendance', label: '考勤' },{ key: 'schedule', label: '课表' },
  { key: 'homework', label: '作业' },{ key: 'notices', label: '公告' },{ key: 'ai', label: 'AI 助手/备课' },
  { key: 'tools', label: '课堂工具' },{ key: 'games', label: '小游戏' },{ key: 'finance', label: '班费' },
  { key: 'activities', label: '班级活动' },{ key: 'rewards', label: '奖励/积分' },{ key: 'parents', label: '家长联系' },
  { key: 'teachers', label: '教师通讯录' },
]

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

async function doLogin() {
  if (logging.value) return; logging.value = true
  try {
    const resp = await apiCall('POST', '/admin/login', { username: username.value, password: password.value })
    adminToken.value = resp?.token || ''
    if (adminToken.value) { uni.setStorageSync(ADMIN_TOKEN_KEY, adminToken.value); await loadAll() }
    else uni.showToast({ title: '登录失败', icon: 'none' })
  } catch (e) { uni.showToast({ title: '登录失败', icon: 'none' }) }
  finally { logging.value = false }
}

function logout() { adminToken.value=''; uni.removeStorageSync(ADMIN_TOKEN_KEY); uni.reLaunch({ url:'/pages/login/login' }) }

onMounted(() => { if (adminToken.value) loadAll() })

async function loadAll() {
  try { schools.value = await apiCall('GET', '/admin/schools') || [] } catch (e) {}
  try { schoolAdmins.value = await apiCall('GET', '/admin/school-admins') || [] } catch (e) {}
  try { users.value = await apiCall('GET', '/admin/teachers') || [] } catch (e) {}
}

async function createSchool() {
  if (!schoolForm.value.name) return uni.showToast({ title: '学校名称必填', icon: 'none' })
  saving.value = true
  try { await apiCall('POST', '/admin/schools', schoolForm.value); showSchoolForm.value = false; await loadAll(); uni.showToast({ title: '学校已创建', icon: 'success' }) }
  catch (e) { uni.showToast({ title: '创建失败', icon: 'none' }) }
  saving.value = false
}
async function delSchool(s) {
  uni.showModal({ title: '删除学校', content: '确定删除「' + s.name + '」？', confirmColor: '#e64340',
    success: async (m) => { if (!m.confirm) return; try { await apiCall('DELETE', '/admin/schools/' + s.id); await loadAll() } catch (e) {} }
  })
}
function onSchoolPick(e) { schoolIdx.value = e.detail.value; adminForm.value.schoolId = schools.value[e.detail.value]?.id || '' }
async function createAdmin() {
  if (!adminForm.value.username || !adminForm.value.password || !adminForm.value.name || !adminForm.value.schoolId)
    return uni.showToast({ title: '所有字段必填', icon: 'none' })
  saving.value = true
  try { await apiCall('POST', '/admin/school-admins', adminForm.value); showAdminForm.value = false; await loadAll(); uni.showToast({ title: '管理员已创建', icon: 'success' }) }
  catch (e) { uni.showToast({ title: '创建失败', icon: 'none' }) }
  saving.value = false
}
async function delAdmin(a) {
  uni.showModal({ title: '删除管理员', content: '确定删除「' + a.name + '」？', confirmColor: '#e64340',
    success: async (m) => { if (!m.confirm) return; try { await apiCall('DELETE', '/admin/school-admins/' + a.id); await loadAll() } catch (e) {} }
  })
}
function toggleFeatures(u) { featureUser.value = u; selFeatures.value = u.features?.length ? [...u.features] : [...allFeatures.map(f=>f.key)] }
async function saveFeatures() {
  if (savingFeat.value || !featureUser.value) return; savingFeat.value = true
  try { await apiCall('PATCH', '/admin/users/' + featureUser.value.id + '/features', { features: selFeatures.value }); featureUser.value = null; await loadAll(); uni.showToast({ title: '已保存', icon: 'success' }) }
  catch (e) { uni.showToast({ title: '保存失败', icon: 'none' }) }
  savingFeat.value = false
}
function delUser(u) {
  uni.showModal({ title: '删除教师', content: '确定删除「' + u.name + '」？', confirmColor: '#e64340',
    success: async (m) => { if (!m.confirm) return; try { await apiCall('DELETE', '/admin/users/' + u.id); await loadAll() } catch (e) {} }
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
.tabs { display: flex; gap: 12rpx; margin-bottom: 20rpx; flex-wrap: wrap; }
.tab { font-size: 26rpx; padding: 14rpx 26rpx; border-radius: 30rpx; background: var(--c-card2); color: var(--c-sub); }
.tab.on { background: var(--c-accent); color: #fff; font-weight: 700; }
.stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: #e64340; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 10rpx 24rpx; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-bottom: 1px solid var(--c-border); }
.info { flex: 1; }
.nm { display: block; font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.meta { font-size: 22rpx; color: var(--c-sub); }
.acts { display: flex; gap: 18rpx; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 80vh; display: flex; flex-direction: column; box-sizing: border-box; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.feat-list { max-height: 500rpx; }
.feat-row { display: flex; align-items: center; gap: 14rpx; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 28rpx; color: var(--c-title); }
.ck { width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.ck.on { background: var(--c-primary); border-color: var(--c-primary); }
.save-btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
</style>
