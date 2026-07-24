<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'
</script>
<template>
  <AiTextTool
    title="小作文助手"
    :fields="[
      { key: 'topic', label: '作文题目', placeholder: '如：我最敬佩的人' },
      { key: 'grade', label: '年级', options: ['三年级', '四年级', '五年级', '六年级'] },
      { key: 'words', label: '字数要求', options: ['200字', '300字', '400字', '500字'] },
    ]"
    :build-prompt="(f) => `请写一篇${f.grade}${f.words}的作文，题目《${f.topic}》。要求结构清晰、语言生动、有真情实感。`"
  />
</template>
