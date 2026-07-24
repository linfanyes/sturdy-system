<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'topic', label: '语法点', placeholder: '如：一般现在时' },
  { key: 'grade', label: '年级', options: ['四年级', '五年级', '六年级'] },
  { key: 'count', label: '题目数', options: ['10', '15', '20'] },
]
function buildPrompt(f: Record<string, string>) {
  return `请为${f.grade || '小学'}生成${f.count || 10}道"${f.topic || ''}"语法练习题，含选择题、填空题、改错题，附答案与解析。`
}
</script>

<template>
  <AiTextTool title="语法练习" :fields="fields" :build-prompt="buildPrompt" />
</template>
