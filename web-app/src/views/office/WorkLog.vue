<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const fields: FieldDef[] = [
  { key: 'date', label: '日期', type: 'date', required: true, width: 'w-32' },
  { key: 'classCount', label: '课时数', type: 'number', width: 'w-20' },
  { key: 'homeworkCount', label: '作业批改', type: 'number', width: 'w-24' },
  { key: 'content', label: '工作内容', type: 'textarea' },
  { key: 'note', label: '备注', type: 'textarea', hideInList: true },
]
</script>

<template>
  <CrudTable api-path="work-logs" title="工作日志" :fields="fields" :defaults="{ classCount: 0, homeworkCount: 0 }" :class-filterable="false" />
</template>
