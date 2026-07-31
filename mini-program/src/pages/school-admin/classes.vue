<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">🏫 班级管理</view>

    <view class="bar">
      <text class="sc">共 {{ classes.length }} 个班级</text>
      <text class="act" @click="openCreateClass">＋ 新增班级</text>
    </view>

    <Skeleton v-if="loading" :rows="3" />

    <EmptyState v-else-if="!classes.length" icon="🏫" text="暂无班级" hint="点击右上角「新增」创建第一个班级" />

    <view v-else class="list">
      <view class="row" v-for="c in classes" :key="c.id">
        <view class="info" @click="openEditClass(c)">
          <view class="nm-line">
            <text class="nm">{{ c.name }}</text>
            <text class="badge on">{{ c.headTeacher }}</text>
          </view>
          <view class="meta">年级：{{ c.grade }} · 班号：{{ c.classNo }} · 学期：{{ c.term || '未设置' }}</view>
          <view class="meta" v-if="c.subjects && c.subjects.length">学科：{{ c.subjects.join('、') }}</view>
        </view>
        <view class="acts">
          <text class="act del" @click.stop="delClass(c)">删除</text>
        </view>
      </view>
    </view>

    <!-- 新增/编辑班级弹窗 -->
    <view v-if="showClassForm" class="mask" @click="showClassForm = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">{{ editingClassId ? '编辑班级' : '新增班级' }}</view>
        <view class="field">
          <text class="label">班级名称</text>
          <view class="readonly-inp">{{ className }}</view>
        </view>
        <view class="field">
          <text class="label">年级 <text class="req">*</text></text>
          <picker :range="GRADE_OPTIONS" @change="(e) => classForm.grade = GRADE_OPTIONS[e.detail.value]">
            <view class="picker">{{ classForm.grade || '请选择年级' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">班号</text>
          <input v-model="classForm.classNo" class="inp" placeholder="如：1" />
        </view>
        <view class="field">
          <text class="label">班主任 <text class="req">*</text></text>
          <picker :range="teacherOptions" range-key="label" @change="onTeacherPick">
            <view class="picker">{{ classForm.headTeacherId ? teacherLabel(classForm.headTeacherId) : '请选择班主任' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">学期</text>
          <input v-model="classForm.term" class="inp" placeholder="如：2026春季学期" />
        </view>
        <view class="field">
          <text class="label">班主任任教学科</text>
          <input v-model="classForm.subjectsText" class="inp" placeholder="如：语文,数学,英语" />
          <text class="hint">多个学科用逗号分隔</text>
        </view>
        <view class="btn-row">
          <button class="btn cancel" @click="showClassForm = false">取消</button>
          <button class="btn save" :disabled="saving" @click="saveClass">{{ saving ? '保存中…' : (editingClassId ? '保存修改' : '确认创建') }}</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const GRADE_OPTIONS = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三']

const classes = ref([])
const teachers = ref([])
const loading = ref(false)
const saving = ref(false)

const showClassForm = ref(false)
const editingClassId = ref('')
const classForm = ref({ name: '', grade: '', classNo: '', headTeacherId: '', term: '', subjectsText: '' })

const className = computed(() => {
  const g = classForm.value.grade
  const n = classForm.value.classNo
  return (g && n) ? g + n + '班' : ''
})

const teacherOptions = computed(() =>
  teachers.value.map(t => ({ id: t.id, label: t.name + (t.subject ? '(' + t.subject + ')' : '') }))
)

function teacherLabel(id) {
  const t = teachers.value.find(x => x.id === id)
  return t ? t.name + (t.subject ? '(' + t.subject + ')' : '') : '请选择班主任'
}

function getToken() { return uni.getStorageSync('sa_token') }

function apiCall(method, path, data) {
  const token = getToken()
  if (!token) { uni.reLaunch({ url: '/pages/login/login' }); throw new Error('未登录') }
  return new Promise((resolve, reject) => {
    const cloud = typeof wx !== 'undefined' && wx.cloud
    if (!cloud || typeof cloud.callContainer !== 'function') {
      return reject(new Error('当前环境不支持云托管私有链路'))
    }
    const opts = {
      config: { env: 'cloud1-3gqx8dzh2e4f2532' },
      path: '/api' + path,
      method,
      header: { 'content-type': 'application/json', 'X-WX-SERVICE': 'gardener', Authorization: 'Bearer ' + token },
      success: (r) => {
        const status = r.statusCode || (r.data && r.data.statusCode) || 200
        if (status === 401) {
          uni.removeStorageSync('sa_token'); uni.removeStorageSync('sa_user')
          uni.reLaunch({ url: '/pages/login/login' }); return reject(new Error('登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(r.data)
        else reject(new Error((r.data && (r.data.message || r.data.error)) || ('请求失败(' + status + ')')))
      },
      fail: (e) => reject(new Error((e && (e.errMsg || e.message)) || '网络异常')),
    }
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') opts.data = data
    cloud.callContainer(opts)
  })
}

async function loadClasses() {
  loading.value = true
  try {
    const r = await apiCall('GET', '/school-admin/classes') || { items: [], total: 0 }
    classes.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { classes.value = [] } finally { loading.value = false }
}

async function loadTeachers() {
  try {
    const r = await apiCall('GET', '/school-admin/teachers?skip=0&take=200') || { items: [], total: 0 }
    teachers.value = (r.items || r) || []
  } catch (e) { teachers.value = [] }
}

function openCreateClass() {
  editingClassId.value = ''
  classForm.value = { name: '', grade: '', classNo: '', headTeacherId: '', term: '', subjectsText: '' }
  showClassForm.value = true
}

function openEditClass(c) {
  editingClassId.value = c.id
  classForm.value = {
    name: c.name || '', grade: c.grade || '', classNo: c.classNo || '',
    headTeacherId: c.teacherId || '', term: c.term || '',
    subjectsText: (c.subjects && c.subjects.length) ? c.subjects.join(',') : '',
  }
  showClassForm.value = true
}

function onTeacherPick(e) {
  const idx = e.detail.value
  const opt = teacherOptions.value[idx]
  classForm.value.headTeacherId = opt ? opt.id : ''
}

async function saveClass() {
  const f = classForm.value
  const autoName = className.value
  if (!autoName || !f.grade || !f.headTeacherId) {
    return uni.showToast({ title: '年级/班号/班主任必填', icon: 'none' })
  }
  const subjects = f.subjectsText ? f.subjectsText.split(/[,，]/).map(s => s.trim()).filter(Boolean) : []
  saving.value = true
  try {
    const payload = { name: autoName, grade: f.grade, classNo: f.classNo, headTeacherId: f.headTeacherId, term: f.term, subjects }
    if (editingClassId.value) {
      await apiCall('PATCH', '/school-admin/classes/' + editingClassId.value, payload)
      showClassForm.value = false
      await loadClasses()
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await apiCall('POST', '/school-admin/classes', payload)
      showClassForm.value = false
      await loadClasses()
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
  saving.value = false
}

async function delClass(c) {
  uni.showModal({
    title: '删除班级', content: '确定删除「' + c.name + '」？关联的学生数据不会自动迁移。', confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/classes/' + c.id)
        classes.value = classes.value.filter(x => x.id !== c.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) }
    },
  })
}

onShow(async () => {
  await Promise.all([loadClasses(), loadTeachers()])
})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 34rpx; font-weight: 800; color: var(--c-title); margin-bottom: 18rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: #e64340; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 6rpx 20rpx; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.badge { font-size: 20rpx; font-weight: 600; padding: 2rpx 14rpx; border-radius: 16rpx; }
.badge.on { background: rgba(76,175,80,.15); color: #4CAF50; }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.acts { display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; flex-shrink: 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 85vh; overflow-y: auto; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; text-align: center; }
.field { margin-bottom: 16rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.req { color: #e64340; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 14rpx 16rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; }
.readonly-inp { font-size: 28rpx; color: var(--c-title); padding: 20rpx 24rpx; background: var(--c-input); border-radius: 12rpx; min-height: 40rpx; border: 1px solid var(--c-input-border); }
.hint { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.save { background: var(--c-primary); color: #fff; }
.btn.save[disabled] { opacity: 0.6; }
</style>