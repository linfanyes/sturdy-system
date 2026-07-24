<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'topic', label: '作文主题', placeholder: '如：春天的校园' },
  { key: 'grade', label: '年级', options: ['三年级', '四年级', '五年级', '六年级'] },
  { key: 'type', label: '作文类型', options: ['写景', '写人', '记事', '状物', '想象', '读后感'] },
]

function buildPrompt(f: Record<string, string>) {
  return `请为${f.grade}${f.type}作文"${f.topic}"生成丰富的写作素材，包含好词(15个)、好句(8句)、修辞手法示例、开头结尾参考段落。`
}
</script>
<template>
  <AiTextTool title="作文素材" :fields="fields" :build-prompt="buildPrompt" />
</template>
