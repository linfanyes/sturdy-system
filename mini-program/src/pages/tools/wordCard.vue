<template>
  <AiTextTool
    title="单词卡片"
    desc="AI 生成单词学习卡片"
    :fields="fields"
    :build-prompt="buildPrompt"
  />
</template>

<script setup>
import AiTextTool from '../../components/business/AiTextTool.vue'

const fields = [
  { key: 'word', label: '单词', placeholder: '如：apple' },
  { key: 'level', label: '难度', options: ['小学', '初中', '高中'] },
]

function buildPrompt(f) {
  return `请为单词 "${f.word || ''}" 生成学习卡片，包含：音标、词性、中文释义、例句(带翻译)、常见搭配、同义词/反义词、记忆技巧。适合${f.level || '小学'}水平。`
}
</script>
