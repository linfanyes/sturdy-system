<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { listReports, respondReport, getAnomalies } from '@/api/safety'
import { useClasses } from '@/composables/useClasses'

const { classes, loadClasses } = useClasses()
const classId = ref('')
const tab = ref<'reports' | 'anomalies'>('reports')

const loading = ref(false)
const reports = ref<any[]>([])
const anomalies = ref<any[]>([])

const TYPE_LABEL: Record<string, string> = { bullying: '校园欺凌', security: '安全隐患', other: '其他' }
const LEVEL_CLASS: Record<string, string> = {
  high: 'bg-rose-50 text-rose-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-gray-100 text-gray-500',
}
const LEVEL_LABEL: Record<string, string> = { high: '高危', medium: '中', low: '低' }
const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-500',
  processing: 'bg-blue-50 text-blue-600',
  resolved: 'bg-emerald-50 text-emerald-600',
}
const STATUS_LABEL: Record<string, string> = { pending: '待处理', processing: '处理中', resolved: '已解决' }

async function load() {
  if (!classId.value) { reports.value = []; anomalies.value = []; return }
  loading.value = true
  try {
    if (tab.value === 'reports') {
      reports.value = await listReports({ classId: classId.value })
    } else {
      const r = await getAnomalies(classId.value)
      anomalies.value = r.anomalies || []
    }
  } catch (e: any) {
    alert('加载失败：' + (e?.message || e))
  } finally {
    loading.value = false
  }
}

async function switchTab(t: 'reports' | 'anomalies') {
  tab.value = t
  load()
}

async function save(r: any) {
  try {
    await respondReport(r.id, { status: r.status, level: r.level, note: r.note, handlerName: r.handlerName })
    alert('已更新处理状态')
    load()
  } catch (e: any) {
    alert('保存失败：' + (e?.message || e))
  }
}

const pendingCount = computed(() => reports.value.filter((r) => r.status !== 'resolved').length)
const highCount = computed(() => reports.value.filter((r) => r.level === 'high' && r.status !== 'resolved').length)

onMounted(async () => {
  await loadClasses()
  if (classes.value.length) classId.value = classes.value[0].id
  load()
})
</script>

<template>
  <div class="mx-auto max-w-5xl p-4">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">校园安全 · 防欺凌</h1>
        <p class="text-sm text-gray-500">匿名举报分级响应，考勤异常及时预警，守护每位学生。</p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="classId" class="rounded-lg border border-gray-200 px-3 py-2 text-sm" @change="load">
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
      </div>
    </div>

    <div class="mb-4 flex items-center gap-3 text-sm">
      <button class="rounded-lg px-3 py-2" :class="tab === 'reports' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600'" @click="switchTab('reports')">
        举报处理 ({{ pendingCount }})
      </button>
      <button class="rounded-lg px-3 py-2" :class="tab === 'anomalies' ? 'bg-rose-600 text-white' : 'bg-gray-100 text-gray-600'" @click="switchTab('anomalies')">
        考勤异常
      </button>
      <span v-if="highCount" class="ml-auto rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-600">⚠ 高危待处理 {{ highCount }} 起</span>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">加载中…</div>
    <div v-else-if="!classId" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">请先选择班级。</div>

    <template v-else-if="tab === 'reports'">
      <div v-if="!reports.length" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">暂无举报记录。</div>
      <div v-else class="grid gap-3">
        <div v-for="r in reports" :key="r.id" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" :class="r.level === 'high' && r.status !== 'resolved' ? 'border-rose-300' : ''">
          <div class="mb-2 flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{{ TYPE_LABEL[r.type] || r.type }}</span>
            <span class="rounded-full px-2 py-0.5 text-xs" :class="LEVEL_CLASS[r.level]">{{ LEVEL_LABEL[r.level] }}危</span>
            <span class="rounded-full px-2 py-0.5 text-xs" :class="STATUS_CLASS[r.status]">{{ STATUS_LABEL[r.status] }}</span>
            <span v-if="r.anonymous" class="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">匿名</span>
            <span class="ml-auto text-xs text-gray-400">{{ new Date(r.createdAt).toLocaleString('zh-CN') }}</span>
          </div>
          <p class="whitespace-pre-wrap text-sm text-gray-700">{{ r.content }}</p>

          <div class="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
            <select v-model="r.level" class="rounded-lg border border-gray-200 px-2 py-1 text-xs">
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
            <select v-model="r.status" class="rounded-lg border border-gray-200 px-2 py-1 text-xs">
              <option value="pending">待处理</option>
              <option value="processing">处理中</option>
              <option value="resolved">已解决</option>
            </select>
            <input v-model="r.handlerName" placeholder="处理人" class="rounded-lg border border-gray-200 px-2 py-1 text-xs" />
            <input v-model="r.note" placeholder="跟进说明" class="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs" />
            <button class="rounded-lg bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-700" @click="save(r)">保存</button>
          </div>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="!anomalies.length" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">近 7 天考勤正常，无异常学生。</div>
      <div v-else class="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p class="mb-2 text-sm font-medium text-amber-700">⚠ 以下学生近 7 天无考勤打卡记录，建议联系家长确认：</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="a in anomalies" :key="a.studentId" class="rounded-full bg-white px-3 py-1 text-sm text-amber-700 shadow-sm">{{ a.studentName }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
