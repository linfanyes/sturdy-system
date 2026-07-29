<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <!-- 返回 -->
    <div @click="router.back()" class="flex items-center gap-1 text-gray-500 mb-4 cursor-pointer">
      ← 返回看板
    </div>

    <h1 class="text-lg font-bold mb-2">📊 跨娃成绩比对</h1>
    <p class="text-xs text-gray-400 mb-4">⚠️ 排名为各班内部排名，不可跨班比较</p>

    <!-- 加载态 -->
    <div v-if="loading" class="text-center py-10 text-gray-400">加载中…</div>

    <!-- 错误态 -->
    <div v-else-if="error" class="text-center py-10">
      <p class="text-red-500 mb-2">数据加载失败</p>
      <button @click="fetchData" class="text-sm text-[#07c160] underline">点击重试</button>
    </div>

    <!-- 空态 -->
    <div v-else-if="!data?.exams?.length" class="text-center py-10 text-gray-400">暂无考试数据</div>

    <!-- 比对表 -->
    <div v-else class="space-y-4">
      <div v-for="exam in data.exams" :key="exam.examName"
        class="bg-white rounded-xl p-4 shadow-sm">
        <div class="font-semibold mb-3">{{ exam.examName }} <span class="text-xs text-gray-400 ml-2">{{ exam.date }}</span></div>

        <!-- 孩子成绩行 -->
        <div v-for="(score, sid) in exam.rows" :key="sid"
          class="flex items-center justify-between py-2 border-b last:border-0">
          <div>
            <span class="font-medium">{{ getName(sid) }}</span>
            <span class="ml-2 text-sm text-gray-500">总分 {{ score.totalScore || '-' }}/{{ score.totalFullScore || '-' }}</span>
          </div>
          <div class="text-sm" :class="score.classRank <= 5 ? 'text-green-600 font-medium' : 'text-gray-500'">
            排名 {{ score.classRank ? `第${score.classRank}名` : '-' }}
          </div>
        </div>

        <!-- 各科对比 -->
        <div v-if="hasSubjects(exam)" class="mt-3 pt-3 border-t border-dashed">
          <div class="text-xs text-gray-400 mb-2">各科对比</div>
          <table class="w-full text-xs">
            <thead><tr class="text-gray-400"><th class="text-left">科目</th><th v-for="(score, sid) in exam.rows" :key="sid" class="text-right">{{ getName(sid) }}</th></tr></thead>
            <tbody>
              <tr v-for="subject in getSubjects(exam)" :key="subject" class="border-b">
                <td class="py-1">{{ subject }}</td>
                <td v-for="(score, sid) in exam.rows" :key="sid" class="text-right py-1">
                  {{ score.subjects?.find((s: any) => s.subject === subject)?.score || '-' }}
                </td>
              </tr>
            </tbody>
          </table>
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

function getName(studentId: string) {
  return data.value?.kids?.find((k: any) => k.studentId === studentId)?.studentName || '未知'
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
