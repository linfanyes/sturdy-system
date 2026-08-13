<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view v-if="logging" class="login-card">
      <view class="login-title">🔐 正在以超级管理员身份进入…</view>
    </view>

    <template v-else-if="!adminToken">
      <view class="login-card">
        <view class="login-title">🔐 超级管理员</view>
        <view class="login-field">
          <text class="login-label">用户名</text>
          <input v-model="adminUser" class="login-input" placeholder="超管用户名" />
        </view>
        <view class="login-field">
          <text class="login-label">密码</text>
          <input v-model="adminPwd" class="login-input" placeholder="超管密码" password />
        </view>
        <button class="login-btn" :disabled="logging" @click="doLogin">{{ logging ? '登录中…' : '登录' }}</button>
        <view class="hint">用户名/密码由后端环境变量配置（SUPER_ADMIN_USER / SUPER_ADMIN_PASSWORD）</view>
      </view>
    </template>

    <template v-else>
      <view class="head">
        <text class="h">👑 超级管理员</text>
        <text class="logout" @click="logout">退出</text>
      </view>

      <!-- 二级功能面板：带返回头 -->
      <template v-if="subView">
        <view class="sub-head">
          <text class="sub-back" @click="back">← 返回</text>
          <text class="sub-title">{{ subTitle }}</text>
        </view>

        <!-- ===== 学校管理 ===== -->
        <SchoolManage
          v-if="subView === 'school'"
          ref="schoolManageRef"
          :schools="schools"
          :saving="saving"
          @open-create-school="openCreateSchool"
          @open-edit-school="openEditSchool"
          @del-school="delSchool"
          @toggle-school-status="toggleSchoolStatus"
          @open-school-features="openSchoolFeatures"
          @confirm-reset-all="confirmResetAll"
          @save-school="saveSchool"
        />

        <!-- ===== 校管理员 / 平台配置 / AI 服务商 ===== -->
        <SystemConfig
          v-else-if="subView === 'schoolAdmin' || subView === 'config' || subView === 'ai'"
          ref="systemConfigRef"
          :school-admins="schoolAdmins"
          :schools="schools"
          :providers="providers"
          :config-groups="configGroups"
          :entry="subView"
          :saving="saving"
          @open-create-admin="openCreateAdmin"
          @open-edit-admin="openEditAdmin"
          @del-admin="delAdmin"
          @open-reset-admin="openResetAdmin"
          @save-admin="saveAdmin"
          @reset-pwd="resetAdminPwd"
          @save-config="saveConfig"
          @add-subject="addSubject"
          @remove-subject="removeSubject"
          @toggle-provider="toggleProvider"
          @del-provider="delProvider"
          @save-provider="saveProvider"
        />

        <!-- ===== 成绩审计 + 审计日志 ===== -->
        <DataStats
          v-else-if="subView === 'grade' || subView === 'audit'"
          ref="dataStatsRef"
          :audit-summary="auditSummary"
          :audit-exams="auditExams"
          :audit-grades="auditGrades"
          :audit-loading="auditLoading"
          :audit-school-id="auditSchoolId"
          :audit-schools="schools"
          :log-items="logAuditItems"
          :log-total="logAuditTotal"
          :log-skip="logAuditSkip"
          :log-page-size="LOG_PAGE_SIZE"
          :log-loading="logAuditLoading"
          :log-school-id="logAuditSchoolId"
          :log-schools="schools"
          @audit-school-change="onAuditSchoolChange"
          @log-school-change="onLogSchoolChange"
          @prev-page="prevAuditPage"
          @next-page="nextAuditPage"
          @load-audit="loadAuditGrade"
          @load-logs="loadAuditLogList"
        />
      </template>

      <!-- 一级列表态 -->
      <template v-else>
        <!-- 仪表盘 -->
        <view v-if="bottomTab === 'dashboard'" class="dash">
          <view class="dash-welcome">
            <text class="dash-hi">👋 欢迎回来</text>
            <text class="dash-sub">系统全局概览与快捷入口</text>
          </view>
          <view class="dash-stats">
            <view class="dstat"><text class="dstat-num">{{ schools.length }}</text><text class="dstat-label">学校</text></view>
            <view class="dstat"><text class="dstat-num">{{ schoolAdmins.length }}</text><text class="dstat-label">校管理员</text></view>
            <view class="dstat"><text class="dstat-num">{{ providers.length }}</text><text class="dstat-label">AI 厂商</text></view>
            <view class="dstat"><text class="dstat-num">{{ todayLogCount }}</text><text class="dstat-label">今日日志</text></view>
            <view class="dstat"><text class="dstat-num">{{ weekLogCount }}</text><text class="dstat-label">本周日志</text></view>
          </view>
          <view class="dash-menu">
            <view class="dm" @click="quickOpen('account','school')"><text class="dm-ico">🏫</text><text class="dm-txt">学校管理</text></view>
            <view class="dm" @click="quickOpen('account','schoolAdmin')"><text class="dm-ico">👤</text><text class="dm-txt">校管理员</text></view>
            <view class="dm" @click="quickOpen('settings','config')"><text class="dm-ico">⚙️</text><text class="dm-txt">平台配置</text></view>
            <view class="dm" @click="quickOpen('settings','ai')"><text class="dm-ico">🤖</text><text class="dm-txt">AI 服务商</text></view>
            <view class="dm" @click="quickOpen('dashboard','grade')"><text class="dm-ico">📊</text><text class="dm-txt">成绩审计</text></view>
            <view class="dm" @click="quickOpen('dashboard','audit')"><text class="dm-ico">📜</text><text class="dm-txt">审计日志</text></view>
          </view>
        </view>

        <!-- 账户管理二级列表 -->
        <template v-else-if="bottomTab === 'account'">
          <view class="menu-list">
            <view class="menu-row" @click="openSub('school')">
              <text class="menu-icon">🏫</text>
              <view class="menu-info">
                <text class="menu-name">学校管理</text>
                <text class="menu-sub">{{ schools.length }} 所学校</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
            <view class="menu-row" @click="openSub('schoolAdmin')">
              <text class="menu-icon">👤</text>
              <view class="menu-info">
                <text class="menu-name">校管理员</text>
                <text class="menu-sub">{{ schoolAdmins.length }} 个管理员</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
          </view>
        </template>

        <!-- 设置二级列表 -->
        <template v-else-if="bottomTab === 'settings'">
          <view class="menu-list">
            <view class="menu-row" @click="openSub('config')">
              <text class="menu-icon">⚙️</text>
              <view class="menu-info">
                <text class="menu-name">平台配置</text>
                <text class="menu-sub">全局配置项即时生效</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
            <view class="menu-row" @click="openSub('ai')">
              <text class="menu-icon">🤖</text>
              <view class="menu-info">
                <text class="menu-name">AI 服务商</text>
                <text class="menu-sub">{{ providers.length }} 个厂商</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
          </view>
        </template>
      </template>

      <!-- 底部 3-tab 导航 -->
      <view class="tabbar">
        <view class="tab-item" :class="{ on: bottomTab === 'dashboard' }" @click="selectBottomTab('dashboard')">
          <text class="tab-ico">📊</text>
          <text class="tab-txt">工作台</text>
        </view>
        <view class="tab-item" :class="{ on: bottomTab === 'account' }" @click="selectBottomTab('account')">
          <text class="tab-ico">👥</text>
          <text class="tab-txt">账户管理</text>
        </view>
        <view class="tab-item" :class="{ on: bottomTab === 'settings' }" @click="selectBottomTab('settings')">
          <text class="tab-ico">⚙️</text>
          <text class="tab-txt">设置</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { isPhone } from '../../common/validators'
