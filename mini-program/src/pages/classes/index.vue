<template>
  <view class="min-h-screen p-4 pb-24">
    <view class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-cocoa-900">班级管理</h2>
      <button @click="showAddModal = true" class="btn-primary text-sm px-4 py-2">
        + 新建班级
      </button>
    </view>

    <view v-if="classStore.classes.length === 0" class="card-soft p-12 text-center">
      <text class="text-6xl block mb-4">🏫</text>
      <text class="text-cocoa-300">暂无班级</text>
      <button @click="showAddModal = true" class="btn-primary mt-4">创建第一个班级</button>
    </view>

    <view v-else class="space-y-3">
      <view
        v-for="cls in classStore.classes"
        :key="cls.id"
        class="card-soft p-4"
      >
        <view class="flex items-center justify-between">
          <view class="flex items-center gap-4">
            <view
              class="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold"
              :style="{ backgroundColor: cls.color }"
            >
              {{ cls.name.charAt(0) }}
            </view>
            <view>
              <text class="font-bold text-cocoa-900 text-lg">{{ cls.name }}</text>
              <text class="text-sm text-cocoa-300 block">{{ cls.term }}</text>
            </view>
          </view>
          <view class="flex items-center gap-2">
            <text class="text-sm text-cocoa-300">{{ classStore.getStudentsByClass(cls.id).length }}人</text>
            <text class="text-cocoa-300">›</text>
          </view>
        </view>
        <view class="flex items-center gap-4 mt-3 pt-3 border-t border-cocoa-100/60">
          <text class="text-sm text-cocoa-500">{{ cls.slogan }}</text>
        </view>
        <view class="flex items-center gap-3 mt-3">
          <button @click="editClass(cls)" class="btn-secondary text-sm px-4 py-1">编辑</button>
          <button @click="deleteClass(cls.id)" class="text-red-500 text-sm px-4 py-1">删除</button>
        </view>
      </view>
    </view>

    <view v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <view class="card-soft w-full max-w-sm p-6">
        <h3 class="text-lg font-bold text-cocoa-900 mb-4">{{ editingClass ? '编辑班级' : '新建班级' }}</h3>
        <view class="space-y-3">
          <input
            v-model="form.name"
            class="input-soft"
            placeholder="班级名称（如：三年级二班）"
          />
          <input
            v-model="form.grade"
            class="input-soft"
            placeholder="年级（如：三年级）"
          />
          <input
            v-model="form.classNo"
            class="input-soft"
            placeholder="班号（如：2）"
          />
          <input
            v-model="form.slogan"
            class="input-soft"
            placeholder="班级口号"
          />
          <input
            v-model="form.headTeacher"
            class="input-soft"
            placeholder="班主任姓名"
          />
          <view class="flex gap-2">
            <view
              v-for="color in colors"
              :key="color"
              @click="form.color = color"
              class="w-8 h-8 rounded-full cursor-pointer"
              :class="{ 'ring-2 ring-offset-2 ring-cocoa-300': form.color === color }"
              :style="{ backgroundColor: color }"
            />
          </view>
        </view>
        <view class="flex gap-3 mt-6">
          <button @click="showAddModal = false" class="btn-secondary flex-1">取消</button>
          <button @click="saveClass" class="btn-primary flex-1">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useClassStore } from '../../stores/class'
import type { ClassItem } from '../../types'

const classStore = useClassStore()
const showAddModal = ref(false)
const editingClass = ref<ClassItem | null>(null)

const colors = ['#F5BE52', '#54bc83', '#F47b98', '#4fa3e0', '#8e7858']

const form = ref({
  name: '',
  grade: '',
  classNo: '',
  slogan: '',
  headTeacher: '',
  color: colors[0],
  term: '2026春季学期',
  teachers: [],
  subjects: [],
})

const editClass = (cls: ClassItem) => {
  editingClass.value = cls
  form.value = {
    name: cls.name,
    grade: cls.grade,
    classNo: cls.classNo,
    slogan: cls.slogan,
    headTeacher: cls.headTeacher,
    color: cls.color,
    term: cls.term,
    teachers: cls.teachers,
    subjects: cls.subjects,
  }
  showAddModal.value = true
}

const saveClass = () => {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请输入班级名称', icon: 'none' })
    return
  }
  if (editingClass.value) {
    classStore.updateClass(editingClass.value.id, form.value)
  } else {
    classStore.addClass(form.value)
  }
  showAddModal.value = false
  editingClass.value = null
  uni.showToast({ title: '保存成功', icon: 'success' })
}

const deleteClass = (id: string) => {
  uni.showModal({
    title: '确认删除',
    content: '删除班级将同时删除该班级的所有学生数据',
    success: (res) => {
      if (res.confirm) {
        classStore.deleteClass(id)
        uni.showToast({ title: '删除成功', icon: 'success' })
      }
    },
  })
}
</script>
