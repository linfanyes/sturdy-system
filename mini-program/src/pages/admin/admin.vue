<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- 登录态 -->
    <view v-if="!adminToken" class="login-card">
      <view class="login-title">🔐 管理员登录</view>
      <input v-model="username" class="inp" placeholder="用户名" />
      <input v-model="password" class="inp" placeholder="密码" password />
      <button class="login-btn" :disabled="logging" @click="doLogin">{{ logging ? '登录中…' : '登 录' }}</button>
      <view class="hint">默认账号 admin / admin，可登录后端云托管修改环境变量</view>
    </view>

    <!-- 用户管理 -->
    <template v-else>
      <view class="head">
        <text class="h">👑 管理员面板</text>
        <text class="logout" @click="adminToken=''">退出</text>
      </view>

      <view class="stats"><text class="sc">共 {{ users.length }} 个用户</text></view>

      <view class="list">
        <view class="row" v-for="u in users" :key="u.id">
          <view class="info">
            <text class="nm">{{ u.name }}</text>
            <text class="meta">{{ u.school || '未设学校' }} · {{ u.openid }}</text>
          </view>
          <view class="acts">
            <text class="act" @click="toggleFeatures(u)">⚙️ 功能</text>
            <text class="act del" @click="delUser(u)">删除</text>
          </view>
        </view>
      </view>

      <!-- 功能配置弹窗 -->
      <view v-if="featureUser" class="mask" @click="featureUser=null">
        <view class="sheet" @click.stop>
          <view class="sh-t">{{ featureUser.name }} 的功能配置</view>
          <view class="all-row">
            <text class="all-btn" @click="toggleAllFeatures">{{ allSelected ? '取消全选' : '全选' }}</text>
          </view>
          <scroll-view scroll-y class="feat-list">
            <label class="feat-row" v-for="f in allFeatures" :key="f.key">
              <text class="ck" :class="selFeatures.includes(f.key) && 'on'"></text>
              <text>{{ f.label }}</text>
            </label>
          </scroll-view>
          <button class="save-btn" :disabled="savingFeat" @click="saveFeatures">{{ savingFeat ? '保存中…' : '保存功能配置' }}</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'

const SERVER_URL = '/api'

const adminToken = ref('')
const username = ref('admin')
const password = ref('admin')
const logging = ref(false)
const users = ref([])
const featureUser = ref(null)
const selFeatures = ref([])
const savingFeat = ref(false)

const allFeatures = [
  { key: 'classes', label: '班级管理' },
  { key: 'students', label: '学生管理' },
  { key: 'exams', label: '考试管理' },
  { key: 'grades', label: '成绩管理' },
  { key: 'attendance', label: '考勤' },
  { key: 'schedule', label: '课表' },
  { key: 'homework', label: '作业' },
  { key: 'notices', label: '公告' },
  { key: 'ai', label: 'AI 助手/备课' },
  { key: 'tools', label: '课堂工具' },
  { key: 'games', label: '小游戏' },
  { key: 'finance', label: '班费' },
  { key: 'activities', label: '班级活动' },
  { key: 'rewards', label: '奖励/积分' },
  { key: 'parents', label: '家长联系' },
  { key: 'teachers', label: '教师通讯录' },
]
const allFeatureKeys = allFeatures.map((f) => f.key)
const allSelected = computed(() => selFeatures.value.length === allFeatureKeys.length)

function toggleAllFeatures() {
  selFeatures.value = allSelected.value ? [] : [...allFeatureKeys]
}

