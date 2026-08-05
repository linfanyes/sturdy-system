<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">
      <view class="hd-left">
        <view class="t">🏫 {{ schoolName || '学校管理' }}</view>
        <view class="sub" v-if="schoolCode">编号：{{ schoolCode }}</view>
      </view>
      <view class="out" @click="logout">退出</view>
    </view>

    <!-- ====== 看板 Tab ====== -->
    <view v-if="bottomTab === 'dashboard'">
    <!-- 看板统计 -->
    <view class="dashboard">
      <view class="dash-card"><text class="dash-n">{{ dash.totalTeachers }}</text><text class="dash-l">教师</text></view>
      <view class="dash-card"><text class="dash-n">{{ dash.activeTeachers }}</text><text class="dash-l">启用</text></view>
      <view class="dash-card"><text class="dash-n">{{ dash.totalClasses }}</text><text class="dash-l">班级</text></view>
      <view class="dash-card"><text class="dash-n">{{ dash.totalStudents }}</text><text class="dash-l">学生</text></view>
    </view>
    <!-- 第二行统计 -->
    <view class="dashboard dash-row2">
      <view class="dash-card" v-if="dash.attendanceRate != null">
        <text class="dash-n" :class="dash.attendanceRate < 80 ? 'warn' : ''">{{ dash.attendanceRate }}%</text>
        <text class="dash-l">今日出勤</text>
      </view>
      <view class="dash-card">
        <text class="dash-n" :class="dash.pendingHomework > 0 ? 'warn' : ''">{{ dash.pendingHomework }}</text>
        <text class="dash-l">待批改</text>
      </view>
      <view class="dash-card">
        <text class="dash-n">{{ dash.parentEnabled || 0 }}</text>
        <text class="dash-l">家长开通</text>
      </view>
    </view>

    <!-- 学校公告 -->
    <view class="notice-section">
      <view class="notice-hd">
        <text class="notice-title">📢 学校公告</text>
        <text v-if="!showNoticeForm" class="act" @click="showNoticeForm=true">写公告</text>
        <text v-else class="act" @click="showNoticeForm=false">收起</text>
      </view>
      <view v-if="showNoticeForm" class="notice-form">
        <input v-model="noticeForm.title" class="inp" placeholder="公告标题（必填）" />
        <textarea v-model="noticeForm.content" class="inp notice-textarea" placeholder="公告内容（选填）" />
        <button class="notice-send" :disabled="saving" @click="sendNotice">{{ saving ? '发送中…' : '发送公告' }}</button>
      </view>
      <view class="notice-list">
        <EmptyState v-if="!schoolNotices.length" icon="📢" text="暂无学校公告" hint="写一条公告发给全体教师" />
        <view class="notice-item" v-for="n in schoolNotices" :key="n.id">
          <view class="notice-item-hd">
            <text class="notice-item-title">{{ n.title }}</text>
            <text class="act del" @click.stop="delNotice(n)">删除</text>
          </view>
          <text class="notice-item-content" v-if="n.content">{{ n.content }}</text>
          <text class="notice-item-time">{{ n.createdAt ? n.createdAt.slice(0, 10) : '' }}</text>
        </view>
      </view>
    </view>

    <!-- 学期管理（仅看板 Tab 显示，避免占用其它 Tab 空间） -->
    <view class="notice-section">
      <view class="notice-hd">
        <text class="notice-title">🗓️ 学期管理</text>
        <text v-if="!showSemesterForm" class="act" @click="openCreateSemester">＋ 新增</text>
        <text v-else class="act" @click="showSemesterForm=false">收起</text>
      </view>
      <view v-if="showSemesterForm" class="notice-form">
        <input v-model="semesterForm.name" class="inp" placeholder="学期名称（如：2026春季学期）" />
        <view class="semester-date-row">
          <input v-model="semesterForm.startDate" class="inp sem-date" placeholder="开始日期 2026-02-17" />
          <text class="sem-date-sep">~</text>
          <input v-model="semesterForm.endDate" class="inp sem-date" placeholder="结束日期 2026-07-04" />
        </view>
        <button class="notice-send" :disabled="saving" @click="saveSemester">{{ saving ? '保存中…' : '创建学期' }}</button>
      </view>
      <view class="notice-list">
        <div v-if="!semesters.length" class="empty" style="padding:20rpx 0">暂无学期，点击上方「新增」创建</div>
        <view class="notice-item" v-for="s in semesters" :key="s.id">
          <view class="notice-item-hd">
            <text class="notice-item-title">{{ s.name }}</text>
            <text v-if="s.current" class="badge on">当前</text>
            <text class="ndate">{{ s.startDate }} ~ {{ s.endDate }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 演示模式（仅看板 Tab 显示） -->
    <view class="demo-section">
      <view class="demo-row">
        <view class="demo-text">
          <text class="demo-name">🛝 教师系统演示</text>
          <text class="demo-sub">以教师身份预览所有功能，体验教师端完整流程</text>
        </view>
      </view>
      <button class="demo-btn" @click="enterDemoMode">进入教师系统演示</button>
    </view>
    </view>

    <!-- 人员管理：二级菜单瓷砖 -->
    <view v-else-if="bottomTab === 'people'" class="tiles-wrap">
      <view class="tiles-title">人员管理</view>
      <view class="tiles">
        <view class="tile" v-for="m in peopleMenus" :key="m.to" @click="navigate(m)">
          <view class="tile-ic">{{ m.icon }}</view>
          <view class="tile-label">{{ m.label }}</view>
        </view>
      </view>
    </view>

    <!-- 系统设置：二级菜单瓷砖 -->
    <view v-else-if="bottomTab === 'settings'" class="tiles-wrap">
      <view class="tiles-title">系统设置</view>
      <view class="tiles">
        <view class="tile" v-for="m in settingsMenus" :key="m.to" @click="navigate(m)">
          <view class="tile-ic">{{ m.icon }}</view>
          <view class="tile-label">{{ m.label }}</view>
        </view>
      </view>
    </view>

    <!-- 底部一级导航（≤3） -->
    <view class="bottom-nav">
      <view class="bn-item" :class="{ on: bottomTab === 'dashboard' }" @click="bottomTab = 'dashboard'">
        <text class="bn-ic">📊</text>
        <text class="bn-tx">工作台</text>
      </view>
      <view class="bn-item" :class="{ on: bottomTab === 'people' }" @click="bottomTab = 'people'">
        <text class="bn-ic">👥</text>
        <text class="bn-tx">人员管理</text>
      </view>
      <view class="bn-item" :class="{ on: bottomTab === 'settings' }" @click="bottomTab = 'settings'">
        <text class="bn-ic">⚙️</text>
        <text class="bn-tx">系统设置</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { setMockMode } from '../../common/request'
import { DEMO_MODE_ENABLED, CLOUDRUN_ENV, CLOUDRUN_SERVICE } from '../../common/config'
import { auth, setAuth, setFeatureProfile } from '../../common/store'
import { isPhone } from '../../common/validators'
import { ALL_SUBJECTS } from '../../common/subject-schema'
import { FEATURE_FLAG_LIST } from '@gardener/shared/constants'

// 年级选项（与 web 对齐）
const GRADE_OPTIONS = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三']

const dark = computed(() => theme.mode === 'dark')
const teachers = ref([])
const saving = ref(false)
// 分页
const teacherPage = ref(0)
const teacherTotal = ref(0)
const TEACHER_PAGE_SIZE = 50

// 看板数据
const dash = ref({ totalTeachers: 0, activeTeachers: 0, inactiveTeachers: 0, totalClasses: 0, totalStudents: 0, attendanceRate: null, pendingHomework: 0, parentEnabled: 0 })
async function loadDashboard() {
  try { dash.value = await apiCall('GET', '/school-admin/dashboard') || dash.value } catch (e) { console.error('[mini catch]', e) }
}

// 从本地存储读取学校管理员信息（登录时保存）
const saUser = (() => {
  try { return JSON.parse(uni.getStorageSync('sa_user') || '{}') } catch (e) { return {} }
})()
const schoolName = ref(saUser.schoolName || '')
const schoolCode = ref(saUser.schoolCode || '')

// 统一表单（新增/编辑）
const showForm = ref(false)
const editingId = ref('')
const form = ref({ username: '', password: '', name: '', subject: '', phone: '', enabled: true })
const phoneError = ref('')

const featUser = ref(null), sel = ref([])
const pwdUser = ref(null), newPwd = ref('')

// 教师级功能包清单：单一事实来源（shared/constants FEATURE_FLAG_LIST，与 Web 端对齐）
const allFeatures = FEATURE_FLAG_LIST

function getToken() { return uni.getStorageSync('sa_token') }

// ===== 校管一级/二级菜单（底部导航） =====
const bottomTab = ref('dashboard')
const peopleMenus = [
  { label: '教师管理', icon: '👩‍🏫', to: '/pages/school-admin/teachers' },
  { label: '班级管理', icon: '🏫', to: '/pages/school-admin/classes' },
  { label: '学生管理', icon: '🧑‍🎓', to: '/pages/school-admin/students' },
  { label: '学校功能包', icon: '🎛️', to: '/pages/school-admin/school-features' },
]
const settingsMenus = [
  { label: '学校公告', icon: '📢', to: '/pages/school-admin/notices' },
  { label: 'AI 配置', icon: '🤖', to: '/pages/school-admin/ai-config' },
]
function navigate(m) { uni.navigateTo({ url: m.to }) }


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
          const msg = r.data && (r.data.message || r.data.error)
          uni.removeStorageSync('sa_token')
          uni.removeStorageSync('sa_user')
          uni.removeStorageSync('g_token')
          uni.removeStorageSync('g_user')
          uni.removeStorageSync('g_mock_mode')
          uni.reLaunch({ url: '/pages/login/login' })
          return reject(new Error(msg || '登录已过期'))
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
  try {
    const r = await apiCall('GET', '/school-admin/teachers?skip=0&take=' + TEACHER_PAGE_SIZE) || { items: [], total: 0 }
    teachers.value = r.items || r
    teacherTotal.value = r.total || teachers.value.length
    teacherPage.value = 1
  } catch (e) { teachers.value = [] }
}

