<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'topic', label: '话题', placeholder: '如：My family' },
  { key: 'grade', label: '年级', options: ['三年级', '四年级', '五年级', '六年级'] },
  { key: 'duration', label: '时长', options: ['1分钟', '2分钟', '3分钟'] },
]
function buildPrompt(f: Record<string, string>) {
  return `请为${f.grade || '小学'}生成"${f.topic || ''}"话题的口语练习材料，时长约${f.duration || '2分钟'}。包含示范演讲稿(英文+中文)、重点词汇、发音提示、拓展问题。`
}
</script>

<template>
  <AiTextTool title="口语练习" :fields="fields" :build-prompt="buildPrompt" />
</template>
