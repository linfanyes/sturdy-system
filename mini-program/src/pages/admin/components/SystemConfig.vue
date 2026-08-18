<template>
  <view>
    <!-- 顶部 Tab：仅在从「平台配置 / AI 服务商」入口进入时显示完整切换；
         从「校管理员」入口进入时不显示 平台配置 / AI 服务商，避免多出一排菜单栏 -->
    <view class="sub-tabs" v-if="entry !== 'schoolAdmin'">
      <view class="stab" :class="{ on: mode === 'admin' }" @click="mode = 'admin'">校管理员</view>
      <view class="stab" :class="{ on: mode === 'config' }" @click="mode = 'config'">平台配置</view>
      <view class="stab" :class="{ on: mode === 'ai' }" @click="mode = 'ai'">AI 服务商</view>
    </view>

    <!-- ===== 校管理员管理 ===== -->
    <view v-if="mode === 'admin'">
      <view class="stats">
        <text class="sc">共 {{ schoolAdmins.length }} 个学校管理员</text>
        <text class="act" @click="emit('open-create-admin')">＋ 新增</text>
      </view>
      <view class="filter-bar">
        <input v-model="filterSchoolCode" class="filter-inp" placeholder="按学校编号筛选" />
      </view>
      <view class="list">
        <view v-if="!filteredAdmins.length" class="empty">暂无匹配的学校管理员</view>
        <view class="row" v-for="a in filteredAdmins" :key="a.id">
          <view class="info" @click="emit('open-edit-admin', a)">
            <view class="nm-line">
              <text class="nm">{{ a.name }}</text>
              <text class="badge" :class="a.enabled ? 'on' : 'off'">{{ a.enabled ? '开启' : '禁用' }}</text>
            </view>
            <text class="meta">学校：{{ a.schoolName || '未关联' }} · 编号：{{ a.schoolCode || '-' }}</text>
            <text class="meta">用户名：{{ a.username }}</text>
          </view>
          <view class="acts">
            <text class="act" @click.stop="emit('open-reset-admin', a)">重置密码</text>
            <text class="act del" @click.stop="emit('del-admin', a)">删除</text>
          </view>
        </view>
      </view>

      <!-- 新增/编辑学校管理员（全屏） -->
      <view v-if="showAdminForm" class="full-mask">
        <view class="full-page">
          <view class="full-head">
            <text class="full-back" @click="showAdminForm = false">← 返回</text>
            <text class="full-title">{{ editingAdminId ? '编辑学校管理员' : '新增学校管理员' }}</text>
            <text class="full-placeholder"></text>
          </view>
          <scroll-view scroll-y class="full-body">
            <view class="form-item">
              <text class="label">所属学校 <text class="req">*</text></text>
              <picker class="picker" mode="selector" :range="schoolOpts" range-key="label" @change="onSchoolPick">
                <view class="picker-inp">{{ adminForm.schoolId ? schoolLabel(adminForm.schoolId) : '请选择学校' }}</view>
              </picker>
            </view>
            <view class="form-item">
              <text class="label">管理员姓名 <text class="req">*</text></text>
              <input v-model="adminForm.name" class="inp" placeholder="如：张老师" />
            </view>
            <view class="form-item">
              <text class="label">用户名 <text class="req">*</text></text>
              <input v-model="adminForm.username" class="inp" placeholder="登录用，如：zhangsan" />
            </view>
            <view v-if="!editingAdminId" class="form-item">
              <text class="label">密码 <text class="req">*</text></text>
              <input v-model="adminForm.password" class="inp inp-lg" placeholder="请输入登录密码" password />
              <text class="field-hint">提示：该密码将作为此学校管理员的登录密码，请妥善保管。</text>
            </view>
            <view v-else class="form-item">
              <text class="label">新密码 <text class="opt">（留空则不修改）</text></text>
              <input v-model="adminForm.password" class="inp inp-lg" placeholder="输入新密码可重置" password />
              <text class="field-hint">提示：留空则保持原密码不变；填写后将立即重置其登录密码。</text>
            </view>
            <view class="form-item switch-item">
              <view class="label-line">
                <text class="label">开启标志</text>
                <text class="switch-val">{{ adminForm.enabled ? '开启' : '禁用' }}</text>
              </view>
              <switch :checked="adminForm.enabled" color="#4CAF50" @change="adminForm.enabled = $event.detail.value" />
            </view>
          </scroll-view>
          <view class="full-foot">
            <button class="save-btn" :disabled="saving" @click="onSaveAdmin">{{ saving ? '保存中…' : (editingAdminId ? '保存修改' : '确认创建') }}</button>
          </view>
        </view>
      </view>

      <!-- 重置密码 -->
      <view v-if="resetTarget" class="mask mask-center" @click="resetTarget = null">
        <view class="dialog" @click.stop>
            <view class="sh-t">重置「{{ resetTarget.name }}」的密码</view>
            <view class="inp-wrap">
              <input :value="origPwd" class="inp-dialog" placeholder="原密码" readonly />
              <input v-model="resetPwd" class="inp-dialog" placeholder="请输入新密码" password />
              <text class="dialog-hint">提示：密码重置后，原密码立即失效，该管理员需使用新密码重新登录。若账号此前被禁用，将同时恢复启用。</text>
            </view>
            <button class="save-btn" :disabled="saving" @click="onResetPwd">{{ saving ? '保存中…' : '确认重置' }}</button>
          </view>
      </view>
    </view>

    <!-- ===== 平台配置 ===== -->
    <view v-else-if="mode === 'config'">
      <view class="stats"><text class="sc">平台全局配置（修改后即时生效）</text></view>
      <scroll-view scroll-y class="config-scroll">
        <view class="config-group" v-for="(group, gidx) in configGroups" :key="gidx">
          <view class="config-group-title">{{ group.label }}</view>
          <view class="config-row" v-for="cfg in group.items" :key="cfg.key">
            <view class="config-info">
              <text class="config-label">{{ cfg.label }}</text>
              <text class="config-desc">{{ cfg.desc }}</text>
            </view>
            <template v-if="cfg.type === 'subjects'">
              <view class="subject-chips">
                <view v-for="sub in parseSubjects(cfg.value)" :key="sub" class="subject-chip">
                  <text class="subject-check">✓</text>
                  <text class="subject-name">{{ sub }}</text>
                  <text class="subject-del" @click="removeSubject(cfg, sub)">×</text>
                </view>
                <view v-if="!parseSubjects(cfg.value).length" class="subject-empty">暂无学科，请在下方添加</view>
              </view>
              <view class="subject-add">
                <input v-model="newSubject" class="subject-inp" placeholder="输入学科后点添加，如：科学" @confirm="addSubject(cfg)" />
                <text class="subject-add-btn" @click="addSubject(cfg)">＋ 添加</text>
              </view>
            </template>
            <view v-else class="config-input-row">
              <input v-if="!cfg.secret" v-model="cfg.value" class="inp config-inp" :placeholder="cfg.placeholder" />
              <input v-else v-model="cfg.value" class="inp config-inp" :placeholder="cfg.placeholder" password />
              <text class="config-save" @click="emit('save-config', cfg)">保存</text>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- ===== AI 服务商管理 ===== -->
    <view v-else-if="mode === 'ai'">
      <view class="stats">
        <text class="sc">共 {{ providers.length }} 个厂商</text>
        <text class="act" @click="openCreateProvider">＋ 新增厂商</text>
      </view>
      <view class="list">
        <view v-if="!providers.length" class="empty">暂无 AI 服务商</view>
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
            <text class="act stop" @click.stop="emit('toggle-provider', p)">{{ p.enabled ? '停用' : '启用' }}</text>
            <text class="act del" @click.stop="emit('del-provider', p)">删除</text>
          </view>
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
            <button class="save-btn" :disabled="saving" @click="onSaveProvider">{{ saving ? '保存中…' : '保存' }}</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'

