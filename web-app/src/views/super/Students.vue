<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { listSchools, listClasses, listStudents } from '@/api/admin'
import { Download, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const loading = ref(false)
const students = ref<any[]>([])
const total = ref(0)
const page = ref(0)
const PAGE_SIZE = 50

const schools = ref<any[]>([])
const classes = ref<any[]>([])
const schoolFilter = ref('')
const classFilter = ref('')
const searchQuery = ref('')

const schoolOptions = computed(() => [
  { value: '', label: '全部学校' },
  ...schools.value.map(s => ({ value: s.id, label: `${s.name}（${s.code}）` })),
])

const classOptions = computed(() => {
  if (!schoolFilter.value) return [{ value: '', label: '请先选择学校' }]
  const list = classes.value.filter(c => c.schoolId === schoolFilter.value)
  return [{ value: '', label: '全部班级' }, ...list.map(c => ({ value: c.id, label: c.name || c.className }))]
})

const filtered = computed(() => {
  let list = students.value
  if (schoolFilter.value) {
    list = list.filter(s => s.schoolId === schoolFilter.value)
  }
  if (classFilter.value) {
    list = list.filter(s => s.classId === classFilter.value)
  }
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.trim().toLowerCase()
    list = list.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.studentNo || '').toLowerCase().includes(q) ||
      (s.studentName || '').toLowerCase().includes(q),
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

async function loadClasses() {
  if (!schoolFilter.value) { classes.value = []; return }
  try {
    const res = await listClasses(schoolFilter.value, 0, 500)
    classes.value = res?.items || []
  } catch { /* ignore */ }
}

async function load() {
  loading.value = true
  try {
    const res = await listStudents(schoolFilter.value || undefined, classFilter.value || undefined, page.value * PAGE_SIZE, PAGE_SIZE)
    students.value = res?.items || []
    total.value = res?.total || students.value.length
  } catch { /* ignore */ }
  finally { loading.value = false }
}

watch(schoolFilter, () => {
  classFilter.value = ''
  page.value = 0
  loadClasses()
  load()
})

watch(classFilter, () => {
  page.value = 0
  load()
})

function prevPage() {
  if (page.value > 0) { page.value--; load() }
}

function nextPage() {
  if ((page.value + 1) * PAGE_SIZE < total.value) { page.value++; load() }
}

function downloadCsv() {
  const headers = ['学校', '班级', '姓名', '学号', '性别', '手机号', '家长姓名', '家长电话']
  const rows = filtered.value.map(s => [
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
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `students-export-${new Date().toISOString().slice(0, 10)}.csv`
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
        👨‍🎓 学生管理（超管）
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
        <select v-model="classFilter" :disabled="!schoolFilter" class="px-3 py-2 rounded-xl border border-cream-200 text-sm focus:outline-none focus:border-butter-400 disabled:opacity-50">
          <option v-for="opt in classOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
        <div class="flex-1 min-w-[200px] relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cocoa-400" />
          <input
            v-model="searchQuery"
            placeholder="搜索姓名 / 学号"
            class="w-full pl-9 pr-3 py-2 rounded-xl border border-cream-200 bg-cream-50 text-sm focus:outline-none focus:border-butter-400 focus:bg-surface transition-colors"
          />
        </div>
        <div class="text-sm text-cocoa-500">共 {{ total }} 名学生</div>
      </div>

      <div v-if="loading" class="flex items-center justify-center py-16 text-cocoa-400">
        <Loader2 class="w-6 h-6 animate-spin mr-2" /> 加载中…
      </div>

      <div v-else-if="!filtered.length" class="text-center py-16 text-cocoa-400">
        暂无学生数据
      </div>

      <div v-else class="table-wrap">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-left text-sm text-cocoa-500 border-b border-cream-200">
              <th class="px-4 py-3 font-medium">学校</th>
              <th class="px-4 py-3 font-medium">班级</th>
              <th class="px-4 py-3 font-medium">姓名</th>
              <th class="px-4 py-3 font-medium">学号</th>
              <th class="px-4 py-3 font-medium">性别</th>
              <th class="px-4 py-3 font-medium">手机号</th>
              <th class="px-4 py-3 font-medium">家长</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cream-100">
            <tr v-for="s in filtered" :key="s.id" class="hover:bg-cream-50 transition-colors">
              <td class="px-4 py-3">
                <div class="font-medium text-cocoa-900">{{ s.schoolName || '-' }}</div>
              </td>
              <td class="px-4 py-3 text-cocoa-700">{{ s.className || '-' }}</td>
              <td class="px-4 py-3 font-medium text-cocoa-900">{{ s.name || s.studentName }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ s.studentNo || '-' }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ s.gender || '-' }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ s.phone || '-' }}</td>
              <td class="px-4 py-3 text-cocoa-700">{{ s.parentName || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > PAGE_SIZE" class="flex items-center justify-between pt-4">
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
