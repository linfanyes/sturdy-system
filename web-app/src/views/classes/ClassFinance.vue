<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const fields: FieldDef[] = [
  { key: 'classId', label: '班级', type: 'select', required: true, width: 'w-32' },
  { key: 'date', label: '日期', type: 'date', required: true, width: 'w-32' },
  { key: 'type', label: '收支', type: 'select', options: ['收入', '支出'], required: true, width: 'w-20' },
  { key: 'category', label: '类别', type: 'select', options: ['班费收取', '文具', '活动', '奖品', '清洁', '其他'], width: 'w-24' },
  { key: 'amount', label: '金额', type: 'number', required: true, width: 'w-24' },
  { key: 'handler', label: '经手人', width: 'w-24' },
  { key: 'description', label: '说明', type: 'textarea' },
]
</script>

<template>
  <CrudTable api-path="class-expenses" title="班费" :fields="fields" :defaults="{ type: '支出', amount: 0 }" />
</template>
