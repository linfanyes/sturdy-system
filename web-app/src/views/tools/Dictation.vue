<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'
</script>
<template>
  <AiTextTool
    title="汉字听写"
    :fields="[
      { key: 'grade', label: '年级', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'] },
      { key: 'unit', label: '单元/课次', placeholder: '如：第一单元' },
      { key: 'count', label: '数量', placeholder: '如：20' },
    ]"
    :build-prompt="(f) => `请为${f.grade}${f.unit}生成${f.count || 20}个听写汉字，列出汉字、拼音、组词，适合课堂听写练习。格式：汉字 拼音 组词`"
  />
</template>
