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

      <!-- 顶部 Tab 切换 -->
      <view class="tabs">
        <text class="tab" :class="{ on: tab === 'school' }" @click="switchTab('school')">🏫 学校</text>
        <text class="tab" :class="{ on: tab === 'admin' }" @click="switchTab('admin')">👤 管理员</text>
        <text class="tab" :class="{ on: tab === 'config' }" @click="switchTab('config')">⚙️ 配置</text>
        <text class="tab" :class="{ on: tab === 'audit' }" @click="switchTab('audit')">📋 日志</text>
      </view>

      <!-- ===== 学校管理 ===== -->
      <template v-if="tab === 'school'">
        <view class="stats">
          <text class="sc">共 {{ schools.length }} 所学校</text>
          <text class="act" @click="openCreateSchool">＋ 新增学校</text>
        </view>
        <view class="list">
          <view v-if="!schools.length" class="empty">暂无学校，点击右上角「新增学校」</view>
          <view class="row" v-for="s in schools" :key="s.id">
            <view class="info" @click="openEditSchool(s)">
              <view class="nm-line">
                <text class="nm">{{ s.name }}</text>
                <text class="badge" :class="s.status === 'active' ? 'on' : 'off'">{{ s.status === 'active' ? '启用' : '停用' }}</text>
              </view>
              <text class="meta">编号：{{ s.code }}</text>
              <view class="meta-line">
                <text class="meta" v-if="s.address">地址：{{ s.address }}</text>
                <text class="meta admin-count">{{ adminCountBySchool(s.id) }}位管理员</text>
              </view>
            </view>
            <view class="acts">
              <text class="act" :class="s.status === 'active' ? 'stop' : 'start'" @click.stop="toggleSchoolStatus(s)">{{ s.status === 'active' ? '停用' : '启用' }}</text>
              <text class="act del" @click.stop="delSchool(s)">删除</text>
            </view>
          </view>
        </view>
        <!-- 一键重置 -->
        <view class="reset-section">
          <view class="reset-row" @click="confirmResetAll">
            <text class="reset-icon">⚠️</text>
            <view class="reset-text">
              <text class="reset-name">一键重置</text>
              <text class="reset-sub">清除所有管理员/教师/家长数据，保留学校结构和超管账号</text>
            </view>
          </view>
        </view>
      </template>

      <!-- ===== 学校管理员管理 ===== -->
      <template v-else>
        <view class="stats">
          <text class="sc">共 {{ schoolAdmins.length }} 个学校管理员</text>
          <text class="act" @click="openCreate">＋ 新增</text>
        </view>
        <view class="filter-bar">
          <input v-model="adminFilterSchoolCode" class="filter-inp" placeholder="按学校编号筛选" @confirm="adminFilterSchoolCode = $event.detail.value" />
        </view>
        <view class="list">
          <view v-if="!filteredSchoolAdmins.length" class="empty">暂无匹配的学校管理员</view>
          <view class="row" v-for="a in filteredSchoolAdmins" :key="a.id">
            <view class="info" @click="openEdit(a)">
              <view class="nm-line">
                <text class="nm">{{ a.name }}</text>
                <text class="badge" :class="a.enabled ? 'on' : 'off'">{{ a.enabled ? '开启' : '禁用' }}</text>
              </view>
              <text class="meta">学校：{{ a.schoolName || '未关联' }} · 编号：{{ a.schoolCode || '-' }}</text>
              <text class="meta">用户名：{{ a.username }}</text>
            </view>
            <view class="acts">
              <text class="act" @click.stop="openReset(a)">重置密码</text>
              <text class="act del" @click.stop="delAdmin(a)">删除</text>
            </view>
          </view>
        </view>
      </template>

      <!-- ===== 平台配置 ===== -->
      <template v-if="tab === 'config'">
        <view class="stats"><text class="sc">平台全局配置（修改后即时生效）</text></view>
        <scroll-view scroll-y class="config-scroll">
          <view class="config-group" v-for="(group, gidx) in configGroups" :key="gidx">
            <view class="config-group-title">{{ group.label }}</view>
            <view class="config-row" v-for="cfg in group.items" :key="cfg.key">
              <view class="config-info">
                <text class="config-label">{{ cfg.label }}</text>
                <text class="config-desc">{{ cfg.desc }}</text>
              </view>
              <view class="config-input-row">
                <input v-if="!cfg.secret" v-model="cfg.value" class="inp config-inp" :placeholder="cfg.placeholder" />
                <input v-else v-model="cfg.value" class="inp config-inp" :placeholder="cfg.placeholder" password />
                <text class="config-save" @click="saveConfig(cfg)">保存</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </template>

      <!-- ===== 审计日志 ===== -->
      <template v-if="tab === 'audit'">
        <view class="stats"><text class="sc">操作日志（最近 100 条）</text></view>
        <scroll-view scroll-y class="config-scroll">
          <view class="list">
            <EmptyState v-if="!auditLogs.length" icon="📋" text="暂无操作日志" />
            <view class="row" v-for="a in auditLogs" :key="a.id">
              <view class="info">
                <view class="nm-line">
                  <text class="nm audit-action">{{ a.action }}</text>
                  <text class="ndate">{{ a.createdAt?.slice(0,10) }}</text>
                </view>
                <view class="meta">{{ a.operator }} → {{ a.target }}</view>
                <view class="meta" v-if="a.detail">{{ a.detail }}</view>
              </view>
            </view>
          </view>
        </scroll-view>
      </template>

      <!-- 新增/编辑学校（全屏） -->
      <view v-if="showSchoolForm" class="full-mask">
        <view class="full-page">
          <view class="full-head">
            <text class="full-back" @click="showSchoolForm = false">← 返回</text>
            <text class="full-title">{{ editingSchoolId ? '维护学校' : '新增学校' }}</text>
            <text class="full-placeholder"></text>
          </view>
          <scroll-view scroll-y class="full-body">
            <view v-if="!editingSchoolId" class="hint-block">
              学校编号 = 您输入的「编号前缀」+ 中横线(-) + 6 位随机字符，由系统自动生成并保证唯一（不填前缀则只有 6 位随机字符）。
            </view>
            <view class="form-item">
              <text class="label">学校名称 <text class="req">*</text></text>
              <input v-model="schoolForm.name" class="inp" placeholder="如：阳光小学" />
            </view>
            <!-- 新增时：显示编号前缀输入框 -->
            <view v-if="!editingSchoolId" class="form-item">
              <text class="label">编号前缀 <text class="opt">（最多 6 位字母/数字，留空则无前缀）</text></text>
              <input v-model="schoolForm.prefix" class="inp" placeholder="如：YG" maxlength="6" />
            </view>
            <!-- 编辑时：直接显示学校编号（只读） -->
            <view v-else class="form-item">
              <text class="label">学校编号</text>
              <view class="code-display">{{ schoolForm.code }}</view>
            </view>
            <view class="form-item">
              <text class="label">地址</text>
              <input v-model="schoolForm.address" class="inp" placeholder="学校地址（选填）" />
            </view>
            <view class="form-item">
              <text class="label">联系人</text>
              <input v-model="schoolForm.contact" class="inp" placeholder="联系人（选填）" />
            </view>
            <view class="form-item">
              <text class="label">联系电话</text>
              <input v-model="schoolForm.phone" class="inp" placeholder="联系电话（选填）" @blur="checkSchoolPhone" />
              <text v-if="schoolPhoneError" class="field-err">{{ schoolPhoneError }}</text>
            </view>
            <view class="form-item switch-item">
              <view class="label-line">
                <text class="label">启用状态</text>
                <text class="switch-val">{{ schoolForm.enabled ? '启用' : '停用' }}</text>
              </view>
              <switch :checked="schoolForm.enabled" color="#4CAF50" @change="onSchoolEnabledChange" />
            </view>
          </scroll-view>
          <view class="full-foot">
            <button class="save-btn" :disabled="saving" @click="saveSchool">{{ saving ? '保存中…' : (editingSchoolId ? '保存修改' : '确认创建') }}</button>
          </view>
        </view>
      </view>

      <!-- 新增/编辑学校管理员（全屏） -->
      <view v-if="showForm" class="full-mask">
        <view class="full-page">
          <view class="full-head">
            <text class="full-back" @click="showForm = false">← 返回</text>
            <text class="full-title">{{ editingId ? '编辑学校管理员' : '新增学校管理员' }}</text>
            <text class="full-placeholder"></text>
          </view>
          <scroll-view scroll-y class="full-body">
            <view class="form-item">
              <text class="label">所属学校 <text class="req">*</text></text>
              <picker class="picker" mode="selector" :range="schoolOptions" range-key="label" @change="onSchoolPick">
                <view class="picker-inp">{{ form.schoolId ? schoolLabel(form.schoolId) : '请选择学校' }}</view>
              </picker>
            </view>
            <view class="form-item">
              <text class="label">管理员姓名 <text class="req">*</text></text>
              <input v-model="form.name" class="inp" placeholder="如：张老师" />
            </view>
            <view class="form-item">
              <text class="label">用户名 <text class="req">*</text></text>
              <input v-model="form.username" class="inp" placeholder="登录用，如：zhangsan" />
            </view>
            <view v-if="!editingId" class="form-item">
              <text class="label">密码 <text class="req">*</text></text>
              <input v-model="form.password" class="inp" placeholder="登录密码" password />
            </view>
            <view v-else class="form-item">
              <text class="label">新密码 <text class="opt">（留空则不修改）</text></text>
              <input v-model="form.password" class="inp" placeholder="输入新密码可重置" password />
            </view>
            <view class="form-item switch-item">
              <view class="label-line">
                <text class="label">开启标志</text>
                <text class="switch-val">{{ form.enabled ? '开启' : '禁用' }}</text>
              </view>
              <switch :checked="form.enabled" color="#4CAF50" @change="onEnabledChange" />
            </view>
          </scroll-view>
          <view class="full-foot">
            <button class="save-btn" :disabled="saving" @click="saveForm">{{ saving ? '保存中…' : (editingId ? '保存修改' : '确认创建') }}</button>
          </view>
        </view>
      </view>

      <!-- 重置密码 -->
      <view v-if="resetTarget" class="mask mask-center" @click="resetTarget = null">
        <view class="dialog" @click.stop>
          <view class="sh-t">重置「{{ resetTarget.name }}」的密码</view>
          <input v-model="resetPwd" class="inp-dialog" placeholder="新密码（必填）" password />
          <button class="save-btn" :disabled="saving" @click="confirmReset">{{ saving ? '保存中…' : '确认重置' }}</button>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { theme } from '../../common/store'
