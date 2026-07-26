<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUnreadCount } from '@/api/notification'
import { Sparkles, Heart, Star, TrendingUp, Bell, Loader2 } from 'lucide-vue-next'

const auth = useAuthStore()
const router = useRouter()
const unreadCount = ref(0)
const greeting = computed(() => { const h = new Date().getHours(); return h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 18 ? '下午好' : '晚上好' })

onMounted(async () => {
  try { const r = await getUnreadCount(); unreadCount.value = r?.count ?? 0 } catch { }
})
</script>

<template>
  <div class="space-y-6">
    <!-- 欢迎横幅 -->
    <div class="welcome-banner">
      <div class="relative z-10 flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-sakura-300/30 backdrop-blur flex items-center justify-center">
          <Heart class="w-7 h-7 text-sakura-600" />
        </div>
        <div class="flex-1">
          <div class="text-xl font-bold text-cocoa-900">{{ greeting }}，<span class="text-sakura-600">{{ auth.user?.name?.replace(/家长$/, '') || '家长' }}</span></div>
          <div class="text-sm text-cocoa-600/80 mt-0.5">
            <template v-if="auth.user?.studentName">孩子：{{ auth.user.studentName }}</template>
            <template v-else>家长中心</template>
          </div>
        </div>
        <button class="relative p-2 rounded-xl bg-white/60 hover:bg-white/90 transition-colors" @click="router.push('/teacher/notifications')">
          <Bell class="w-5 h-5 text-cocoa-600" />
          <span v-if="unreadCount > 0" class="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-sakura-500 text-white text-[10px] font-semibold flex items-center justify-center">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Star class="w-4 h-4 text-butter-500" /> 孩子动态</div>
        <div class="text-sm text-cocoa-700 mt-1">学校的最新通知、考试与活动</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><TrendingUp class="w-4 h-4 text-mint-500" /> 学习成长</div>
        <div class="text-sm text-cocoa-700 mt-1">关注孩子的学习成绩与进步</div>
      </div>
      <div class="stat-card">
        <div class="flex items-center gap-2 text-sm text-cocoa-500 mb-1"><Heart class="w-4 h-4 text-sakura-500" /> 家校沟通</div>
        <div class="text-sm text-cocoa-700 mt-1">与老师保持联系，共同育人</div>
      </div>
    </div>

    <div class="empty-state" style="padding-top:3rem">
      <div class="icon">🌟</div>
      <div class="title">欢迎来到家长中心</div>
      <div class="desc">更多功能正在开放中，敬请期待</div>
    </div>
  </div>
</template>
