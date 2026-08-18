<template>
  <AiTextTool
    title="英语听力"
    desc="AI 生成英语听力材料与题目"
    :fields="fields"
    :build-prompt="buildPrompt"
  />
</template>

<script setup>
import AiTextTool from '../../components/business/AiTextTool.vue'

const fields = [
  { key: 'topic', label: '主题', placeholder: '如：At the restaurant' },
  { key: 'grade', label: '年级', options: ['四年级', '五年级', '六年级'] },
  { key: 'length', label: '时长', options: ['1分钟', '2分钟', '3分钟'] },
]

function buildPrompt(f) {
  return `请生成一段${f.grade || '小学'}英语听力材料，主题：${f.topic || ''}，时长约${f.length || '2分钟'}。包含英文原文、中文翻译、5道听力理解题及答案。`
}
</script>
