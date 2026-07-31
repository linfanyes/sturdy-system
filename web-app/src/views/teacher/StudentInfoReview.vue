<script setup lang="ts">
/**
 * 教师端：审核家长提交的学生信息修改申请。
 * 列表来自 GET /student-info-updates（按班级/状态过滤），审核走 POST /student-info-updates/:id/review。
 */
import { ref, onMounted, computed } from 'vue'
import request from '@/api/request'
import { loadClasses, useClasses } from '@/composables/useClasses'
import Modal from '@/components/Modal.vue'
import { Check, X, Clock, UserCog, FileEdit, Inbox } from 'lucide-vue-next'

interface InfoUpdate {
  id: string
  studentId: string
  classId: string
  studentName: string
  parentId: string
  parentName: string
  payload: Record<string, any>
  status: 'pending' | 'approved' | 'rejected'
  reviewNote: string | null
  reviewedBy: string
  reviewedAt: string | null
  createdAt: string
}

/** payload 字段键 → 中文名 */
const FIELD_LABEL: Record<string, string> = {
  parentPhone: '家长电话',
  studentPhone: '学生电话',
  address: '地址',
  birthDate: '出生日期',
  parentName: '家长姓名',
  note: '备注',
}

const STATUS_META: Record<InfoUpdate['status'], { label: string; cls: string }> = {
  pending: { label: '待审核', cls: 'bg-butter-100 text-butter-600' },
  approved: { label: '已通过', cls: 'bg-mint-100 text-mint-600' },
  rejected: { label: '已拒绝', cls: 'bg-rose-100 text-rose-500' },
}

const { classes } = useClasses()
const loading = ref(false)
const list = ref<InfoUpdate[]>([])
const classFilter = ref('')
const statusFilter = ref<'' | InfoUpdate['status']>('')

const filtered = computed(() => list.value)

function fieldLabel(key: string) {
  return FIELD_LABEL[key] || key
}

function className(id: string) {
  return classes.value.find(c => c.id === id)?.name || id
}

function formatTime(t: string | null) {
  if (!t) return '-'
  const d = new Date(t)
  if (isNaN(d.getTime())) return t
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadList() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (classFilter.value) params.classId = classFilter.value
    if (statusFilter.value) params.status = statusFilter.value
    const res = await request.get('/student-info-updates', { params })
    list.value = Array.isArray(res) ? res : (res?.items || [])
  } catch (e: any) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadClasses()
  await loadList()
})

/* ============ 审核 ============ */
const reviewing = ref(false)
const showReject = ref(false)
const rejectTarget = ref<InfoUpdate | null>(null)
const rejectNote = ref('')

async function handleApprove(item: InfoUpdate) {
  if (!confirm(`确定通过「${item.studentName}」的信息修改申请？通过后将直接更新学生信息。`)) return
  reviewing.value = true
  try {
    await request.post(`/student-info-updates/${item.id}/review`, { action: 'approve' })
    await loadList()
  } catch (e: any) {
    alert(e?.message || '操作失败')
  } finally {
    reviewing.value = false
  }
}

function openReject(item: InfoUpdate) {
  rejectTarget.value = item
  rejectNote.value = ''
  showReject.value = true
}

