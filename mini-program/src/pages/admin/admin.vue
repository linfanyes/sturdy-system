<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <!-- ===== 登录中状态 ===== -->
    <view v-if="logging" class="login-card login-card--logging anim-bounce">
      <view class="login-crest">
        <text class="login-crest-ico anim-float">👑</text>
        <view class="login-crest-ring"></view>
      </view>
      <view class="login-title">正在以超级管理员身份进入</view>
      <view class="login-dots"><text class="dot dot-1"></text><text class="dot dot-2"></text><text class="dot dot-3"></text></view>
    </view>

    <!-- ===== 登录表单 ===== -->
    <template v-else-if="!adminToken">
      <view class="login-card anim-pop">
        <view class="login-crest">
          <text class="login-crest-ico">👑</text>
          <view class="login-crest-ring"></view>
        </view>
        <view class="login-title">超级管理员</view>
        <view class="login-sub">请输入凭据以访问全局控制台</view>
        <view class="login-field">
          <text class="login-label">用户名</text>
          <input v-model="adminUser" class="login-input" placeholder="超管用户名" placeholder-class="login-placeholder" />
        </view>
        <view class="login-field">
          <text class="login-label">密码</text>
          <input v-model="adminPwd" class="login-input" placeholder="超管密码" password placeholder-class="login-placeholder" />
        </view>
        <button class="login-btn press-feedback" :disabled="logging" @click="doLogin">
          <text v-if="!logging" class="login-btn-txt">登 录</text>
          <text v-else class="login-btn-txt">登录中…</text>
        </button>
        <view class="hint">用户名/密码由后端环境变量配置（SUPER_ADMIN_USER / SUPER_ADMIN_PASSWORD）</view>
      </view>
    </template>

    <!-- ===== 已登录主界面 ===== -->
    <template v-else>
      <!-- 顶部头栏 -->
      <view class="head">
        <view class="head-left">
          <text class="head-avatar">👑</text>
          <view>
            <text class="h">超级管理员</text>
            <text class="head-sub">全局控制台</text>
          </view>
        </view>
        <text class="logout press-feedback" @click="logout">退出</text>
      </view>

      <!-- 二级功能面板：带返回头 -->
      <template v-if="subView">
        <view class="sub-head">
          <text class="sub-back press-feedback" @click="back">← 返回</text>
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
          <view class="dash-welcome anim-slide-up">
            <text class="dash-hi">欢迎回来 👋</text>
            <text class="dash-sub">系统全局概览与快捷入口</text>
          </view>
          <view class="dash-stats grow-in">
            <view class="dstat dstat--school">
              <text class="dstat-ico">🏫</text>
              <text class="dstat-num">{{ schools.length }}</text>
              <text class="dstat-label">学校</text>
            </view>
            <view class="dstat dstat--admin">
              <text class="dstat-ico">👤</text>
              <text class="dstat-num">{{ schoolAdmins.length }}</text>
              <text class="dstat-label">校管理员</text>
            </view>
            <view class="dstat dstat--ai">
              <text class="dstat-ico">🤖</text>
              <text class="dstat-num">{{ providers.length }}</text>
              <text class="dstat-label">AI 厂商</text>
            </view>
            <view class="dstat dstat--today">
              <text class="dstat-ico">📅</text>
              <text class="dstat-num">{{ todayLogCount }}</text>
              <text class="dstat-label">今日日志</text>
            </view>
            <view class="dstat dstat--week">
              <text class="dstat-ico">📈</text>
              <text class="dstat-num">{{ weekLogCount }}</text>
              <text class="dstat-label">本周日志</text>
            </view>
          </view>
          <view class="dash-menu grow-in">
            <view class="dm press-feedback" @click="quickOpen('account','school')">
              <text class="dm-ico">🏫</text>
              <text class="dm-txt">学校管理</text>
            </view>
            <view class="dm press-feedback" @click="quickOpen('account','schoolAdmin')">
              <text class="dm-ico">👤</text>
              <text class="dm-txt">校管理员</text>
            </view>
            <view class="dm press-feedback" @click="quickOpen('settings','config')">
              <text class="dm-ico">⚙️</text>
              <text class="dm-txt">平台配置</text>
            </view>
            <view class="dm press-feedback" @click="quickOpen('settings','ai')">
              <text class="dm-ico">🤖</text>
              <text class="dm-txt">AI 服务商</text>
            </view>
            <view class="dm press-feedback" @click="quickOpen('dashboard','grade')">
              <text class="dm-ico">📊</text>
              <text class="dm-txt">成绩审计</text>
            </view>
            <view class="dm press-feedback" @click="quickOpen('dashboard','audit')">
              <text class="dm-ico">📜</text>
              <text class="dm-txt">审计日志</text>
            </view>
          </view>
        </view>

        <!-- 账户管理二级列表 -->
        <template v-else-if="bottomTab === 'account'">
          <view class="menu-list grow-in">
            <view class="menu-row press-feedback" @click="openSub('school')">
              <view class="menu-icon-wrap menu-icon--school">
                <text class="menu-icon">🏫</text>
              </view>
              <view class="menu-info">
                <text class="menu-name">学校管理</text>
                <text class="menu-sub">{{ schools.length }} 所学校</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
            <view class="menu-row press-feedback" @click="openSub('schoolAdmin')">
              <view class="menu-icon-wrap menu-icon--admin">
                <text class="menu-icon">👤</text>
              </view>
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
          <view class="menu-list grow-in">
            <view class="menu-row press-feedback" @click="openSub('config')">
              <view class="menu-icon-wrap menu-icon--config">
                <text class="menu-icon">⚙️</text>
              </view>
              <view class="menu-info">
                <text class="menu-name">平台配置</text>
                <text class="menu-sub">全局配置项即时生效</text>
              </view>
              <text class="menu-arrow">›</text>
            </view>
            <view class="menu-row press-feedback" @click="openSub('ai')">
              <view class="menu-icon-wrap menu-icon--ai">
                <text class="menu-icon">🤖</text>
              </view>
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
        <view class="tab-item press-feedback" :class="{ on: bottomTab === 'dashboard' }" @click="selectBottomTab('dashboard')">
          <view class="tab-ico-wrap">
            <text class="tab-ico">📊</text>
            <view v-if="bottomTab === 'dashboard'" class="tab-indicator"></view>
          </view>
          <text class="tab-txt">工作台</text>
        </view>
        <view class="tab-item press-feedback" :class="{ on: bottomTab === 'account' }" @click="selectBottomTab('account')">
          <view class="tab-ico-wrap">
            <text class="tab-ico">👥</text>
            <view v-if="bottomTab === 'account'" class="tab-indicator"></view>
          </view>
          <text class="tab-txt">账户管理</text>
        </view>
        <view class="tab-item press-feedback" :class="{ on: bottomTab === 'settings' }" @click="selectBottomTab('settings')">
          <view class="tab-ico-wrap">
            <text class="tab-ico">⚙️</text>
            <view v-if="bottomTab === 'settings'" class="tab-indicator"></view>
          </view>
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
import { isSessionInvalid } from '@gardener/shared/utils/security'
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
          const msg = r.data && (r.data.message || r.data.error)
          const msgText = typeof msg === 'string' ? msg : ''
          // 缺陷修复：仅「真·会话失效」才清登录态踢回登录页。
          // 后端对「权限不足/角色不符」也返回 401，无条件清除会把超管误登出。
          if (isSessionInvalid(msgText)) {
            adminToken.value = ''
            uni.removeStorageSync(ADMIN_TOKEN_KEY)
            uni.removeStorageSync('admin_user')
            uni.reLaunch({ url: '/pages/login/login' })
          }
          return reject(new Error(msgText || '登录已过期'))
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
    if (adminToken.value) {
      // 缺陷修复：补齐 admin_user 写入，使 authMachine.restore() 的 loadLogin
      // 能找到 admin_token + admin_user 配对，冷启动可恢复超管会话。
      const user = resp?.user || {}
      uni.setStorageSync(ADMIN_TOKEN_KEY, adminToken.value)
      uni.setStorageSync('admin_user', JSON.stringify(user))
      await loadAll()
    }
    else uni.showToast({ title: '登录失败：未返回 token', icon: 'none' })
  } catch (e) { uni.showToast({ title: String(e?.message || '登录失败').slice(0, 40), icon: 'none' }) }
  finally { logging.value = false }
}

