<template>
  <div class="min-h-[100dvh] bg-cream-50 p-4">
    <!-- 返回 -->
    <button class="flex items-center gap-1 text-sm text-cocoa-500 mb-4 cursor-pointer hover:text-cocoa-700" @click="router.back()">
      ← 返回看板
    </button>

    <h1 class="text-lg font-bold mb-2 text-cocoa-900">📊 跨娃成绩比对</h1>
    <p class="text-xs text-cocoa-400 mb-4">⚠️ 排名为各班内部排名，不可跨班比较</p>

    <!-- 加载骨架 -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 2" :key="i" class="h-40 rounded-2xl bg-cream-100 animate-pulse"></div>
    </div>

    <!-- 错误态 -->
    <div v-else-if="error" class="rounded-2xl bg-surface p-8 text-center shadow-softer">
      <p class="text-sakura-600 mb-3 text-sm">数据加载失败</p>
      <button class="text-sm rounded-xl bg-mint-500 text-white px-4 py-2 hover:bg-mint-600" @click="fetchData">点击重试</button>
    </div>

    <!-- 空态 -->
    <div v-else-if="!data?.exams?.length" class="rounded-2xl bg-surface p-8 text-center text-sm text-cocoa-400 shadow-softer">
      暂无考试数据
    </div>

    <!-- 比对表 -->
    <div v-else class="space-y-4">
      <div v-for="exam in data.exams" :key="exam.examName" class="bg-surface rounded-2xl p-4 shadow-softer">
        <div class="font-semibold mb-3 text-cocoa-900">{{ exam.examName }} <span class="text-xs text-cocoa-400 ml-2 font-normal">{{ exam.date }}</span></div>

        <!-- 孩子成绩行 -->
        <div v-for="(score, sid) in exam.rows" :key="sid"
          class="flex items-center justify-between py-2 border-b border-cream-100 last:border-0">
          <div>
            <span class="font-medium text-cocoa-900">{{ getName(sid) }}</span>
            <span class="ml-2 text-sm text-cocoa-500">总分 {{ score.totalScore || '-' }}/{{ score.totalFullScore || '-' }}</span>
          </div>
          <div class="text-sm" :class="score.classRank <= 5 ? 'text-mint-600 font-semibold' : 'text-cocoa-500'">
            排名 {{ score.classRank ? `第${score.classRank}名` : '-' }}
          </div>
        </div>

        <!-- 各科对比 -->
        <div v-if="hasSubjects(exam)" class="mt-3 pt-3 border-t border-dashed border-cream-200">
          <div class="text-xs text-cocoa-400 mb-2">各科对比</div>
          <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead><tr class="text-cocoa-400"><th class="text-left">科目</th><th v-for="(score, sid) in exam.rows" :key="sid" class="text-right">{{ getName(sid) }}</th></tr></thead>
            <tbody>
              <tr v-for="subject in getSubjects(exam)" :key="subject" class="border-b border-cream-100 last:border-0">
                <td class="py-1 text-cocoa-700">{{ subject }}</td>
                <td v-for="(score, sid) in exam.rows" :key="sid" class="text-right py-1 text-cocoa-700">
                  {{ score.subjects?.find((s: any) => s.subject === subject)?.score || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getKidsComparison } from '@/api/parent'

const router = useRouter()
const data = ref<any>(null)
const loading = ref(true)
const error = ref(false)

function getName(studentId: string | number) {
  return data.value?.kids?.find((k: any) => k.studentId === String(studentId))?.studentName || '未知'
}
function hasSubjects(exam: any) {
  return Object.values(exam.rows || {}).some((r: any) => r.subjects?.length)
}
function getSubjects(exam: any) {
  const all = Object.values(exam.rows || {}).flatMap((r: any) => r.subjects?.map((s: any) => s.subject) || [])
  return [...new Set(all)]
}

async function fetchData() {
  loading.value = true
  error.value = false
  try {
    const res = await getKidsComparison()
    data.value = res
  } catch (e) {
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>
