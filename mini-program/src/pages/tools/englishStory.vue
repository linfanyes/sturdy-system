<template>
  <AiTextTool
    title="英语小故事"
    desc="AI 生成英语趣味故事"
    :fields="fields"
    :build-prompt="buildPrompt"
  />
</template>

<script setup>
import AiTextTool from '../../components/business/AiTextTool.vue'

const fields = [
  { key: 'theme', label: '主题', placeholder: '如：冒险、友谊、魔法' },
  { key: 'grade', label: '年级', options: ['四年级', '五年级', '六年级'] },
  { key: 'words', label: '字数', options: ['100词', '200词', '300词'] },
]

function buildPrompt(f) {
  return `请写一篇${f.grade || '小学'}${f.words || '200词'}的英语小故事，主题：${f.theme || ''}。要求词汇适合该年级、情节有趣、附中文翻译和重点词汇表。`
}
</script>
