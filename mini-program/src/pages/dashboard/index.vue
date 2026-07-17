<template>
  <view class="min-h-screen p-4 pb-24">
    <view class="card-soft p-5 mb-4">
      <view class="flex items-center gap-4">
        <view class="w-14 h-14 rounded-full bg-butter-300/60 flex items-center justify-center text-3xl">
          {{ userStore.user?.avatar || '👨‍🏫' }}
        </view>
        <view>
          <h2 class="text-xl font-bold text-cocoa-900">{{ userStore.user?.name }}</h2>
          <p class="text-sm text-cocoa-300">{{ userStore.user?.school }} · {{ userStore.user?.subject }}</p>
        </view>
      </view>
    </view>

    <view class="grid grid-cols-2 gap-3 mb-4">
      <view class="card-soft p-4">
        <view class="text-3xl font-bold text-butter-500">{{ classStore.classCount }}</view>
        <view class="text-sm text-cocoa-300">班级数</view>
      </view>
      <view class="card-soft p-4">
        <view class="text-3xl font-bold text-mint-500">{{ classStore.totalStudents }}</view>
        <view class="text-sm text-cocoa-300">学生数</view>
      </view>
    </view>

    <view class="card-soft p-4">
      <h3 class="font-bold text-cocoa-900 mb-4">快捷功能</h3>
      <view class="grid grid-cols-4 gap-4">
        <view
          v-for="item in quickActions"
          :key="item.url"
          @click="navigateTo(item.url)"
          class="flex flex-col items-center gap-2"
        >
          <view class="w-12 h-12 rounded-2xl bg-butter-100/60 flex items-center justify-center text-xl">
            {{ item.icon }}
          </view>
          <text class="text-xs text-cocoa-700">{{ item.text }}</text>
        </view>
      </view>
    </view>

    <view class="card-soft p-4 mt-4">
      <h3 class="font-bold text-cocoa-900 mb-4">我的班级</h3>
      <view v-if="classStore.classes.length === 0" class="text-center py-8 text-cocoa-300">
        <text class="text-4xl block mb-2">📚</text>
        <text>暂无班级，快去创建吧</text>
      </view>
      <view v-else class="space-y-3">
        <view
          v-for="cls in classStore.classes.slice(0, 3)"
          :key="cls.id"
          @click="navigateTo(`/pages/students/index?classId=${cls.id}`)"
          class="flex items-center justify-between p-3 bg-white/60 rounded-2xl"
        >
          <view class="flex items-center gap-3">
            <view
              class="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
              :style="{ backgroundColor: cls.color }"
            >
              {{ cls.name.charAt(0) }}
            </view>
            <view>
              <text class="font-medium text-cocoa-900">{{ cls.name }}</text>
              <text class="text-xs text-cocoa-300 ml-2">{{ classStore.getStudentsByClass(cls.id).length }}人</text>
            </view>
          </view>
          <text class="text-cocoa-300">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { useUserStore } from '../../stores/user'
import { useClassStore } from '../../stores/class'

const userStore = useUserStore()
const classStore = useClassStore()

const quickActions = [
  { icon: '📝', text: '作业', url: '/pages/homework/index' },
  { icon: '✅', text: '考勤', url: '/pages/attendance/index' },
  { icon: '📊', text: '成绩', url: '/pages/grades/index' },
  { icon: '👨‍👩‍👧', text: '学生', url: '/pages/students/index' },
]

const navigateTo = (url: string) => {
  uni.navigateTo({ url })
}
</script>
