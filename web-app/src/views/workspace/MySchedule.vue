<script setup lang="ts">
/**
 * 我的课表：调用 GET /schedules/my，按班级分组展示课表网格。
 * 复用 Schedule.vue 的网格样式与科目配色；dayOfWeek(0-6) → weekday(1-7)。
 */
import { ref, computed, onMounted } from 'vue'
import { CalendarDays, Loader2, BookOpen, User } from 'lucide-vue-next'
import request from '@/api/request'

interface MyScheduleItem {
  id: string
  classId: string
  dayOfWeek: number
  period: number
  section?: string | null
  weekType?: string
  subject: string
  teacher?: string
  note?: string
}
interface MyScheduleClass {
  classId: string
  className: string
  term: string
  items: MyScheduleItem[]
}
interface MyScheduleResp {
  teacherName: string
  classes: MyScheduleClass[]
}

const loading = ref(true)
const errorMsg = ref('')
const teacherName = ref('')
const groups = ref<MyScheduleClass[]>([])

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

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

function weekTypeBadge(wt?: string): string {
  if (!wt || wt === 'all') return ''
  if (wt === 'single') return '单'
  if (wt === 'double') return '双'
  return ''
}

/** 把一个班级的 items 组织成 grid，key = `${weekday}-${period}` */
function buildGrid(items: MyScheduleItem[]): Record<string, MyScheduleItem> {
  const grid: Record<string, MyScheduleItem> = {}
  for (const it of items) {
    const weekday = (it.dayOfWeek ?? 0) + 1
    grid[`${weekday}-${it.period}`] = it
  }
  return grid
}

/** 预计算每个班级的网格，避免模板内重复构建 */
const renderedGroups = computed(() =>
  groups.value.map(g => ({ ...g, grid: buildGrid(g.items) })),
)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await request.get<any, MyScheduleResp>('/schedules/my')
    teacherName.value = res?.teacherName || ''
    groups.value = Array.isArray(res?.classes) ? res.classes : []
  } catch (e: any) {
    errorMsg.value = e?.message || '加载我的课表失败'
    groups.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="space-y-4">
    <!-- 标题栏 -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
        <CalendarDays class="w-6 h-6 text-butter-500" /> 我的课表
      </h1>
      <div v-if="teacherName" class="flex items-center gap-1.5 text-cocoa-600 text-sm bg-surface rounded-xl px-3 py-2 border border-cream-200">
        <User class="w-4 h-4 text-butter-500" /> {{ teacherName }}
      </div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="rounded-xl p-4 border border-sakura-200 bg-sakura-50 text-sakura-700 text-sm">
      ⚠️ {{ errorMsg }}
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="flex items-center justify-center py-16 text-cocoa-400">
      <Loader2 class="w-6 h-6 animate-spin mr-2" /> 加载中…
    </div>

    <!-- 空状态 -->
    <div v-else-if="!groups.length" class="text-center py-16 text-cocoa-400">
      <BookOpen class="w-12 h-12 mx-auto mb-3 text-cocoa-300" />
      <p class="text-lg">暂无课表数据</p>
      <p class="text-sm mt-1">请联系管理员或班主任设置课表</p>
    </div>

    <!-- 各班级课表 -->
    <template v-else>
      <div v-for="g in renderedGroups" :key="g.classId" class="bg-surface rounded-2xl shadow-softer border border-cream-200 overflow-hidden">
        <div class="px-4 py-3 bg-cream-100 text-cocoa-700 flex items-center gap-2">
          <BookOpen class="w-4 h-4 text-butter-500" />
          <span class="font-semibold">{{ g.className }}</span>
          <span v-if="g.term" class="text-xs text-cocoa-400">· {{ g.term }}</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[700px]">
            <thead>
              <tr class="bg-cream-50 text-cocoa-600">
                <th class="px-4 py-2.5 font-medium text-left w-20">节次</th>
                <th
                  v-for="(day, idx) in WEEK_DAYS"
                  :key="idx"
                  class="px-3 py-2.5 font-medium text-center border-l border-cream-200"
                >{{ day }}</th>
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
                  <template v-if="g.grid[`${dIdx + 1}-${row.period}`]">
                    <div
                      :class="[
                        'rounded-lg px-2.5 py-2 text-xs transition-colors border',
                        getSubjectColor(g.grid[`${dIdx + 1}-${row.period}`]!.subject),
                      ]"
                    >
                      <div class="font-semibold truncate flex items-center gap-1">
                        <span class="truncate">{{ g.grid[`${dIdx + 1}-${row.period}`]!.subject }}</span>
                        <span
                          v-if="weekTypeBadge(g.grid[`${dIdx + 1}-${row.period}`]!.weekType)"
                          class="shrink-0 text-[9px] px-1 rounded bg-black/10"
                        >{{ weekTypeBadge(g.grid[`${dIdx + 1}-${row.period}`]!.weekType) }}</span>
                      </div>
                      <div
                        v-if="g.grid[`${dIdx + 1}-${row.period}`]!.teacher"
                        class="text-[10px] mt-0.5 opacity-70 truncate"
                      >{{ g.grid[`${dIdx + 1}-${row.period}`]!.teacher }}</div>
                      <div
                        v-if="g.grid[`${dIdx + 1}-${row.period}`]!.note"
                        class="text-[10px] mt-0.5 opacity-60 truncate"
                      >{{ g.grid[`${dIdx + 1}-${row.period}`]!.note }}</div>
                    </div>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>
