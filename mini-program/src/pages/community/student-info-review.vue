<template>
  <view class="page" :class="{ dark: theme.mode === 'dark' }">
    <view class="header">
      <text class="title">📝 信息修改审核</text>
      <view class="filters">
        <picker :range="classList" range-key="name" :value="classIdx" @change="onClassChange">
          <view class="picker">{{ currentClass?.name || '全部班级' }}</view>
        </picker>
        <picker :range="STATUS_OPTIONS" :value="statusIdx" @change="onStatusChange">
          <view class="picker">{{ STATUS_OPTIONS[statusIdx] }}</view>
        </picker>
        <text class="refresh-btn" @click="loadList">刷新</text>
      </view>
    </view>

    <!-- 加载中 -->
    <view v-if="loading" class="loading">加载中…</view>

    <!-- 空状态 -->
    <view v-else-if="!filteredList.length" class="empty">
      <text class="empty-icon">📭</text>
      <text>暂无申请记录</text>
    </view>

    <!-- 列表 -->
    <view v-else class="list">
      <view v-for="item in filteredList" :key="item.id" class="card">
        <!-- 头部 -->
        <view class="card-head">
          <view class="student-info">
            <text class="student-name">{{ item.studentName || '未知学生' }}</text>
            <text class="class-name">{{ className(item.classId) }}</text>
          </view>
          <view class="status-badge" :class="'status-' + item.status">
            {{ STATUS_MAP[item.status]?.label || item.status }}
          </view>
        </view>

        <!-- 提交信息 -->
        <view class="meta">
          <text>提交人：{{ item.parentName || '家长' }}</text>
          <text class="meta-sep">·</text>
          <text>{{ formatTime(item.createdAt) }}</text>
        </view>

        <!-- 修改字段 -->
        <view class="payload">
          <text class="payload-title">申请修改的字段</text>
          <view v-for="(val, key) in item.payload" :key="key" class="payload-row">
            <text class="payload-key">{{ fieldLabel(key) }}</text>
            <text class="payload-val">{{ val ?? '-' }}</text>
          </view>
        </view>

        <!-- 审核备注 -->
        <view v-if="item.reviewNote" class="review-note">
          <text class="review-label">审核备注：</text>
          <text>{{ item.reviewNote }}</text>
          <text v-if="item.reviewedAt" class="review-time">· {{ formatTime(item.reviewedAt) }}</text>
        </view>

        <!-- 操作按钮 -->
        <view v-if="item.status === 'pending'" class="actions">
          <button class="btn reject" :disabled="reviewing" @click="openReject(item)">拒绝</button>
          <button class="btn approve" :disabled="reviewing" @click="handleApprove(item)">通过</button>
        </view>
      </view>
    </view>

    <!-- 拒绝理由弹窗 -->
    <view v-if="showReject" class="mask" @click="showReject = false">
      <view class="modal" @click.stop>
        <view class="modal-title">拒绝申请</view>
        <view class="modal-body">
          <text class="modal-desc">正在拒绝「{{ rejectTarget?.studentName }}」的信息修改申请，请填写拒绝理由（选填）：</text>
          <textarea v-model="rejectNote" class="textarea" rows="3" placeholder="如：电话格式有误，请重新提交" />
        </view>
        <view class="modal-foot">
          <text class="modal-btn cancel" @click="showReject = false">取消</text>
          <text class="modal-btn confirm" :class="{ disabled: reviewing }" @click="submitReject">{{ reviewing ? '提交中…' : '确认拒绝' }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onShow, onLoad } from '@dcloudio/uni-app'
import { formatDateTime } from '@gardener/shared/utils'
import { auth, theme } from '../../common/store'
import { listStudentInfoUpdates, reviewStudentInfoUpdate } from '@/api/student-info-review'
import { listClasses } from '@/api/teaching'

const dark = computed(() => theme.mode === 'dark')
const loading = ref(false)
const reviewing = ref(false)
const list = ref([])
const classList = ref([])
const classIdx = ref(0)
const statusIdx = ref(0)
const showReject = ref(false)
const rejectTarget = ref(null)
const rejectNote = ref('')

const STATUS_OPTIONS = ['全部状态', '待审核', '已通过', '已拒绝']
const STATUS_MAP = {
  pending: { label: '待审核', cls: 'status-pending' },
  approved: { label: '已通过', cls: 'status-approved' },
  rejected: { label: '已拒绝', cls: 'status-rejected' },
}

const FIELD_LABEL = {
  parentPhone: '家长电话',
  studentPhone: '学生电话',
  address: '地址',
  birthDate: '出生日期',
  parentName: '家长姓名',
  note: '备注',
}

const currentClass = computed(() => classList.value[classIdx.value] || null)

const filteredList = computed(() => {
  return list.value.filter(item => {
    if (statusIdx.value === 1 && item.status !== 'pending') return false
    if (statusIdx.value === 2 && item.status !== 'approved') return false
    if (statusIdx.value === 3 && item.status !== 'rejected') return false
    if (classIdx.value > 0 && item.classId !== currentClass.value?.id) return false
    return true
  })
})

function fieldLabel(key) {
  return FIELD_LABEL[key] || key
}
function className(id) {
  return classList.value.find(c => c.id === id)?.name || id
}
function formatTime(t) {
  return formatDateTime(t || undefined)
}

async function loadList() {
  loading.value = true
  try {
    const params = {}
    if (classIdx.value > 0 && currentClass.value) params.classId = currentClass.value.id
    if (statusIdx.value === 1) params.status = 'pending'
    else if (statusIdx.value === 2) params.status = 'approved'
    else if (statusIdx.value === 3) params.status = 'rejected'
    const res = await listStudentInfoUpdates({ params })
    list.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
    list.value = []
  } finally {
    loading.value = false
  }
}

