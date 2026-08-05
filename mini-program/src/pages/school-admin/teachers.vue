<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">
      <text style="font-size:28rpx;color:#b8894a;min-width:96rpx;" @click="uni.navigateBack()">← 返回</text>
      <text style="font-size:32rpx;font-weight:600;color:#4a3b2a;">👩‍🏫 教师管理</text>
      <text style="min-width:96rpx;"></text>
    </view>

    <view class="bar">
      <text class="sc">共 {{ teachers.length }} 位教师</text>
      <view class="bar-acts">
        <text class="act" @click="openCreate">＋ 新增</text>
        <text class="act" @click="showBatchImport = true">📋 批量导入</text>
        <text class="act" @click="exportCsv('teachers')">📄 导出CSV</text>
        <text class="act" @click="exportXls('teachers')">📊 导出XLS</text>
      </view>
    </view>

    <Skeleton v-if="loading" :rows="3" />

    <EmptyState v-else-if="!teachers.length" icon="👩‍🏫" text="暂无教师" hint="点击右上角「新增」创建第一位教师" />

    <view v-else class="list">
      <view class="row" v-for="u in teachers" :key="u.id">
        <view class="info" @click="openEdit(u)">
          <view class="nm-line">
            <text class="nm">{{ u.name }}</text>
            <text class="badge" :class="u.enabled ? 'on' : 'off'">{{ u.enabled ? '启用' : '禁用' }}</text>
          </view>
          <view class="meta">用户名：{{ u.username || '微信登录' }}</view>
          <view class="meta" v-if="u.teacherNo">编号：{{ u.teacherNo }}</view>
          <view class="meta" v-if="u.phone">电话：{{ u.phone }}</view>
        </view>
        <view class="acts">
          <text class="act" @click.stop="resetPwd(u)">重置密码</text>
          <text class="act del" @click.stop="delTeacher(u)">删除</text>
        </view>
      </view>
      <view v-if="teachers.length < teacherTotal" class="load-more" @click="loadMore">加载更多（共 {{ teacherTotal }} 位）</view>
    </view>

    <!-- 新增/编辑教师弹窗 -->
    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">{{ editingId ? '编辑教师' : '新增教师' }}</view>
        <view class="field">
          <text class="label">用户名 <text class="req">*</text></text>
          <input v-model="form.username" class="inp" placeholder="登录用，如：zhangsan" />
        </view>
        <view class="field">
          <text class="label">姓名 <text class="req">*</text></text>
          <input v-model="form.name" class="inp" placeholder="如：张老师" />
        </view>
        <view class="field">
          <text class="label">学科</text>
          <input v-model="form.subject" class="inp" placeholder="如：语文" />
        </view>
        <view v-if="!editingId" class="field">
          <text class="label">密码 <text class="req">*</text></text>
          <input v-model="form.password" class="inp" placeholder="登录密码" password />
        </view>
        <view v-else class="field">
          <text class="label">新密码 <text class="opt">（留空则不修改）</text></text>
          <input v-model="form.password" class="inp" placeholder="输入新密码可重置" password />
        </view>
        <view class="field">
          <text class="label">手机号</text>
          <input v-model="form.phone" class="inp" placeholder="可选" />
        </view>
        <view class="field switch-item">
          <text class="label">启用标志</text>
          <switch :checked="form.enabled" color="#4CAF50" @change="(e) => form.enabled = e.detail.value" />
        </view>
        <view class="btn-row">
          <button class="btn cancel" @click="showForm = false">取消</button>
          <button class="btn save" :disabled="saving" @click="saveForm">{{ saving ? '保存中…' : (editingId ? '保存修改' : '确认创建') }}</button>
        </view>
      </view>
    </view>

    <!-- 密码重置弹窗 -->
    <view v-if="pwdUser" class="mask" @click="pwdUser = null">
      <view class="sheet" @click.stop>
        <view class="sh-t">重置「{{ pwdUser.name }}」密码</view>
        <view class="field">
          <input v-model="newPwd" class="inp" placeholder="新密码（6-20位）" password />
        </view>
        <view class="sh-sub">默认密码 1314521，也可自行设置（6-20位）</view>
        <view class="btn-row">
          <button class="btn cancel" @click="pwdUser = null">取消</button>
          <button class="btn save" :disabled="saving" @click="doResetPwd">确认重置</button>
        </view>
      </view>
    </view>

    <!-- 批量导入弹窗 -->
    <view v-if="showBatchImport" class="mask" @click="showBatchImport = false">
      <view class="sheet" @click.stop>
        <view class="sh-t">批量导入教师</view>
        <view class="hint-text">每行一条：姓名,用户名,密码（英文逗号分隔）</view>
        <textarea v-model="batchText" class="inp area" placeholder="张三,zhangsan,123456（每行一条）" />
        <view v-if="batchResult.length" class="batch-result">
          <view class="batch-summary">共 {{ batchResult.length }} 条，成功 {{ batchResult.filter(r => r.status==='成功').length }}/{{ batchResult.length }}</view>
          <view class="batch-item" :class="r.status==='成功'?'ok':'fail'" v-for="(r, i) in batchResult" :key="i">
            <text>{{ r.name }}({{ r.username }})：{{ r.status }}</text>
            <text v-if="r.error" class="batch-err">{{ r.error }}</text>
          </view>
        </view>
        <view class="btn-row">
          <button class="btn cancel" @click="showBatchImport = false">取消</button>
          <button class="btn save" :disabled="saving || !batchText.trim()" @click="doBatchImport">{{ saving ? '导入中…' : '确认导入' }}</button>
        </view>
      </view>
    </view>
  </view>

  <!-- CSV 预览 -->
  <view v-if="showCsvModal" class="mask" @click="showCsvModal = false">
    <view class="sheet" @click.stop>
      <view class="sh-t">CSV 预览</view>
      <scroll-view scroll-y class="csv-box"><text class="csv-text">{{ csvContent }}</text></scroll-view>
      <view class="btn-row">
        <button class="btn cancel" @click="showCsvModal = false">关闭</button>
        <button class="btn save" @click="copyCsv">复制</button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import { isPhone } from '../../common/validators'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const teachers = ref([])