const props = defineProps({
  schoolAdmins: { type: Array, default: () => [] },
  schools: { type: Array, default: () => [] },
  providers: { type: Array, default: () => [] },
  configGroups: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
  // 入口来源：'schoolAdmin'（校管理员视图，隐藏 平台配置/AI 服务商 Tab）/ 'config' / 'ai'
  entry: { type: String, default: 'admin' },
})
const emit = defineEmits([
  'open-create-admin', 'open-edit-admin', 'del-admin', 'open-reset-admin', 'save-admin', 'reset-pwd',
  'save-config', 'add-subject', 'remove-subject',
  'open-create-provider', 'open-edit-provider', 'del-provider', 'toggle-provider', 'save-provider',
])

// 按入口初始化：从「校管理员」进入锁定为 admin；从「平台配置/AI 服务商」进入时直接落到对应视图
const mode = ref(props.entry === 'schoolAdmin' ? 'admin' : (props.entry || 'admin'))

// 校管理员
const filterSchoolCode = ref('')
const filteredAdmins = computed(() => {
  if (!filterSchoolCode.value) return props.schoolAdmins
  const q = filterSchoolCode.value.trim().toLowerCase()
  return props.schoolAdmins.filter(a => (a.schoolCode || '').toLowerCase().includes(q))
})
const showAdminForm = ref(false)
const editingAdminId = ref('')
const adminForm = reactive({ schoolId: '', name: '', username: '', password: '', enabled: true })
const schoolOpts = computed(() => props.schools.map(s => ({ id: s.id, label: s.name + '（' + s.code + '）' })))
function schoolLabel(id) { const s = props.schools.find(x => x.id === id); return s ? s.name + '（' + s.code + '）' : '请选择学校' }
function onSchoolPick(e) { const opt = schoolOpts.value[e.detail.value]; adminForm.schoolId = opt ? opt.id : '' }
function onSaveAdmin() {
  if (!adminForm.schoolId) return uni.showToast({ title: '请先选择学校', icon: 'none' })
  if (!adminForm.name || !adminForm.username) return uni.showToast({ title: '姓名/用户名必填', icon: 'none' })
  if (!editingAdminId.value && !adminForm.password) return uni.showToast({ title: '新增时密码必填', icon: 'none' })
  emit('save-admin', { ...adminForm }, editingAdminId.value)
  showAdminForm.value = false
}
const resetTarget = ref(null)
const resetPwd = ref('')
const origPwd = ref('')
function onResetPwd() {
  if (!resetPwd.value) return uni.showToast({ title: '请输入新密码', icon: 'none' })
  emit('reset-pwd', resetTarget.value, resetPwd.value)
  resetTarget.value = null
}

