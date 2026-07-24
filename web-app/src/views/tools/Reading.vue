<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'grade', label: '年级', options: ['三年级', '四年级', '五年级', '六年级'] },
  { key: 'type', label: '文体', options: ['记叙文', '说明文', '议论文', '童话', '诗歌'] },
  { key: 'topic', label: '主题', placeholder: '如：保护环境' },
  { key: 'count', label: '题目数', options: ['3', '5', '8'] },
]
function buildPrompt(f: Record<string, string>) {
  return `请生成一篇适合${f.grade}的${f.type}阅读理解，主题为"${f.topic}"，约400字。附${f.count || 5}道题目（含选择题和简答题）及参考答案。`
}
</script>
<template>
  <AiTextTool title="阅读理解生成" :fields="fields" :build-prompt="buildPrompt" />
</template>
