<script setup lang="ts">
import AiTextTool from '@/components/AiTextTool.vue'

const fields = [
  { key: 'topic', label: '演讲主题', placeholder: '如：我的教育初心、班级管理经验分享' },
  { key: 'occasion', label: '场合', options: ['全体教师会', '年级组会议', '家长会', '开学典礼', '毕业典礼', '教研活动', '其他'] },
  { key: 'duration', label: '时长（分钟）', placeholder: '如：5' },
  { key: 'speaker', label: '演讲人身份', placeholder: '如：班主任、学科教师' },
]
function buildPrompt(f: Record<string, string>) {
  return `请撰写一篇演讲稿。主题：${f.topic || ''}；场合：${f.occasion || ''}；时长：${f.duration || '5'}分钟；演讲人：${f.speaker || '教师'}。
要求：开场有吸引力、内容充实有条理、结尾有力、语言口语化适合演讲、富有感染力。`
}
function buildSavePayload(f: Record<string, string>, result: string) {
  return { title: f.topic || '演讲稿', content: result, category: '演讲稿' }
}
</script>

<template>
  <AiTextTool title="演讲稿生成" :fields="fields" :build-prompt="buildPrompt" save-path="notes" :build-save-payload="buildSavePayload" />
</template>
