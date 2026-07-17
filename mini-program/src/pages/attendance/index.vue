<template>
  <view class="min-h-screen p-4 pb-24">
    <view class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-cocoa-900">考勤管理</h2>
      <picker mode="date" :value="currentDate" @change="onDateChange">
        <view class="btn-secondary text-sm px-4 py-2">{{ currentDate }}</view>
      </picker>
    </view>

    <view class="card-soft p-3 mb-4">
      <picker :value="classIndex" :range="classOptions" @change="onClassChange">
        <view class="flex items-center justify-between">
          <text class="text-cocoa-700">选择班级</text>
          <text class="text-cocoa-300">{{ selectedClassName || '请选择' }}</text>
        </view>
      </picker>
    </view>

    <view v-if="!selectedClassId" class="card-soft p-12 text-center">
      <text class="text-6xl block mb-4">✅</text>
      <text class="text-cocoa-300">请先选择班级</text>
    </view>

    <view v-else class="space-y-3">
      <view
        v-for="student in currentStudents"
        :key="student.id"
        class="card-soft p-4"
      >
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-3">
            <view class="w-10 h-10 rounded-full bg-butter-100 flex items-center justify-center text-lg">
              {{ student.gender === '男' ? '👦' : '👧' }}
            </view>
            <view>
              <text class="font-bold text-cocoa-900">{{ student.name }}</text>
              <text class="text-sm text-cocoa-300">{{ student.studentNo }}</text>
            </view>
          </view>
          <view class="flex items-center gap-2">
            <view
              v-for="status in attendanceStatus"
              :key="status.value"
              @click="setAttendance(student.id, status.value)"
              class="w-10 h-10 rounded-xl flex items-center justify-center text-sm"
              :class="getAttendanceClass(student.id, status.value)"
            >
              {{ status.icon }}
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../../stores/class'

const classStore = useClassStore()
const currentDate = ref(new Date().toISOString().split('T')[0])
const selectedClassId = ref('')
const attendance = ref<Record<string, string>>({})

const attendanceStatus = [
  { value: 'present', icon: '✅', label: '出勤' },
  { value: 'absent', icon: '❌', label: '缺席' },
  { value: 'late', icon: '⏰', label: '迟到' },
]

const classOptions = computed(() => classStore.classes.map((c) => c.name))
const classIndex = computed(() => {
  const index = classStore.classes.findIndex((c) => c.id === selectedClassId.value)
  return index >= 0 ? index : 0
})

const selectedClassName = computed(() => {
  const cls = classStore.getClassById(selectedClassId.value)
  return cls?.name || ''
})

const currentStudents = computed(() => {
  return classStore.getStudentsByClass(selectedClassId.value)
})

if (classStore.classes.length > 0) {
  selectedClassId.value = classStore.classes[0].id
}

const onDateChange = (e: { detail: { value: string } }) => {
  currentDate.value = e.detail.value
}

const onClassChange = (e: { detail: { value: number } }) => {
  selectedClassId.value = classStore.classes[e.detail.value].id
}

const getAttendance = (studentId: string) => {
  return attendance.value[`${currentDate.value}_${studentId}`] || 'present'
}

const getAttendanceClass = (studentId: string, status: string) => {
  const current = getAttendance(studentId)
  if (current === status) {
    switch (status) {
      case 'present': return 'bg-mint-400 text-white'
      case 'absent': return 'bg-red-400 text-white'
      case 'late': return 'bg-yellow-400 text-white'
      default: return 'bg-cocoa-100'
    }
  }
  return 'bg-cocoa-100'
}

const setAttendance = (studentId: string, status: string) => {
  attendance.value[`${currentDate.value}_${studentId}`] = status
}
</script>
