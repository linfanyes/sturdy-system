<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from '@/utils/feedback'
import { formatISOTime } from '@gardener/shared/utils'
import { FileText, ChevronLeft, ChevronRight, Loader2 } from 'lucide-vue-next'
import { listAuditLogs, listSchools } from '@/api/admin'

const PAGE_SIZE = 50

const loading = ref(false)
const items = ref<any[]>([])
const total = ref(0)
const skip = ref(0)
const schools = ref<any[]>([])
const schoolId = ref<string>('')

const page = computed(() => Math.floor(skip.value / PAGE_SIZE) + 1)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

async function loadSchools() {
  try {
    const res = await listSchools(0, 500)
    schools.value = (res?.items || [])
  } catch {
    schools.value = []
  }
}

async function load() {
  loading.value = true
  try {
    const res = await listAuditLogs(skip.value, PAGE_SIZE, schoolId.value || undefined)
    items.value = (res?.items || [])
    total.value = res?.total || 0
  } catch (e: any) {
    toast.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadSchools()
  await load()
})

function onFilterChange() {
  skip.value = 0
  load()
}

function prevPage() {
  if (skip.value <= 0) return
  skip.value = Math.max(0, skip.value - PAGE_SIZE)
  load()
}

function nextPage() {
  if (skip.value + PAGE_SIZE >= total.value) return
  skip.value = skip.value + PAGE_SIZE
  load()
}

function formatTime(t?: string) {
  return formatISOTime(t || undefined)
}

const ACTION_LABELS: Record<string, string> = {
  create_teacher: '创建教师', delete_teacher: '删除教师', reset_password: '重置密码',
  create_class: '创建班级', delete_class: '删除班级', promote_class: '班级升级',
  create_school_admin: '创建校管', delete_school_admin: '删除校管',
  batch_create_classes: '批量建班', batch_create_students: '批量导入学生',
  delete_student: '删除学生', create_student: '创建学生',
  toggle_parent_login: '开关家长登录', reset_parent_password: '重置家长密码',
  batch_toggle_school: '批量启停学校', batch_toggle_admin: '批量启停校管',
  bind_parent: '绑定家长微信', login: '登录', logout: '登出',
  system_reset_all: '全量重置系统', clear_teacher_data: '清理教师业务数据',
  deactivate_all_teachers: '批量停用教师',
}
function formatAction(action?: string) {
  if (!action) return '-'
  return ACTION_LABELS[action] || action
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <FileText class="w-6 h-6 text-butter-500" /> 审计日志
    </h1>

    <!-- 筛选 -->
    <div class="bg-surface rounded-2xl shadow-softer p-4 flex items-center gap-3">
      <label class="text-sm text-cocoa-500">学校筛选</label>
      <select
        v-model="schoolId"
        class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400 w-64"
        @change="onFilterChange"
      >
        <option value="">全部学校</option>
        <option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <div class="flex-1" />
      <span class="text-sm text-cocoa-500">共 {{ total }} 条</span>
    </div>

    <!-- 列表 -->
    <div class="table-wrap">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-sm text-cocoa-500 border-b border-cream-200">
            <th class="px-4 py-3 font-medium">时间</th>
            <th class="px-4 py-3 font-medium">操作人</th>
            <th class="px-4 py-3 font-medium">动作</th>
            <th class="px-4 py-3 font-medium">目标</th>
            <th class="px-4 py-3 font-medium">详情</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading">
            <td colspan="5" class="py-10 text-center text-cocoa-400">
              <Loader2 class="w-5 h-5 animate-spin inline-block mr-2" /> 加载中…
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="5" class="py-10 text-center text-cocoa-400">暂无日志数据</td>
          </tr>
          <tr v-for="(row, i) in items" :key="row.id || i" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 text-cocoa-700 whitespace-nowrap text-xs">{{ formatTime(row.createdAt || row.created_at) }}</td>
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ row.operator || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">
              <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-cream-100 text-cocoa-700">{{ formatAction(row.action) }}</span>
            </td>
            <td class="px-4 py-3 text-cocoa-700 max-w-[200px] truncate" :title="row.target">{{ row.target || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-500 text-xs max-w-[200px] truncate" :title="row.detail">{{ row.detail || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div class="flex items-center justify-between">
      <span class="text-sm text-cocoa-500">第 {{ page }} / {{ totalPages }} 页</span>
      <div class="flex items-center gap-2">
        <button
          class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 disabled:opacity-50"
          :disabled="skip <= 0"
          @click="prevPage"
        >
          <ChevronLeft class="w-4 h-4" /> 上一页
        </button>
        <button
          class="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 disabled:opacity-50"
          :disabled="skip + PAGE_SIZE >= total"
          @click="nextPage"
        >
          下一页 <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