const loading = ref(false)
const saving = ref(false)
const teacherPage = ref(0)
const teacherTotal = ref(0)
const TEACHER_PAGE_SIZE = 50

const showForm = ref(false)
const editingId = ref('')
const form = ref({ username: '', password: '', name: '', subject: '', phone: '', enabled: true })

const pwdUser = ref(null)
const newPwd = ref('')

const showBatchImport = ref(false)
const batchText = ref('')
const batchResult = ref([])

const showCsvModal = ref(false)
const csvContent = ref('')
const exportSaving = ref(false)

function getToken() { return uni.getStorageSync('sa_token') }

function apiCall(method, path, data, extraOpts = {}) {
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
      header: {
        'content-type': 'application/json',
        'X-WX-SERVICE': 'gardener',
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
        else reject(new Error((r.data && (r.data.message || r.data.error)) || ('请求失败(' + status + ')')))
      },
      fail: (e) => reject(new Error((e && (e.errMsg || e.message)) || '网络异常')),
    }
    if (extraOpts.responseType) opts.responseType = extraOpts.responseType
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') opts.data = data
    cloud.callContainer(opts)
  })
}

async function loadTeachers() {
  loading.value = true
  try {
    const r = await apiCall('GET', '/school-admin/teachers?skip=0&take=' + TEACHER_PAGE_SIZE) || { items: [], total: 0 }
    teachers.value = r.items || r
    teacherTotal.value = r.total || teachers.value.length
    teacherPage.value = 1
  } catch (e) { teachers.value = [] } finally { loading.value = false }
}

async function loadMore() {
  const skip = teacherPage.value * TEACHER_PAGE_SIZE
  try {
    const r = await apiCall('GET', '/school-admin/teachers?skip=' + skip + '&take=' + TEACHER_PAGE_SIZE) || { items: [], total: 0 }
    const more = r.items || r
    if (more.length) { teachers.value = [...teachers.value, ...more]; teacherPage.value++ }
  } catch (e) { console.error('[mini catch]', e) }
}

function openCreate() {
  editingId.value = ''
  form.value = { username: '', password: '', name: '', subject: '', phone: '', enabled: true }
  showForm.value = true
}

function openEdit(u) {
  editingId.value = u.id
  form.value = { username: u.username || '', password: '', name: u.name || '', subject: u.subject || '', phone: u.phone || '', enabled: u.enabled !== false }
  showForm.value = true
}

async function saveForm() {
  const f = form.value
  if (!f.username || !f.name) return uni.showToast({ title: '用户名/姓名必填', icon: 'none' })
  if (!editingId.value && !f.password) return uni.showToast({ title: '新增时密码必填', icon: 'none' })
  if (f.phone && !isPhone(f.phone)) return uni.showToast({ title: '手机号格式错误', icon: 'none' })
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
      await apiCall('POST', '/school-admin/teachers', { username: f.username, name: f.name, subject: f.subject, password: f.password, phone: f.phone, enabled: f.enabled })
      showForm.value = false
      await loadTeachers()
      uni.showToast({ title: '已创建', icon: 'success' })
    }
  } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none', duration: 3000 }) }
  saving.value = false
}

async function delTeacher(u) {
  uni.showModal({
    title: '删除教师', content: '确定删除「' + u.name + '」？', confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/teachers/' + u.id)
        teachers.value = teachers.value.filter(x => x.id !== u.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) }
    },
  })
}

function resetPwd(u) { pwdUser.value = u; newPwd.value = '1314521' }

async function doResetPwd() {
  if (!newPwd.value) return uni.showToast({ title: '请输入新密码', icon: 'none' })
  if (newPwd.value.length < 6 || newPwd.value.length > 20) return uni.showToast({ title: '密码须为6-20位', icon: 'none' })
  saving.value = true
  try {
    const r = await apiCall('POST', '/school-admin/teachers/' + pwdUser.value.id + '/reset-password', { password: newPwd.value })
    pwdUser.value = null
    const actualPwd = (r && r.defaultPassword) || newPwd.value
    uni.showModal({ title: '密码已重置', content: '新密码：' + actualPwd + '\n请将此密码告知教师', showCancel: false, confirmText: '知道了' })
  } catch (e) { uni.showToast({ title: e.message || '重置失败', icon: 'none' }) }
  saving.value = false
}