function logout() {
  adminToken.value = ''
  uni.removeStorageSync(ADMIN_TOKEN_KEY)
  uni.removeStorageSync('admin_user')
  // 仅清除超管自身令牌，不移除教师/校管登录态（g_token/g_user/sa_token）
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
/* ======================== 页面容器 ======================== */
.page {
  padding: 24rpx;
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  background: var(--c-bg);
  min-height: 100vh;
  box-sizing: border-box;
}

/* ======================== 登录卡片 ======================== */
.login-card {
  position: relative;
  background: var(--c-card);
  border-radius: 32rpx;
  padding: 56rpx 40rpx 40rpx;
  width: 560rpx;
  max-width: 90vw;
  margin: 100rpx auto 0;
  box-sizing: border-box;
  box-shadow: var(--c-shadow-paper);
  border: 1px solid var(--c-border);
  overflow: hidden;
}
/* 卡片顶部柔光带 */
.login-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 4rpx;
  background: linear-gradient(90deg, transparent, var(--c-primary), transparent);
  border-radius: 0 0 4rpx 4rpx;
}
/* 登录中变体 */
.login-card--logging {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx 70rpx;
}
/* 王冠徽标 */
.login-crest {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}
.login-crest-ico {
  font-size: 72rpx;
  line-height: 1;
  filter: drop-shadow(0 4rpx 12rpx rgba(245,179,66,.35));
}
.login-crest-ring {
  position: absolute;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(245,179,66,.2);
  animation: pulse-ring 2s ease-out infinite;
}
/* 登录中脉冲圆点 */
.login-dots {
  display: flex;
  gap: 12rpx;
  margin-top: 24rpx;
}
.login-dots .dot {
  display: inline-block;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: var(--c-primary);
}
.dot-1 { animation: dot-pulse 1.2s ease-in-out infinite; }
.dot-2 { animation: dot-pulse 1.2s ease-in-out 0.2s infinite; }
.dot-3 { animation: dot-pulse 1.2s ease-in-out 0.4s infinite; }