async function loadMoreTeachers() {
  const skip = teacherPage.value * TEACHER_PAGE_SIZE
  try {
    const r = await apiCall('GET', `/school-admin/teachers?skip=${skip}&take=${TEACHER_PAGE_SIZE}`) || { items: [], total: 0 }
    const more = r.items || r
    if (more.length) {
      teachers.value = [...teachers.value, ...more]
      teacherPage.value++
    }
  } catch (e) { /* 静默：加载更多失败不阻塞主流程 */ }
}

function openCreate() {
  editingId.value = ''
  phoneError.value = ''
  form.value = { username: '', password: '', name: '', subject: '', phone: '', enabled: true }
  showForm.value = true
}

function openEdit(u) {
  editingId.value = u.id
  phoneError.value = ''
  form.value = {
    username: u.username || '',
    password: '',
    name: u.name || '',
    subject: u.subject || '',
    phone: u.phone || '',
    enabled: u.enabled !== false,
  }
  showForm.value = true
}

function onEnabledChange(e) {
  form.value.enabled = e.detail.value
}

function checkPhone() {
  if (form.value.phone && !isPhone(form.value.phone)) {
    phoneError.value = '手机号格式错误，应为 11 位手机号'
  } else {
    phoneError.value = ''
  }
}

async function saveForm() {
  const f = form.value
  if (!f.username || !f.name) return uni.showToast({ title: '用户名/姓名必填', icon: 'none' })
  if (!editingId.value && !f.password) return uni.showToast({ title: '新增时密码必填', icon: 'none' })
  if (f.phone && !isPhone(f.phone)) {
    phoneError.value = '手机号格式错误，请修正后再提交'
    return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  }
  phoneError.value = ''
  saving.value = true
  try {
    if (editingId.value) {
      const payload = { username: f.username, name: f.name, subject: f.subject, phone: f.phone, enabled: f.enabled }
      await apiCall('PATCH', '/school-admin/teachers/' + editingId.value, payload)
      if (f.password) {
        await apiCall('POST', '/school-admin/teachers/' + editingId.value + '/reset-password', { password: f.password })
      }
      showForm.value = false
      await loadTeachers()
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await apiCall('POST', '/school-admin/teachers', {
        username: f.username, name: f.name, subject: f.subject, password: f.password,
        phone: f.phone, enabled: f.enabled,
      })
      showForm.value = false
      await loadTeachers()
      uni.showToast({ title: '已创建', icon: 'success' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none', duration: 3000 })
  }
  saving.value = false
  phoneError.value = ''
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
        uni.showToast({ title: e.message || '删除失败', icon: 'none', duration: 3000 })
      }
    },
  })
}

