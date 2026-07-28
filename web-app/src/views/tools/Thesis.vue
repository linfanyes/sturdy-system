<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'
</script>
<template>
  <AiTextTool
    title="教育论文"
    :fields="[
      { key: 'title', label: '论文题目', placeholder: '如：核心素养视角下的小学数学教学创新' },
      { key: 'keywords', label: '关键词', placeholder: '可选，逗号分隔' },
      { key: 'outline', label: '论文大纲', type: 'textarea', placeholder: '可选，留空则 AI 自动生成大纲和内容' },
    ]"
    :build-prompt="(f) => {
      let p = '请以教育论文格式，撰写一篇题为《' + f.title + '》的论文。'
      if (f.keywords) p += '关键词：' + f.keywords + '。'
      if (f.outline) p += '参考大纲：' + f.outline
      else p += '请自动生成完整大纲和内容。'
      return p
    }"
  />
</template>