import { CLOUDRUN_ENV, CLOUDRUN_SERVICE, API_PREFIX } from '../../common/config'
import SchoolManage from './components/SchoolManage.vue'
import DataStats from './components/DataStats.vue'
import SystemConfig from './components/SystemConfig.vue'

const SERVER_URL = API_PREFIX
const ADMIN_TOKEN_KEY = 'admin_token'
const adminToken = ref(uni.getStorageSync(ADMIN_TOKEN_KEY) || '')
const logging = ref(false)
const adminUser = ref('')
const adminPwd = ref('')
const saving = ref(false)

// 底部 3-tab 导航
const bottomTab = ref('dashboard')
const subView = ref('')
const subTitle = ref('')

// Refs for child components
const schoolManageRef = ref(null)
const systemConfigRef = ref(null)
const dataStatsRef = ref(null)

/* ===== 学校管理 ===== */
const schools = ref([])

/* ===== 学校管理员管理 ===== */
const schoolAdmins = ref([])
const adminFilterSchoolCode = ref('')
const filteredSchoolAdmins = computed(() => {
  if (!adminFilterSchoolCode.value) return schoolAdmins.value
  const q = adminFilterSchoolCode.value.trim().toLowerCase()
  return schoolAdmins.value.filter(a => (a.schoolCode || '').toLowerCase().includes(q))
})