import { isPhone } from '../../common/validators'

const SERVER_URL = '/api'
const ADMIN_TOKEN_KEY = 'admin_token'
const adminToken = ref(uni.getStorageSync(ADMIN_TOKEN_KEY) || '')
const logging = ref(false)
const adminUser = ref('')
const adminPwd = ref('')
const saving = ref(false)

// 当前 Tab：school=学校管理 / admin=学校管理员
const tab = ref('school')

/* ===== 学校管理 ===== */
const schools = ref([])
const showSchoolForm = ref(false)
const editingSchoolId = ref('')
const schoolForm = reactive({ name: '', prefix: '', address: '', contact: '', phone: '', enabled: true, code: '' })
const schoolPhoneError = ref('')

/* ===== 学校管理员管理 ===== */
const schoolAdmins = ref([])
// 学校编号筛选
const adminFilterSchoolCode = ref('')
const filteredSchoolAdmins = computed(() => {
  if (!adminFilterSchoolCode.value) return schoolAdmins.value
  const q = adminFilterSchoolCode.value.trim().toLowerCase()
  return schoolAdmins.value.filter(a => (a.schoolCode || '').toLowerCase().includes(q))
})

// 统一的表单状态（新增/编辑复用）
const showForm = ref(false)
const editingId = ref('')  // 空=新增，非空=编辑
const form = reactive({ schoolId: '', name: '', username: '', password: '', enabled: true })

