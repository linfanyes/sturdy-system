<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'
</script>
<template>
  <AiTextTool
    title="拼音标注"
    :fields="[
      { key: 'text', label: '待标注文本', type: 'textarea', placeholder: '输入中文段落' },
      { key: 'mode', label: '标注模式', options: ['全文注音', '生字注音', '只标声调'] },
    ]"
    :build-prompt="(f) => `请为以下中文文本进行${f.mode}，在汉字上方标注拼音（用 Unicode 声调）。文本：\n${f.text || ''}`"
  />
</template>
