<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'type', label: '总结类型', options: ['班级总结', '学科总结', '学生评语', '班主任工作总结'] },
  { key: 'grade', label: '年级', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
  { key: 'class', label: '班级', placeholder: '如：三年级2班' },
  { key: 'keypoints', label: '要点/亮点', type: 'textarea' as const, placeholder: '如：本学期成绩提升明显、运动会第一名等' },
]
function buildPrompt(f: Record<string, string>) {
  return `请写一份${f.grade || '小学'}${f.class || ''}的${f.type || '班级总结'}。要点/亮点：${f.keypoints || ''}。要求结构完整、内容充实、语言得体，800字左右。`
}
</script>

<template>
  <AiTextTool title="期末总结生成" :fields="fields" :build-prompt="buildPrompt" />
</template>
