<script setup lang="ts">
import { computed, ref } from 'vue'
import { useClassStore } from '../../stores/class'
import { useSchoolStore } from '../../stores/school'
import { useUserStore } from '../../stores/user'
import { useTeacherStore } from '../../stores/teacher'
import { useToastStore } from '../../stores/toast'
import { subjectPalette } from '../../seed'
import { X, Check } from 'lucide-vue-next'

const classStore = useClassStore()
const schoolStore = useSchoolStore()
const userStore = useUserStore()
const teacherStore = useTeacherStore()
const toast = useToastStore()

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

const subjectOptions = [
  '语文', '数学', '英语', '音乐', '美术', '体育', '品德', '科学',
  '综合实践', '信息技术', '劳动', '阅读',
]
const fixedSubjects: Record<number, string> = { 5: '午自习', 8: '课后服务' }

const teacherOptions = computed(() =>
  teacherStore.teachers.map((t) => t.name).filter(Boolean),
)

// 双击编辑
const editOpen = ref(false)
const editDay = ref(1)
const editPeriod = ref(1)
const editClassId = ref('')
const editSubject = ref('')
const editTeacher = ref('')

function openEdit(day: number, period: number, lesson: { classId: string; subject: string; teacher: string }) {
  editDay.value = day
  editPeriod.value = period
  editClassId.value = lesson.classId
  editSubject.value = fixedSubjects[period] || lesson.subject
  editTeacher.value = lesson.teacher
  editOpen.value = true
}

function saveEdit() {
  const subject = fixedSubjects[editPeriod.value] || editSubject.value
  if (!subject) {
    toast.warning('请选择科目')
    return
  }
  schoolStore.updateSchedule(
    editClassId.value,
    editDay.value,
    editPeriod.value,
    subject,
    '',
    editTeacher.value || '未知',
  )
  editOpen.value = false
  toast.success('已更新课表')
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
            <div class="text-[10px] sm:text-xs text-cocoa-500">
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
                class="rounded-md px-1 py-0.5 text-center sm:rounded-lg sm:px-1.5 sm:py-1 cursor-pointer"
                :class="(row.period === 5 || row.period === 8) ? 'bg-cream-100' : subjectBg(l.subject)"
                @dblclick.stop="openEdit(cell.day, row.period, l)"
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

    <!-- 双击编辑弹窗 -->
    <transition name="modal">
      <div
        v-if="editOpen"
        class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-cocoa-900/40 backdrop-blur-sm"
        @click.self="editOpen = false"
      >
        <div class="card-soft max-w-md w-full p-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="title-display text-lg">
              周{{ days[editDay - 1] }} · {{ periodLabels[editPeriod] }} · {{ classStore.getClass(editClassId)?.name || '' }}
            </h3>
            <button
              class="text-cocoa-500 hover:text-cocoa-900"
              @click="editOpen = false"
            >
              <X :size="18" />
            </button>
          </div>

          <div v-if="!fixedSubjects[editPeriod]">
            <label class="text-xs text-cocoa-500 ml-1">科目</label>
            <div class="flex flex-wrap gap-2 mt-1 mb-3">
              <button
                v-for="s in subjectOptions"
                :key="s"
                class="chip border"
                :class="
                  editSubject === s
                    ? `${subjectPalette[s]?.bg || 'bg-butter-300'} border-butter-500 text-cocoa-900`
                    : 'bg-white/70 border-white-80 text-cocoa-700 hover:bg-butter-100'
                "
                @click="editSubject = s"
              >
                {{ s }}
              </button>
            </div>
          </div>
          <div
            v-else
            class="text-xs text-cocoa-500 mb-3"
          >
            固定时段：<b>{{ fixedSubjects[editPeriod] }}</b>（仅设置老师）
          </div>

          <div>
            <label class="text-xs text-cocoa-500 ml-1">执教老师</label>
            <div class="flex gap-2 mt-1">
              <input
                v-model="editTeacher"
                class="input-soft"
                placeholder="如：李老师"
                list="teacher-options"
                @keyup.enter="saveEdit"
              >
              <datalist id="teacher-options">
                <option
                  v-for="n in teacherOptions"
                  :key="n"
                  :value="n"
                />
              </datalist>
            </div>
            <div
              v-if="teacherOptions.length"
              class="flex flex-wrap gap-1 mt-2"
            >
              <button
                v-for="n in teacherOptions.slice(0, 8)"
                :key="n"
                class="chip border bg-white/70 border-white-80 text-cocoa-700 hover:bg-butter-100 text-[10px]"
                @click="editTeacher = n"
              >
                {{ n }}
              </button>
            </div>
          </div>

          <div class="flex gap-2 justify-end mt-4">
            <button
              class="btn-secondary"
              @click="editOpen = false"
            >
              <X :size="14" /> 取消
            </button>
            <button
              class="btn-primary"
              @click="saveEdit"
            >
              <Check :size="14" /> 保存
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