const resetTarget = ref(null)
const resetPwd = ref('')

// 学校下拉选项（管理员表单用）
const schoolOptions = computed(() =>
  schools.value.map(s => ({ id: s.id, label: s.name + '（' + s.code + '）' })),
)
function schoolLabel(id) {
  const s = schools.value.find(x => x.id === id)
  return s ? s.name + '（' + s.code + '）' : '请选择学校'
}

async function apiCall(method, path, data) {
  const cloud = typeof wx !== 'undefined' && wx.cloud
  if (!cloud || typeof cloud.callContainer !== 'function') throw new Error('当前环境不支持云托管私有链路')
  return new Promise((resolve, reject) => {
    const opts = {
      config: { env: CLOUDRUN_ENV },
      path: SERVER_URL + path,
      method,
      header: { 'content-type': 'application/json', 'X-WX-SERVICE': CLOUDRUN_SERVICE, Authorization: 'Bearer ' + adminToken.value },
      success: (r) => {
        const status = r.statusCode || (r.data && r.data.statusCode) || 200
        if (status === 401) {
          adminToken.value = ''
          uni.removeStorageSync(ADMIN_TOKEN_KEY)
          return reject(new Error((r.data && (r.data.message || r.data.error)) || '登录已过期'))
        }
        if (status >= 200 && status < 300) resolve(r.data)
        else reject(new Error((r.data && (r.data.message || r.data.error)) || ('请求失败(' + status + ')')))
      },
      fail: (e) => { reject(new Error((e && (e.errMsg || e.message)) || '网络异常')); }
    }
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') opts.data = data
    cloud.callContainer(opts)
  })
}

async function doLogin() {
  if (logging.value) return
  if (!adminUser.value.trim() || !adminPwd.value) return uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
  logging.value = true
  try {
    const resp = await apiCall('POST', '/admin/login', { username: adminUser.value.trim(), password: adminPwd.value })
    adminToken.value = resp?.token || ''
    if (adminToken.value) { uni.setStorageSync(ADMIN_TOKEN_KEY, adminToken.value); await loadAll() }
    else uni.showToast({ title: '登录失败：未返回 token', icon: 'none' })
  } catch (e) { uni.showToast({ title: String(e?.message || '登录失败').slice(0, 40), icon: 'none' }) }
  finally { logging.value = false }
}

function logout() {
  adminToken.value = ''
  uni.removeStorageSync(ADMIN_TOKEN_KEY)
  uni.removeStorageSync('g_token')
  uni.removeStorageSync('g_user')
  uni.removeStorageSync('g_mock_mode')
  uni.reLaunch({ url: '/pages/login/login' })
}

onMounted(() => { if (adminToken.value) loadAll() })

onLoad((options) => { if (options && options.open) switchTab(options.open) })

async function loadAll() {
  try {
    await Promise.all([
      loadSchools(),
      loadAdmins(),
      loadProviders(),
      loadAuditLogs().catch(() => {}),
    ])
  } catch (e) { uni.showToast({ title: String(e?.message || '加载失败').slice(0, 40), icon: 'none' }) }
}

function quickOpen(tab, sub) { selectBottomTab(tab); openSub(sub) }

function switchTab(t) {
  if (t === 'school') quickOpen('account', 'school')
  else if (t === 'admin') quickOpen('account', 'schoolAdmin')
  else if (t === 'config') quickOpen('settings', 'config')
  else if (t === 'ai') quickOpen('settings', 'ai')
  else if (t === 'grade') quickOpen('dashboard', 'grade')
  else if (t === 'audit') quickOpen('dashboard', 'audit')
}

async function loadSchools() {
  const r = await apiCall('GET', '/admin/schools') || { items: [], total: 0 }
  schools.value = Array.isArray(r) ? r : (r.items || [])
}

async function loadAdmins() {
  const r = await apiCall('GET', '/admin/school-admins') || { items: [], total: 0 }
  schoolAdmins.value = Array.isArray(r) ? r : (r.items || [])
}

function selectBottomTab(t) { bottomTab.value = t; subView.value = '' }

