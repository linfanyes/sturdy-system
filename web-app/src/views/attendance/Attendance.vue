<script setup lang="ts">
/**
 * 教师端考勤记录页
 * - 选择班级 + 日期，按学生逐人标记出勤/迟到/请假/旷课
 * - 支持「全班X」一键标记、统计概览、保存（新建或更新）
 * - 数据对接后端 /attendances（GET 列表 / POST 新建 / PATCH 更新）
 */
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { toast } from '@/utils/feedback'
import request from '@/api/request'
import EmptyState from '@/components/EmptyState.vue'
import { Loader2 } from 'lucide-vue-next'

interface Student {
  id: string
  classId: string
  name: string
  gender: string
  studentNo: string
  seatNo?: string
}

interface AttRecord {
  studentId: string
  status: string
}

/** 考勤状态定义（与小程序端一致） */
const STATUS_LIST = ['出勤', '迟到', '请假', '旷课'] as const
type AttStatus = (typeof STATUS_LIST)[number]

const STATUS_META: Record<AttStatus, { fg: string; bg: string; emoji: string }> = {
  '出勤': { fg: '#07c160', bg: '#e8f9e8', emoji: '✅' },
  '迟到': { fg: '#e6a23c', bg: '#fff3e0', emoji: '⏰' },
  '请假': { fg: '#1C6FB3', bg: '#e8f1fb', emoji: '📝' },
  '旷课': { fg: '#e06c75', bg: '#fde8ea', emoji: '❌' },
}

/** 归一化后端存储的状态（兼容中文与英文 key） */
const STATUS_NORM: Record<string, AttStatus> = {
  present: '出勤', late: '迟到', absent: '旷课', leave: '请假',
  '出勤': '出勤', '迟到': '迟到', '请假': '请假', '旷课': '旷课',
}

const { classes } = useClasses()
const classId = ref('')
const date = ref(new Date().toISOString().slice(0, 10))
const students = ref<Student[]>([])
const loading = ref(false)
const saving = ref(false)

/** studentId -> 状态 */
const statusMap = ref<Record<string, AttStatus>>({})
/** 已存在考勤记录的 id（用于更新） */
const attId = ref('')
let dirty = false

const selClassName = computed(() => classes.value.find(c => c.id === classId.value)?.name || '')
const hasData = computed(() => !!classId.value)

const stats = computed<Record<AttStatus, number>>(() => {
  const o: Record<AttStatus, number> = { '出勤': 0, '迟到': 0, '请假': 0, '旷课': 0 }
  for (const id in statusMap.value) {
    const s = statusMap.value[id]
    if (o[s] !== undefined) o[s]++
  }
  return o
})

/** 加载当前班级的学生 */
async function loadStudents() {
  if (!classId.value) return
  loading.value = true
  try {
    const res = await request.get('/students', { params: { classId: classId.value, take: 500 } })
    students.value = Array.isArray(res) ? res : (res?.items || [])
    await loadAttendance()
  } catch (e: any) {
    toast.error(e?.message || '学生加载失败')
    students.value = []
  } finally {
    loading.value = false
  }
}

/** 读取某班级+日期已保存的考勤 */
async function loadAttendance() {
  statusMap.value = {}
  attId.value = ''
  dirty = false
  if (!classId.value) return
  try {
    const res = await request.get('/attendances', {
      params: { classId: classId.value, date: date.value, take: 50 },
    })
    const list: any[] = Array.isArray(res) ? res : (res?.items || [])
    const rec = list.find(a => a.classId === classId.value && (!date.value || a.date === date.value))
    if (rec) {
      attId.value = rec.id
      const records = Array.isArray(rec.records) ? rec.records : []
      for (const r of records) {
        const norm = STATUS_NORM[r.status]
        if (norm && r.studentId) statusMap.value[r.studentId] = norm
      }
    }
  } catch (e: any) {
    // 读取失败不阻断页面，默认全部出勤
  }
  // 未标记的学生默认「出勤」
  for (const s of students.value) {
    if (!statusMap.value[s.id]) statusMap.value[s.id] = '出勤'
  }
}

function statusOf(id: string): AttStatus {
  return statusMap.value[id] || '出勤'
}

function setStatus(id: string, s: AttStatus) {
  statusMap.value[id] = s
  dirty = true
}

function markAll(s: AttStatus) {
  for (const st of students.value) statusMap.value[st.id] = s
  dirty = true
}