function openFeatures(u) {
  featUser.value = u
  sel.value = u.features && u.features.length ? [...u.features] : allFeatures.map(f => f.key)
  loadSchoolFlags()
}

function toggleFeat(key) {
  // 被学校级关闭的项锁定，勾选也不生效
  if (blockedBySchool(key)) return
  const i = sel.value.indexOf(key)
  if (i >= 0) sel.value.splice(i, 1)
  else sel.value.push(key)
}

/** 全选：跳过被学校级关闭的项（选了也不可用） */
function selectAll() { sel.value = allFeatures.filter(f => !blockedBySchool(f.key)).map(f => f.key) }
function selectNone() { sel.value = [] }

/* ---------- 有效权限预览：effective = 学校级 ∩ 教师级（与 Web 端 Teachers.vue 同公式/同文案） ---------- */

/** 本校学校级功能包开关；null/[] = 全开（不收窄） */
const schoolFlags = ref(Array.isArray(auth.schoolFeatureFlags) && auth.schoolFeatureFlags.length ? auth.schoolFeatureFlags : null)

/** 学校级是否未做限制（全部开放） */
const schoolAllOn = computed(() => schoolFlags.value === null)

/** 拉取 /auth/me 刷新本校学校级开关（登录响应已含，这里做兜底与刷新） */
async function loadSchoolFlags() {
  try {
    const me = await apiCall('GET', '/auth/me')
    const flags = me && me.schoolFeatureFlags
    schoolFlags.value = Array.isArray(flags) && flags.length ? flags : null
    setFeatureProfile(me)
  } catch (e) {
    // 拉取失败时沿用登录态缓存，不阻塞功能配置
  }
}

/** 某 key 是否被学校级关闭 */
function blockedBySchool(key) {
  if (schoolAllOn.value) return false
  return schoolFlags.value.indexOf(key) < 0
}

/** 实际可用清单（保持 allFeatures 原始顺序） */
const effectivePreview = computed(() =>
  allFeatures.filter(f => !blockedBySchool(f.key) && sel.value.indexOf(f.key) >= 0),
)

/** 被学校级关闭、但教师侧勾选了的项 */
const blockedSelected = computed(() =>
  allFeatures.filter(f => blockedBySchool(f.key) && sel.value.indexOf(f.key) >= 0),
)

/** 被学校级关闭项的中文标签串（模板展示用） */
const blockedSelectedText = computed(() => blockedSelected.value.map(f => f.label).join('、'))

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
  if (newPwd.value.length < 6 || newPwd.value.length > 20) {
    return uni.showToast({ title: '密码须为6-20位字符', icon: 'none' })
  }
  saving.value = true
  try {
    const r = await apiCall('POST', '/school-admin/teachers/' + pwdUser.value.id + '/reset-password', { password: newPwd.value })
    pwdUser.value = null
    // 显示实际生效的密码（若后端因长度合规要求自动生成了随机密码，需要告知管理员）
    const actualPwd = (r && r.defaultPassword) || newPwd.value
    uni.showModal({
      title: '密码已重置',
      content: '新密码：' + actualPwd + '\n请将此密码告知教师',
      showCancel: false,
      confirmText: '知道了',
    })
  } catch (e) {
    uni.showToast({ title: e.message || '重置失败', icon: 'none' })
  }
  saving.value = false
}

function logout() {
  setMockMode(false)
  uni.removeStorageSync('sa_token')
  uni.removeStorageSync('sa_user')
  // 清除校管登录时写入的共享 token + 演示模式标记，
  // 防止冷启动时 App.vue 误读 g_token 判为教师登录态
  uni.removeStorageSync('g_token')
  uni.removeStorageSync('g_user')
  uni.removeStorageSync('g_mock_mode')
  uni.reLaunch({ url: '/pages/login/login' })
}

