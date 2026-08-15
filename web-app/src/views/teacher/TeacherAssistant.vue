<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMyInsights, generateClassDoc } from '@/api/insight'

const classes = ref<any[]>([])
const classId = ref('')
const type = ref<'letter' | 'speech' | 'summary' | 'blessing'>('letter')
const generating = ref(false)
const result = ref<{ className: string; studentCount: number; content: string } | null>(null)

const TYPES = [
  { key: 'letter', label: '致家长信' },
  { key: 'speech', label: '家长会发言稿' },
  { key: 'summary', label: '学期总结' },
  { key: 'blessing', label: '班级寄语' },
] as const

onMounted(async () => {
  classes.value = await getMyInsights()
  if (classes.value.length) classId.value = classes.value[0].classId
})

async function generate() {
  if (!classId.value || generating.value) return
  generating.value = true
  result.value = null
  try {
    result.value = await generateClassDoc(classId.value, type.value)
  } catch (e: any) {
    alert('生成失败：' + (e?.message || e))
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-3xl p-4">
    <h1 class="mb-1 text-xl font-semibold text-gray-800">教师事务助手</h1>
    <p class="mb-4 text-sm text-gray-500">基于本班真实数据，AI 一键生成班级文案，省去重复写作。</p>

    <div class="mb-4 flex flex-wrap items-center gap-3">
      <select v-model="classId" class="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        <option v-for="c in classes" :key="c.classId" :value="c.classId">{{ c.className }}</option>
        <option v-if="!classes.length" value="">（暂无班级数据）</option>
      </select>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="t in TYPES"
          :key="t.key"
          class="rounded-full px-3 py-1.5 text-sm"
          :class="type === t.key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'"
          @click="type = t.key"
        >
          {{ t.label }}
        </button>
      </div>
      <button
        class="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
        :disabled="!classId || generating"
        @click="generate"
      >
        {{ generating ? '生成中…' : '一键生成' }}
      </button>
    </div>

    <div v-if="result" class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-700">{{ result.className }} · {{ TYPES.find((t) => t.key === type)?.label }}</span>
        <span class="text-xs text-gray-400">{{ result.studentCount }} 名学生</span>
      </div>
      <p class="whitespace-pre-wrap text-sm leading-7 text-gray-700">{{ result.content }}</p>
    </div>
    <div v-else-if="!generating" class="rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
      选择班级与文案类型，点击「一键生成」。
    </div>
  </div>
</template>
