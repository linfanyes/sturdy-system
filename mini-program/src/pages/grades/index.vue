<template>
  <view class="min-h-screen p-4 pb-24">
    <view class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-cocoa-900">成绩管理</h2>
      <button @click="showAddModal = true" class="btn-primary text-sm px-4 py-2">
        + 新建成绩
      </button>
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
      <text class="text-6xl block mb-4">📊</text>
      <text class="text-cocoa-300">请先选择班级</text>
    </view>

    <view v-else class="card-soft p-4">
      <h3 class="font-bold text-cocoa-900 mb-4">最近考试成绩</h3>
      <view v-if="exams.length === 0" class="text-center py-8 text-cocoa-300">
        <text class="text-4xl block mb-2">📝</text>
        <text>暂无考试成绩</text>
      </view>
      <view v-else class="space-y-3">
        <view
          v-for="exam in exams"
          :key="exam.id"
          class="flex items-center justify-between p-3 bg-white/60 rounded-2xl"
        >
          <view>
            <text class="font-medium text-cocoa-900">{{ exam.name }}</text>
            <text class="text-sm text-cocoa-300 block">{{ exam.date }}</text>
          </view>
          <text class="text-cocoa-300">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useClassStore } from '../../stores/class'

const classStore = useClassStore()
const showAddModal = ref(false)
const selectedClassId = ref('')

interface Exam {
  id: string
  name: string
  date: string
  subject: string
}

const exams = ref<Exam[]>([])

const classOptions = computed(() => classStore.classes.map((c) => c.name))
const classIndex = computed(() => {
  const index = classStore.classes.findIndex((c) => c.id === selectedClassId.value)
  return index >= 0 ? index : 0
})

const selectedClassName = computed(() => {
  const cls = classStore.getClassById(selectedClassId.value)
  return cls?.name || ''
})

if (classStore.classes.length > 0) {
  selectedClassId.value = classStore.classes[0].id
}

const onClassChange = (e: { detail: { value: number } }) => {
  selectedClassId.value = classStore.classes[e.detail.value].id
}
</script>