// 平台配置
function parseSubjects(value) {
  if (!value) return []
  return Array.from(new Set(String(value).split(',').map(s => s.trim()).filter(Boolean)))
}
const newSubject = ref('')
async function addSubject(cfg) {
  const name = (newSubject.value || '').trim()
  if (!name) return uni.showToast({ title: '请输入学科名称', icon: 'none' })
  const list = parseSubjects(cfg.value)
  if (list.includes(name)) { newSubject.value = ''; return uni.showToast({ title: '该学科已存在', icon: 'none' }) }
  list.push(name); cfg.value = list.join(','); newSubject.value = ''
  emit('add-subject', cfg)
}
async function removeSubject(cfg, name) {
  const list = parseSubjects(cfg.value).filter(s => s !== name)
  cfg.value = list.join(',')
  emit('remove-subject', cfg)
}

// AI 服务商
const showProviderForm = ref(false)
const editingProviderCode = ref('')
const providerForm = reactive({ name: '', code: '', baseUrl: '', enabled: true, isDefault: false, sortOrder: 0 })
function openCreateProvider() {
  editingProviderCode.value = ''
  Object.assign(providerForm, { name: '', code: '', baseUrl: '', enabled: true, isDefault: false, sortOrder: 0 })
  showProviderForm.value = true
}
function openEditProvider(p) {
  editingProviderCode.value = p.code
  Object.assign(providerForm, { name: p.name, code: p.code, baseUrl: p.baseUrl || '', enabled: p.enabled, isDefault: p.isDefault, sortOrder: p.sortOrder || 0 })
  showProviderForm.value = true
}
function onSaveProvider() {
  if (!providerForm.name || !providerForm.code) return uni.showToast({ title: '厂商名称和代码必填', icon: 'none' })
  emit('save-provider', { ...providerForm }, editingProviderCode.value)
  showProviderForm.value = false
}

defineExpose({
  openCreateAdmin() {
    editingAdminId.value = ''
    Object.assign(adminForm, { schoolId: '', name: '', username: '', password: '', enabled: true })
    showAdminForm.value = true
  },
  openEditAdmin(a) {
    editingAdminId.value = a.id
    Object.assign(adminForm, { schoolId: a.schoolId || '', name: a.name || '', username: a.username || '', password: '', enabled: a.enabled })
    showAdminForm.value = true
  },
  openResetAdmin(a) { resetTarget.value = a; resetPwd.value = ''; origPwd.value = '' },
})
</script>

