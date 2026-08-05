<script setup lang="ts">
/**
 * 课程表：按周显示课程表，支持按班级筛选。
 * 字段映射：后端返回 dayOfWeek(0=周一..6=周日) 与 period(0=早读,1-8=节次,99=晚自习)，
 * 这里把 dayOfWeek 映射为 weekday(1-7)，并按 period 渲染早读 / 第1-8节 / 晚自习行。
 */
import { ref, computed, onMounted } from 'vue'
import { Calendar, Loader2, BookOpen } from 'lucide-vue-next'
import { loadClasses, useClasses } from '@/composables/useClasses'
import request from '@/api/request'

interface ScheduleItem {
  id: string
  classId: string
  className?: string
  /** 后端 dayOfWeek: 0=周一..6=周日 */
  dayOfWeek?: number
  /** 前端归一化后的星期: 1=周一..7=周日 */
  weekday: number
  /** 后端 period: 0=早读, 1-8=节次, 99=晚自习 */
  period: number
  /** 文字节次：早读/晚自习，普通节次为 null */
  section?: string | null
  weekType?: string
  subject: string
  teacher?: string
  note?: string
}

const { classes } = useClasses()
const loading = ref(true)
const classLoading = ref(false)
const schedules = ref<ScheduleItem[]>([])
const selectedClassId = ref('')
const errorMsg = ref('')

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

/** 课表行：早读 + 第1-8节 + 晚自习 */
interface Row { label: string; period: number; dim?: boolean }
const ROWS: Row[] = [
  { label: '早读', period: 0, dim: true },
  { label: '第1节', period: 1 },
  { label: '第2节', period: 2 },
  { label: '第3节', period: 3 },
  { label: '第4节', period: 4 },
  { label: '第5节', period: 5 },
  { label: '第6节', period: 6 },
  { label: '第7节', period: 7 },
  { label: '第8节', period: 8 },
  { label: '晚自习', period: 99, dim: true },
]

/** 按班级筛选后的课表 */
const filteredSchedules = computed(() => {
  if (!selectedClassId.value) return schedules.value
  return schedules.value.filter(s => s.classId === selectedClassId.value)
})

/** 按星期和节次组织成二维查找表，key = `${weekday}-${period}` */
const scheduleGrid = computed(() => {
  const grid: Record<string, ScheduleItem> = {}
  for (const s of filteredSchedules.value) {
    const key = `${s.weekday}-${s.period}`
    grid[key] = s
  }
  return grid
})

/** 课程颜色映射 */
const subjectColors: Record<string, string> = {
  '语文': 'bg-sakura-100 text-sakura-700 border-sakura-200',
  '数学': 'bg-sky2-100 text-sky2-700 border-sky2-200',
  '英语': 'bg-mint-100 text-mint-700 border-mint-200',
  '物理': 'bg-butter-100 text-butter-700 border-butter-200',
  '化学': 'bg-cream-200 text-cocoa-700 border-cream-300',
  '生物': 'bg-green-100 text-green-700 border-green-200',
  '历史': 'bg-amber-100 text-amber-700 border-amber-200',
  '地理': 'bg-teal-100 text-teal-700 border-teal-200',
  '政治': 'bg-orange-100 text-orange-700 border-orange-200',
  '体育': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  '音乐': 'bg-purple-100 text-purple-700 border-purple-200',
  '美术': 'bg-pink-100 text-pink-700 border-pink-200',
  '信息技术': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  '科学': 'bg-lime-100 text-lime-700 border-lime-200',
}

function getSubjectColor(subject: string): string {
  if (!subject) return 'bg-cream-50 text-cocoa-400 border-cream-200'
  for (const [key, cls] of Object.entries(subjectColors)) {
    if (subject.includes(key)) return cls
  }
  return 'bg-cream-100 text-cocoa-600 border-cream-200'
}

/** 周次徽章 */
function weekTypeBadge(wt?: string): string {
  if (!wt || wt === 'all') return ''
  if (wt === 'single') return '单'
  if (wt === 'double') return '双'
  return ''
}

