<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">👨‍🎓 学生管理（超管）</view>

    <view class="bar">
      <text class="sc">共 {{ students.length }} 名学生</text>
      <text class="act" @click="exportCsv">📄 导出CSV</text>
    </view>

    <view class="filter-bar">
      <picker :range="schoolOptions" range-key="label" :value="schoolIdx" @change="onSchoolChange">
        <view class="picker-val">{{ schoolLabel }}</view>
      </picker>
    </view>

    <Skeleton v-if="loading" :rows="3" />

    <EmptyState v-else-if="!students.length" icon="👨‍🎓" text="暂无学生" hint="超管视图将展示所有学校学生" />

    <view v-else class="list">
      <view class="row" v-for="s in students" :key="s.id">
        <view class="info">
          <view class="nm-line">
            <text class="nm">{{ s.name || s.studentName }}</text>
            <text v-if="s.studentNo" class="sno">· {{ s.studentNo }}</text>
          </view>
          <view class="meta">学校：{{ s.schoolName || '-' }} · 班级：{{ s.className || '-' }}</view>
          <view class="meta" v-if="s.gender">性别：{{ s.gender }}</view>
          <view class="meta" v-if="s.phone">手机：{{ s.phone }}</view>
          <view class="meta" v-if="s.parentName">家长：{{ s.parentName }} {{ s.parentPhone ? '· ' + s.parentPhone : '' }}</view>
        </view>
      </view>
      <view v-if="students.length < studentTotal" class="load-more" @click="loadMore">加载更多（共 {{ studentTotal }} 位）</view>
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
  </view>
</template>

<script setup>
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const students = ref([])
const loading = ref(false)
const studentPage = ref(0)
const studentTotal = ref(0)
const STUDENT_PAGE_SIZE = 50

const schools = ref([])
const schoolIdx = ref(0)
const showCsvModal = ref(false)
const csvContent = ref('')

const schoolOptions = computed(() => [
  { id: '', name: '全部学校' },
  ...schools.value.map(s => ({ id: s.id, name: s.name + '（' + s.code + '）' })),
])
const schoolLabel = computed(() => {
  const opt = schoolOptions.value[schoolIdx.value]
  return opt ? opt.name : '全部学校'
})
const currentSchoolId = computed(() => {
  const opt = schoolOptions.value[schoolIdx.value]
  return opt ? opt.id : ''
})

function getToken() { return uni.getStorageSync('admin_token') }

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
          uni.removeStorageSync('admin_token')
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

async function loadSchools() {
  try {
    const r = await apiCall('GET', '/admin/schools?take=500') || { items: [] }
    schools.value = r.items || r || []
    if (schools.value.length === 0) schools.value = [{ id: '', name: '全部学校' }]
  } catch (e) {
    schools.value = [{ id: '', name: '全部学校' }]
  }
}

async function loadStudents() {
  loading.value = true
  try {
    const skip = studentPage.value * STUDENT_PAGE_SIZE
    const sid = currentSchoolId.value || undefined
    const qs = 'skip=' + skip + '&take=' + STUDENT_PAGE_SIZE + (sid ? '&schoolId=' + sid : '')
    const r = await apiCall('GET', '/admin/students?' + qs) || { items: [], total: 0 }
    const items = r.items || r || []
    if (studentPage.value === 0) students.value = items
    else students.value = [...students.value, ...items]
    studentTotal.value = r.total || students.value.length
  } catch (e) {
    if (studentPage.value === 0) students.value = []
  } finally { loading.value = false }
}

function onSchoolChange(e) {
  schoolIdx.value = e.detail.value
  studentPage.value = 0
  loadStudents()
}

async function loadMore() {
  studentPage.value++
  await loadStudents()
}

function exportCsv() {
  const headers = ['学校', '班级', '姓名', '学号', '性别', '手机号', '家长姓名', '家长电话']
  const rows = students.value.map(s => [
    s.schoolName || '-',
    s.className || '-',
    s.name || s.studentName || '',
    s.studentNo || '',
    s.gender || '',
    s.phone || '',
    s.parentName || '',
    s.parentPhone || '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  csvContent.value = csv
  showCsvModal.value = true
}

async function copyCsv() {
  try {
    await uni.setClipboardData({ data: csvContent.value })
    uni.showToast({ title: '已复制', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
}

onShow(() => {
  studentPage.value = 0
  loadSchools().then(() => loadStudents())
})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 34rpx; font-weight: 800; color: var(--c-title); margin-bottom: 18rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.filter-bar { margin-bottom: 16rpx; }
.picker-val { border: 1px solid var(--c-input-border); border-radius: 12rpx; padding: 16rpx 20rpx; font-size: 28rpx; background: var(--c-input); color: var(--c-text); }
.list { background: var(--c-card); border-radius: 16rpx; padding: 6rpx 20rpx; }
.row { padding: 16rpx 0; border-bottom: 1px solid var(--c-border); }
.info { flex: 1; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.sno { font-size: 22rpx; color: var(--c-sub); }
.meta { font-size: 22rpx; color: var(--c-sub); margin-top: 4rpx; }
.load-more { text-align: center; padding: 20rpx 0; font-size: 24rpx; color: var(--c-accent); }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: flex-end; z-index: 100; }
.sheet { width: 100%; background: var(--c-card); border-radius: 24rpx 24rpx 0 0; padding: 30rpx; max-height: 85vh; overflow-y: auto; box-sizing: border-box; }
.sh-t { font-size: 30rpx; font-weight: 700; color: var(--c-title); margin-bottom: 14rpx; text-align: center; }
.csv-box { max-height: 60vh; margin: 16rpx 0; padding: 16rpx; border: 1px solid var(--c-border); border-radius: 12rpx; background: var(--c-bg); }
.csv-text { font-size: 20rpx; color: var(--c-text); white-space: pre; word-break: break-all; }
.btn-row { display: flex; gap: 20rpx; margin-top: 10rpx; }
.btn { flex: 1; border-radius: 50rpx; height: 84rpx; line-height: 84rpx; font-size: 28rpx; }
.btn.cancel { background: var(--c-card2); color: var(--c-sub); }
.btn.save { background: var(--c-primary); color: #fff; }
</style>
