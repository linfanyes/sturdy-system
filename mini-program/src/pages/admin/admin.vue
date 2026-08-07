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
      <view v-if="subView === 'school'">
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
              <view class="meta-line" v-if="s.address">
                <text class="meta">地址：{{ s.address }}</text>
              </view>
            </view>
            <view class="acts">
              <text class="act" @click.stop="openSchoolFeatures(s)">功能包</text>
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
              <text class="reset-sub">清除所有业务数据及本机登录缓存，保留基础演示数据和超管登录</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ===== 学校管理员管理 ===== -->
      <view v-else-if="subView === 'schoolAdmin'">
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
      </view>

      <!-- ===== 平台配置 ===== -->
      <view v-else-if="subView === 'config'">
        <view class="stats"><text class="sc">平台全局配置（修改后即时生效）</text></view>
        <scroll-view scroll-y class="config-scroll">
          <view class="config-group" v-for="(group, gidx) in configGroups" :key="gidx">
            <view class="config-group-title">{{ group.label }}</view>
            <view class="config-row" v-for="cfg in group.items" :key="cfg.key">
              <view class="config-info">
                <text class="config-label">{{ cfg.label }}</text>
                <text class="config-desc">{{ cfg.desc }}</text>
              </view>

              <!-- 默认学科：勾选标签 + 新增 / 删除（即时保存） -->
              <template v-if="cfg.type === 'subjects'">
                <view class="subject-chips">
                  <view
                    v-for="sub in parseSubjects(cfg.value)"
                    :key="sub"
                    class="subject-chip"
                  >
                    <text class="subject-check">✓</text>
                    <text class="subject-name">{{ sub }}</text>
                    <text class="subject-del" @click="removeSubject(cfg, sub)">×</text>
                  </view>
                  <view v-if="!parseSubjects(cfg.value).length" class="subject-empty">
                    暂无学科，请在下方添加
                  </view>
                </view>
                <view class="subject-add">
                  <input
                    v-model="newSubject"
                    class="subject-inp"
                    placeholder="输入学科后点添加，如：科学"
                    @confirm="addSubject(cfg)"
                  />
                  <text class="subject-add-btn" @click="addSubject(cfg)">＋ 添加</text>
                </view>
              </template>

              <!-- 其余配置项：通用输入 -->
              <view v-else class="config-input-row">
                <input v-if="!cfg.secret" v-model="cfg.value" class="inp config-inp" :placeholder="cfg.placeholder" />
                <input v-else v-model="cfg.value" class="inp config-inp" :placeholder="cfg.placeholder" password />
                <text class="config-save" @click="saveConfig(cfg)">保存</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- ===== AI 服务商管理 ===== -->
      <view v-else-if="subView === 'ai'">
        <view class="stats">
          <text class="sc">共 {{ providers.length }} 个厂商</text>
          <text class="act" @click="openCreateProvider">＋ 新增厂商</text>
        </view>
        <view class="list">
          <EmptyState v-if="!providers.length" icon="🤖" text="暂无 AI 服务商" />
          <view class="row" v-for="p in providers" :key="p.code">
            <view class="info" @click="openEditProvider(p)">
              <view class="nm-line">
                <text class="nm">{{ p.name }}</text>
                <text class="badge" :class="p.enabled ? 'on' : 'off'">{{ p.enabled ? '启用' : '停用' }}</text>
                <text v-if="p.isDefault" class="badge on">默认</text>
              </view>
              <view class="meta">代码: {{ p.code }} | 排序: {{ p.sortOrder }}</view>
              <view class="meta" v-if="p.baseUrl">{{ p.baseUrl }}</view>
            </view>
            <view class="acts">
              <text class="act stop" @click="toggleProvider(p)">{{ p.enabled ? '停用' : '启用' }}</text>
              <text class="act del" @click="delProvider(p)">删除</text>
            </view>
          </view>
        </view>
      </view>
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

      <!-- 新增/编辑 AI 厂商（全屏） -->
      <view v-if="showProviderForm" class="full-mask">
        <view class="full-page">
          <view class="full-head">
            <text class="full-back" @click="showProviderForm = false">← 返回</text>
            <text class="full-title">{{ editingProviderCode ? '编辑厂商' : '新增厂商' }}</text>
            <text class="full-placeholder"></text>
          </view>
          <scroll-view scroll-y class="full-body">
            <view class="form-item">
              <text class="label">厂商名称 <text class="req">*</text></text>
              <input v-model="providerForm.name" class="inp" placeholder="如：阿里云" />
            </view>
            <view class="form-item">
              <text class="label">代码标识 <text class="req">*</text></text>
              <input v-model="providerForm.code" class="inp" placeholder="如：aliyun" />
            </view>
            <view class="form-item">
              <text class="label">API 接口地址</text>
              <input v-model="providerForm.baseUrl" class="inp" placeholder="如：https://dashscope.aliyuncs.com/v1" />
            </view>
            <view class="form-item">
              <text class="label">排序</text>
              <input v-model.number="providerForm.sortOrder" class="inp" type="number" placeholder="数字越小越靠前" />
            </view>
            <view class="switch-item">
              <text class="label-line">启用</text>
              <switch :checked="providerForm.enabled" @change="providerForm.enabled = $event.detail.value" color="#4CAF50" />
            </view>
          </scroll-view>
          <view class="full-foot">
            <button class="save-btn" :disabled="saving" @click="saveProvider">{{ saving ? '保存中…' : '保存' }}</button>
          </view>
        </view>
      </view>

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
              <input v-model="form.password" class="inp inp-lg" placeholder="请输入登录密码" password />
              <text class="field-hint">提示：该密码将作为此学校管理员的登录密码，请妥善保管。</text>
            </view>
            <view v-else class="form-item">
              <text class="label">新密码 <text class="opt">（留空则不修改）</text></text>
              <input v-model="form.password" class="inp inp-lg" placeholder="输入新密码可重置" password />
              <text class="field-hint">提示：留空则保持原密码不变；填写后将立即重置其登录密码。</text>
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
          <view class="inp-wrap">
            <input v-model="resetPwd" class="inp-dialog" placeholder="请输入新密码" password />
            <text class="dialog-hint">提示：密码重置后，原密码立即失效，该管理员需使用新密码重新登录。若账号此前被禁用，将同时恢复启用。</text>
          </view>
          <button class="save-btn" :disabled="saving" @click="confirmReset">{{ saving ? '保存中…' : '确认重置' }}</button>
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
import { CLOUDRUN_ENV, CLOUDRUN_SERVICE } from '../../common/config'

