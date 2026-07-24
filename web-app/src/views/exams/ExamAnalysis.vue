<script setup lang="ts">
import { ref, onMounted } from 'vue'
import request from '@/api/request'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { Sparkles, FileText } from 'lucide-vue-next'

const { classes } = useClasses()
onMounted(() => loadClasses())

const classId = ref('')
const exams = ref<any[]>([])
const selectedExamId = ref('')
const result = ref('')
const loading = ref(false)

async function loadExams() {
  if (!classId.value) { exams.value = []; return }
  try {
    const res = await request.get('/exams', { params: { classId: classId.value } })
    exams.value = Array.isArray(res) ? res : (res?.items || [])
    selectedExamId.value = ''
  } catch { exams.value = [] }
}

async function analyze() {
  if (!selectedExamId.value) { alert('请选择考试'); return }
  loading.value = true
  result.value = ''
  try {
    const res = await request.post('/ai/analyze-exam', { examId: selectedExamId.value })
    result.value = res?.content || '（无分析结果）'
  } catch (e: any) {
    result.value = `分析失败：${e?.message || '未知错误'}`
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Sparkles class="w-6 h-6 text-butter-500" /> 考试一键分析
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="grid grid-cols-3 gap-4 items-end">
        <div>
          <label class="text-sm text-cocoa-500">班级</label>
          <select v-model="classId" @change="loadExams" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">考试</label>
          <select v-model="selectedExamId" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="">请选择</option>
            <option v-for="e in exams" :key="e.id" :value="e.id">{{ e.name }}（{{ e.date }}）</option>
          </select>
        </div>
        <button
          class="flex items-center justify-center gap-1.5 px-5 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 disabled:opacity-60"
          :disabled="loading || !selectedExamId"
          @click="analyze"
        >
          <Sparkles class="w-4 h-4" /> {{ loading ? '分析中…' : 'AI 分析' }}
        </button>
      </div>
    </div>

    <div v-if="result || loading" class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-3 text-cocoa-700">
        <FileText class="w-4 h-4" />
        <span class="text-sm font-medium">分析报告</span>
        <span v-if="loading" class="text-xs text-butter-500 animate-pulse">AI 生成中…</span>
      </div>
      <div class="text-sm text-cocoa-900 whitespace-pre-wrap leading-relaxed">{{ result }}</div>
    </div>
  </div>
</template>
