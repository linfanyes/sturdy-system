<template>
  <AiTextTool
    title="教育论文"
    desc="AI 生成教育论文"
    :fields="fields"
    :build-prompt="buildPrompt"
  />
</template>

<script setup>
import AiTextTool from '../../components/business/AiTextTool.vue'

const fields = [
  { key: 'title', label: '论文题目', placeholder: '如：核心素养视角下的小学数学教学创新' },
  { key: 'keywords', label: '关键词', placeholder: '可选，逗号分隔' },
  { key: 'outline', label: '大纲', placeholder: '可选，留空则 AI 自动生成' },
]

function buildPrompt(f) {
  let p = `请以教育论文格式，撰写一篇题为《${f.title || ''}》的论文。`
  if (f.keywords) p += `关键词：${f.keywords}。`
  if (f.outline) p += `参考大纲：${f.outline}`
  else p += '请自动生成完整大纲和内容。'
  return p
}
</script>
