<script setup lang="ts">
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import { toast } from '@/utils/feedback'

const props = defineProps<{
  loading: boolean
  classId: string
  grades: any[]
  selectedSubject: string
  keyword: string
  page: number
  pageSize: number
  className: (id: string) => string
}>()

const emit = defineEmits<{
  (e: 'update:page', v: number): void
  (e: 'update:pageSize', v: number): void
  (e: 'reload'): void
}>()

const filtered = computed(() => {
  let list = props.grades
  if (props.selectedSubject) {
    list = list.filter(g => g.subject === props.selectedSubject)
  }
  if (props.keyword) {
    const kw = props.keyword.toLowerCase()
    list = list.filter(g =>
      g.examName?.toLowerCase().includes(kw) ||
      g.subject?.toLowerCase().includes(kw),
    )
  }
  return list
})

const totalFiltered = computed(() => filtered.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(totalFiltered.value / props.pageSize)))
const displayedGrades = computed(() => {
  const start = props.page * props.pageSize
  return filtered.value.slice(start, start + props.pageSize)
})

function scoreSummary(g: any): string {
  if (!g.scores?.length) return '暂无'
  const valid = g.scores.filter((s: any) => s.score != null).map((s: any) => s.score)
  if (!valid.length) return '暂无'
  const avg = (valid.reduce((a: number, b: number) => a + b, 0) / valid.length).toFixed(1)
  return `${valid.length}人 均${avg} 最高${Math.max(...valid)} 最低${Math.min(...valid)}`
}

async function handleDelete(g: any) {
  if (!await confirm(`确定删除「${g.examName} - ${g.subject}」的成绩记录？`)) return
  try {
    const { removeGrade } = await import('@/api/teacher')
    await removeGrade(g.id)
    emit('reload')
  } catch (e: any) {
    toast.error(e?.message || '删除失败')
  }
}
</script>

<template>
  <!-- 列表 -->
  <div class="table-wrap">
    <table class="w-full text-sm">
      <thead class="bg-cream-100 text-cocoa-500 text-left">
        <tr>
          <th class="px-4 py-3 font-medium">考试名称</th>
          <th class="px-4 py-3 font-medium">科目</th>
          <th class="px-4 py-3 font-medium">班级</th>
          <th class="px-4 py-3 font-medium">日期</th>
          <th class="px-4 py-3 font-medium">成绩汇总</th>
          <th class="px-4 py-3 font-medium text-right">操作</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-cream-100">
        <tr v-if="loading" class="text-center text-cocoa-400">
          <td colspan="6" class="py-8">加载中…</td>
        </tr>
        <tr v-else-if="!classId" class="text-center text-cocoa-400">
          <td colspan="6" class="py-8">请先选择班级</td>
        </tr>
        <tr v-else-if="totalFiltered === 0" class="text-center text-cocoa-400">
          <td colspan="6" class="py-8">暂无成绩数据</td>
        </tr>
        <tr v-for="g in displayedGrades" :key="g.id" class="hover:bg-cream-50 transition-colors">
          <td class="px-4 py-3 font-medium text-cocoa-900">{{ g.examName }}</td>
          <td class="px-4 py-3 text-cocoa-700">{{ g.subject }}</td>
          <td class="px-4 py-3 text-cocoa-700">{{ className(g.classId) }}</td>
          <td class="px-4 py-3 text-cocoa-700">{{ g.date || '-' }}</td>
          <td class="px-4 py-3 text-cocoa-500 text-xs">{{ scoreSummary(g) }}</td>
          <td class="px-4 py-3 text-right">
            <button class="p-1.5 rounded-lg hover:bg-red-50 text-red-500" title="删除" @click="handleDelete(g)">
              <Trash2 class="w-4 h-4" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- 分页栏 -->
  <div v-if="totalFiltered > pageSize" class="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-cream-100">
    <span class="text-xs text-cocoa-400">共 {{ totalFiltered }} 条</span>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="px-3 py-1.5 rounded-xl border border-cream-200 text-cocoa-600 hover:bg-cream-100 disabled:opacity-40 text-sm"
        :disabled="page === 0"
        @click="emit('update:page', page - 1)"
      >上一页</button>
      <span class="text-xs text-cocoa-500">第 {{ page + 1 }}/{{ totalPages }} 页</span>
      <button
        type="button"
        class="px-3 py-1.5 rounded-xl border border-cream-200 text-cocoa-600 hover:bg-cream-100 disabled:opacity-40 text-sm"
        :disabled="page + 1 >= totalPages"
        @click="emit('update:page', page + 1)"
      >下一页</button>
    </div>
    <div class="flex items-center gap-2">
      <span class="text-xs text-cocoa-400">每页</span>
      <select :value="pageSize" class="px-2 py-1.5 rounded-xl border border-cream-200 bg-surface text-sm focus:outline-none focus:border-butter-400" @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value)); emit('update:page', 0)">
        <option :value="5">5 条</option>
        <option :value="10">10 条</option>
        <option :value="20">20 条</option>
        <option :value="50">50 条</option>
      </select>
    </div>
  </div>
</template>
