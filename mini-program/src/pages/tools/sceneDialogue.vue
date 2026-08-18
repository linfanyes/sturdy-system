<template>
  <AiTextTool
    title="情景对话"
    desc="AI 生成英语情景对话"
    :fields="fields"
    :build-prompt="buildPrompt"
  />
</template>

<script setup>
import AiTextTool from '../../components/business/AiTextTool.vue'

const fields = [
  { key: 'scene', label: '场景', placeholder: '如：购物、问路、看医生' },
  { key: 'grade', label: '年级', options: ['三年级', '四年级', '五年级', '六年级'] },
]

function buildPrompt(f) {
  return `请生成一段${f.grade || '小学'}英语情景对话，场景：${f.scene || ''}。包含6-8轮对话、中文翻译、重点句型标注、角色扮演建议。`
}
</script>