/** 加载课程表 */
async function loadSchedules() {
  loading.value = true
  errorMsg.value = ''
  try {
    const params: Record<string, any> = { take: 500 }
    if (selectedClassId.value) params.classId = selectedClassId.value
    const res = await request.get('/schedules', { params })
    const list: any[] = Array.isArray(res) ? res : (res?.items || [])
    // 字段映射：dayOfWeek(0-6) → weekday(1-7)
    schedules.value = list.map((it: any) => ({
      ...it,
      weekday: (it.dayOfWeek ?? 0) + 1,
      period: it.period,
    }))
  } catch (e: any) {
    errorMsg.value = e?.message || '加载课程表失败'
    schedules.value = []
  } finally {
    loading.value = false
  }
}

async function onClassChange() {
  classLoading.value = true
  await loadSchedules()
  classLoading.value = false
}

onMounted(async () => {
  await loadClasses()
  if (classes.value.length > 0) {
    selectedClassId.value = classes.value[0].id
  }
  await loadSchedules()
})
</script>

<template>
  <div class="space-y-4">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <Calendar class="w-6 h-6 text-butter-500" /> 课程表
      </h1>
      <select
        v-model="selectedClassId"
        class="px-3 py-2 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400 min-w-[160px]"
        @change="onClassChange"
      >
        <option value="">全部班级</option>
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="rounded-xl p-4 border border-sakura-200 bg-sakura-50 text-sakura-700 text-sm">
      ⚠️ {{ errorMsg }}
    </div>

    <!-- 加载状态 -->
    <div v-if="loading || classLoading" class="flex items-center justify-center py-16 text-cocoa-400">
      <Loader2 class="w-6 h-6 animate-spin mr-2" />
      加载中…
    </div>

    <!-- 空状态 -->
    <div v-else-if="!filteredSchedules.length" class="text-center py-16 text-cocoa-400">
      <BookOpen class="w-12 h-12 mx-auto mb-3 text-cocoa-300" />
      <p class="text-lg">暂无课程数据</p>
      <p class="text-sm mt-1">请先选择班级或在课表管理中添加课程</p>
    </div>

    <!-- 课表网格 -->
    <div v-else class="bg-surface rounded-2xl shadow-softer border border-cream-200 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm min-w-[700px]">
          <thead>
            <tr class="bg-cream-100 text-cocoa-600">
              <th class="px-4 py-3 font-medium text-left w-20">节次</th>
              <th
                v-for="(day, idx) in WEEK_DAYS"
                :key="idx"
                class="px-3 py-3 font-medium text-center border-l border-cream-200"
              >
                {{ day }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-cream-100">
            <tr v-for="row in ROWS" :key="row.period">
              <td :class="['px-4 py-2 text-cocoa-500 font-medium text-xs align-top', row.dim ? 'text-butter-600' : '']">
                {{ row.label }}
              </td>
              <td
                v-for="(day, dIdx) in WEEK_DAYS"
                :key="dIdx"
                class="px-2 py-1.5 align-top border-l border-cream-100"
              >
                <template v-if="scheduleGrid[`${dIdx + 1}-${row.period}`]">
                  <div
                    :class="[
                      'rounded-lg px-2.5 py-2 text-xs transition-colors border relative',
                      getSubjectColor(scheduleGrid[`${dIdx + 1}-${row.period}`]!.subject),
                    ]"
                  >
                    <div class="font-semibold truncate flex items-center gap-1">
                      <span class="truncate">{{ scheduleGrid[`${dIdx + 1}-${row.period}`]!.subject }}</span>
                      <span
                        v-if="weekTypeBadge(scheduleGrid[`${dIdx + 1}-${row.period}`]!.weekType)"
                        class="shrink-0 text-[9px] px-1 rounded bg-black/10"
                      >{{ weekTypeBadge(scheduleGrid[`${dIdx + 1}-${row.period}`]!.weekType) }}</span>
                    </div>
                    <div
                      v-if="scheduleGrid[`${dIdx + 1}-${row.period}`]!.teacher"
                      class="text-xs mt-0.5 opacity-70 truncate"
                    >
                      {{ scheduleGrid[`${dIdx + 1}-${row.period}`]!.teacher }}
                    </div>
                    <div
                      v-if="scheduleGrid[`${dIdx + 1}-${row.period}`]!.note"
                      class="text-xs mt-0.5 opacity-60 truncate"
                    >
                      {{ scheduleGrid[`${dIdx + 1}-${row.period}`]!.note }}
                    </div>
                  </div>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