.login-title {
  font-size: 36rpx;
  font-weight: 800;
  color: var(--c-title);
  text-align: center;
  margin-bottom: 8rpx;
}
.login-sub {
  font-size: 24rpx;
  color: var(--c-sub);
  text-align: center;
  margin-bottom: 32rpx;
}
.login-field { margin-bottom: 20rpx; }
.login-label {
  display: block;
  font-size: 26rpx;
  color: var(--c-sub);
  margin-bottom: 8rpx;
  font-weight: 600;
}
.login-input {
  border: 1.5px solid var(--c-input-border);
  border-radius: var(--r-md);
  padding: 22rpx 24rpx;
  font-size: 30rpx;
  width: 100%;
  box-sizing: border-box;
  background: var(--c-input);
  color: var(--c-text);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.login-input:focus {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 4rpx rgba(245,179,66,.12);
}
.login-placeholder {
  color: var(--c-sub);
  opacity: 0.6;
}
.login-btn {
  background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d));
  color: #fff;
  border-radius: var(--r-pill);
  font-size: 30rpx;
  height: 88rpx;
  line-height: 88rpx;
  margin-top: 24rpx;
  font-weight: 700;
  box-shadow: 0 8rpx 24rpx rgba(245,179,66,.28);
  letter-spacing: 4rpx;
  transition: transform 0.15s, box-shadow 0.15s;
}
.login-btn-txt { letter-spacing: 4rpx; }
.hint {
  font-size: 22rpx;
  color: var(--c-sub);
  text-align: center;
  margin-top: 20rpx;
  line-height: 1.6;
}

/* ======================== 顶部头栏 ======================== */
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  padding-top: 8rpx;
}
.head-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.head-avatar {
  font-size: 44rpx;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(245,179,66,.15), rgba(245,179,66,.08));
  border-radius: 50%;
  border: 1.5px solid rgba(245,179,66,.2);
}
.h {
  font-size: 34rpx;
  font-weight: 800;
  color: var(--c-title);
  display: block;
}
.head-sub {
  font-size: 22rpx;
  color: var(--c-sub);
  display: block;
  margin-top: 2rpx;
}
.logout {
  font-size: 24rpx;
  color: var(--c-primary);
  font-weight: 600;
  padding: 12rpx 28rpx;
  border-radius: var(--r-pill);
  background: rgba(245,179,66,.1);
  border: 1.5px solid rgba(245,179,66,.2);
  transition: transform 0.15s, background 0.15s;
}

/* ======================== 子页面头栏 ======================== */
.sub-head {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 8rpx 4rpx 20rpx;
}
.sub-back {
  font-size: 28rpx;
  color: var(--c-accent);
  font-weight: 600;
  padding: 10rpx 20rpx;
  background: rgba(245,179,66,.08);
  border-radius: 24rpx;
  border: 1px solid rgba(245,179,66,.15);
  transition: transform 0.15s;
}
.sub-title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-title);
}