const resetTarget = ref(null)
const resetPwd = ref('')

const CLOUDRUN_ENV = 'prod-d6g1zoq8c7be4ce53'
const CLOUDRUN_SERVICE = 'tec-work'

// 学校下拉选项（管理员表单用）
const schoolOptions = computed(() =>
  schools.value.map((s) => ({ id: s.id, label: s.name + '（' + s.code + '）' })),
)
function schoolLabel(id) {
  const s = schools.value.find((x) => x.id === id)
  return s ? s.name + '（' + s.code + '）' : '请选择学校'
}
// 每所学校的管理员数
function adminCountBySchool(schoolId) {
  return schoolAdmins.value.filter(a => a.schoolId === schoolId).length
}

async function apiCall(method, path, data) {
  const cloud = typeof wx !== 'undefined' && wx.cloud
  if (!cloud || typeof cloud.callContainer !== 'function') {
    throw new Error('当前环境不支持云托管私有链路')
  }
  return new Promise((resolve, reject) => {
    const opts = {
      config: { env: CLOUDRUN_ENV },
      path: SERVER_URL + path,
      method,
      header: {
        'content-type': 'application/json',
        'X-WX-SERVICE': CLOUDRUN_SERVICE,
        Authorization: 'Bearer ' + adminToken.value,
      },
      success: (r) => {
        const status = r.statusCode || (r.data && r.data.statusCode) || 200
        if (status === 401) {
          const msg = r.data && (r.data.message || r.data.error)
          adminToken.value = ''
          uni.removeStorageSync(ADMIN_TOKEN_KEY)
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
    // GET/DELETE 不传 data（微信小程序对无 body 请求更稳定）
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') {
      opts.data = data
    }
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
  } catch (e) {
    uni.showToast({ title: String(e?.message || '登录失败').slice(0, 40), icon: 'none' })
  }
  finally { logging.value = false }
}

function logout() {
  adminToken.value = ''
  // 清除超管登录态 + 污染的共享 token + 演示模式标记，
  // 防止冷启动时 App.vue 误读 g_token 判为教师登录态
  uni.removeStorageSync(ADMIN_TOKEN_KEY)
  uni.removeStorageSync('g_token')
  uni.removeStorageSync('g_user')
  uni.removeStorageSync('g_mock_mode')
  uni.reLaunch({ url: '/pages/login/login' })
}

onMounted(() => {
  if (adminToken.value) loadAll()
})

// 进入页面加载学校列表 + 管理员列表（错误显式暴露，便于排查后端/链路问题）
async function loadAll() {
  try {
    await Promise.all([loadSchools(), loadAdmins()])
  } catch (e) {
    uni.showToast({ title: String(e?.message || '加载失败').slice(0, 40), icon: 'none' })
  }
}

async function loadSchools() {
  const r = await apiCall('GET', '/admin/schools') || { items: [], total: 0 }
  schools.value = Array.isArray(r) ? r : (r.items || [])
}

async function loadAdmins() {
  const r = await apiCall('GET', '/admin/school-admins') || { items: [], total: 0 }
  schoolAdmins.value = Array.isArray(r) ? r : (r.items || [])
}

// Tab 切换
function switchTab(t) { tab.value = t; loadAll(); if (t === 'config') loadConfigs(); if (t === 'audit') loadAuditLogs() }

// ===== 审计日志 =====
const auditLogs = ref([])
async function loadAuditLogs() {
  try {
    const r = await apiCall('GET', '/admin/audit-logs') || { items: [], total: 0 }
    auditLogs.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { auditLogs.value = [] }
}

// ===== 平台配置 =====
const configGroups = ref([])

const CONFIG_SCHEMA = [
  { key: 'defaultSubjects', label: '默认学科', desc: '逗号分隔，教师端注册时可选', placeholder: '语文,数学,英语', secret: false },
  { key: 'loginCode', label: '小程序登录码', desc: '教师首次进入小程序的验证码', placeholder: '自定义4-8位', secret: false },
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
    // 用后端数据填充 schema
    const filled = CONFIG_SCHEMA.map(s => {
      const found = rows.find(x => x.key === s.key)
      return { ...s, value: found ? found.value : '' }
    })
    // 分组
    configGroups.value = [
      { label: '📚 学科与登录', items: filled.filter(x => ['defaultSubjects', 'loginCode'].includes(x.key)) },
      { label: '🤖 AI 模型配置', items: filled.filter(x => x.key.startsWith('ai')) },
      { label: '🔐 微信与 IM 配置', items: filled.filter(x => ['wxAppId', 'wxAppSecret', 'imSdkAppId', 'imSecretKey'].includes(x.key)) },
    ].filter(g => g.items.length > 0)
  } catch (e) { configGroups.value = []; console.error('loadConfigs', e) }
}

async function saveConfig(cfg) {
  uni.showLoading({ title: '保存中…', mask: true })
  try {
    await apiCall('PUT', '/config/app/' + cfg.key, { value: cfg.value })
    uni.hideLoading()
    uni.showToast({ title: cfg.label + ' 已保存', icon: 'success' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: e.message || '保存失败', icon: 'none' })
  }
}

/* ===== 学校表单 ===== */
function openCreateSchool() {
  editingSchoolId.value = ''
  schoolPhoneError.value = ''
  Object.assign(schoolForm, { name: '', prefix: '', address: '', contact: '', phone: '', enabled: true, code: '' })
  showSchoolForm.value = true
}

function openEditSchool(s) {
  editingSchoolId.value = s.id
  schoolPhoneError.value = ''
  Object.assign(schoolForm, {
    name: s.name || '',
    prefix: '',
    address: s.address || '',
    contact: s.contact || '',
    phone: s.phone || '',
    enabled: s.status === 'active',
    code: s.code || '',
  })
  showSchoolForm.value = true
}

function onSchoolEnabledChange(e) {
  schoolForm.enabled = e.detail.value
}

function checkSchoolPhone() {
  if (schoolForm.phone && !isPhone(schoolForm.phone)) {
    schoolPhoneError.value = '手机号格式错误，应为 11 位手机号'
  } else {
    schoolPhoneError.value = ''
  }
}

async function saveSchool() {
  if (!schoolForm.name) return uni.showToast({ title: '学校名称必填', icon: 'none' })
  if (schoolForm.phone && !isPhone(schoolForm.phone)) {
    schoolPhoneError.value = '手机号格式错误，请修正后再提交'
    return uni.showToast({ title: '手机号格式错误', icon: 'none' })
  }
  schoolPhoneError.value = ''
  saving.value = true
  const payload = {
    name: schoolForm.name,
    prefix: schoolForm.prefix,
    address: schoolForm.address,
    contact: schoolForm.contact,
    phone: schoolForm.phone,
    status: schoolForm.enabled ? 'active' : 'inactive',
  }
  const p = editingSchoolId.value
    ? apiCall('PATCH', '/admin/schools/' + editingSchoolId.value, payload)
    : apiCall('POST', '/admin/schools', payload)
  try {
    await p
    showSchoolForm.value = false
    await loadSchools()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
  saving.value = false
}

async function delSchool(s) {
  uni.showModal({
    title: '删除学校',
    content: `确定删除「${s.name}」？若该校仍有管理员将无法删除。`,
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/admin/schools/' + s.id)
        await loadSchools()
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}

// 列表内快速「停用 / 启用」切换：仅更新 status（后端 updateSchool 支持部分更新）
async function toggleSchoolStatus(s) {
  const next = s.status === 'active' ? 'inactive' : 'active'
  const label = next === 'active' ? '启用' : '停用'
  uni.showModal({
    title: label + '学校',
    content: `确定将「${s.name}」${label}吗？`,
    confirmColor: next === 'active' ? '#4CAF50' : '#e6a23c',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('PATCH', '/admin/schools/' + s.id, { status: next })
        // 直接更新本地条目，徽章与按钮文字即时响应
        s.status = next
        uni.showToast({ title: '已' + label, icon: 'success' })
      } catch (e) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      }
    },
  })
}

/* ===== 管理员表单 ===== */
function openCreate() {
  editingId.value = ''
  Object.assign(form, { schoolId: '', name: '', username: '', password: '', enabled: true })
  showForm.value = true
}

function openEdit(a) {
  editingId.value = a.id
  Object.assign(form, {
    schoolId: a.schoolId || '',
    name: a.name || '',
    username: a.username || '',
    password: '',  // 编辑时密码留空，不修改
    enabled: a.enabled,
  })
  showForm.value = true
}

function onSchoolPick(e) {
  const idx = e.detail.value
  const opt = schoolOptions.value[idx]
  form.schoolId = opt ? opt.id : ''
}

function onEnabledChange(e) {
  form.enabled = e.detail.value
}

async function saveForm() {
  const f = form
  if (!f.schoolId) {
    return uni.showToast({ title: '请先选择学校', icon: 'none' })
  }
  if (!f.name || !f.username) {
    return uni.showToast({ title: '姓名/用户名必填', icon: 'none' })
  }
  if (!editingId.value && !f.password) {
    return uni.showToast({ title: '新增时密码必填', icon: 'none' })
  }
  saving.value = true
  try {
    if (editingId.value) {
      // 编辑：PATCH 更新基本信息
      const payload = { schoolId: f.schoolId, name: f.name, username: f.username, enabled: f.enabled }
      await apiCall('PATCH', '/admin/school-admins/' + editingId.value, payload)
      // 如果填了新密码，额外调用重置密码接口
      if (f.password) {
        await apiCall('PATCH', '/admin/school-admins/' + editingId.value + '/password', { password: f.password })
      }
      showForm.value = false
      await loadAdmins()
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      // 新增：POST 创建（绑定所选学校）
      await apiCall('POST', '/admin/school-admins', {
        schoolId: f.schoolId, name: f.name, username: f.username,
        password: f.password, enabled: f.enabled,
      })
      showForm.value = false
      await loadAdmins()
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
  } catch (e) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
  saving.value = false
}

function openReset(a) {
  resetTarget.value = a
  resetPwd.value = ''
}

async function confirmReset() {
  if (!resetPwd.value) return uni.showToast({ title: '请输入新密码', icon: 'none' })
  saving.value = true
  try {
    await apiCall('PATCH', '/admin/school-admins/' + resetTarget.value.id + '/password', { password: resetPwd.value })
    resetTarget.value = null
    uni.showToast({ title: '密码已重置', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '重置失败', icon: 'none' }) }
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
        // 先从本地列表移除，确保 UI 立即响应
        schoolAdmins.value = schoolAdmins.value.filter((x) => x.id !== a.id)
        uni.showToast({ title: '已删除', icon: 'success' })
        // 延迟重新加载，确保后端数据已同步
        setTimeout(() => { loadAdmins() }, 500)
      } catch (e) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    },
  })
}

