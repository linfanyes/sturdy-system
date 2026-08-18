<template>
  <AiTextTool
    title="小作文助手"
    desc="AI 生成小学生作文"
    :fields="fields"
    :build-prompt="buildPrompt"
  />
</template>

<script setup>
import AiTextTool from '../../components/business/AiTextTool.vue'

const fields = [
  { key: 'topic', label: '作文题目', placeholder: '如：我最敬佩的人' },
  { key: 'grade', label: '年级', options: ['三年级', '四年级', '五年级', '六年级'] },
  { key: 'words', label: '字数', options: ['200字', '300字', '400字', '500字'] },
]

function buildPrompt(f) {
  return `请写一篇${f.grade || '小学'}${f.words || '300字'}的作文，题目《${f.topic || ''}》。要求结构清晰、语言生动、有真情实感。`
}
</script>
