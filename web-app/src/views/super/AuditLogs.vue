<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
    alert(e?.message || '加载失败')
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
  if (!t) return '-'
  return t.replace('T', ' ').replace(/\.\d+Z?$/, '').slice(0, 19)
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <FileText class="w-6 h-6 text-butter-500" /> 审计日志
    </h1>

    <!-- 筛选 -->
    <div class="bg-white rounded-2xl shadow-softer p-4 flex items-center gap-3">
      <label class="text-sm text-cocoa-500">学校筛选</label>
      <select
        v-model="schoolId"
        class="px-3 py-2 rounded-xl border border-cream-200 bg-white text-sm focus:outline-none focus:border-butter-400 w-64"
        @change="onFilterChange"
      >
        <option value="">全部学校</option>
        <option v-for="s in schools" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <div class="flex-1" />
      <span class="text-sm text-cocoa-500">共 {{ total }} 条</span>
    </div>

    <!-- 列表 -->
    <div class="bg-white rounded-2xl shadow-softer overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-sm text-cocoa-500 border-b border-cream-200">
            <th class="px-4 py-3 font-medium">时间</th>
            <th class="px-4 py-3 font-medium">操作人</th>
            <th class="px-4 py-3 font-medium">角色</th>
            <th class="px-4 py-3 font-medium">动作</th>
            <th class="px-4 py-3 font-medium">目标</th>
            <th class="px-4 py-3 font-medium">IP</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-cream-100">
          <tr v-if="loading">
            <td colspan="6" class="py-10 text-center text-cocoa-400">
              <Loader2 class="w-5 h-5 animate-spin inline-block mr-2" /> 加载中…
            </td>
          </tr>
          <tr v-else-if="items.length === 0">
            <td colspan="6" class="py-10 text-center text-cocoa-400">暂无日志数据</td>
          </tr>
          <tr v-for="(row, i) in items" :key="row.id || i" class="hover:bg-cream-50 transition-colors">
            <td class="px-4 py-3 text-cocoa-700 whitespace-nowrap">{{ formatTime(row.createdAt || row.created_at) }}</td>
            <td class="px-4 py-3 font-medium text-cocoa-900">{{ row.actorName || row.actor_name || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ row.actorRole || row.actor_role || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ row.action || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700">{{ row.target || '-' }}</td>
            <td class="px-4 py-3 text-cocoa-700 font-mono text-xs">{{ row.ip || '-' }}</td>
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
