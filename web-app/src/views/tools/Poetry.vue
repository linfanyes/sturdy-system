<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'
</script>
<template>
  <AiTextTool
    title="古诗词助手"
    :fields="[
      { key: 'title', label: '诗词标题/作者', placeholder: '如：静夜思 李白' },
      { key: 'action', label: '功能', options: ['全文赏析', '背诵指导', '默写练习', '意境配画描述', '改写白话文'] },
    ]"
    :build-prompt="(f) => `请对古诗词《${f.title}》进行${f.action}。如果是赏析，包含创作背景、逐句解读、艺术手法、思想感情；如果是背诵指导，提供记忆口诀和易错字提醒。`"
  />
</template>