/* ======================== 仪表盘 ======================== */
.dash { padding-top: 8rpx; }
.dash-welcome {
  display: flex;
  flex-direction: column;
  margin-bottom: 28rpx;
  padding: 32rpx 36rpx;
  background: linear-gradient(135deg, rgba(245,179,66,.1), rgba(245,179,66,.04));
  border-radius: var(--r-lg);
  border: 1px solid rgba(245,179,66,.12);
}
.dash-hi {
  font-size: 36rpx;
  font-weight: 800;
  color: var(--c-title);
}
.dash-sub {
  font-size: 24rpx;
  color: var(--c-sub);
  margin-top: 8rpx;
}

/* 统计卡片行 */
.dash-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 28rpx;
}
.dstat {
  flex: 1 1 30%;
  min-width: 30%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28rpx 0 24rpx;
  background: var(--c-card);
  border-radius: var(--r-lg);
  box-shadow: var(--c-shadow-paper);
  position: relative;
  overflow: hidden;
  transition: transform 0.15s;
}
.dstat:active {
  transform: scale(0.97);
}
/* 顶部色带 */
.dstat::before {
  content: '';
  position: absolute;
  top: 0;
  left: 15%;
  right: 15%;
  height: 4rpx;
  border-radius: 0 0 4rpx 4rpx;
}
.dstat--school::before { background: var(--c-primary); }
.dstat--admin::before { background: var(--c-accent); }
.dstat--ai::before { background: var(--c-blue); }
.dstat--today::before { background: var(--c-success); }
.dstat--week::before { background: var(--c-pink); }

.dstat-ico {
  font-size: 36rpx;
  margin-bottom: 8rpx;
}
.dstat-num {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--c-title);
  line-height: 1.2;
}
.dstat--school .dstat-num { color: var(--c-primary); }
.dstat--admin .dstat-num { color: var(--c-accent); }
.dstat--ai .dstat-num { color: var(--c-blue); }
.dstat--today .dstat-num { color: var(--c-success); }
.dstat--week .dstat-num { color: var(--c-pink); }
.dstat-label {
  font-size: 22rpx;
  color: var(--c-sub);
  margin-top: 4rpx;
}

/* 快捷菜单网格 */
.dash-menu {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.dm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 36rpx 0;
  background: var(--c-card);
  border-radius: var(--r-lg);
  box-shadow: var(--c-shadow-paper);
  position: relative;
  overflow: hidden;
  transition: transform 0.15s, box-shadow 0.15s;
}
.dm-ico { font-size: 50rpx; }
.dm-txt {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--c-title);
}

/* ======================== 菜单列表 ======================== */
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.menu-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  background: var(--c-card);
  border-radius: var(--r-lg);
  box-shadow: var(--c-shadow-paper);
  border: 1px solid var(--c-border);
  transition: transform 0.15s, box-shadow 0.15s;
}
.menu-icon-wrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.menu-icon--school { background: rgba(245,179,66,.12); }
.menu-icon--admin { background: rgba(230,162,60,.12); }
.menu-icon--config { background: rgba(28,111,179,.1); }
.menu-icon--ai { background: rgba(76,175,80,.1); }
.menu-icon { font-size: 36rpx; }
.menu-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.menu-name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.menu-sub { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.menu-arrow {
  font-size: 40rpx;
  color: var(--c-sub);
  font-weight: 700;
  opacity: 0.5;
}

/* ======================== 底部 Tabbar ======================== */
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: stretch;
  background: var(--c-card);
  border-top: 1px solid var(--c-border);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 50;
  box-shadow: 0 -4rpx 20rpx var(--c-shadow);
}
.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding: 16rpx 0 12rpx;
  color: var(--c-sub);
  position: relative;
  transition: color 0.2s;
}
.tab-item.on { color: var(--c-primary); }
.tab-ico-wrap {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tab-ico {
  font-size: 38rpx;
  line-height: 1;
  transition: transform 0.2s;
}
.tab-item.on .tab-ico {
  transform: scale(1.1);
}
.tab-indicator {
  width: 32rpx;
  height: 6rpx;
  border-radius: 3rpx;
  background: var(--c-primary);
  margin-top: 6rpx;
  animation: bounce-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}
.tab-txt {
  font-size: 22rpx;
  font-weight: 600;
  transition: font-weight 0.2s;
}
.tab-item.on .tab-txt {
  font-weight: 700;
}

/* ======================== 按压反馈（scoped 内覆盖全局） ======================== */
.press-feedback {
  transition: transform 0.15s, opacity 0.15s;
}
.press-feedback:active {
  transform: scale(0.96);
  opacity: 0.92;
}
</style>
