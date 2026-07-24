<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'name', label: '学生姓名', placeholder: '如：小明' },
  { key: 'grade', label: '年级', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
  { key: 'traits', label: '性格特点', type: 'textarea' as const, placeholder: '如：活泼好动、乐于助人、数学好但粗心' },
  { key: 'type', label: '评语类型', options: ['期末评语', '期中评语', '日常评语', '鼓励性评语'] },
]
function buildPrompt(f: Record<string, string>) {
  return `请为${f.grade || '小学'}学生${f.name || ''}写一段${f.type || '期末评语'}。学生特点：${f.traits || ''}。要求语言亲切、有针对性、既肯定优点又提出改进建议，150字左右。`
}
</script>

<template>
  <AiTextTool title="评语生成" :fields="fields" :build-prompt="buildPrompt" />
</template>