const SERVER_URL = '/api'
const ADMIN_TOKEN_KEY = 'admin_token'
const adminToken = ref(uni.getStorageSync(ADMIN_TOKEN_KEY) || '')
const logging = ref(false)
const adminUser = ref('')
const adminPwd = ref('')
const saving = ref(false)

// 底部 3-tab 导航：dashboard=仪表盘 / account=账户管理 / settings=设置
const bottomTab = ref('dashboard')
// 二级功能视图：''=列表态，'school'|'schoolAdmin'|'config'|'ai'=进入对应功能面板
const subView = ref('')
const subTitle = ref('')

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

// 学校下拉选项（管理员表单用）
const schoolOptions = computed(() =>
  schools.value.map((s) => ({ id: s.id, label: s.name + '（' + s.code + '）' })),
)
function schoolLabel(id) {
  const s = schools.value.find((x) => x.id === id)
  return s ? s.name + '（' + s.code + '）' : '请选择学校'
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

// 从超管仪表盘快捷入口跳转进来时，按 ?open= 参数直接定位到对应功能面板
onLoad((options) => {
  if (options && options.open) switchTab(options.open)
})

// 进入页面加载学校/管理员/AI 厂商（错误显式暴露，便于排查后端/链路问题）
async function loadAll() {
  try {
    await Promise.all([
      loadSchools(),
      loadAdmins(),
      loadProviders(),
      loadAuditLogs().catch(() => {}),
    ])
  } catch (e) {
    uni.showToast({ title: String(e?.message || '加载失败').slice(0, 40), icon: 'none' })
  }
}

// 仪表盘快捷入口：切换底部 tab 并直接进入对应二级功能
function quickOpen(tab, sub) {
  selectBottomTab(tab)
  openSub(sub)
}

// 兼容 admin/dashboard.vue 快捷入口：将 'school'|'admin'|'config'|'ai' 映射到底部 tab + 二级面板
function switchTab(t) {
  if (t === 'school') quickOpen('account', 'school')
  else if (t === 'admin') quickOpen('account', 'schoolAdmin')
  else if (t === 'config') quickOpen('settings', 'config')
  else if (t === 'ai') quickOpen('settings', 'ai')
}

async function loadSchools() {
  const r = await apiCall('GET', '/admin/schools') || { items: [], total: 0 }
  schools.value = Array.isArray(r) ? r : (r.items || [])
}

async function loadAdmins() {
  const r = await apiCall('GET', '/admin/school-admins') || { items: [], total: 0 }
  schoolAdmins.value = Array.isArray(r) ? r : (r.items || [])
}

// 底部 tab 切换：切换一级菜单并回到二级列表态
function selectBottomTab(t) {
  bottomTab.value = t
  subView.value = ''
}
// 进入二级功能面板（按需加载数据）
function openSub(v) {
  subView.value = v
  if (v === 'school') { subTitle.value = '学校管理'; loadSchools() }
  else if (v === 'schoolAdmin') { subTitle.value = '校管理员'; loadAdmins() }
  else if (v === 'config') { subTitle.value = '平台配置'; loadConfigs() }
  else if (v === 'ai') { subTitle.value = 'AI 服务商'; loadProviders() }
}
// 返回二级列表
function back() { subView.value = '' }

// ===== AI 服务商管理 =====
const providers = ref([])
const showProviderForm = ref(false)
const editingProviderCode = ref('')
const providerForm = ref({ name: '', code: '', baseUrl: '', enabled: true, isDefault: false, sortOrder: 0 })
// 仪表盘审计统计（与 Web 端 Dashboard 对齐）
const auditLogs = ref([])
const todayLogCount = ref(0)
const weekLogCount = ref(0)

async function loadProviders() {
  try {
    const r = await apiCall('GET', '/ai-providers') || { items: [] }
    providers.value = r.items || r || []
  } catch (e) { providers.value = [] }
}

// 仪表盘审计统计：加载最近审计日志并计算今日/本周条数
async function loadAuditLogs() {
  const r = await apiCall('GET', '/admin/audit-logs') || { items: [] }
  const logs = r.items || r || []
  auditLogs.value = logs
  const now = new Date()
  const todayStr = now.toDateString()
  const weekAgo = new Date(now.getTime() - 7 * 86400000)
  let today = 0
  let week = 0
  for (const l of logs) {
    const d = new Date(l.createdAt || l.created_at)
    if (isNaN(d.getTime())) continue
    if (d.toDateString() === todayStr) today++
    if (d >= weekAgo) week++
  }
  todayLogCount.value = today
  weekLogCount.value = week
}

function openCreateProvider() {
  editingProviderCode.value = ''
  providerForm.value = { name: '', code: '', baseUrl: '', enabled: true, isDefault: false, sortOrder: 0 }
  showProviderForm.value = true
}

function openEditProvider(p) {
  editingProviderCode.value = p.code
  providerForm.value = { name: p.name, code: p.code, baseUrl: p.baseUrl || '', enabled: p.enabled, isDefault: p.isDefault, sortOrder: p.sortOrder || 0 }
  showProviderForm.value = true
}

async function saveProvider() {
  const f = providerForm.value
  if (!f.name || !f.code) return uni.showToast({ title: '厂商名称和代码必填', icon: 'none' })
  saving.value = true
  try {
    if (editingProviderCode.value) {
      await apiCall('PATCH', '/ai-providers/' + editingProviderCode.value, f)
    } else {
      await apiCall('POST', '/ai-providers', f)
    }
    showProviderForm.value = false
    await loadProviders()
    uni.showToast({ title: '已保存', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
  saving.value = false
}

async function toggleProvider(p) {
  try {
    await apiCall('PATCH', '/ai-providers/' + p.code, { enabled: !p.enabled })
    p.enabled = !p.enabled
    uni.showToast({ title: p.enabled ? '已启用' : '已停用', icon: 'success' })
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
}

async function delProvider(p) {
  uni.showModal({
    title: '删除厂商',
    content: `确定删除「${p.name}」？`,
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/ai-providers/' + p.code)
        providers.value = providers.value.filter(x => x.id !== p.code)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) }
    },
  })
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
    // 用后端数据填充 schema
    const filled = CONFIG_SCHEMA.map(s => {
      const found = rows.find(x => x.key === s.key)
      return { ...s, value: found ? found.value : '' }
    })
    // 分组
    configGroups.value = [
      { label: '📚 学科配置', items: filled.filter(x => ['defaultSubjects'].includes(x.key)) },
      { label: '🤖 AI 模型配置', items: filled.filter(x => x.key.startsWith('ai')) },
      { label: '🔐 微信与 IM 配置', items: filled.filter(x => ['wxAppId', 'wxAppSecret', 'imSdkAppId', 'imSecretKey'].includes(x.key)) },
    ].filter(g => g.items.length > 0)
  } catch (e) {
    console.error('[admin] loadConfigs error:', e)
  }
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

// ===== 默认学科：解析 / 新增 / 删除 =====
function parseSubjects(value) {
  if (!value) return []
  return Array.from(
    new Set(
      String(value)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  )
}

async function addSubject(cfg) {
  const name = (newSubject.value || '').trim()
  if (!name) return uni.showToast({ title: '请输入学科名称', icon: 'none' })
  const list = parseSubjects(cfg.value)
  if (list.includes(name)) {
    newSubject.value = ''
    return uni.showToast({ title: '该学科已存在', icon: 'none' })
  }
  list.push(name)
  cfg.value = list.join(',')
  newSubject.value = ''
  await saveConfig(cfg)
}

async function removeSubject(cfg, name) {
  const list = parseSubjects(cfg.value).filter((s) => s !== name)
  cfg.value = list.join(',')
  await saveConfig(cfg)
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

// 跳转「学校功能包」页（超管独占的学校级功能开关，与 Web 端 /super/school-features 对应）
function openSchoolFeatures(s) {
  uni.navigateTo({ url: '/pages/school-admin/school-features?schoolId=' + s.id })
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
    uni.showToast({ title: '密码已重置，账号已启用', icon: 'success' })
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

// 一键重置：全量清除所有学校/教师/班级/学生/业务数据 + 重建种子
function confirmResetAll() {
  uni.showModal({
    title: '⚠️ 一键全量重置',
    content: '确定要执行全量重置吗？\n\n此操作将：\n1. 清除所有考试、成绩、作业、考勤等业务数据\n2. 清除本机所有学校管理员、教师、家长的登录信息及个人缓存\n\n此操作不可撤销！\n\n保留：学校、教师、校管等基础演示数据，超管登录态将保留。',
    confirmText: '确认重置',
    confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      uni.showLoading({ title: '重置中…', mask: true })
      try {
        await apiCall('POST', '/admin/reset-all', { confirm: true })
        uni.hideLoading()
        // 保存超管登录态
        const savedAdminToken = adminToken.value
        // 清除所有本地存储，实现系统初始化
        uni.clearStorageSync()
        // 恢复超管token
        uni.setStorageSync(ADMIN_TOKEN_KEY, savedAdminToken)
        // 重新加载管理员页面，重置所有内存状态
        uni.reLaunch({ url: '/pages/admin/admin' })
        uni.showToast({ title: '重置成功', icon: 'success' })
      } catch (e) {
        uni.hideLoading()
        uni.showToast({ title: e.message || '重置失败', icon: 'none' })
      }
    },
  })
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: calc(150rpx + env(safe-area-inset-bottom)); background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.login-card { background: var(--c-card); border-radius: 28rpx; padding: 48rpx 36rpx; width: 560rpx; max-width: 90vw; margin: 120rpx auto 0; box-sizing: border-box; box-shadow: 0 10rpx 36rpx var(--c-shadow); border: 1px solid var(--c-border); }
.login-title { font-size: 36rpx; font-weight: 800; color: var(--c-title); text-align: center; margin-bottom: 30rpx; }
.login-field { margin-bottom: 20rpx; }
.login-label { display: block; font-size: 26rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.login-input { border: 1px solid var(--c-input-border); border-radius: 16rpx; padding: 22rpx 24rpx; font-size: 30rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.inp { border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 20rpx 22rpx; margin-bottom: 4rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.login-btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; font-size: 30rpx; height: 88rpx; line-height: 88rpx; margin-top: 20rpx; font-weight: 700; box-shadow: 0 6rpx 20rpx rgba(245,179,66,.25); }
.hint { font-size: 22rpx; color: var(--c-sub); text-align: center; margin-top: 16rpx; }
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; padding-top: 8rpx; }
.h { font-size: 36rpx; font-weight: 800; color: var(--c-title); }
.logout { font-size: 24rpx; color: var(--c-primary); font-weight: 600; padding: 10rpx 28rpx; border-radius: 32rpx; background: rgba(245,179,66,.1); }
/* 底部 3-tab 导航 */
.tabbar { position: fixed; left: 0; right: 0; bottom: 0; display: flex; align-items: stretch; background: var(--c-card); border-top: 1px solid var(--c-border); padding-bottom: env(safe-area-inset-bottom); z-index: 50; box-shadow: 0 -6rpx 24rpx var(--c-shadow); }
.tab-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4rpx; padding: 14rpx 0 12rpx; color: var(--c-sub); }
.tab-item.on { color: var(--c-primary); }
.tab-ico { font-size: 38rpx; line-height: 1; }
.tab-txt { font-size: 22rpx; font-weight: 600; }
/* 二级功能面板头部（返回） */
.sub-head { display: flex; align-items: center; gap: 16rpx; padding: 8rpx 4rpx 20rpx; }
.sub-back { font-size: 28rpx; color: var(--c-accent); font-weight: 600; padding: 8rpx 12rpx; background: rgba(245,179,66,.08); border-radius: 24rpx; }
.sub-title { font-size: 32rpx; font-weight: 800; color: var(--c-title); }
/* 二级列表菜单 */
.menu-list { display: flex; flex-direction: column; gap: 16rpx; }
.menu-row { display: flex; align-items: center; gap: 20rpx; padding: 28rpx 24rpx; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.menu-icon { font-size: 44rpx; width: 64rpx; text-align: center; }
.menu-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.menu-name { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.menu-sub { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.menu-arrow { font-size: 40rpx; color: var(--c-sub); font-weight: 700; }
/* 仪表盘 */
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
.stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); font-weight: 500; }
.act { display: inline-flex; align-items: center; font-size: 23rpx; color: var(--c-blue); font-weight: 600; padding: 10rpx 22rpx; border-radius: 30rpx; background: rgba(28,111,179,.08); line-height: 1.4; }
.act.del { color: var(--c-danger); background: rgba(245,108,108,.1); }
.act.stop { color: #d48806; background: rgba(230,162,60,.12); }
.act.start { color: var(--c-primary); background: rgba(245,179,66,.1); }
.list { display: flex; flex-direction: column; gap: 16rpx; }
.empty { padding: 80rpx 30rpx; text-align: center; font-size: 26rpx; color: var(--c-sub); background: var(--c-card); border-radius: 20rpx; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 24rpx; background: var(--c-card); border-radius: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 8rpx; flex-wrap: wrap; }
.nm { font-size: 30rpx; font-weight: 700; color: var(--c-title); }
.badge { display: inline-block; font-size: 20rpx; font-weight: 600; padding: 4rpx 16rpx; border-radius: 20rpx; }
.badge.on { background: rgba(245,179,66,.12); color: var(--c-primary); }
.badge.off { background: rgba(245,108,108,.12); color: var(--c-danger); }
.meta { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; line-height: 1.5; }
.meta-line { display: flex; gap: 16rpx; align-items: center; margin-top: 4rpx; }
.acts { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 12rpx; flex-shrink: 0; flex-wrap: wrap; max-width: 46%; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: flex-end; z-index: 100; }
.mask.mask-center { align-items: center; justify-content: center; }
.dialog { width: 86%; max-width: 600rpx; background: var(--c-card); border-radius: 28rpx; padding: 44rpx 36rpx; box-shadow: 0 12rpx 40rpx rgba(0,0,0,.25); }
.inp-dialog { border: 2rpx solid var(--c-border); border-radius: 16rpx; padding: 24rpx 24rpx; margin: 12rpx 0 4rpx; font-size: 32rpx; min-height: 92rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.sheet { width: 100%; background: var(--c-card); border-radius: 28rpx 28rpx 0 0; padding: 36rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); max-height: 82vh; display: flex; flex-direction: column; box-sizing: border-box; }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
/* 全屏表单 */
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; width: 100%; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: env(safe-area-inset-top) 24rpx 0; height: calc(88rpx + env(safe-area-inset-top)); background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; width: 100%; padding: 32rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 20rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.hint-block { font-size: 24rpx; color: var(--c-sub); background: var(--c-card2, #f5f5f5); padding: 14rpx 18rpx; border-radius: 12rpx; margin-bottom: 20rpx; line-height: 1.6; border-left: 4rpx solid var(--c-accent, #4CAF50); width: auto; }
/* 编辑学校时显示只读编号 */
.code-display { font-size: 28rpx; padding: 20rpx 22rpx; background: var(--c-card2); border-radius: 14rpx; color: var(--c-title); font-weight: 600; border: 1px dashed var(--c-border); }
.field-err { display: block; font-size: 22rpx; color: #e64340; margin-top: 4rpx; }
.field-hint { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 10rpx; line-height: 1.6; }
.dialog-hint { display: block; font-size: 24rpx; color: var(--c-sub); margin: 10rpx 2rpx 14rpx; line-height: 1.6; }
/* 重置密码弹窗输入框包裹（解决 flex 下 input 被挤压） */
.inp-wrap { width: 100%; margin-bottom: 6rpx; }
/* 学校管理员列表学校编号筛选 */
.filter-bar { margin-bottom: 16rpx; }
.filter-inp { width: 100%; border: 1px solid var(--c-input-border); border-radius: 16rpx; padding: 18rpx 22rpx; font-size: 26rpx; background: var(--c-card); color: var(--c-text); box-sizing: border-box; }
/* 一键重置 */
.reset-section { margin-top: 32rpx; background: linear-gradient(135deg, #ff6b6b, #e64340); border-radius: 20rpx; padding: 6rpx 24rpx; box-shadow: 0 6rpx 22rpx rgba(230,67,64,.22); }
.reset-row { display: flex; align-items: center; gap: 16rpx; padding: 24rpx 0; }
.reset-icon { font-size: 36rpx; flex-shrink: 0; }
.reset-text { flex: 1; display: flex; flex-direction: column; }
.reset-name { font-size: 28rpx; font-weight: 700; color: #fff; }
.reset-sub { font-size: 22rpx; color: rgba(255,255,255,.85); margin-top: 4rpx; }
.form-item { margin-bottom: 26rpx; width: 100%; box-sizing: border-box; }
.label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.req { color: #e64340; }
.opt { color: var(--c-sub); font-weight: 400; font-size: 22rpx; }
.label-line { flex: 1; }
.switch-item { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; background: var(--c-card2); border-radius: 16rpx; padding: 16rpx 20rpx; }
.switch-val { font-size: 24rpx; color: var(--c-sub); display: block; margin-top: 4rpx; }
.hint-tip { font-size: 22rpx; color: var(--c-sub); text-align: center; margin: 8rpx 0 14rpx; }
.save-btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; font-weight: 700; box-shadow: 0 6rpx 18rpx rgba(245,179,66,.25); }
/* 学校下拉选择器 */
.picker { width: 100%; }
.picker-inp { border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 20rpx 22rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
/* 全屏表单内的输入框：覆盖共享 .inp 的 margin，确保宽度撑满 */
.full-body .inp { width: 100%; margin-bottom: 0; min-height: 84rpx; }
/* 放大的密码输入框（创建/修改/重置场景） */
.full-body .inp.inp-lg { font-size: 32rpx; padding: 26rpx 24rpx; min-height: 96rpx; }
/* 平台配置 */
.config-scroll { height: calc(100vh - 220rpx); padding: 0 0 40rpx; }
.config-group { background: var(--c-card); border-radius: 20rpx; padding: 26rpx 24rpx; margin-bottom: 20rpx; box-shadow: 0 4rpx 16rpx var(--c-shadow); }
.config-group-title { font-size: 28rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; padding-bottom: 14rpx; border-bottom: 1px solid var(--c-border); }
.config-row { padding: 20rpx 0; border-bottom: 1px solid var(--c-border); }
.config-row:last-child { border-bottom: none; }
.config-info { margin-bottom: 12rpx; }
.config-label { font-size: 26rpx; font-weight: 600; color: var(--c-title); }
.config-desc { display: block; font-size: 22rpx; color: var(--c-sub); margin-top: 2rpx; }
.config-input-row { display: flex; gap: 12rpx; align-items: center; }
.config-inp { flex: 1; border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 16rpx 20rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; min-height: 76rpx; }
.config-save { flex-shrink: 0; font-size: 24rpx; color: var(--c-primary); font-weight: 600; padding: 12rpx 28rpx; background: rgba(245,179,66,.1); border-radius: 30rpx; }
/* 默认学科：勾选标签 + 增删 */
.subject-chips { display: flex; flex-wrap: wrap; gap: 14rpx; margin: 6rpx 0 14rpx; }
.subject-chip { display: inline-flex; align-items: center; gap: 8rpx; padding: 10rpx 18rpx; border-radius: 16rpx; background: rgba(245,179,66,.1); border: 1px solid rgba(245,179,66,.35); max-width: 100%; box-sizing: border-box; }
.subject-check { color: var(--c-primary); font-weight: 800; font-size: 24rpx; }
.subject-name { font-size: 26rpx; color: var(--c-title); }
.subject-del { color: var(--c-danger); font-size: 30rpx; font-weight: 700; padding: 0 4rpx; line-height: 1; }
.subject-del:active { opacity: .5; }
.subject-empty { font-size: 24rpx; color: var(--c-sub); padding: 6rpx 0; }
.subject-add { display: flex; gap: 12rpx; align-items: center; }
.subject-inp { flex: 1; border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 16rpx 20rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; min-height: 76rpx; }
.subject-add-btn { flex-shrink: 0; font-size: 24rpx; color: #fff; font-weight: 600; padding: 16rpx 28rpx; background: var(--c-primary); border-radius: 30rpx; }
.ndate { font-size: 20rpx; color: var(--c-sub2); margin-left: 10rpx; font-weight: 400; }

</style>
