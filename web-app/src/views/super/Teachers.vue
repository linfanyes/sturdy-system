<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listSchools, listTeachers } from '@/api/admin'
import { Download, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const loading = ref(false)
const teachers = ref<any[]>([])
const total = ref(0)
const page = ref(0)
const PAGE_SIZE = 50

const schools = ref<any[]>([])
const schoolFilter = ref('')
const searchQuery = ref('')

const schoolOptions = computed(() => [
  { value: '', label: '全部学校' },
  ...schools.value.map(s => ({ value: s.id, label: `${s.name}（${s.code}）` })),
])

const filtered = computed(() => {
  let list = teachers.value
  if (schoolFilter.value) {
    list = list.filter(t => t.schoolId === schoolFilter.value || t.schoolName === schoolFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(t =>
      (t.name || '').toLowerCase().includes(q) ||
      (t.username || '').toLowerCase().includes(q) ||
      (t.subject || '').toLowerCase().includes(q),
    )
  }
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

async function loadSchools() {
  try {
    const res = await listSchools(0, 500)
    schools.value = res?.items || []
  } catch { /* ignore */ }
}

async function load() {
  loading.value = true
  try {
    const res = await listTeachers(page.value * PAGE_SIZE, PAGE_SIZE)
    teachers.value = res?.items || []
    total.value = res?.total || teachers.value.length
  } catch { /* ignore */ }
  finally { loading.value = false }
}

function prevPage() {
  if (page.value > 0) { page.value--; load() }
}

function nextPage() {
  if ((page.value + 1) * PAGE_SIZE < total.value) { page.value++; load() }
}

function downloadCsv() {
  const headers = ['学校', '学校编号', '姓名', '用户名', '学科', '手机号', '启用']
  const rows = filtered.value.map(t => [
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
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `teachers-export-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadSchools()
  load()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        👩‍🏫 教师管理（超管）
      </h1>
      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm font-medium hover:bg-butter-600 transition-colors"
        @click="downloadCsv"
      >
        <Download class="w-4 h-4" /> 导出 CSV
      </button>
    </div>

    <div class="bg-surface rounded-2xl p-5 shadow-softer border border-cream-200">
      <div class="flex flex-wrap items-center gap-3 mb-4">
        <select v-model="schoolFilter" class="px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-butter-400">
          <option v-for="opt in schoolOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <div class="flex-1 min-w-[200px] relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
          <input
            v-model="searchQuery"
            placeholder="搜索姓名 / 用户名 / 学科"
            class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:border-butter-400 focus:bg-surface transition-colors"
          />
        </div>
        <div class="text-sm text-cocoa-500">共 {{ total }} 位教师</div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-cocoa-400">
        <Loader2 class="w-6 h-6 animate-spin mr-2" /> 加载中…
      </div>

      <div v-else-if="!filtered.length" class="text-center py-16 text-cocoa-400">
        暂无教师数据
      </div>

      <div v-else class="table-wrap">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-sm text-cocoa-500 border-b border-cream-200">
              <th class="px-4 py-3 font-medium">学校</th>
              <th class="px-4 py-3 font-medium">姓名</th>
              <th class="px-4 py-3 font-medium">用户名</th>
              <th class="px-4 py-3 font-medium">学科</th>
              <th class="px-4 py-3 font-medium">手机号</th>
              <th class="px-4 py-3 font-medium text-center">状态</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cream-100">
            <tr v-for="t in filtered" :key="t.id" class="hover:bg-cream-50 transition-colors">
              <td class="px-4 py-3">
                <div class="font-medium text-cocoa-900">{{ t.schoolName || '-' }}</div>
                <div class="text-xs text-cocoa-400">{{ t.schoolCode || '-' }}</div>
              </td>
              <td class="px-4 py-3 font-medium text-cocoa-900">{{ t.name }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ t.username || '-' }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ t.subject || '-' }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ t.phone || '-' }}</td>
              <td class="px-4 py-3 text-center">
                <span :class="['text-xs px-2 py-0.5 rounded-full', t.enabled ? 'bg-mint-100 text-mint-500' : 'bg-sakura-100 text-sakura-500']">
                  {{ t.enabled ? '启用' : '停用' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > 0 && PAGE_SIZE < total" class="flex items-center justify-between pt-4">
        <button
          class="px-3 py-1.5 rounded-lg bg-surface border border-cream-200 text-sm text-cocoa-700 hover:bg-cream-100 disabled:opacity-50 flex items-center gap-1"
          :disabled="page === 0"
          @click="prevPage"
        >
          <ChevronLeft class="w-4 h-4" /> 上一页
        </button>
        <div class="text-sm text-cocoa-500">第 {{ page + 1 }} / {{ totalPages }} 页</div>
        <button
          class="px-3 py-1.5 rounded-lg bg-surface border border-cream-200 text-sm text-cocoa-700 hover:bg-cream-100 disabled:opacity-50 flex items-center gap-1"
          :disabled="page + 1 >= totalPages"
          @click="nextPage"
        >
          下一页 <ChevronRight class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-wrap { overflow-x: auto; }
</style>
