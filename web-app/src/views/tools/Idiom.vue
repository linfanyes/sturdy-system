<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'idiom', label: '成语', placeholder: '输入成语，如：画蛇添足' },
  { key: 'action', label: '功能', options: ['释义与出处', '造句示范', '近反义词', '成语故事', '接龙建议'] },
]

function buildPrompt(f: Record<string, string>) {
  return `请对成语"${f.idiom}"进行${f.action}。包含释义、出处、造句、近义词、反义词。如果是成语故事，请讲述完整故事并说明寓意。`
}
</script>
<template>
  <AiTextTool title="成语词典" :fields="fields" :build-prompt="buildPrompt" />
</template>
