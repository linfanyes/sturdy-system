<template>
  <view class="min-h-screen p-4 pb-24">
    <view class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-cocoa-900">学生管理</h2>
      <button @click="showAddModal = true" class="btn-primary text-sm px-4 py-2">
        + 添加学生
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

    <view v-if="filteredStudents.length === 0" class="card-soft p-12 text-center">
      <text class="text-6xl block mb-4">👧</text>
      <text class="text-cocoa-300">暂无学生</text>
    </view>

    <view v-else class="space-y-3">
      <view
        v-for="student in filteredStudents"
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
              <text class="text-sm text-cocoa-300 ml-2">{{ student.studentNo }}</text>
            </view>
          </view>
          <text class="text-cocoa-300">›</text>
        </view>
        <view class="mt-2 text-sm text-cocoa-500">
          <text>家长：{{ student.parentName }}</text>
          <text class="ml-4">电话：{{ student.parentPhone }}</text>
        </view>
        <view class="flex items-center gap-3 mt-3 pt-3 border-t border-cocoa-100/60">
          <button @click="editStudent(student)" class="btn-secondary text-sm px-4 py-1">编辑</button>
          <button @click="deleteStudent(student.id)" class="text-red-500 text-sm px-4 py-1">删除</button>
        </view>
      </view>
    </view>

    <view v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <view class="card-soft w-full max-w-sm p-6 max-h-[80vh] overflow-y-auto">
        <h3 class="text-lg font-bold text-cocoa-900 mb-4">{{ editingStudent ? '编辑学生' : '添加学生' }}</h3>
        <view class="space-y-3">
          <input
            v-model="form.name"
            class="input-soft"
            placeholder="姓名"
          />
          <picker :value="genderIndex" :range="['男', '女']" @change="onGenderChange">
            <view class="input-soft">{{ form.gender }}</view>
          </picker>
          <input
            v-model="form.studentNo"
            class="input-soft"
            placeholder="学号"
          />
          <input
            v-model="form.seatNo"
            class="input-soft"
            type="number"
            placeholder="座位号"
          />
          <input
            v-model="form.parentName"
            class="input-soft"
            placeholder="家长姓名"
          />
          <input
            v-model="form.parentPhone"
            class="input-soft"
            placeholder="家长电话"
          />
          <textarea
            v-model="form.note"
            class="input-soft"
            placeholder="备注信息"
            :rows="3"
          />
        </view>
        <view class="flex gap-3 mt-6">
          <button @click="showAddModal = false" class="btn-secondary flex-1">取消</button>
          <button @click="saveStudent" class="btn-primary flex-1">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onLoad } from '@dcloudio/uni-app'
import { useClassStore } from '../../stores/class'
import type { Student } from '../../types'

const classStore = useClassStore()
const showAddModal = ref(false)
const editingStudent = ref<Student | null>(null)
const selectedClassId = ref('')

const classOptions = computed(() => classStore.classes.map((c) => c.name))
const classIndex = computed(() => {
  const index = classStore.classes.findIndex((c) => c.id === selectedClassId.value)
  return index >= 0 ? index : 0
})

const selectedClassName = computed(() => {
  const cls = classStore.getClassById(selectedClassId.value)
  return cls?.name || ''
})

const filteredStudents = computed(() => {
  if (!selectedClassId.value && classStore.classes.length > 0) {
    selectedClassId.value = classStore.classes[0].id
  }
  return classStore.getStudentsByClass(selectedClassId.value)
})

const form = ref({
  name: '',
  gender: '男',
  studentNo: '',
  seatNo: 0,
  parentName: '',
  parentPhone: '',
  note: '',
  tags: [],
})

const genderIndex = computed(() => (form.value.gender === '男' ? 0 : 1))

onLoad((options) => {
  if (options?.classId) {
    selectedClassId.value = options.classId
  } else if (classStore.classes.length > 0) {
    selectedClassId.value = classStore.classes[0].id
  }
})

const onClassChange = (e: { detail: { value: number } }) => {
  selectedClassId.value = classStore.classes[e.detail.value].id
}

const onGenderChange = (e: { detail: { value: number } }) => {
  form.value.gender = e.detail.value === 0 ? '男' : '女'
}

const editStudent = (student: Student) => {
  editingStudent.value = student
  form.value = {
    name: student.name,
    gender: student.gender,
    studentNo: student.studentNo,
    seatNo: student.seatNo,
    parentName: student.parentName,
    parentPhone: student.parentPhone,
    note: student.note,
    tags: student.tags,
  }
  showAddModal.value = true
}

const saveStudent = () => {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  if (!selectedClassId.value) {
    uni.showToast({ title: '请先选择班级', icon: 'none' })
    return
  }
  if (editingStudent.value) {
    classStore.updateStudent(editingStudent.value.id, form.value)
  } else {
    classStore.addStudent({ ...form.value, classId: selectedClassId.value })
  }
  showAddModal.value = false
  editingStudent.value = null
  uni.showToast({ title: '保存成功', icon: 'success' })
}

const deleteStudent = (id: string) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除该学生吗？',
    success: (res) => {
      if (res.confirm) {
        classStore.deleteStudent(id)
        uni.showToast({ title: '删除成功', icon: 'success' })
      }
    },
  })
}
</script>
