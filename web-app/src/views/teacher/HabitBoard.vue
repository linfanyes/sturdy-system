<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { classChallenges, habitRanking } from '@/api/habit'
import { useClasses } from '@/composables/useClasses'

const { classes, loadClasses } = useClasses()
const classId = ref('')
const tab = ref<'challenges' | 'ranking'>('ranking')

const loading = ref(false)
const challenges = ref<any[]>([])
const ranking = ref<any[]>([])

const TYPE_LABEL: Record<string, string> = { reading: '阅读', sport: '运动', early_sleep: '早睡', other: '其他' }
const MEDAL = ['🥇', '🥈', '🥉']

async function load() {
  if (!classId.value) { challenges.value = []; ranking.value = []; return }
  loading.value = true
  try {
    if (tab.value === 'challenges') {
      challenges.value = await classChallenges(classId.value)
    } else {
      ranking.value = await habitRanking(classId.value)
    }
  } catch (e: any) {
    alert('加载失败：' + (e?.message || e))
  } finally {
    loading.value = false
  }
}

function switchTab(t: 'challenges' | 'ranking') {
  tab.value = t
  load()
}

onMounted(async () => {
  await loadClasses()
  if (classes.value.length) classId.value = classes.value[0].id
  load()
})
</script>

<template>
  <div class="mx-auto max-w-5xl p-4">
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-gray-800">21 天习惯养成</h1>
        <p class="text-sm text-gray-500">阅读、运动、早睡——小坚持，大改变。</p>
      </div>
      <select v-model="classId" class="rounded-lg border border-gray-200 px-3 py-2 text-sm" @change="load">
        <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
      </select>
    </div>

    <div class="mb-4 flex items-center gap-3 text-sm">
      <button class="rounded-lg px-3 py-2" :class="tab === 'ranking' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'" @click="switchTab('ranking')">打卡排行榜</button>
      <button class="rounded-lg px-3 py-2" :class="tab === 'challenges' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'" @click="switchTab('challenges')">班级挑战</button>
    </div>

    <div v-if="loading" class="text-sm text-gray-400">加载中…</div>
    <div v-else-if="!classId" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">请先选择班级。</div>

    <template v-else-if="tab === 'ranking'">
      <div v-if="!ranking.length" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">还没有打卡记录，鼓励孩子们先发起挑战吧。</div>
      <div v-else class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div v-for="(r, i) in ranking" :key="r.studentId" class="flex items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-0">
          <span class="w-8 text-center text-lg">{{ MEDAL[i] || (i + 1) }}</span>
          <span class="flex-1 font-medium text-gray-800">{{ r.studentName }}</span>
          <span class="text-sm text-orange-600">连续 {{ r.streak }} 天</span>
          <span class="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-600">累计 {{ r.total }} 次</span>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-if="!challenges.length" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-400">该班级暂无习惯挑战。</div>
      <div v-else class="grid gap-3 sm:grid-cols-2">
        <div v-for="c in challenges" :key="c.id" class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <span class="font-semibold text-gray-800">{{ c.title }}</span>
            <span class="rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-600">{{ TYPE_LABEL[c.type] || c.type }}</span>
          </div>
          <p class="mt-1 text-sm text-gray-500">目标连续 {{ c.targetDays }} 天 · 由{{ c.createdByRole === 'teacher' ? '老师' : '家长' }}发起</p>
        </div>
      </div>
    </template>
  </div>
</template>
