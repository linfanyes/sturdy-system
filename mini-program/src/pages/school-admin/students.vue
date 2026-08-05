<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">
      <text style="font-size:28rpx;color:#b8894a;min-width:96rpx;" @click="uni.navigateBack()">← 返回</text>
      <text style="font-size:32rpx;font-weight:600;color:#4a3b2a;">🧑‍🎓 学生管理</text>
      <text style="min-width:96rpx;"></text>
    </view>

    <view class="bar">
      <text class="sc">共 {{ schoolStudents.length }} 名学生</text>
      <input v-model="studentFilter" class="filter-inp" placeholder="搜索姓名…" />
      <view class="bar-acts">
        <text class="act" @click="exportCsv('students')">📄 导出CSV</text>
        <text class="act" @click="exportXls('students')">📊 导出XLS</text>
      </view>
    </view>

    <Skeleton v-if="loading" :rows="3" />

    <EmptyState v-else-if="!schoolStudents.length" icon="🧑‍🎓" text="暂无学生" hint="需先创建班级和教师" />

    <view v-else class="list">
      <view class="row" v-for="s in filteredStudents" :key="s.id">
        <view class="info" @click="openEditStudent(s)">
          <view class="nm-line">
            <text class="nm">{{ s.name }}</text>
            <text class="badge on">{{ s.gender || '未知' }}</text>
          </view>
          <view class="meta">学号：{{ s.studentNo }} · 班级：{{ s.className || (s.classId || '').slice(0, 8) }}</view>
        </view>
        <view class="acts">
          <text v-if="s.parentLoginEnabled" class="badge on">家长已开通</text>
          <text v-if="s.parentLoginEnabled" class="act reset" @click.stop="resetParentPwd(s)">重置密码</text>
          <text class="act" @click.stop="toggleParentLogin(s)">{{ s.parentLoginEnabled ? '取消家长' : '开通家长' }}</text>
          <text class="act del" @click.stop="delStudent(s)">删除</text>
        </view>
      </view>
    </view>

    <!-- 编辑学生弹窗 -->
    <view v-if="editingStudent" class="mask" @click="editingStudent = null">
      <view class="sheet" @click.stop>
        <view class="sh-t">编辑学生</view>
        <view class="field">
          <text class="label">姓名</text>
          <input v-model="editStudentForm.name" class="inp" placeholder="学生姓名" />
        </view>
        <view class="field">
          <text class="label">性别</text>
          <picker :range="['男','女']" @change="(e) => editStudentForm.gender = ['男','女'][e.detail.value]">
            <view class="picker">{{ editStudentForm.gender || '请选择' }}</view>
          </picker>
        </view>
        <view class="field">
          <text class="label">家长姓名</text>
          <input v-model="editStudentForm.parentName" class="inp" placeholder="选填" />
        </view>
        <view class="field">
          <text class="label">家长电话</text>
          <input v-model="editStudentForm.parentPhone" class="inp" placeholder="选填" />
        </view>
        <view class="btn-row">
          <button class="btn cancel" @click="editingStudent = null">取消</button>
          <button class="btn save" :disabled="saving" @click="saveStudent">{{ saving ? '保存中…' : '保存修改' }}</button>
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
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const schoolStudents = ref([])
const studentFilter = ref('')
const loading = ref(false)
const saving = ref(false)
const editingStudent = ref(null)
const editStudentForm = ref({ name: '', gender: '', parentName: '', parentPhone: '' })

const showCsvModal = ref(false)
const csvContent = ref('')
const exportSaving = ref(false)

const filteredStudents = computed(() => {
  if (!studentFilter.value) return schoolStudents.value
  const q = studentFilter.value.trim().toLowerCase()
  return schoolStudents.value.filter(s => (s.name || '').toLowerCase().includes(q))
})

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
    if (extraOpts.responseType) opts.responseType = extraOpts.responseType
    if (data !== undefined && method !== 'GET' && method !== 'DELETE') opts.data = data
    cloud.callContainer(opts)
  })
}

async function loadStudents() {
  loading.value = true
  try {
    const r = await apiCall('GET', '/school-admin/students') || { items: [], total: 0 }
    schoolStudents.value = Array.isArray(r) ? r : (r.items || [])
  } catch (e) { schoolStudents.value = [] } finally { loading.value = false }
}

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

async function delStudent(s) {
  uni.showModal({
    title: '删除学生', content: '确定删除「' + s.name + '」？', confirmColor: '#e64340',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('DELETE', '/school-admin/students/' + s.id)
        schoolStudents.value = schoolStudents.value.filter(x => x.id !== s.id)
        uni.showToast({ title: '已删除', icon: 'success' })
      } catch (e) { uni.showToast({ title: e.message || '删除失败', icon: 'none' }) }
    },
  })
}

async function toggleParentLogin(s) {
  uni.showModal({
    title: s.parentLoginEnabled ? '取消家长登录' : '开通家长登录',
    content: s.parentLoginEnabled ? '确定取消「' + s.name + '」的家长登录权限？' : '确定开通「' + s.name + '」的家长登录？默认口令为学号后6位。',
    success: async (m) => {
      if (!m.confirm) return
      try {
        await apiCall('POST', '/students/' + s.id + '/toggle-parent-login')
        await loadStudents()
        uni.showToast({ title: s.parentLoginEnabled ? '已取消' : '已开通', icon: 'success' })
      } catch (e) { uni.showToast({ title: e.message || '操作失败', icon: 'none' }) }
    },
  })
}

async function resetParentPwd(s) {
  uni.showModal({
    title: '重置家长密码',
    content: '确定将「' + s.name + '」的家长登录口令重置为学号后6位？',
    success: async (m) => {
      if (!m.confirm) return
      try {
        const res = await apiCall('POST', '/students/' + s.id + '/reset-parent-password')
        uni.showModal({
          title: '重置成功',
          content: '默认口令已重置为学号后6位：' + (res.defaultPassword || ((s.studentNo || '').slice(-6))),
          showCancel: false,
        })
        await loadStudents()
      } catch (e) { uni.showToast({ title: e.message || '重置失败', icon: 'none' }) }
    },
  })
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

onShow(loadStudents)
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 34rpx; font-weight: 800; color: var(--c-title); margin-bottom: 18rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; gap: 12rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.filter-inp { flex: 1; border: 1px solid var(--c-input-border); border-radius: 30rpx; padding: 12rpx 20rpx; font-size: 24rpx; background: var(--c-input); color: var(--c-text); }
.act { font-size: 24rpx; color: #409eff; }
.act.reset { color: #e6a23c; }
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
.inp { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 14rpx 16rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); width: 100%; box-sizing: border-box; }
.picker { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; color: var(--c-title); background: var(--c-input); min-height: 80rpx; line-height: 44rpx; box-sizing: border-box; }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.save { background: var(--c-primary); color: #fff; }
.btn.save[disabled] { opacity: 0.6; }
.csv-box { max-height: 60vh; margin: 16rpx 0; padding: 16rpx; border: 1px solid var(--c-border); border-radius: 12rpx; background: var(--c-bg); }
.csv-text { font-size: 20rpx; color: var(--c-text); white-space: pre; word-break: break-all; }
</style>