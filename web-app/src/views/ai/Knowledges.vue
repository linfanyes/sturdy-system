<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
const fields: FieldDef[] = [
  { key: 'title', label: '标题', required: true },
  { key: 'subject', label: '学科', width: 'w-20' },
  { key: 'grade', label: '年级', width: 'w-20' },
  { key: 'topic', label: '知识点', width: 'w-32' },
  { key: 'content', label: '内容', type: 'textarea', hideInList: false },
  { key: 'createdAt', label: '生成时间', type: 'datetime', width: 'w-40', readonly: true },
]
</script>
<template>
  <CrudTable api-path="generated/knowledges" title="知识点" :fields="fields" :class-filterable="false" />
</template>
