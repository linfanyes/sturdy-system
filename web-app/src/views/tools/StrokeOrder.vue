<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'char', label: '汉字', placeholder: '输入一个汉字，如：水' },
  { key: 'grade', label: '年级', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
]

function buildPrompt(f: Record<string, string>) {
  return `请详细描述汉字"${f.char}"的笔顺，按书写顺序列出每一笔的名称和方向，并说明该字的部首、结构、造字法。适合${f.grade}学生理解。`
}
</script>
<template>
  <AiTextTool title="汉字笔顺" :fields="fields" :build-prompt="buildPrompt" />
</template>
