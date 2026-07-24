<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'topic', label: '论文主题', placeholder: '如：小学语文阅读教学策略' },
  { key: 'subject', label: '学科', options: ['语文', '数学', '英语', '科学', '道德与法治', '其他'] },
  { key: 'wordCount', label: '字数要求', placeholder: '如：2000字' },
  { key: 'requirement', label: '具体要求', type: 'textarea' as const, placeholder: '如：结合新课标，包含理论分析与教学案例' },
]
function buildPrompt(f: Record<string, string>) {
  return `请撰写一篇教育论文。主题：${f.topic || ''}；学科：${f.subject || ''}；字数：${f.wordCount || '不限'}；要求：${f.requirement || '无'}。
论文需包含：摘要、关键词、引言、正文（理论分析+实践案例）、结论、参考文献。语言学术化、结构清晰。`
}
function buildSavePayload(f: Record<string, string>, result: string) {
  return { title: f.topic || '教育论文', subject: f.subject || '', content: result }
}
</script>

<template>
  <AiTextTool title="教育论文" :fields="fields" :build-prompt="buildPrompt" save-path="notes" :build-save-payload="buildSavePayload" />
</template>
