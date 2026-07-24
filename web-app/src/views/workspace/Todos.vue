<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const fields: FieldDef[] = [
  { key: 'title', label: '待办事项', required: true, placeholder: '如：批改作业' },
  { key: 'done', label: '状态', type: 'select', options: ['未完成', '已完成'], width: 'w-24' },
  { key: 'priority', label: '优先级', type: 'select', options: ['高', '中', '低'], width: 'w-24' },
  { key: 'dueDate', label: '截止日期', type: 'date', width: 'w-32' },
  { key: 'note', label: '备注', type: 'textarea', hideInList: true },
]
</script>

<template>
  <CrudTable api-path="todos" title="待办" :fields="fields" :class-filterable="false" :defaults="{ done: '未完成', priority: '中' }" />
</template>