function openSub(v) {
  subView.value = v
  if (v === 'school') { subTitle.value = '学校管理'; loadSchools() }
  else if (v === 'schoolAdmin') { subTitle.value = '校管理员'; loadAdmins() }
  else if (v === 'config') { subTitle.value = '平台配置'; loadConfigs() }
  else if (v === 'ai') { subTitle.value = 'AI 服务商'; loadProviders() }
  else if (v === 'grade') { subTitle.value = '成绩审计'; loadAuditGrade() }
  else if (v === 'audit') { subTitle.value = '审计日志'; loadAuditLogList() }
}

function back() { subView.value = '' }

// ===== 学校管理事件 =====
function openCreateSchool() { schoolManageRef.value?.openCreate() }
function openEditSchool(s) { schoolManageRef.value?.openEdit(s) }

async function saveSchool(formData, editingId) {
  saving.value = true
  const payload = {
    name: formData.name, prefix: formData.prefix, address: formData.address,
    contact: formData.contact, phone: formData.phone, status: formData.enabled ? 'active' : 'inactive',
  }
  try {
    if (editingId) await apiCall('PATCH', '/admin/schools/' + editingId, payload)
    else await apiCall('POST', '/admin/schools', payload)
    await loadSchools()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
  saving.value = false
}

async function delSchool(s) {
  uni.showModal({ title: '删除学校', content: `确定删除「${s.name}」？若该校仍有管理员将无法删除。`, confirmColor: '#e64340',
    success: async (m) => { if (!m.confirm) return; try { await apiCall('DELETE', '/admin/schools/' + s.id); await loadSchools(); uni.showToast({ title: '已删除', icon: 'success' }) } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) } },
  })
}

function openSchoolFeatures(s) { uni.navigateTo({ url: '/pages/school-admin/school-features?schoolId=' + s.id }) }

async function toggleSchoolStatus(s) {
  const next = s.status === 'active' ? 'inactive' : 'active'
  const label = next === 'active' ? '启用' : '停用'
  uni.showModal({ title: label + '学校', content: `确定将「${s.name}」${label}吗？`, confirmColor: next === 'active' ? '#4CAF50' : '#e6a23c',
    success: async (m) => { if (!m.confirm) return; try { await apiCall('PATCH', '/admin/schools/' + s.id, { status: next }); s.status = next; uni.showToast({ title: '已' + label, icon: 'success' }) } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) } },
  })
}

function confirmResetAll() {
  uni.showModal({ title: '⚠️ 一键全量重置',
    content: '确定要执行全量重置吗？\n\n此操作将：\n1. 清除所有考试、成绩、作业、考勤等业务数据\n2. 清除本机所有学校管理员、教师、家长的登录信息及个人缓存\n\n此操作不可撤销！\n\n保留：学校、教师、校管等基础演示数据，超管登录态将保留。',
    confirmText: '确认重置', confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      uni.showLoading({ title: '重置中…', mask: true })
      try {
        await apiCall('POST', '/admin/reset-all', { confirm: true })
        uni.hideLoading()
        const savedAdminToken = adminToken.value
        uni.clearStorageSync()
        uni.setStorageSync(ADMIN_TOKEN_KEY, savedAdminToken)
        uni.reLaunch({ url: '/pages/admin/admin' })
        uni.showToast({ title: '重置成功', icon: 'success' })
      } catch (e) { uni.hideLoading(); uni.showToast({ title: e.message || '重置失败', icon: 'none' }) }
    },
  })
}

// ===== 校管理员管理事件 =====
function openCreateAdmin() { systemConfigRef.value?.openCreateAdmin() }
function openEditAdmin(a) { systemConfigRef.value?.openEditAdmin(a) }
function openResetAdmin(a) { systemConfigRef.value?.openResetAdmin(a) }

