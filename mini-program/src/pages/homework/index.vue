<template>
  <view class="min-h-screen p-4 pb-24">
    <view class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold text-cocoa-900">作业管理</h2>
      <button @click="showAddModal = true" class="btn-primary text-sm px-4 py-2">
        + 布置作业
      </button>
    </view>

    <view v-if="homeworks.length === 0" class="card-soft p-12 text-center">
      <text class="text-6xl block mb-4">📝</text>
      <text class="text-cocoa-300">暂无作业</text>
    </view>

    <view v-else class="space-y-3">
      <view
        v-for="hw in homeworks"
        :key="hw.id"
        class="card-soft p-4"
      >
        <view class="flex items-start justify-between">
          <view>
            <text class="font-bold text-cocoa-900 text-lg">{{ hw.title }}</text>
            <text class="text-sm text-cocoa-300 block">{{ hw.subject }} · {{ hw.date }}</text>
          </view>
          <view
            class="px-3 py-1 rounded-full text-xs font-medium"
            :class="hw.status === 'done' ? 'bg-mint-100 text-mint-500' : 'bg-butter-100 text-butter-500'"
          >
            {{ hw.status === 'done' ? '已完成' : '待批改' }}
          </view>
        </view>
        <view class="mt-2 text-cocoa-500">{{ hw.content }}</view>
      </view>
    </view>

    <view v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <view class="card-soft w-full max-w-sm p-6">
        <h3 class="text-lg font-bold text-cocoa-900 mb-4">布置作业</h3>
        <view class="space-y-3">
          <input
            v-model="form.title"
            class="input-soft"
            placeholder="作业标题"
          />
          <input
            v-model="form.subject"
            class="input-soft"
            placeholder="学科"
          />
          <textarea
            v-model="form.content"
            class="input-soft"
            placeholder="作业内容"
            :rows="4"
          />
        </view>
        <view class="flex gap-3 mt-6">
          <button @click="showAddModal = false" class="btn-secondary flex-1">取消</button>
          <button @click="saveHomework" class="btn-primary flex-1">发布</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Homework {
  id: string
  title: string
  subject: string
  content: string
  date: string
  status: 'done' | 'pending'
}

const showAddModal = ref(false)
const homeworks = ref<Homework[]>([])

const form = ref({
  title: '',
  subject: '',
  content: '',
})

const saveHomework = () => {
  if (!form.value.title.trim()) {
    uni.showToast({ title: '请输入作业标题', icon: 'none' })
    return
  }
  homeworks.value.unshift({
    id: `hw_${Date.now()}`,
    title: form.value.title,
    subject: form.value.subject || '未指定',
    content: form.value.content,
    date: new Date().toLocaleDateString(),
    status: 'pending',
  })
  showAddModal.value = false
  form.value = { title: '', subject: '', content: '' }
  uni.showToast({ title: '发布成功', icon: 'success' })
}
</script>