// ===== 演示模式：以教师身份进入教师系统 =====
async function enterDemoMode() {
  // 生产构建中演示模式已被隔离禁用，直接提示并返回，避免写入假 token 触发真实后端 401
  if (!DEMO_MODE_ENABLED) {
    uni.showToast({ title: '演示模式仅限开发/预览版', icon: 'none' })
    return
  }
  uni.showLoading({ title: '进入演示…' })
  try {
    setMockMode(true)
    // 设置教师模拟身份
    const demoUser = {
      name: '珊珊老师', school: '阳光实验小学（演示版）',
      schoolId: 'demo-school', features: [],
    }
    setAuth('mock-teacher-token', demoUser)
    uni.hideLoading()
    uni.switchTab({ url: '/pages/dashboard/dashboard' })
  } catch (e) {
    uni.hideLoading()
  }
}

// ===== Tab 切换 =====
const tab = ref('dashboard')

// ===== 批量导入教师 =====
const showBatchImport = ref(false)
const batchText = ref('')
const batchResult = ref([])
async function doBatchImport() {
  const lines = batchText.value.trim().split('\n').filter(Boolean)
  const teachers = lines.map(line => {
    const parts = line.split(',').map(s => s.trim())
    return { name: parts[0] || '', username: parts[1] || '', password: parts[2] || '' }
  }).filter(t => t.name && t.username && t.password)
  if (!teachers.length) return uni.showToast({ title: '格式错误，请按「姓名,用户名,密码」每行一条', icon: 'none' })
  saving.value = true
  batchResult.value = []
  try {
    const r = await apiCall('POST', '/school-admin/teachers/batch', { teachers })
    batchResult.value = r.results || []
    uni.showToast({ title: `成功 ${r.success || 0} / ${r.total || 0}`, icon: r.failed > 0 ? 'none' : 'success' })
    await loadTeachers()
  } catch (e) { uni.showToast({ title: e.message || '导入失败', icon: 'none' }) }
  saving.value = false
}

// ===== 数据导出 =====
async function exportTeachers() {
  const blob = await apiCall('GET', '/school-admin/export/teachers')
  downloadBlob(blob, 'teachers.csv')
}
async function exportStudents() {
  const blob = await apiCall('GET', '/school-admin/export/students')
  downloadBlob(blob, 'students.csv')
}
function downloadBlob(data, name) {
  // 小程序环境下无法下载文件，走复制链接/提示
  uni.showToast({ title: '导出功能需在 Web 端使用', icon: 'none' })
}

// ===== 班级管理 =====
const classes = ref([])
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