async function saveAdmin(formData, editingId) {
  saving.value = true
  try {
    if (editingId) {
      const payload = { schoolId: formData.schoolId, name: formData.name, username: formData.username, enabled: formData.enabled }
      await apiCall('PATCH', '/admin/school-admins/' + editingId, payload)
      if (formData.password) await apiCall('PATCH', '/admin/school-admins/' + editingId + '/password', { password: formData.password })
    } else {
      await apiCall('POST', '/admin/school-admins', { schoolId: formData.schoolId, name: formData.name, username: formData.username, password: formData.password, enabled: formData.enabled })
    }
    await loadAdmins()
    uni.showToast({ title: editingId ? '已保存' : '创建成功', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
  saving.value = false
}

async function resetAdminPwd(a, pwd) {
  if (!pwd) return uni.showToast({ title: '请输入新密码', icon: 'none' })
  saving.value = true
  try {
    await apiCall('PATCH', '/admin/school-admins/' + a.id + '/password', { password: pwd })
    uni.showToast({ title: '密码已重置，账号已启用', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '重置失败', icon: 'none' }) }
  saving.value = false
}

async function delAdmin(a) {
  uni.showModal({ title: '删除学校管理员', content: `确定删除「${a.name}」？该操作不会删除学校数据，但管理员账号将无法登录。`, confirmColor: '#e64340',
    success: async (m) => { if (!m.confirm) return; try { await apiCall('DELETE', '/admin/school-admins/' + a.id); schoolAdmins.value = schoolAdmins.value.filter(x => x.id !== a.id); uni.showToast({ title: '已删除', icon: 'success' }); setTimeout(() => { loadAdmins() }, 500) } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) } },
  })
}

// ===== AI 服务商管理 =====
const providers = ref([])
const showProviderForm = ref(false)
const editingProviderCode = ref('')
const providerForm = ref({ name: '', code: '', baseUrl: '', enabled: true, isDefault: false, sortOrder: 0 })

async function loadProviders() { try { const r = await apiCall('GET', '/ai-providers') || { items: [] }; providers.value = r.items || r || [] } catch (e) { providers.value = [] } }

async function saveProvider(formData, editingCode) {
  saving.value = true
  try {
    if (editingCode) await apiCall('PATCH', '/ai-providers/' + editingCode, formData)
    else await apiCall('POST', '/ai-providers', formData)
    await loadProviders()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
  saving.value = false
}

async function toggleProvider(p) {
  try { await apiCall('PATCH', '/ai-providers/' + p.code, { enabled: !p.enabled }); p.enabled = !p.enabled; uni.showToast({ title: p.enabled ? '已启用' : '已停用', icon: 'success' }) }
  catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
}

async function delProvider(p) {
  uni.showModal({
    title: '删除厂商',
    content: '\u786e\u5b9a\u5220\u9664\u300c' + p.name + '\u300d\uff1f',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return;
      try {
        await apiCall('DELETE', '/ai-providers/' + p.code);
        providers.value = providers.value.filter(x => x.id !== p.code);
        uni.showToast({ title: '\u5df2\u5220\u9664', icon: 'success' });
      } catch (e) { uni.showToast({ title: e.message || '\u5220\u9664\u5931\u8d25', icon: 'none' }) }
    },
  });
}

// ===== 平台配置 =====
const configGroups = ref([])
const newSubject = ref('')

const CONFIG_SCHEMA = [
  { key: 'defaultSubjects', label: '默认学科', desc: '勾选/新增/删除，教师端注册时可选', placeholder: '语文,数学,英语', secret: false, type: 'subjects' },
  { key: 'aiTextModel', label: 'AI 文本模型', desc: '对话/备课/出题等文本生成', placeholder: 'qwen-plus', secret: false },
  { key: 'aiVisionModel', label: 'AI 视觉模型', desc: '图片识别/OCR等视觉任务', placeholder: 'qwen-vl-plus', secret: false },
  { key: 'aiTemperature', label: 'AI 温度', desc: '输出随机性(0-2)，越低越严谨', placeholder: '0.7', secret: false },
  { key: 'aiName', label: 'AI 助手名称', desc: '教师端AI助手的显示名称', placeholder: '小林子', secret: false },
  { key: 'aiBaseUrl', label: 'AI 接口地址', desc: '兼容 OpenAI 格式的 API 地址', placeholder: 'https://api.openai.com/v1', secret: false },
  { key: 'aiApiKey', label: 'AI API Key', desc: '密钥，保存后不会明文显示', placeholder: 'sk-xxxx', secret: true },
  { key: 'wxAppId', label: '微信 AppID', desc: '小程序 AppID', placeholder: 'wx...', secret: false },
  { key: 'wxAppSecret', label: '微信 AppSecret', desc: '小程序 AppSecret', placeholder: '...', secret: true },
  { key: 'imSdkAppId', label: 'IM SDK AppID', desc: '腾讯云即时通信 ID', placeholder: '1400...', secret: false },
  { key: 'imSecretKey', label: 'IM 密钥', desc: '腾讯云即时通信 SecretKey', placeholder: '...', secret: true },
]

async function loadConfigs() {
  try {
    const r = await apiCall('GET', '/config/app') || []
    const rows = Array.isArray(r) ? r : []
    const filled = CONFIG_SCHEMA.map(s => { const found = rows.find(x => x.key === s.key); return { ...s, value: found ? found.value : '' } })
    configGroups.value = [
      { label: '📚 学科配置', items: filled.filter(x => ['defaultSubjects'].includes(x.key)) },
      { label: '🤖 AI 模型配置', items: filled.filter(x => x.key.startsWith('ai')) },
      { label: '🔐 微信与 IM 配置', items: filled.filter(x => ['wxAppId', 'wxAppSecret', 'imSdkAppId', 'imSecretKey'].includes(x.key)) },
    ].filter(g => g.items.length > 0)
  } catch (e) { console.error('[admin] loadConfigs error:', e) }
}

async function saveConfig(cfg) {
  uni.showLoading({ title: '保存中…', mask: true })
  try { await apiCall('PUT', '/config/app/' + cfg.key, { value: cfg.value }); uni.hideLoading(); uni.showToast({ title: cfg.label + ' 已保存', icon: 'success' }) }
  catch (e) { uni.hideLoading(); uni.showToast({ title: e.message || '保存失败', icon: 'none' }) }
}

async function addSubject(cfg) { await saveConfig(cfg) }
async function removeSubject(cfg) { await saveConfig(cfg) }

// ===== 成绩审计（超管只读 P4） =====
const auditExams = ref([])
const auditGrades = ref([])
const auditSummary = ref({ subjects: [], totalGrades: 0 })
const auditLoading = ref(false)
const auditSchoolId = ref('')

async function loadAuditGrade() {
  auditLoading.value = true
  try {
    const params = auditSchoolId.value ? { schoolId: auditSchoolId.value } : {}
    const q = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&')
    const qs = q ? ('?' + q) : ''
    const [examRes, gradeRes, sumRes] = await Promise.all([
      apiCall('GET', '/admin/audit-exams' + qs + (qs ? '&' : '?') + 'take=500'),
      apiCall('GET', '/admin/audit-grades' + qs + (qs ? '&' : '?') + 'take=500'),
      apiCall('GET', '/admin/audit-grade-summary' + qs),
    ])
    auditExams.value = (examRes && (examRes.items || examRes)) || []
    auditGrades.value = (gradeRes && (gradeRes.items || gradeRes)) || []
    auditSummary.value = (sumRes && sumRes.subjects) ? sumRes : { subjects: [], totalGrades: 0 }
  } catch (e) { uni.showToast({ title: String(e?.message || '加载失败').slice(0, 40), icon: 'none' }) }
  finally { auditLoading.value = false }
}

function onAuditSchoolChange(schoolId) { auditSchoolId.value = schoolId; loadAuditGrade() }

// ===== 审计日志 =====
const LOG_PAGE_SIZE = 50
const logAuditItems = ref([])
const logAuditTotal = ref(0)
const logAuditSkip = ref(0)
const logAuditLoading = ref(false)
const logAuditSchoolId = ref('')

async function loadAuditLogs() {
  const r = await apiCall('GET', '/admin/audit-logs') || { items: [] }
  const logs = r.items || r || []
  const now = new Date()
  const todayStr = now.toDateString()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  let today = 0, week = 0
  for (const l of logs) {
    const d = new Date(l.createdAt || l.created_at)
    if (isNaN(d.getTime())) continue
    if (d.toDateString() === todayStr) today++
    if (d >= weekAgo) week++
  }
  todayLogCount.value = today
  weekLogCount.value = week
}

const todayLogCount = ref(0)
const weekLogCount = ref(0)

function onLogSchoolChange(schoolId) { logAuditSchoolId.value = schoolId; logAuditSkip.value = 0; loadAuditLogList() }
function prevAuditPage() { if (logAuditSkip.value <= 0) return; logAuditSkip.value = Math.max(0, logAuditSkip.value - LOG_PAGE_SIZE); loadAuditLogList() }
function nextAuditPage() { if (logAuditSkip.value + LOG_PAGE_SIZE >= logAuditTotal.value) return; logAuditSkip.value = logAuditSkip.value + LOG_PAGE_SIZE; loadAuditLogList() }

async function loadAuditLogList() {
  logAuditLoading.value = true
  try {
    const params = []
    if (logAuditSchoolId.value) params.push('schoolId=' + encodeURIComponent(logAuditSchoolId.value))
    params.push('skip=' + logAuditSkip.value)
    params.push('take=' + LOG_PAGE_SIZE)
    const r = await apiCall('GET', '/admin/audit-logs?' + params.join('&')) || { items: [], total: 0 }
    logAuditItems.value = (r.items || r || [])
    logAuditTotal.value = r.total || logAuditItems.value.length
  } catch (e) { uni.showToast({ title: String(e?.message || '加载失败').slice(0, 40), icon: 'none' }) }
  finally { logAuditLoading.value = false }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: calc(150rpx + env(safe-area-inset-bottom)); background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.login-card { background: var(--c-card); border-radius: 28rpx; padding: 48rpx 36rpx; width: 560rpx; max-width: 90vw; margin: 120rpx auto 0; box-sizing: border-box; box-shadow: 0 10rpx 36rpx var(--c-shadow); border: 1px solid var(--c-border); }
.login-title { font-size: 36rpx; font-weight: 800; color: var(--c-title); text-align: center; margin-bottom: 30rpx; }
.login-field { margin-bottom: 20rpx; }
.login-label { display: block; font-size: 26rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.login-input { border: 1px solid var(--c-input-border); border-radius: 16rpx; padding: 22rpx 24rpx; font-size: 30rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.login-btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; font-size: 30rpx; height: 88rpx; line-height: 88rpx; margin-top: 20rpx; font-weight: 700; box-shadow: 0 6rpx 20rpx rgba(245,179,66,.25); }
.hint { font-size: 22rpx; color: var(--c-sub); text-align: center; margin-top: 16rpx; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; padding-top: 8rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.logout { font-size: 24rpx; color: var(--c-primary); font-weight: 600; padding: 10rpx 28rpx; border-radius: 32rpx; background: rgba(245,179,66,.1); }
.tabbar { position: fixed; left: 0; right: 0; bottom: 0; display: flex; align-items: stretch; background: var(--c-card); border-top: 1px solid var(--c-border); padding-bottom: env(safe-area-inset-bottom); z-index: 50; box-shadow: 0 -6rpx 24rpx var(--c-shadow); }
.tab-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; padding: 14rpx 0 12rpx; color: var(--c-sub); }
.tab-item.on { color: var(--c-primary); }
.tab-ico { font-size: 38rpx; line-height: 1; }
.tab-txt { font-size: 22rpx; font-weight: 600; }
.sub-head { display: flex; align-items: center; gap: 16rpx; padding: 8rpx 4rpx 20rpx; }
.sub-back { font-size: 28rpx; color: var(--c-accent); font-weight: 600; padding: 8rpx 12rpx; background: rgba(245,179,66,.08); border-radius: 24rpx; }
.sub-title { font-size: 32rpx; font-weight: 800; color: var(--c-title); }
.menu-list { display: flex; flex-direction: column; gap: 16rpx; }
.menu-row { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 24rpx; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.menu-icon { font-size: 44rpx; width: 64rpx; text-align: center; }
.menu-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.menu-name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.menu-sub { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.menu-arrow { font-size: 40rpx; color: var(--c-sub); font-weight: 700; }
.dash { padding-top: 8rpx; }
.dash-welcome { display: flex; flex-direction: column; margin-bottom: 24rpx; }
.dash-hi { font-size: 34rpx; font-weight: 800; color: var(--c-title); }
.dash-sub { font-size: 24rpx; color: var(--c-sub); margin-top: 6rpx; }
.dash-stats { display: flex; flex-wrap: wrap; gap: 16rpx; margin-bottom: 28rpx; }
.dstat { flex: 1 1 30%; min-width: 30%; display: flex; flex-direction: column; align-items: center; padding: 28rpx 0; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.dstat-num { font-size: 44rpx; font-weight: 800; color: var(--c-primary); }
.dstat-label { font-size: 22rpx; color: var(--c-sub); margin-top: 6rpx; }
.dash-menu { display: grid; grid-template-columns: 1fr 1fr; gap: 16rpx; }
.dm { display: flex; flex-direction: column; align-items: center; gap: 12rpx; padding: 32rpx 0; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.dm-ico { font-size: 48rpx; }
.dm-txt { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
</style>