async function doLogin() {
  if (logging.value) return
  logging.value = true
  try {
    const cloud = typeof wx !== 'undefined' && wx.cloud
    const resp = await new Promise((resolve, reject) => {
      cloud.callContainer({
        config: { env: 'prod-d6g1zoq8c7be4ce53' },
        path: SERVER_URL + '/admin/login',
        method: 'POST',
        data: { username: username.value, password: password.value },
        header: { 'content-type': 'application/json', 'X-WX-SERVICE': 'tec-work' },
        success: resolve,
        fail: reject,
      })
    })
    adminToken.value = resp.data?.token || ''
    if (adminToken.value) {
      await loadUsers()
    } else {
      uni.showToast({ title: '登录失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '登录失败: ' + (e.message || '网络错误'), icon: 'none' })
  } finally {
    logging.value = false
  }
}

async function loadUsers() {
  try {
    const cloud = typeof wx !== 'undefined' && wx.cloud
    const resp = await new Promise((resolve, reject) => {
      cloud.callContainer({
        config: { env: 'prod-d6g1zoq8c7be4ce53' },
        path: SERVER_URL + '/admin/users',
        method: 'GET',
        header: { Authorization: adminToken.value },
        success: resolve,
        fail: reject,
      })
    })
    users.value = resp.data || []
  } catch (e) {
    uni.showToast({ title: '加载用户失败', icon: 'none' })
  }
}

function toggleFeatures(u) {
  featureUser.value = u
  selFeatures.value = u.features && u.features.length ? [...u.features] : [...allFeatureKeys]
}

async function saveFeatures() {
  if (savingFeat.value || !featureUser.value) return
  savingFeat.value = true
  const features = selFeatures.value.length === allFeatureKeys.length ? [] : selFeatures.value
  try {
    const cloud = typeof wx !== 'undefined' && wx.cloud
    await new Promise((resolve, reject) => {
      cloud.callContainer({
        config: { env: 'prod-d6g1zoq8c7be4ce53' },
        path: SERVER_URL + '/admin/users/' + featureUser.value.id + '/features',
        method: 'PATCH',
        data: { features },
        header: { Authorization: adminToken.value, 'content-type': 'application/json' },
        success: resolve,
        fail: reject,
      })
    })
    featureUser.value = null
    await loadUsers()
    uni.showToast({ title: '功能配置已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    savingFeat.value = false
  }
}

function delUser(u) {
  uni.showModal({
    title: '删除用户',
    content: `确定删除「${u.name}」及其全部数据？此操作不可恢复！`,
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        const cloud = typeof wx !== 'undefined' && wx.cloud
        await new Promise((resolve, reject) => {
          cloud.callContainer({
            config: { env: 'prod-d6g1zoq8c7be4ce53' },
            path: SERVER_URL + '/admin/users/' + u.id,
            method: 'DELETE',
            header: { Authorization: adminToken.value },
            success: resolve,
            fail: reject,
          })
        })
        users.value = users.value.filter((x) => x.id !== u.id)
        uni.showToast({ title: '已删除', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '删除失败', icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.login-card { background: var(--c-card); border-radius: 24rpx; padding: 40rpx 30rpx; width: 560rpx; margin: 80rpx auto; }
.login-title { font-size: 36rpx; font-weight: 800; color: var(--c-title); text-align: center; margin-bottom: 30rpx; }
.inp { border: 1px solid var(--c-border); border-radius: 14rpx; padding: 18rpx; margin-bottom: 16rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); }
.login-btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 30rpx; height: 84rpx; line-height: 84rpx; }
.hint { font-size: 22rpx; color: var(--c-sub); text-align: center; margin-top: 16rpx; line-height: 1.6; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.logout { font-size: 26rpx; color: var(--c-accent); }
.stats { margin-bottom: 14rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.list { background: var(--c-card); border-radius: 16rpx; padding: 10rpx 24rpx; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-bottom: 1px solid var(--c-border); }
.info { flex: 1; }
.nm { display: block; font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.meta { font-size: 22rpx; color: var(--c-sub); }
.acts { display: flex; gap: 18rpx; }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: var(--c-danger); }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 80vh; display: flex; flex-direction: column; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.all-row { margin-bottom: 10rpx; }
.all-btn { font-size: 26rpx; color: var(--c-accent); }
.feat-list { max-height: 500rpx; }
.feat-row { display: flex; align-items: center; gap: 14rpx; padding: 14rpx 0; border-bottom: 1px solid var(--c-border); font-size: 28rpx; color: var(--c-title); }
.ck { width: 28rpx; height: 28rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.ck.on { background: var(--c-primary); border-color: var(--c-primary); }
.save-btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; margin-top: 14rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
</style>