async function doBatchImport() {
  const lines = batchText.value.trim().split('\n').filter(Boolean)
  const items = lines.map(line => {
    const parts = line.split(',').map(s => s.trim())
    return { name: parts[0] || '', username: parts[1] || '', password: parts[2] || '' }
  }).filter(t => t.name && t.username && t.password)
  if (!items.length) return uni.showToast({ title: '格式错误，请按「姓名,用户名,密码」每行一条', icon: 'none' })
  saving.value = true
  batchResult.value = []
  try {
    const r = await apiCall('POST', '/school-admin/teachers/batch', { teachers: items })
    batchResult.value = r.results || []
    uni.showToast({ title: '成功 ' + (r.success || 0) + ' / ' + (r.total || 0), icon: r.failed > 0 ? 'none' : 'success' })
    await loadTeachers()
  } catch (e) { uni.showToast({ title: e.message || '导入失败', icon: 'none' }) }
  saving.value = false
}

/* ============ 导出 ============ */

async function exportCsv(type) {
  exportSaving.value = true
  try {
    const r = await apiCall('GET', '/school-admin/export/' + type, undefined, { responseType: 'base64' })
    const text = decodeURIComponent(escape(atob(r)))
    csvContent.value = text
    showCsvModal.value = true
  } catch (e) {
    uni.showToast({ title: e.message || '导出失败', icon: 'none' })
  }
  exportSaving.value = false
}

async function exportXls(type) {
  exportSaving.value = true
  try {
    const r = await apiCall('GET', '/school-admin/export/' + type + '-xls', undefined, { responseType: 'base64' })
    const buf = base64ToArrayBuffer(r)
    const fs = uni.getFileSystemManager()
    const filePath = uni.env.USER_DATA_PATH + '/export_' + type + '.xlsx'
    fs.writeFile({
      filePath: filePath,
      data: buf,
      encoding: 'binary',
      success: () => {
        uni.openDocument({
          filePath: filePath,
          showMenu: true,
          success: () => {},
          fail: () => uni.showToast({ title: '打开文件失败', icon: 'none' }),
        })
      },
      fail: () => uni.showToast({ title: '保存文件失败', icon: 'none' }),
    })
  } catch (e) {
    uni.showToast({ title: e.message || '导出失败', icon: 'none' })
  }
  exportSaving.value = false
}

function base64ToArrayBuffer(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function copyCsv() {
  try {
    await uni.setClipboardData({ data: csvContent.value })
    uni.showToast({ title: '已复制', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}

onShow(loadTeachers)
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 34rpx; font-weight: 800; color: var(--c-title); margin-bottom: 18rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.bar-acts { display: flex; gap: 12rpx; align-items: center; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.act.del { color: #e64340; }
.load-more { text-align: center; padding: 20rpx 0; font-size: 24rpx; color: var(--c-accent); }
.list { background: var(--c-card); border-radius: 16rpx; padding: 6rpx 20rpx; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; padding: 16rpx 0; border-bottom: 1px solid var(--c-border); }
.info { flex: 1; min-width: 0; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.badge { font-size: 20rpx; font-weight: 600; padding: 2rpx 14rpx; border-radius: 16rpx; }
.badge.on { background: rgba(76,175,80,.15); color: #4CAF50; }
.badge.off { background: rgba(230,67,64,.15); color: #e64340; }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.acts { display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; flex-shrink: 0; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 85vh; overflow-y: auto; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; text-align: center; }
.sh-sub { font-size: 22rpx; color: var(--c-sub); margin: 8rpx 0 16rpx; text-align: center; }
.field { margin-bottom: 16rpx; }
.label { display: block; font-size: 24rpx; color: var(--c-sub); margin-bottom: 8rpx; }
.req { color: #e64340; }
.opt { color: var(--c-sub); font-weight: 400; }
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 14rpx 16rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
.area { height: 200rpx; }
.switch-item { display: flex; align-items: center; justify-content: space-between; }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.save { background: var(--c-primary); color: #fff; }
.btn.save[disabled] { opacity: 0.6; }
.hint-text { font-size: 22rpx; color: var(--c-sub); margin-bottom: 12rpx; line-height: 1.6; }
.batch-result { margin-top: 16rpx; }
.batch-summary { font-size: 24rpx; font-weight: 600; color: var(--c-title); margin-bottom: 8rpx; }
.batch-item { font-size: 22rpx; padding: 6rpx 0; }
.batch-item.ok { color: #07c160; }
.batch-item.fail { color: #e64340; }
.batch-err { display: block; font-size: 20rpx; color: var(--c-sub); margin-left: 16rpx; }
.csv-box { max-height: 60vh; margin: 16rpx 0; padding: 16rpx; border: 1px solid var(--c-border); border-radius: 12rpx; background: var(--c-bg); }
.csv-text { font-size: 20rpx; color: var(--c-text); white-space: pre; word-break: break-all; }
</style>