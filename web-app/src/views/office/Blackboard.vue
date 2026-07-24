<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'theme', label: '黑板报主题', placeholder: '如：喜迎国庆、安全教育月、读书节' },
  { key: 'grade', label: '年级', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
  { key: 'sections', label: '板块数量', placeholder: '如：4个板块' },
]
function buildPrompt(f: Record<string, string>) {
  return `请为${f.grade || '小学'}设计一份黑板报内容方案。主题：${f.theme || ''}；板块数量：${f.sections || '4个'}。
每个板块需包含：板块标题、简短文字内容（适合黑板报排版）、配图建议。整体风格活泼、适合小学生。`
}
function buildSavePayload(f: Record<string, string>, result: string) {
  return { title: f.theme || '黑板报', content: result, category: '黑板报' }
}
</script>

<template>
  <AiTextTool title="黑板报生成" :fields="fields" :build-prompt="buildPrompt" save-path="notes" :build-save-payload="buildSavePayload" />
</template>
