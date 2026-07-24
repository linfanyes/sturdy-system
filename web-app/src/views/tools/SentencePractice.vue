<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'pattern', label: '句型', placeholder: '如：There be...' },
  { key: 'grade', label: '年级', options: ['三年级', '四年级', '五年级', '六年级'] },
  { key: 'count', label: '练习数', options: ['5', '10', '15'] },
]
function buildPrompt(f: Record<string, string>) {
  return `请为${f.grade || '小学'}生成${f.count || 10}道句型"${f.pattern || ''}"的练习题，包含中译英、英译中、填空各若干，附参考答案。`
}
</script>

<template>
  <AiTextTool title="句型练习" :fields="fields" :build-prompt="buildPrompt" />
</template>