async function loadClasses() {
  try {
    const r = await apiCall('GET', '/school-admin/classes') || { items: [], total: 0 }
    classes.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { classes.value = [] }
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
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
  saving.value = false
}

async function delClass(c) {
  uni.showModal({
    title: '删除班级',
    content: '确定删除「' + c.name + '」？关联的学生数据不会自动迁移。',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/classes/' + c.id)
        classes.value = classes.value.filter(x => x.id !== c.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}

// ===== 学校公告 =====
const schoolNotices = ref([])
const showNoticeForm = ref(false)
const noticeForm = ref({ title: '', content: '' })

// ===== 学期管理 =====
const semesters = ref([])
const showSemesterForm = ref(false)
const semesterForm = ref({ name: '', startDate: '', endDate: '' })

async function loadSemesters() {
  try {
    const r = await apiCall('GET', '/semesters') || { items: [], total: 0 }
    semesters.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { semesters.value = [] }
}

function openCreateSemester() {
  semesterForm.value = { name: '', startDate: '', endDate: '' }
  showSemesterForm.value = true
}

async function saveSemester() {
  const f = semesterForm.value
  if (!f.name) return uni.showToast({ title: '学期名称必填', icon: 'none' })
  saving.value = true
  try {
    await apiCall('POST', '/semesters', { ...f })
    showSemesterForm.value = false
    await loadSemesters()
    uni.showToast({ title: '学期已创建', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '创建失败', icon: 'none' }) }
  saving.value = false
}

async function loadNotices() {
  try {
    const r = await apiCall('GET', '/school-admin/notices') || { items: [], total: 0 }
    schoolNotices.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { schoolNotices.value = [] }
}

async function sendNotice() {
  if (!noticeForm.value.title) return uni.showToast({ title: '公告标题必填', icon: 'none' })
  saving.value = true
  try {
    await apiCall('POST', '/school-admin/notices', { title: noticeForm.value.title, content: noticeForm.value.content })
    showNoticeForm.value = false
    noticeForm.value = { title: '', content: '' }
    await loadNotices()
    uni.showToast({ title: '公告已发送', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '发送失败', icon: 'none' })
  }
  saving.value = false
}

async function delNotice(n) {
  uni.showModal({
    title: '删除公告',
    content: '确定删除「' + n.title + '」？',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/notices/' + n.id)
        schoolNotices.value = schoolNotices.value.filter(x => x.id !== n.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}

// ===== 学生管理 =====
const schoolStudents = ref([])
const studentFilter = ref('')
const editingStudent = ref(null)
const editStudentForm = ref({ name: '', gender: '', parentName: '', parentPhone: '' })
const filteredStudents = computed(() => {
  if (!studentFilter.value) return schoolStudents.value
  const q = studentFilter.value.trim().toLowerCase()
  return schoolStudents.value.filter(s => s.name?.toLowerCase().includes(q))
})

function openEditStudent(s) {
  editingStudent.value = s
  editStudentForm.value = {
    name: s.name || '', gender: s.gender || '',
    parentName: s.parentName || '', parentPhone: s.parentPhone || '',
  }
}

async function saveStudent() {
  if (!editStudentForm.value.name) return uni.showToast({ title: '姓名必填', icon: 'none' })
  saving.value = true
  try {
    await apiCall('PATCH', '/school-admin/students/' + editingStudent.value.id, editStudentForm.value)
    editingStudent.value = null
    await loadStudents()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '保存失败', icon: 'none' }) }
  saving.value = false
}

async function loadStudents() {
  try {
    const r = await apiCall('GET', '/school-admin/students') || { items: [], total: 0 }
    schoolStudents.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { schoolStudents.value = [] }
}

// ===== 校管 AI 配置（后端按校管角色隔离存储） =====
// 兜底服务商列表：当 /config/ai-providers 不可用时保证可用（不可新增，仅选择）
const AI_PROVIDER_FALLBACK = [
  { code: 'ali-qwen', name: '阿里百炼（通义千问）', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', textModels: ['qwen-plus', 'qwen-max', 'qwen-turbo'], visionModels: ['qwen-vl-plus', 'qwen-vl-max'], imageModels: [], videoModels: [], isDefault: true, enabled: true, sortOrder: 1 },
  { code: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', textModels: ['deepseek-v4-flash', 'deepseek-v4-pro'], visionModels: ['deepseek-v4-pro'], imageModels: [], videoModels: [], isDefault: false, enabled: true, sortOrder: 2 },
  { code: 'glm', name: '智谱GLM', baseUrl: 'https://open.bigmodel.cn/api/paas/v4', textModels: ['GLM-4.7-Flash'], visionModels: ['GLM-4.6V-Flash'], imageModels: ['GLM-4.6V-Flash'], videoModels: ['CogVideoX-Flash'], isDefault: false, enabled: true, sortOrder: 3 },
]

const aiProviders = ref([])
const aiProviderCode = ref('')
const aiProviderIdx = ref(0)
const ai = ref({})
const savingAi = ref(false)

const PROVIDER_NAMES = computed(() => aiProviders.value.map((p) => p.name))
const aiCurrentProvider = computed(() => aiProviders.value[aiProviderIdx.value] || aiProviders.value[0] || {})
const aiTextModels = computed(() => aiCurrentProvider.value.textModels || [])
const aiVisionModels = computed(() => aiCurrentProvider.value.visionModels || [])
const aiImageModels = computed(() => aiCurrentProvider.value.imageModels || [])
const aiVideoModels = computed(() => aiCurrentProvider.value.videoModels || [])
const aiHasImageModels = computed(() => aiImageModels.value.length > 0)
const aiHasVideoModels = computed(() => aiVideoModels.value.length > 0)
const aiTextModelOpts = computed(() => [...aiTextModels.value, '自定义'])
const aiVisionModelOpts = computed(() => [...aiVisionModels.value, '自定义'])
const aiImageModelOpts = computed(() => [...aiImageModels.value, '自定义'])
const aiVideoModelOpts = computed(() => [...aiVideoModels.value, '自定义'])
const aiTextModelIdx = computed(() => { const i = aiTextModels.value.indexOf(ai.value.textModel); return i >= 0 ? i : aiTextModelOpts.value.length - 1 })
const aiVisionModelIdx = computed(() => { const i = aiVisionModels.value.indexOf(ai.value.visionModel); return i >= 0 ? i : aiVisionModelOpts.value.length - 1 })
const aiImageModelIdx = computed(() => { const i = aiImageModels.value.indexOf(ai.value.imageModel); return i >= 0 ? i : aiImageModelOpts.value.length - 1 })
const aiVideoModelIdx = computed(() => { const i = aiVideoModels.value.indexOf(ai.value.videoModel); return i >= 0 ? i : aiVideoModelOpts.value.length - 1 })

function aiGetProviderIdx(code) { if (!code) return 0; const i = aiProviders.value.findIndex((p) => p.code === code); return i >= 0 ? i : 0 }
function aiDetectProviderIdx(baseUrl) { if (!baseUrl) return 0; const i = aiProviders.value.findIndex((p) => p.baseUrl && baseUrl.indexOf(p.baseUrl) === 0); return i >= 0 ? i : 0 }

const AI_DEFAULT_NAME = '小林子'
const AI_DEFAULT_PROMPT = '你是一位亲切、专业的教师助理，名字叫「小林子」。回答要简洁、清晰、有条理。'

async function loadAiProviders() {
  try {
    const res = await apiCall('GET', '/config/ai-providers')
    const list = (res && res.items) || (Array.isArray(res) ? res : [])
    if (list && list.length) { aiProviders.value = list; return }
  } catch (e) { console.warn('[school-admin] 加载 AI 服务商失败，使用本地兜底', e && e.message) }
  aiProviders.value = AI_PROVIDER_FALLBACK.filter((p) => p.enabled).map((p) => ({ ...p }))
}

async function loadAi() {
  try {
    await loadAiProviders()
    const a = await apiCall('GET', '/config/ai-settings').catch(() => ({}))
    if (a && a.providerCode) {
      aiProviderCode.value = a.providerCode
      aiProviderIdx.value = aiGetProviderIdx(a.providerCode)
    } else if (a && a.baseUrl) {
      aiProviderIdx.value = aiDetectProviderIdx(a.baseUrl)
      const p = aiProviders.value[aiProviderIdx.value]
      aiProviderCode.value = p ? p.code : ''
    } else {
      const defIdx = aiProviders.value.findIndex((p) => p.isDefault)
      aiProviderIdx.value = defIdx >= 0 ? defIdx : 0
      const p = aiProviders.value[aiProviderIdx.value]
      aiProviderCode.value = p ? p.code : ''
    }
    const cur = aiProviders.value[aiProviderIdx.value] || aiProviders.value[0] || {}
    ai.value = {
      baseUrl: a.baseUrl || cur.baseUrl || '',
      apiKey: a.apiKey || '',
      textModel: a.textModel || (cur.textModels && cur.textModels[0]) || '',
      visionModel: a.visionModel || (cur.visionModels && cur.visionModels[0]) || '',
      imageModel: a.imageModel || (cur.imageModels && cur.imageModels[0]) || '',
      videoModel: a.videoModel || (cur.videoModels && cur.videoModels[0]) || '',
      temperature: typeof a.temperature === 'number' && !isNaN(a.temperature) ? a.temperature : 0.7,
      aiName: a.aiName || AI_DEFAULT_NAME,
      systemPrompt: a.systemPrompt || AI_DEFAULT_PROMPT,
      resourceModels: a.resourceModels || {},
    }
  } catch (e) { console.warn('[school-admin] AI 配置加载失败', e && e.message) }
}

function onAiProviderChange(e) {
  const idx = Number(e.detail.value)
  if (idx === aiProviderIdx.value) return
  aiProviderIdx.value = idx
  const p = aiProviders.value[idx]
  aiProviderCode.value = p.code || ''
  if (p.baseUrl) ai.value.baseUrl = p.baseUrl
  if (p.textModels && p.textModels.length) ai.value.textModel = p.textModels[0]
  if (p.visionModels && p.visionModels.length) ai.value.visionModel = p.visionModels[0]
  if (p.imageModels && p.imageModels.length) ai.value.imageModel = p.imageModels[0]
  if (p.videoModels && p.videoModels.length) ai.value.videoModel = p.videoModels[0]
}
function onAiTextModelPick(e) { const idx = Number(e.detail.value); if (idx !== aiTextModelOpts.value.length - 1) ai.value.textModel = aiTextModels.value[idx] }
function onAiVisionModelPick(e) { const idx = Number(e.detail.value); if (idx !== aiVisionModelOpts.value.length - 1) ai.value.visionModel = aiVisionModels.value[idx] }
function onAiImageModelPick(e) { const idx = Number(e.detail.value); if (idx !== aiImageModelOpts.value.length - 1) ai.value.imageModel = aiImageModels.value[idx] }
function onAiVideoModelPick(e) { const idx = Number(e.detail.value); if (idx !== aiVideoModelOpts.value.length - 1) ai.value.videoModel = aiVideoModels.value[idx] }

function resetAiDefaults() {
  const p = aiProviders.value[aiProviderIdx.value] || aiProviders.value[0]
  ai.value = {
    baseUrl: p.baseUrl || '',
    apiKey: ai.value.apiKey,
    textModel: (p.textModels && p.textModels[0]) || '',
    visionModel: (p.visionModels && p.visionModels[0]) || '',
    imageModel: (p.imageModels && p.imageModels[0]) || '',
    videoModel: (p.videoModels && p.videoModels[0]) || '',
    temperature: 0.7,
    aiName: AI_DEFAULT_NAME,
    systemPrompt: AI_DEFAULT_PROMPT,
    resourceModels: {},
  }
}

async function saveAi() {
  if (savingAi.value) return
  if (ai.value.baseUrl && !/^https?:\/\//i.test(ai.value.baseUrl)) return uni.showToast({ title: '接口地址格式错误', icon: 'none' })
  savingAi.value = true
  try {
    const payload = {
      providerCode: aiProviderCode.value || '',
      baseUrl: ai.value.baseUrl || '',
      apiKey: ai.value.apiKey || '',
      textModel: ai.value.textModel || '',
      visionModel: ai.value.visionModel || '',
      imageModel: ai.value.imageModel || '',
      videoModel: ai.value.videoModel || '',
      temperature: Number(ai.value.temperature) || 0.7,
      aiName: ai.value.aiName || '',
      systemPrompt: ai.value.systemPrompt || '',
      resourceModels: ai.value.resourceModels || {},
    }
    await apiCall('PATCH', '/config/ai-settings', payload)
    uni.showToast({ title: 'AI 配置已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '保存失败：' + (e.message || '请重试'), icon: 'none' })
  } finally {
    savingAi.value = false
  }
}

onShow(async () => {
  await Promise.all([loadDashboard(), loadNotices(), loadSemesters()])
})
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: calc(24rpx + env(safe-area-inset-bottom)); background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; padding-top: 8rpx; }
/* Tab 切换 */
.tabs { display: flex; gap: 8rpx; margin-bottom: 24rpx; padding: 10rpx; background: var(--c-card2); border-radius: 26rpx; }
.tab { flex: 1; text-align: center; font-size: 26rpx; padding: 18rpx 0; border-radius: 18rpx; background: transparent; color: var(--c-sub); font-weight: 600; }
.tab.on { background: var(--c-primary); color: #fff; box-shadow: 0 4rpx 14rpx rgba(7,193,96,.28); }
.hd-left { flex: 1; }
.t { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.sub { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.out { font-size: 24rpx; color: var(--c-primary); font-weight: 600; padding: 10rpx 28rpx; border-radius: 32rpx; background: rgba(7,193,96,.1); }
.load-more { text-align: center; padding: 24rpx 0; font-size: 24rpx; color: var(--c-primary); font-weight: 600; }
/* 看板统计 */
.dashboard { display: flex; gap: 14rpx; margin-bottom: 20rpx; }
.dash-card { flex: 1; background: var(--c-card); border-radius: 20rpx; padding: 24rpx 0 20rpx; text-align: center; box-shadow: 0 4rpx 16rpx var(--c-shadow); border: 1px solid var(--c-border); }
.dash-n { display: block; font-size: 40rpx; font-weight: 800; color: var(--c-primary); }
.dash-n.warn { color: #d48806; }
.dash-row2 { margin-top: -10rpx; }
.dash-l { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; flex-wrap: wrap; gap: 10rpx; }
.bar-acts { display: flex; gap: 12rpx; align-items: center; }
.export { font-size: 22rpx; color: var(--c-primary); font-weight: 600; padding: 8rpx 18rpx; background: rgba(7,193,96,.1); border-radius: 28rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); font-weight: 500; }
.act { display: inline-flex; align-items: center; font-size: 23rpx; color: var(--c-blue); font-weight: 600; padding: 10rpx 22rpx; border-radius: 30rpx; background: rgba(28,111,179,.08); line-height: 1.4; }
.act.del { color: var(--c-danger); background: rgba(245,108,108,.1); }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.empty { padding: 80rpx 30rpx; text-align: center; font-size: 26rpx; color: var(--c-sub); background: var(--c-card); border-radius: 20rpx; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 24rpx; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 4rpx 16rpx; border-radius: 20rpx; }
.badge.on { background: rgba(7,193,96,.12); color: var(--c-primary); }
.badge.off { background: rgba(245,108,108,.12); color: var(--c-danger); }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; line-height: 1.5; }
.acts { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 12rpx; flex-shrink: 0; flex-wrap: wrap; max-width: 46%; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 28rpx 28rpx 0 0; padding: 36rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); max-height: 82vh; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; }
.inp-wrap { width: 100%; margin-bottom: 6rpx; }
.readonly-inp { font-size: 28rpx; color: var(--c-title); padding: 20rpx 24rpx; background: var(--c-input); border-radius: 14rpx; min-height: 40rpx; }
.field-err { display: block; font-size: 22rpx; color: #e64340; margin-top: 4rpx; }
.inp { border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 20rpx 22rpx; margin-bottom: 6rpx; font-size: 28rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
.btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 88rpx; line-height: 88rpx; font-weight: 700; box-shadow: 0 6rpx 18rpx rgba(7,193,96,.25); }
.btn[disabled] { opacity: .6; }
/* 全屏表单 */
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; width: 100%; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: env(safe-area-inset-top) 24rpx 0; height: calc(88rpx + env(safe-area-inset-top)); background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; width: 100%; padding: 32rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 20rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.form-item { margin-bottom: 26rpx; width: 100%; box-sizing: border-box; }
.label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.req { color: #e64340; }
.opt { color: var(--c-sub); font-weight: 400; font-size: 22rpx; }
.tip { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
.switch-item { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; background: var(--c-card2); border-radius: 16rpx; padding: 16rpx 20rpx; }
.label-line { flex: 1; }
.switch-val { font-size: 24rpx; color: var(--c-sub); display: block; margin-top: 4rpx; }
/* 全屏表单内的输入框：覆盖共享 .inp 的 margin，确保宽度撑满 */
.full-body .inp { width: 100%; margin-bottom: 0; min-height: 84rpx; }
/* 功能配置 */
.feat-toolbar { display: flex; align-items: center; gap: 24rpx; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); margin-bottom: 12rpx; }
.flist { padding: 4rpx 0; }
.frow { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 18rpx; border-radius: 16rpx; font-size: 28rpx; color: var(--c-title); }
.frow:active { background: var(--c-card2); }
.frow-label { flex: 1; }
.ck { width: 32rpx; height: 32rpx; border-radius: 50%; border: 3rpx solid var(--c-sub); flex-shrink: 0; }
.ck.on { background: var(--c-primary); border-color: var(--c-primary); }
/* 被学校级关闭：置灰 + 锁定 */
.ck.dis { background: transparent; border-color: var(--c-border); opacity: .5; }
.frow.locked { opacity: .55; }
.frow.locked .frow-label { text-decoration: line-through; }
.frow-lock { font-size: 20rpx; color: #d48806; flex-shrink: 0; padding: 4rpx 14rpx; background: rgba(230,162,60,.12); border-radius: 16rpx; }

/* 有效权限预览 */
.eff-box { margin: 12rpx 0 22rpx; padding: 22rpx 24rpx; border: 1px solid var(--c-border); border-radius: 20rpx; background: var(--c-card); }
.eff-head { display: flex; align-items: center; justify-content: space-between; }
.eff-title { font-size: 28rpx; font-weight: 600; color: var(--c-title); }
.eff-count { font-size: 22rpx; color: var(--c-sub); }
.eff-desc { display: block; margin-top: 8rpx; font-size: 22rpx; line-height: 1.6; color: var(--c-sub); }
.eff-tags { display: flex; flex-wrap: wrap; margin-top: 12rpx; }
.eff-tag { font-size: 20rpx; color: var(--c-primary); border: 1px solid rgba(7,193,96,.3); background: rgba(7,193,96,.06); border-radius: 20rpx; padding: 6rpx 16rpx; margin: 0 10rpx 10rpx 0; }
.eff-none { display: block; margin-top: 12rpx; font-size: 22rpx; color: #e06c75; }
.eff-blocked { margin-top: 12rpx; padding-top: 12rpx; border-top: 1px solid var(--c-border); }
.eff-blocked-t { font-size: 22rpx; line-height: 1.6; color: var(--c-sub); }
/* 演示模式 */
.demo-section { margin-top: 40rpx; padding: 28rpx 26rpx; background: linear-gradient(135deg, var(--c-card), var(--c-card2)); border-radius: 22rpx; border: 1px solid var(--c-border); }
/* 学校公告 */
.notice-section { margin-top: 24rpx; background: var(--c-card); border-radius: 20rpx; padding: 26rpx 24rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.notice-hd { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.notice-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.notice-form { margin-bottom: 18rpx; padding: 20rpx; background: var(--c-card2); border-radius: 16rpx; }
.notice-textarea { min-height: 140rpx; margin-top: 12rpx; }
.notice-send { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; height: 76rpx; line-height: 76rpx; font-size: 28rpx; margin-top: 16rpx; font-weight: 600; }
.notice-list { margin-top: 8rpx; }
.notice-item { padding: 18rpx 0; border-bottom: 1px solid var(--c-border); }
.notice-item:last-child { border-bottom: none; }
.notice-item-hd { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8rpx; }
.notice-item-title { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.notice-item-content { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.notice-item-time { display: block; font-size: 20rpx; color: var(--c-sub2); margin-top: 4rpx; }
/* 学期管理 */
.semester-date-row { display: flex; gap: 10rpx; align-items: center; margin-top: 10rpx; }
.sem-date { flex: 1; }
.sem-date-sep { font-size: 24rpx; color: var(--c-sub); }
.dark .semester-date-row .inp { background: var(--c-input); }
/* 批量导入 */
.batch-area { min-height: 220rpx; margin-top: 14rpx; }
.batch-result { margin-top: 16rpx; }
.batch-summary { font-size: 24rpx; font-weight: 600; color: var(--c-title); margin-bottom: 8rpx; }
.batch-item { font-size: 22rpx; padding: 8rpx 0; }
.batch-item.ok { color: #07c160; }
.batch-item.fail { color: #e64340; }
.batch-err { display: block; font-size: 20rpx; color: var(--c-sub); margin-left: 16rpx; }
.hint-example { display: block; color: var(--c-sub); font-size: 22rpx; margin-top: 6rpx; white-space: pre; }
.demo-row { display: flex; align-items: center; justify-content: space-between; }
.demo-text { flex: 1; padding-right: 20rpx; }
.demo-name { display: block; font-size: 28rpx; color: var(--c-title); font-weight: 600; }
.demo-sub { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.demo-btn { width: 100%; margin-top: 16rpx; background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; font-size: 28rpx; height: 84rpx; line-height: 84rpx; font-weight: 600; box-shadow: 0 6rpx 18rpx rgba(7,193,96,.25); }
/* 学生搜索框 */
.filter-inp { flex: 1; min-width: 200rpx; border: 1px solid var(--c-input-border); border-radius: 16rpx; padding: 16rpx 22rpx; font-size: 26rpx; background: var(--c-card); color: var(--c-text); box-sizing: border-box; }
/* 批量导入提示块 */
.hint-block { font-size: 24rpx; color: var(--c-sub); background: var(--c-card2); padding: 18rpx 22rpx; border-radius: 16rpx; margin-bottom: 20rpx; line-height: 1.7; border-left: 6rpx solid var(--c-accent); }
/* 弹窗提示文字 */
.sh-sub { font-size: 24rpx; color: var(--c-sub); margin: 8rpx 2rpx 18rpx; line-height: 1.6; }
/* 表单内小提示 */
.hint { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; display: block; }
/* 学期日期 */
.ndate { font-size: 20rpx; color: var(--c-sub2); margin-left: 10rpx; font-weight: 400; }

/* ===== 校管 AI 配置 ===== */
.ai-card { background: var(--c-card); border-radius: 20rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 2rpx 10rpx var(--c-shadow); }
.ai-title { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.ai-hint { display: block; font-size: 22rpx; color: var(--c-sub); line-height: 1.7; margin-bottom: 20rpx; padding: 12rpx 18rpx; background: var(--c-card2); border-radius: 14rpx; }
.ai-field { margin-bottom: 22rpx; }
.ai-label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 10rpx; }
.ai-picker { height: 80rpx; line-height: 80rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 0 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; }
.ai-ta { width: 100%; min-height: 200rpx; border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-text); background: var(--c-input); box-sizing: border-box; line-height: 1.6; }
.ai-actions { display: flex; align-items: center; justify-content: space-between; margin-top: 10rpx; }
.ai-ghost { background: transparent; color: var(--c-primary); border: 1px solid var(--c-primary); border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; padding: 0 40rpx; }
.ai-save { background: var(--c-primary); color: #fff; border-radius: 50rpx; height: 80rpx; line-height: 80rpx; font-size: 28rpx; padding: 0 40rpx; }
.ai-save[disabled] { opacity: .6; }

/* ===== 底部一级导航 ===== */
.bottom-nav { position: fixed; left: 0; right: 0; bottom: 0; display: flex; background: #fff; border-top: 1rpx solid #f0e9df; padding: 14rpx 0 calc(14rpx + env(safe-area-inset-bottom)); z-index: 20; box-shadow: 0 -4rpx 18rpx rgba(0,0,0,.04); }
.dark .bottom-nav { background: #262421; border-top-color: #3a3733; }
.bn-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6rpx; color: #9a8f7d; }
.bn-item.on { color: #07c160; }
.bn-ic { font-size: 42rpx; line-height: 1; }
.bn-tx { font-size: 22rpx; }
/* ===== 二级菜单瓷砖 ===== */
.tiles-wrap { padding: 8rpx 0 24rpx; }
.tiles-title { font-size: 30rpx; font-weight: 700; color: var(--c-title, #4a3b2a); margin: 16rpx 4rpx 20rpx; }
.tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20rpx; }
.tile { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14rpx; padding: 44rpx 0; background: var(--c-card, #fff); border-radius: 24rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow, rgba(0,0,0,.05)); }
.tile:active { transform: scale(.97); }
.tile-ic { font-size: 56rpx; line-height: 1; }
.tile-label { font-size: 28rpx; font-weight: 600; color: var(--c-title, #4a3b2a); }
/* 内容区底部留出底部导航空间 */
.page { padding-bottom: calc(170rpx + env(safe-area-inset-bottom)); }
</style>
