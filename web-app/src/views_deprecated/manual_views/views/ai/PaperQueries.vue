<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
const fields: FieldDef[] = [
  { key: 'title', label: '标题', required: true },
  { key: 'subject', label: '学科', width: 'w-20' },
  { key: 'query', label: '查询内容', type: 'textarea', hideInList: false },
  { key: 'result', label: '结果', type: 'textarea', hideInList: true },
  { key: 'createdAt', label: '查询时间', type: 'datetime', width: 'w-40', readonly: true },
]
</script>
<template>
  <CrudTable api-path="generated/queries" title="试卷查询" :fields="fields" :class-filterable="false" />
</template>