// 一键重置：清除所有管理员/教师/家长数据
function confirmResetAll() {
  uni.showModal({
    title: '⚠️ 一键重置',
    content: '确定要清除所有学校管理员、教师、家长及全部业务数据吗？\n\n此操作不可撤销！\n\n保留：学校结构 + 超管账号。',
    confirmText: '确认重置',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      uni.showLoading({ title: '重置中…', mask: true })
      try {
        await apiCall('POST', '/admin/reset-all', { confirm: true })
        uni.hideLoading()
        uni.showModal({
          title: '重置成功',
          content: '所有数据已清除，建议重新登录以确保状态刷新。',
          confirmText: '重新登录',
          success: (r) => {
            if (r.confirm) {
              adminToken.value = ''
              uni.removeStorageSync('admin_token')
              uni.reLaunch({ url: '/pages/login/login' })
            }
          },
        })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '重置失败', icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.login-card { background: var(--c-card); border-radius: 24rpx; padding: 40rpx 30rpx; width: 560rpx; max-width: 90vw; margin: 80rpx auto; box-sizing: border-box; }
.login-title { font-size: 36rpx; font-weight: 800; color: var(--c-title); text-align: center; margin-bottom: 30rpx; }
.login-field { margin-bottom: 20rpx; }
.login-label { display: block; font-size: 26rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.login-input { border: 1px solid var(--c-border); border-radius: 14rpx; padding: 20rpx; font-size: 30rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.inp { border: 1px solid var(--c-border); border-radius: 14rpx; padding: 18rpx; margin-bottom: 4rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.login-btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; font-size: 30rpx; height: 84rpx; line-height: 84rpx; margin-top: 10rpx; }
.hint { font-size: 22rpx; color: var(--c-sub); text-align: center; margin-top: 16rpx; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.logout { font-size: 26rpx; color: var(--c-accent); }
/* Tab 切换 */
.tabs { display: flex; gap: 12rpx; margin-bottom: 16rpx; }
.tab { flex: 1; text-align: center; font-size: 28rpx; padding: 16rpx 0; border-radius: 14rpx; background: var(--c-card); color: var(--c-sub); font-weight: 600; }
.tab.on { background: var(--c-primary); color: #fff; }
.stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: #e64340; }
.act.stop { color: #e6a23c; }
.act.start { color: #4CAF50; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 10rpx 24rpx; }
.empty { padding: 60rpx 0; text-align: center; font-size: 26rpx; color: var(--c-sub); }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 18rpx 0; border-bottom: 1px solid var(--c-border); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.nm { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 2rpx 14rpx; border-radius: 16rpx; }
.badge.on { background: rgba(76, 175, 80, .15); color: #4CAF50; }
.badge.off { background: rgba(230, 67, 64, .15); color: #e64340; }
.meta { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.meta-line { display: flex; gap: 16rpx; align-items: center; margin-top: 4rpx; }
.admin-count { font-size: 20rpx; color: #409eff; background: rgba(64,158,255,.1); padding: 1rpx 10rpx; border-radius: 8rpx; }
.acts { display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; flex-shrink: 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: flex-end; z-index: 100; }
.mask.mask-center { align-items: center; justify-content: center; }
.dialog { width: 86%; max-width: 600rpx; background: var(--c-card); border-radius: 24rpx; padding: 40rpx 36rpx; box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.3); }
.inp-dialog { border: 1px solid var(--c-border); border-radius: 14rpx; padding: 18rpx 20rpx; margin: 20rpx 0; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 80vh; display: flex; flex-direction: column; box-sizing: border-box; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
/* 全屏表单 */
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; width: 100%; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: 0 24rpx; height: 88rpx; background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; width: 100%; padding: 24rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 16rpx 30rpx 30rpx; background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.hint-block { font-size: 24rpx; color: var(--c-sub); background: var(--c-card2, #f5f5f5); padding: 14rpx 18rpx; border-radius: 12rpx; margin-bottom: 20rpx; line-height: 1.6; border-left: 4rpx solid var(--c-accent, #4CAF50); width: auto; }
/* 编辑学校时显示只读编号 */
.code-display { font-size: 28rpx; padding: 18rpx; background: var(--c-card2); border-radius: 14rpx; color: var(--c-title); font-weight: 600; }
.field-err { display: block; font-size: 22rpx; color: #e64340; margin-top: 4rpx; }
/* 重置密码弹窗输入框包裹（解决 flex 下 input 被挤压） */
.inp-wrap { width: 100%; margin-bottom: 6rpx; }
/* 学校管理员列表学校编号筛选 */
.filter-bar { margin-bottom: 12rpx; }
.filter-inp { width: 100%; border: 1px solid var(--c-border); border-radius: 14rpx; padding: 16rpx 20rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; }
/* 一键重置 */
.reset-section { margin-top: 30rpx; background: linear-gradient(135deg, #ff6b6b, #e64340); border-radius: 16rpx; padding: 10rpx 24rpx; }
.reset-row { display: flex; align-items: center; gap: 16rpx; padding: 20rpx 0; }
.reset-icon { font-size: 36rpx; flex-shrink: 0; }
.reset-text { flex: 1; display: flex; flex-direction: column; }
.reset-name { font-size: 28rpx; font-weight: 700; color: #fff; }
.reset-sub { font-size: 22rpx; color: rgba(255,255,255,.85); margin-top: 4rpx; }
.form-item { margin-bottom: 18rpx; width: 100%; box-sizing: border-box; }
.label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.req { color: #e64340; }
.opt { color: var(--c-sub); font-weight: 400; font-size: 22rpx; }
.label-line { flex: 1; }
.switch-item { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 0; width: 100%; box-sizing: border-box; }
.switch-val { font-size: 24rpx; color: var(--c-sub); display: block; margin-top: 4rpx; }
.hint-tip { font-size: 22rpx; color: var(--c-sub); text-align: center; margin: 8rpx 0 14rpx; }
.save-btn { background: var(--c-primary); color: #fff; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 30rpx; }
/* 学校下拉选择器 */
.picker { width: 100%; }
.picker-inp { border: 1px solid var(--c-border); border-radius: 14rpx; padding: 18rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
/* 全屏表单内的输入框：覆盖共享 .inp 的 margin，确保宽度撑满 */
.full-body .inp { width: 100%; margin-bottom: 0; min-height: 72rpx; }
/* 平台配置 */
.config-scroll { height: calc(100vh - 200rpx); padding: 0 0 40rpx; }
.config-group { background: var(--c-card); border-radius: 16rpx; padding: 20rpx 24rpx; margin-bottom: 16rpx; }
.config-group-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 12rpx; }
.config-row { padding: 16rpx 0; border-bottom: 1px solid var(--c-border); }
.config-row:last-child { border-bottom: none; }
.config-info { margin-bottom: 8rpx; }
.config-label { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.config-desc { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 2rpx; }
.config-input-row { display: flex; gap: 10rpx; align-items: center; }
.config-inp { flex: 1; border: 1px solid var(--c-border); border-radius: 10rpx; padding: 14rpx 16rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; min-height: 64rpx; }
.config-save { flex-shrink: 0; font-size: 24rpx; color: #409eff; font-weight: 600; padding: 8rpx 16rpx; background: rgba(64,158,255,.1); border-radius: 8rpx; }
/* 审计日志 */
.audit-action { font-size: 24rpx; color: var(--c-sub); }
.ndate { font-size: 20rpx; color: var(--c-sub2); margin-left: 10rpx; font-weight: 400; }

</style>