async function submitReject() {
  if (!rejectTarget.value) return
  reviewing.value = true
  try {
    await request.post(`/student-info-updates/${rejectTarget.value.id}/review`, {
      action: 'reject',
      note: rejectNote.value.trim() || undefined,
    })
    showReject.value = false
    await loadList()
  } catch (e: any) {
    alert(e?.message || '操作失败')
  } finally {
    reviewing.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 顶栏 + 筛选 -->
    <div class="flex items-center justify-between gap-4 flex-wrap">
      <h1 class="text-2xl font-bold text-cocoa-900">信息修改审核</h1>
      <div class="flex items-center gap-2 flex-wrap">
        <select
          v-model="classFilter"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
          @change="loadList"
        >
          <option value="">全部班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select
          v-model="statusFilter"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400"
          @change="loadList"
        >
          <option value="">全部状态</option>
          <option value="pending">待审核</option>
          <option value="approved">已通过</option>
          <option value="rejected">已拒绝</option>
        </select>
        <button
          class="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cream-200 text-cocoa-500 text-sm font-medium hover:bg-cream-50 transition-colors"
          @click="loadList"
        >
          刷新
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div v-if="loading" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      加载中…
    </div>

    <div v-else-if="filtered.length === 0" class="bg-white rounded-2xl p-10 shadow-softer text-center text-cocoa-400">
      <Inbox class="w-10 h-10 mx-auto mb-2 text-cocoa-300" />
      暂无申请记录
    </div>

    <div v-else class="grid gap-3">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="bg-white rounded-2xl p-5 shadow-softer"
      >
        <!-- 卡片头部 -->
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <div class="w-9 h-9 rounded-full bg-butter-100 text-butter-600 flex items-center justify-center">
              <UserCog class="w-5 h-5" />
            </div>
            <div>
              <div class="font-semibold text-cocoa-900">{{ item.studentName || '未知学生' }}</div>
              <div class="text-xs text-cocoa-400">{{ className(item.classId) }}</div>
            </div>
          </div>
          <span :class="['text-xs px-2.5 py-1 rounded-full font-medium', STATUS_META[item.status].cls]">
            {{ STATUS_META[item.status].label }}
          </span>
        </div>

        <!-- 提交信息 -->
        <div class="mt-3 flex items-center gap-4 text-sm text-cocoa-500 flex-wrap">
          <span class="flex items-center gap-1">
            <FileEdit class="w-4 h-4" /> 提交人：{{ item.parentName || '家长' }}
          </span>
          <span class="flex items-center gap-1">
            <Clock class="w-4 h-4" /> {{ formatTime(item.createdAt) }}
          </span>
        </div>

        <!-- 修改字段 -->
        <div class="mt-3 bg-cream-50 rounded-xl p-3 space-y-1.5">
          <div class="text-xs text-cocoa-400 mb-1">申请修改的字段</div>
          <div v-for="(val, key) in item.payload" :key="key" class="flex text-sm">
            <span class="text-cocoa-500 w-24 shrink-0">{{ fieldLabel(String(key)) }}</span>
            <span class="text-cocoa-900 break-all">{{ val ?? '-' }}</span>
          </div>
        </div>

        <!-- 审核备注 -->
        <div v-if="item.reviewNote" class="mt-2 text-sm text-cocoa-500">
          <span class="text-cocoa-400">审核备注：</span>{{ item.reviewNote }}
          <span v-if="item.reviewedAt" class="text-cocoa-400 ml-2">· {{ formatTime(item.reviewedAt) }}</span>
        </div>

        <!-- 操作按钮 -->
        <div v-if="item.status === 'pending'" class="mt-4 flex items-center justify-end gap-2">
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-cream-200 text-cocoa-500 text-sm font-medium hover:bg-cream-50 transition-colors disabled:opacity-60"
            :disabled="reviewing"
            @click="openReject(item)"
          >
            <X class="w-4 h-4" /> 拒绝
          </button>
          <button
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-mint-500 text-white text-sm font-medium hover:bg-mint-600 transition-colors disabled:opacity-60"
            :disabled="reviewing"
            @click="handleApprove(item)"
          >
            <Check class="w-4 h-4" /> 通过
          </button>
        </div>
      </div>
    </div>

    <!-- 拒绝理由弹窗 -->
    <Modal v-model="showReject" title="拒绝申请">
      <div class="space-y-2">
        <p class="text-sm text-cocoa-500">
          正在拒绝「{{ rejectTarget?.studentName }}」的信息修改申请，请填写拒绝理由（选填）：
        </p>
        <textarea
          v-model="rejectNote"
          rows="3"
          class="w-full px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 resize-none"
          placeholder="如：电话格式有误，请重新提交"
        />
      </div>
      <template #footer>
        <button class="px-4 py-2 rounded-xl text-cocoa-500 hover:bg-cream-100" @click="showReject = false">取消</button>
        <button
          class="px-4 py-2 rounded-xl bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-60"
          :disabled="reviewing"
          @click="submitReject"
        >
          {{ reviewing ? '提交中…' : '确认拒绝' }}
        </button>
      </template>
    </Modal>
  </div>
</template>
