<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="hd">👩‍🏫 教师管理（超管）</view>

    <view class="bar">
      <text class="sc">共 {{ teachers.length }} 位教师</text>
      <text class="act" @click="exportCsv">📄 导出CSV</text>
    </view>

    <Skeleton v-if="loading" :rows="3" />

    <EmptyState v-else-if="!teachers.length" icon="👩‍🏫" text="暂无教师" hint="超管视图将展示所有学校教师" />

    <view v-else class="list">
      <view class="row" v-for="u in teachers" :key="u.id">
        <view class="info">
          <view class="nm-line">
            <text class="nm">{{ u.name }}</text>
            <text class="badge" :class="u.enabled ? 'on' : 'off'">{{ u.enabled ? '启用' : '禁用' }}</text>
          </view>
          <view class="meta">学校：{{ u.schoolName || '-' }} · 编号：{{ u.schoolCode || '-' }}</view>
          <view class="meta">用户名：{{ u.username || '微信登录' }}</view>
          <view class="meta" v-if="u.subject">学科：{{ u.subject }}</view>
          <view class="meta" v-if="u.phone">电话：{{ u.phone }}</view>
        </view>
      </view>
      <view v-if="teachers.length < teacherTotal" class="load-more" @click="loadMore">加载更多（共 {{ teacherTotal }} 位）</view>
    </view>

    <!-- CSV 预览 -->
    <view v-if="showCsvModal" class="mask" @click="showCsvModal = false">
      <view class="sheet safe-bottom" @click.stop>
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
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { theme } from '../../common/store'
import Skeleton from '../../components/Skeleton/Skeleton.vue'
import EmptyState from '../../components/EmptyState/EmptyState.vue'

const teachers = ref([])
const loading = ref(false)
const teacherPage = ref(0)
const teacherTotal = ref(0)
const TEACHER_PAGE_SIZE = 50

const showCsvModal = ref(false)
const csvContent = ref('')

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

async function loadTeachers() {
  loading.value = true
  try {
    const skip = teacherPage.value * TEACHER_PAGE_SIZE
    const r = await apiCall('GET', '/admin/teachers?skip=' + skip + '&take=' + TEACHER_PAGE_SIZE) || { items: [], total: 0 }
    const items = r.items || r || []
    if (teacherPage.value === 0) teachers.value = items
    else teachers.value = [...teachers.value, ...items]
    teacherTotal.value = r.total || teachers.value.length
  } catch (e) {
    if (teacherPage.value === 0) teachers.value = []
  } finally { loading.value = false }
}

async function loadMore() {
  teacherPage.value++
  await loadTeachers()
}

function exportCsv() {
  const headers = ['学校', '学校编号', '姓名', '用户名', '学科', '手机号', '启用']
  const rows = teachers.value.map(t => [
    t.schoolName || '-',
    t.schoolCode || '-',
    t.name || '',
    t.username || '',
    t.subject || '',
    t.phone || '',
    t.enabled ? '是' : '否',
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
  teacherPage.value = 0
  loadTeachers()
})
</script>

<style scoped>
.page { padding: 24rpx; background: var(--c-bg); min-height: 100vh; box-sizing: border-box; }
.hd { font-size: 34rpx; font-weight: 800; color: var(--c-title); margin-bottom: 18rpx; }
.bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14rpx; }
.sc { font-size: 26rpx; color: var(--c-sub); }
.act { font-size: 24rpx; color: #409eff; }
.list { background: var(--c-card); border-radius: 16rpx; padding: 6rpx 20rpx; }
.row { padding: 16rpx 0; border-bottom: 1px solid var(--c-border); }
.info { flex: 1; }
.nm-line { display: flex; align-items: center; gap: 12rpx; margin-bottom: 6rpx; }
.nm { font-size: 28rpx; font-weight: 700; color: var(--c-title); }
.badge { font-size: 20rpx; font-weight: 600; padding: 2rpx 14rpx; border-radius: 16rpx; }
.badge.on { background: rgba(76,175,80,.15); color: #4CAF50; }
.badge.off { background: rgba(230,67,64,.15); color: #e64340; }
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