async function loadClasses() {
  try {
    const res = await listClasses()
    classList.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e) {
    classList.value = []
  }
}

onLoad(async () => {
  await loadClasses()
  await loadList()
})

onShow(() => {
  if (!auth.token) uni.reLaunch({ url: '/pages/login/login' })
})

function onClassChange(e) {
  classIdx.value = Number(e.detail.value)
  loadList()
}
function onStatusChange(e) {
  statusIdx.value = Number(e.detail.value)
  loadList()
}

async function handleApprove(item) {
  const res = await uni.showModal({
    title: '确认审核',
    content: `确定通过「${item.studentName}」的信息修改申请？通过后将直接更新学生信息。`,
    confirmColor: '#07c160',
  })
  if (!res.confirm) return
  reviewing.value = true
  try {
    await reviewStudentInfoUpdate(item.id, { action: 'approve' })
    uni.showToast({ title: '已通过', icon: 'success' })
    await loadList()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    reviewing.value = false
  }
}

function openReject(item) {
  rejectTarget.value = item
  rejectNote.value = ''
  showReject.value = true
}

async function submitReject() {
  if (!rejectTarget.value || reviewing.value) return
  reviewing.value = true
  try {
    await reviewStudentInfoUpdate(rejectTarget.value.id, {
      action: 'reject',
      note: rejectNote.value.trim() || undefined,
    })
    showReject.value = false
    uni.showToast({ title: '已拒绝', icon: 'success' })
    await loadList()
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  } finally {
    reviewing.value = false
  }
}
</script>

<style scoped>
.page { padding: 30rpx; background: var(--c-bg); min-height: 100vh; }
.header { margin-bottom: 20rpx; }
.title { font-size: 36rpx; font-weight: 800; color: var(--c-title); display: block; margin-bottom: 16rpx; }
.filters { display: flex; gap: 12rpx; align-items: center; flex-wrap: wrap; }
.picker { border: 1px solid var(--c-border); border-radius: 12rpx; padding: 14rpx 20rpx; font-size: 26rpx; background: var(--c-card); color: var(--c-title); min-width: 160rpx; text-align: center; }
.refresh-btn { background: var(--c-primary); color: #fff; border-radius: 40rpx; padding: 12rpx 28rpx; font-size: 26rpx; }
.loading { text-align: center; padding: 40rpx; color: var(--c-sub); }
.empty { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 80rpx 0; color: var(--c-sub); gap: 16rpx; }
.empty-icon { font-size: 64rpx; }
.list { display: flex; flex-direction: column; gap: 20rpx; }
.card { background: var(--c-card); border-radius: 20rpx; padding: 24rpx; }
.card-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12rpx; }
.student-info { flex: 1; }
.student-name { font-size: 30rpx; font-weight: 700; color: var(--c-title); display: block; }
.class-name { font-size: 24rpx; color: var(--c-sub); }
.status-badge { font-size: 22rpx; padding: 4rpx 16rpx; border-radius: 20rpx; font-weight: 600; }
.status-pending { background: #fff3d6; color: #e65100; }
.status-approved { background: #e8f9e8; color: #2e7d32; }
.status-rejected { background: #fde8ea; color: #c62828; }
.meta { font-size: 24rpx; color: var(--c-sub); margin-bottom: 16rpx; display: flex; align-items: center; gap: 8rpx; }
.meta-sep { margin: 0 4rpx; }
.payload { background: var(--c-input); border-radius: 12rpx; padding: 16rpx; margin-bottom: 12rpx; }
.payload-title { font-size: 22rpx; color: var(--c-sub); display: block; margin-bottom: 10rpx; }
.payload-row { display: flex; justify-content: space-between; align-items: flex-start; padding: 6rpx 0; font-size: 26rpx; }
.payload-key { color: var(--c-sub); width: 160rpx; flex-shrink: 0; }
.payload-val { color: var(--c-title); flex: 1; text-align: right; word-break: break-all; }
.review-note { font-size: 24rpx; color: var(--c-sub); padding: 12rpx; background: var(--c-input); border-radius: 12rpx; margin-bottom: 12rpx; }
.review-label { font-weight: 600; color: var(--c-title); }
.review-time { margin-left: 8rpx; }
.actions { display: flex; justify-content: flex-end; gap: 16rpx; margin-top: 16rpx; }
.btn { padding: 16rpx 36rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; }
.btn[disabled] { opacity: 0.6; }
.btn.reject { background: var(--c-card); color: var(--c-sub); border: 1px solid var(--c-border); }
.btn.approve { background: var(--c-primary); color: #fff; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 100; }
.modal { width: 600rpx; background: var(--c-card); border-radius: 24rpx; padding: 30rpx; }
.modal-title { font-size: 32rpx; font-weight: 700; color: var(--c-title); text-align: center; margin-bottom: 16rpx; }
.modal-body { margin-bottom: 20rpx; }
.modal-desc { font-size: 26rpx; color: var(--c-sub); line-height: 1.6; display: block; margin-bottom: 12rpx; }
.textarea { width: 100%; border: 1px solid var(--c-border); border-radius: 12rpx; padding: 16rpx; font-size: 26rpx; background: var(--c-input); color: var(--c-text); box-sizing: border-box; min-height: 160rpx; }
.modal-foot { display: flex; gap: 20rpx; }
.modal-btn { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 40rpx; font-size: 28rpx; font-weight: 600; }
.modal-btn.cancel { background: var(--c-input); color: var(--c-sub); }
.modal-btn.confirm { background: #e64340; color: #fff; }
.modal-btn.confirm.disabled { opacity: 0.6; }
</style>