/** 保存考勤 */
async function save() {
  if (!classId.value) { toast.warning('请先选择班级'); return }
  if (!students.value.length) { toast.warning('该班级暂无学生'); return }
  if (saving.value) return
  saving.value = true
  const records: AttRecord[] = students.value.map(s => ({
    studentId: s.id,
    status: statusMap.value[s.id] || '出勤',
  }))
  const payload = { classId: classId.value, date: date.value, records }
  try {
    if (attId.value) {
      await request.patch(`/attendances/${attId.value}`, payload)
    } else {
      await request.post('/attendances', payload)
    }
    dirty = false
    toast.success('考勤已保存')
  } catch (e: any) {
    toast.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

// 班级/日期变化时刷新
watch(classId, () => { if (classId.value) loadStudents() })
watch(date, () => { if (classId.value) loadAttendance() })

onMounted(async () => {
  await loadClasses()
  if (classes.value.length) {
    classId.value = classes.value[0].id
  }
})

let activated = false
// keep-alive 页面重新激活时刷新（首次挂载由 onMounted 加载，不重复请求）
onActivated(async () => {
  if (!activated) { activated = true; return }
  await loadClasses()
  if (classId.value) await loadStudents() // loadStudents 内部会调 loadAttendance 刷新考勤
})
</script>

<template>
  <div class="space-y-4 grow-in">
    <!-- 顶栏 -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-cocoa-900">考勤</h1>
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="classId"
          aria-label="选择班级"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
        >
          <option value="" disabled>选择班级</option>
          <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <input
          v-model="date"
          type="date"
          aria-label="选择日期"
          class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400"
        />
        <button
          class="btn-pill bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="saving"
          @click="save"
        >
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
          {{ saving ? '保存中…' : '保存考勤' }}
        </button>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="card-soft p-6 flex items-center justify-center gap-2 text-cocoa-400">
      <Loader2 class="w-5 h-5 animate-spin" /> 加载中…
    </div>

    <!-- 未选班级 -->
    <EmptyState v-else-if="!hasData" icon="📋" title="请选择班级" desc="选择班级后即可开始记录考勤" />

    <template v-else>
      <!-- 统计卡 -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          v-for="s in STATUS_LIST"
          :key="s"
          class="stat-card flex items-center gap-3"
        >
          <span
            class="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            :style="{ background: STATUS_META[s].bg }"
          >{{ STATUS_META[s].emoji }}</span>
          <div>
            <div class="text-2xl font-bold" :style="{ color: STATUS_META[s].fg }">{{ stats[s] }}</div>
            <div class="text-xs text-cocoa-500">{{ s }}</div>
          </div>
        </div>
      </div>

      <!-- 全班一键标记 -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm text-cocoa-500">全班：</span>
        <button
          v-for="s in STATUS_LIST"
          :key="s"
          class="text-xs px-3 py-1.5 rounded-full border transition-colors"
          :style="{ color: STATUS_META[s].fg, borderColor: STATUS_META[s].bg, background: STATUS_META[s].bg }"
          @click="markAll(s)"
        >全班{{ s }}</button>
      </div>

      <!-- 学生列表 -->
      <div class="card-soft overflow-hidden">
        <div v-if="students.length === 0" class="p-6">
          <EmptyState icon="📋" title="暂无学生" desc="该班级还没有学生，请先在学生管理中添加" />
        </div>
        <ul v-else class="divide-y divide-cream-100">
          <li
            v-for="st in students"
            :key="st.id"
            class="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-cream-50/60 transition-colors"
          >
            <span class="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center text-lg shrink-0">
              {{ st.gender === '女' ? '👧' : '👦' }}
            </span>
            <div class="min-w-0 flex-1">
              <div class="font-medium text-cocoa-900 text-sm">{{ st.name }}</div>
              <div class="text-xs text-cocoa-400">{{ st.studentNo ? '学号 ' + st.studentNo : '' }}<template v-if="st.studentNo && st.seatNo"> · </template>{{ st.seatNo ? '座 ' + st.seatNo : '' }}</div>
            </div>
            <div class="flex gap-1.5 flex-wrap">
              <button
                v-for="s in STATUS_LIST"
                :key="s"
                class="text-xs px-2.5 py-1.5 rounded-full border transition-all"
                :style="statusOf(st.id) === s
                  ? { background: STATUS_META[s].fg, color: '#fff', borderColor: STATUS_META[s].fg }
                  : { borderColor: '#e8e0d0', color: '#8a8175', background: 'transparent' }"
                @click="setStatus(st.id, s)"
              >{{ s }}</button>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </div>
</template>