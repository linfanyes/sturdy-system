<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../stores/class'
import { useSchoolStore } from '../stores/school'
import type { AttendanceStatus } from '../types'
import { Save, Check, X, Clock, HelpCircle } from 'lucide-vue-next'
import { useToastStore } from '../stores/toast'
import { formatDate } from '../utils'

const classStore = useClassStore()
const schoolStore = useSchoolStore()
const toast = useToastStore()

const classId = ref(classStore.classes[0]?.id || '')
const date = ref(new Date().toISOString().slice(0, 10))

const students = computed(() => classStore.studentsOf(classId.value))
const record = computed(() =>
  schoolStore.getAttendance(classId.value, date.value),
)

const statusMap: Record<AttendanceStatus, { color: string; icon: any; bg: string }> = {
  出勤: { color: 'text-mint-500', icon: Check, bg: 'bg-mint-300' },
  迟到: { color: 'text-butter-600', icon: Clock, bg: 'bg-butter-300' },
  请假: { color: 'text-sky2-500', icon: HelpCircle, bg: 'bg-sky2-300' },
  旷课: { color: 'text-sakura-500', icon: X, bg: 'bg-sakura-300' },
}

function getStatus(studentId: string): AttendanceStatus {
  return (
    record.value?.records.find((r) => r.studentId === studentId)?.status || '出勤'
  )
}

function setStatus(studentId: string, status: AttendanceStatus) {
  const prevStatus = getStatus(studentId)
  const list = students.value.map((s) => ({
    studentId: s.id,
    status: s.id === studentId ? status : getStatus(s.id),
  }))
  schoolStore.saveAttendance(classId.value, date.value, list)
  // 新标记为旷课时，自动生成一条班级公告
  if (status === '旷课' && prevStatus !== '旷课') {
    const stu = classStore.getStudent(studentId)
    const cls = classStore.getClass(classId.value)
    schoolStore.addNotice({
      classId: classId.value,
      title: `${stu?.name || '某同学'}今日旷课`,
      content: `${cls?.name || ''} ${stu?.name || ''} 于 ${date.value} 旷课，请家长关注。`,
      pinned: false,
    })
    toast.warning(`已为${stu?.name || '该同学'}生成旷课通知`)
  }
}

function setAll(status: AttendanceStatus) {
  const list = students.value.map((s) => ({ studentId: s.id, status }))
  schoolStore.saveAttendance(classId.value, date.value, list)
  toast.success(`已将全班标记为「${status}」`)
}

const stats = computed(() => {
  const counts: Record<AttendanceStatus, number> = {
    出勤: 0,
    迟到: 0,
    请假: 0,
    旷课: 0,
  }
  for (const s of students.value) {
    counts[getStatus(s.id)]++
  }
  return counts
})

const statusList: AttendanceStatus[] = ['出勤', '迟到', '请假', '旷课']
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-col md:flex-row md:items-center gap-3 justify-between">
      <div class="flex flex-wrap items-center gap-2">
        <select
          v-model="classId"
          class="input-soft !py-2 text-sm w-auto"
        >
          <option
            v-for="c in classStore.classes"
            :key="c.id"
            :value="c.id"
          >
            {{ c.name }}
          </option>
        </select>
        <input
          v-model="date"
          type="date"
          class="input-soft !py-2 text-sm w-auto"
        >
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="s in statusList"
          :key="s"
          class="chip border"
          :class="statusMap[s].bg + ' text-cocoa-900 border-white/80'"
          @click="setAll(s)"
        >
          全部 {{ s }}
        </button>
      </div>
    </div>

    <div class="grid sm:grid-cols-4 gap-3">
      <div
        v-for="s in statusList"
        :key="s"
        class="card-soft p-4 flex items-center gap-3"
      >
        <div
          class="w-12 h-12 rounded-2xl flex items-center justify-center"
          :class="statusMap[s].bg"
        >
          <component
            :is="statusMap[s].icon"
            :size="20"
          />
        </div>
        <div>
          <div class="text-xs text-cocoa-500">
            {{ s }}
          </div>
          <div class="number text-2xl">
            {{ stats[s] }}
          </div>
        </div>
      </div>
    </div>

    <div class="card-soft p-5">
      <h3 class="title-display text-lg mb-3">
        {{ classStore.getClass(classId)?.name }} · {{ formatDate(date, 'YYYY-MM-DD') }}
      </h3>
      <div
        v-if="students.length"
        class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2"
      >
        <div
          v-for="s in students"
          :key="s.id"
          class="card-flat p-3 flex items-center gap-3"
        >
          <div
            class="w-9 h-9 rounded-full bg-butter-300/70 flex items-center justify-center text-base"
          >
            {{ s.gender === '女' ? '👧' : '👦' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">
              {{ s.name }}
            </div>
            <div class="text-[11px] text-cocoa-500 truncate">
              座 {{ s.seatNo }} · {{ s.studentNo || '无学号' }}
            </div>
          </div>
          <div class="flex gap-1">
            <button
              v-for="st in statusList"
              :key="st"
              class="w-8 h-8 rounded-xl flex items-center justify-center transition"
              :class="
                getStatus(s.id) === st
                  ? statusMap[st].bg + ' ' + statusMap[st].color
                  : 'bg-white/60 text-cocoa-300 hover:bg-white'
              "
              :title="st"
              @click="setStatus(s.id, st)"
            >
              <component
                :is="statusMap[st].icon"
                :size="14"
              />
            </button>
          </div>
        </div>
      </div>
      <div
        v-else
        class="text-center text-cocoa-500 py-6"
      >
        这个班级还没有学生
      </div>
    </div>
  </div>
</template>
