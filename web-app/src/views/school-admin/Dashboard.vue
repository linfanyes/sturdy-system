<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getDashboard } from '@/api/school-admin'
import { Users, GraduationCap, School, Phone, TrendingUp, ClipboardList } from 'lucide-vue-next'

const auth = useAuthStore()
const loading = ref(true)
const stats = ref<any>({})

async function loadDashboard() {
  loading.value = true
  try {
    stats.value = await getDashboard()
  } catch (e: any) {
    // 静默处理，dashboard 非关键
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)

const cards = ref([
  { key: 'totalTeachers', label: '教师总数', icon: Users, color: 'butter' },
  { key: 'totalClasses', label: '班级总数', icon: School, color: 'mint' },
  { key: 'totalStudents', label: '学生总数', icon: GraduationCap, color: 'sky2' },
  { key: 'parentEnabled', label: '家长已开通', icon: Phone, color: 'sakura' },
  { key: 'attendanceRate', label: '今日考勤率', icon: TrendingUp, color: 'butter', suffix: '%' },
  { key: 'pendingHomework', label: '待批改作业', icon: ClipboardList, color: 'mint' },
])
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-end">
      <button
        class="px-4 py-2 rounded-xl bg-cream-100 text-cocoa-700 text-sm hover:bg-cream-200 transition-colors"
        @click="loadDashboard"
        :disabled="loading"
      >
        {{ loading ? '刷新中…' : '刷新' }}
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="card in cards"
        :key="card.key"
        class="bg-white rounded-2xl p-5 shadow-softer flex items-center gap-4"
      >
        <div
          :class="[
            'w-12 h-12 rounded-xl flex items-center justify-center',
            card.color === 'butter' ? 'bg-butter-100' : '',
            card.color === 'mint' ? 'bg-mint-100' : '',
            card.color === 'sky2' ? 'bg-sky2-100' : '',
            card.color === 'sakura' ? 'bg-sakura-100' : '',
          ]"
        >
          <component
            :is="card.icon"
            :class="[
              'w-6 h-6',
              card.color === 'butter' ? 'text-butter-600' : '',
              card.color === 'mint' ? 'text-mint-500' : '',
              card.color === 'sky2' ? 'text-sky2-500' : '',
              card.color === 'sakura' ? 'text-sakura-500' : '',
            ]"
          />
        </div>
        <div>
          <div class="text-sm text-cocoa-500">{{ card.label }}</div>
          <div class="text-2xl font-bold text-cocoa-900 mt-0.5">
            {{ loading ? '—' : (stats[card.key] ?? '-') }}{{ card.suffix || '' }}
          </div>
        </div>
      </div>
    </div>

    <!-- 当前账号信息 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="text-sm font-semibold text-cocoa-700 mb-3">当前账号</div>
      <div class="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span class="text-cocoa-500">姓名：</span>
          <span class="text-cocoa-900 font-medium">{{ auth.user?.name }}</span>
        </div>
        <div>
          <span class="text-cocoa-500">学校：</span>
          <span class="text-cocoa-900 font-medium">{{ auth.user?.schoolName || auth.user?.schoolId || '-' }}</span>
        </div>
        <div>
          <span class="text-cocoa-500">日期：</span>
          <span class="text-cocoa-900 font-medium">{{ stats.todayDate || '-' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
