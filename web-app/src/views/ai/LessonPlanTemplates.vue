<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
const fields: FieldDef[] = [
  { key: 'name', label: '模板名称', required: true },
  { key: 'subject', label: '学科', width: 'w-20' },
  { key: 'grade', label: '年级', width: 'w-20' },
  { key: 'content', label: '模板内容', type: 'textarea', hideInList: false },
  { key: 'createdAt', label: '创建时间', type: 'datetime', width: 'w-40', readonly: true },
]
</script>
<template>
  <CrudTable api-path="lesson-plan-templates" title="教案模板" :fields="fields" :class-filterable="false" />
</template>
