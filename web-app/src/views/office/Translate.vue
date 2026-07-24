<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'target', label: '目标语言', options: ['英语', '中文', '日语', '韩语', '法语', '德语', '俄语', '西班牙语'] },
  { key: 'text', label: '待翻译文本', type: 'textarea' as const, placeholder: '请输入需要翻译的内容' },
]
function buildPrompt(f: Record<string, string>) {
  return `请将以下文本翻译为${f.target || '英语'}，仅输出译文，保持原文格式：\n${f.text || ''}`
}
</script>

<template>
  <AiTextTool title="翻译" :fields="fields" :build-prompt="buildPrompt" />
</template>
