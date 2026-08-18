<template>
  <AiTextTool
    title="单词拼写"
    desc="AI 生成英语单词拼写练习"
    :fields="fields"
    :build-prompt="buildPrompt"
  />
</template>

<script setup>
import AiTextTool from '../../components/business/AiTextTool.vue'

const fields = [
  { key: 'topic', label: '主题/单元', placeholder: '如：Animals' },
  { key: 'grade', label: '年级', options: ['三年级', '四年级', '五年级', '六年级'] },
  { key: 'count', label: '单词数', options: ['10', '15', '20'] },
]

function buildPrompt(f) {
  return `请为${f.grade || '小学'}主题"${f.topic || ''}"生成${f.count || 10}个英语单词拼写练习，格式：单词、音标、中文、例句。附默写练习版（只给中文，留空填写）。`
}
</script>