<style scoped>
.sub-tabs { display: flex; gap: 8rpx; margin-bottom: 20rpx; padding: 8rpx; background: var(--c-card2); border-radius: 22rpx; }
.stab { flex: 1; text-align: center; font-size: 24rpx; padding: 14rpx 0; border-radius: 16rpx; background: transparent; color: var(--c-sub); font-weight: 600; }
.stab.on { background: var(--c-primary); color: #fff; }
.stats { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); font-weight: 500; }
.act { display: inline-flex; align-items: center; font-size: 23rpx; color: var(--c-blue); font-weight: 600; padding: 10rpx 22rpx; border-radius: 30rpx; background: rgba(28,111,179,.08); line-height: 1.4; }
.act.del { color: var(--c-danger); background: rgba(245,108,108,.1); }
.act.stop { color: #d48806; background: rgba(230,162,60,.12); }
.filter-bar { margin-bottom: 16rpx; }
.filter-inp { width: 100%; border: 1px solid var(--c-input-border); border-radius: 16rpx; padding: 18rpx 22rpx; font-size: 26rpx; background: var(--c-card); color: var(--c-text); box-sizing: border-box; }
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
.acts { display: flex; flex-direction: row; align-items: center; justify-content: flex-end; gap: 12rpx; flex-shrink: 0; flex-wrap: wrap; max-width: 46%; }
.full-mask { position: fixed; inset: 0; z-index: 200; background: var(--c-bg); }
.full-page { display: flex; flex-direction: column; height: 100vh; width: 100%; }
.full-head { display: flex; align-items: center; justify-content: space-between; padding: env(safe-area-inset-top) 24rpx 0; height: calc(88rpx + env(safe-area-inset-top)); background: var(--c-card); border-bottom: 1px solid var(--c-border); flex-shrink: 0; }
.full-back { font-size: 28rpx; color: var(--c-accent); width: 120rpx; }
.full-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); }
.full-placeholder { width: 120rpx; }
.full-body { flex: 1; width: 100%; padding: 32rpx 30rpx; box-sizing: border-box; }
.full-foot { padding: 20rpx 30rpx calc(30rpx + env(safe-area-inset-bottom)); background: var(--c-card); border-top: 1px solid var(--c-border); flex-shrink: 0; }
.inp { border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 20rpx 22rpx; margin-bottom: 4rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.full-body .inp { width: 100%; margin-bottom: 0; min-height: 84rpx; }
.full-body .inp.inp-lg { font-size: 32rpx; padding: 26rpx 24rpx; min-height: 96rpx; }
.form-item { margin-bottom: 26rpx; width: 100%; box-sizing: border-box; }
.label { display: block; font-size: 26rpx; color: var(--c-title); font-weight: 600; margin-bottom: 8rpx; }
.req { color: #e64340; }
.opt { color: var(--c-sub); font-weight: 400; font-size: 22rpx; }
.label-line { flex: 1; }
.switch-item { display: flex; align-items: center; justify-content: space-between; width: 100%; box-sizing: border-box; background: var(--c-card2); border-radius: 16rpx; padding: 16rpx 20rpx; }
.switch-val { font-size: 24rpx; color: var(--c-sub); display: block; margin-top: 4rpx; }
.field-hint { display: block; font-size: 24rpx; color: var(--c-sub); margin-top: 10rpx; line-height: 1.6; }
.save-btn { background: linear-gradient(135deg, var(--c-primary), var(--c-primary-d)); color: #fff; border-radius: 50rpx; height: 88rpx; line-height: 88rpx; font-size: 30rpx; font-weight: 700; box-shadow: 0 6rpx 18rpx rgba(245,179,66,.25); }
.save-btn[disabled] { opacity: .6; }
.picker { width: 100%; }
.picker-inp { border: 1px solid var(--c-input-border); border-radius: 14rpx; padding: 20rpx 22rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,.55); display: flex; align-items: flex-end; z-index: 100; }
.mask.mask-center { align-items: center; justify-content: center; }
.dialog { width: 86%; max-width: 600rpx; background: var(--c-card); border-radius: 28rpx; padding: 44rpx 36rpx; box-shadow: 0 12rpx 40rpx rgba(0,0,0,.25); }
.sh-t { font-size: 32rpx; font-weight: 700; color: var(--c-title); margin-bottom: 16rpx; }
.inp-dialog { border: 2rpx solid var(--c-border); border-radius: 16rpx; padding: 24rpx; margin: 12rpx 0 4rpx; font-size: 32rpx; min-height: 92rpx; width: 100%; box-sizing: border-box; background: var(--c-input); color: var(--c-text); }
.inp-wrap { width: 100%; margin-bottom: 6rpx; }
.dialog-hint { display: block; font-size: 24rpx; color: var(--c-sub); margin: 10rpx 2rpx 14rpx; line-height: 1.6; }
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
</style>
