<script setup lang="ts">
import { computed } from 'vue'
import { useClassStore } from '../../stores/class'
import { useSchoolStore } from '../../stores/school'
import { useUserStore } from '../../stores/user'
import { subjectPalette } from '../../seed'

const classStore = useClassStore()
const schoolStore = useSchoolStore()
const userStore = useUserStore()

const days = ['一', '二', '三', '四', '五']
const totalPeriods = 8

const periodLabels = [
  '',
  '第 1 节',
  '第 2 节',
  '第 3 节',
  '第 4 节',
  '午自习',
  '第 6 节',
  '第 7 节',
  '课后服务',
]

/**
 * 给定 day / period 收集所有命中的 (classId, subject)
 */
function getLessonsAt(day: number, period: number) {
  return schoolStore.schedules
    .filter(
      (s) =>
        s.dayOfWeek === day &&
        s.period === period &&
        s.subject &&
        userStore.isTeaching(s.classId, s.subject),
    )
    .map((s) => ({
      classId: s.classId,
      className: classStore.getClass(s.classId)?.name || '已删除',
      subject: s.subject,
      teacher: s.teacher || '未知',
    }))
}

const grid = computed(() => {
  // 8 行 × 5 列
  return Array.from({ length: totalPeriods }, (_, p) => ({
    period: p + 1,
    cells: Array.from({ length: days.length }, (_, d) => ({
      day: d + 1,
      lessons: getLessonsAt(d + 1, p + 1),
    })),
  }))
})

// 今日高亮列
const today = new Date()
const todayDow = today.getDay() === 0 ? 7 : today.getDay()
const isWeekday = todayDow >= 1 && todayDow <= 5

// 统计
const stats = computed(() => {
  let count = 0
  for (const s of schoolStore.schedules) {
    if (s.subject && userStore.isTeaching(s.classId, s.subject)) count++
  }
  return count
})

function subjectBg(sub: string) {
  return subjectPalette[sub]?.bg || 'bg-butter-100'
}
function subjectText(sub: string) {
  return subjectPalette[sub]?.text || 'text-cocoa-700'
}
</script>

<template>
  <div class="card-soft p-3 sm:p-4 overflow-x-auto">
    <table class="w-full border-collapse min-w-[480px]">
      <thead>
        <tr>
          <th class="p-1.5 sm:p-2 text-cocoa-500 text-xs font-normal w-16 sm:w-24" />
          <th
            v-for="(d, i) in days"
            :key="d"
            class="p-1.5 sm:p-2 title-display text-sm sm:text-base text-cocoa-700"
            :class="
              isWeekday && i + 1 === todayDow
                ? 'text-butter-600 underline decoration-2 underline-offset-4'
                : ''
            "
          >
            周{{ d }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in grid"
          :key="row.period"
        >
          <td class="p-1.5 sm:p-2 text-center align-top">
            <div class="number text-sm sm:text-base text-cocoa-700">
              {{ row.period !== 5 && row.period <= 6 ? row.period : '' }}
            </div>
            <div class="text-[10px] text-cocoa-500 mt-0.5 hidden sm:block">
              {{ periodLabels[row.period] }}
            </div>
          </td>
          <td
            v-for="cell in row.cells"
            :key="cell.day"
            class="p-0.5 sm:p-1 border border-cocoa-100/40 align-top"
            :class="
              isWeekday && cell.day === todayDow ? 'bg-butter-50/40' : ''
            "
          >
            <div
              v-if="cell.lessons.length"
              class="rounded-lg p-1 space-y-0.5 min-h-[48px] sm:min-h-[58px] sm:rounded-xl sm:p-1.5 sm:space-y-1"
              :class="(row.period === 5 || row.period === 8) ? 'bg-cream-50' : (cell.lessons.length > 1 ? 'bg-cream-50' : '')"
            >
              <div
                v-for="(l, i) in cell.lessons"
                :key="i"
                class="rounded-md px-1 py-0.5 text-center sm:rounded-lg sm:px-1.5 sm:py-1"
                :class="(row.period === 5 || row.period === 8) ? 'bg-cream-100' : subjectBg(l.subject)"
              >
                <div
                  v-if="row.period !== 5 && row.period !== 8"
                  class="text-[9px] sm:text-[10px] text-cocoa-500 truncate"
                  :title="l.className"
                >
                  {{ l.className }}
                </div>
                <div
                  class="text-[11px] sm:text-xs font-medium truncate"
                  :class="(row.period === 5 || row.period === 8) ? 'text-cocoa-700' : subjectText(l.subject)"
                >
                  {{ (row.period === 5 || row.period === 8) ? l.teacher : l.subject }}
                </div>
                <div
                  v-if="row.period === 5 || row.period === 8"
                  class="text-[9px] sm:text-[10px] text-cocoa-500 truncate hidden sm:block"
                >
                  {{ l.className }}
                </div>
              </div>
            </div>
            <div
              v-else
              class="rounded-lg p-2 text-center text-xs text-cocoa-300 min-h-[48px] sm:min-h-[58px] sm:rounded-xl sm:p-3 flex items-center justify-center"
            >
              -
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="text-[11px] text-cocoa-500 mt-2 flex flex-wrap items-center gap-3">
      <span>💡 一格内出现多个班级 = 同时段你任教多班</span>
      <span class="chip bg-butter-100 text-butter-600">本周 {{ stats }} 节课</span>
    </div>
  </div>
</template>
