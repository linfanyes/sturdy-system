<template>
  <view class="min-h-screen flex flex-col items-center justify-center p-6 bg-cream-100">
    <view class="text-center mb-10">
      <view class="text-6xl mb-4">🏫</view>
      <h1 class="text-3xl font-bold text-cocoa-900 mb-2">园丁工作台</h1>
      <p class="text-cocoa-300">教师专用 · 用心教育</p>
    </view>

    <view class="card-soft w-full max-w-sm p-6">
      <view class="space-y-4">
        <view>
          <label class="block text-sm font-medium text-cocoa-700 mb-1">姓名</label>
          <input
            v-model="form.name"
            class="input-soft"
            placeholder="请输入您的姓名"
          />
        </view>
        <view>
          <label class="block text-sm font-medium text-cocoa-700 mb-1">任教学科</label>
          <input
            v-model="form.subject"
            class="input-soft"
            placeholder="如：语文、数学、英语"
          />
        </view>
        <view>
          <label class="block text-sm font-medium text-cocoa-700 mb-1">学校名称</label>
          <input
            v-model="form.school"
            class="input-soft"
            placeholder="请输入学校名称"
          />
        </view>

        <button
          @click="handleLogin"
          :disabled="!isValid"
          class="btn-primary w-full mt-6"
          :class="{ 'opacity-50': !isValid }"
        >
          开始使用
        </button>
      </view>
    </view>

    <view class="mt-8 text-center text-cocoa-300 text-sm">
      <p>本地数据存储 · 隐私安全保障</p>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()

const form = ref({
  name: '',
  subject: '',
  school: '',
})

const isValid = computed(() => {
  return form.value.name.trim() && form.value.subject.trim() && form.value.school.trim()
})

const handleLogin = () => {
  if (!isValid.value) return
  userStore.login(form.value.name, form.value.subject, form.value.school)
  uni.switchTab({
    url: '/pages/dashboard/index',
  })
}
</script>
