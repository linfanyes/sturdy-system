<template>
  <AiTextTool
    title="古诗词助手"
    desc="诗词赏析、背诵指导、默写练习"
    :fields="fields"
    :build-prompt="buildPrompt"
  />
</template>

<script setup>
import AiTextTool from '../../components/business/AiTextTool.vue'

const fields = [
  { key: 'title', label: '诗词标题', placeholder: '如：静夜思 李白' },
  { key: 'action', label: '功能', options: ['全文赏析', '背诵指导', '默写练习', '意境配画描述', '改写白话文'] },
]

function buildPrompt(f) {
  return `请对古诗词《${f.title || ''}》进行${f.action || '全文赏析'}。如果是赏析，包含创作背景、逐句解读、艺术手法、思想感情；如果是背诵指导，提供记忆口诀和易错字提醒。`
}
</script>
