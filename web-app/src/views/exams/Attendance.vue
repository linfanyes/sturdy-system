<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'

const { classes } = useClasses()
onMounted(() => loadClasses())

const fields: FieldDef[] = [
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'date', label: '日期', type: 'date', required: true, width: 'w-32' },
  { key: 'records', label: '考勤明细', type: 'textarea', hideInList: true, placeholder: 'JSON 格式：[{studentId, status}]' },
  { key: 'summary', label: '出勤汇总', hideInList: false, width: 'w-48' },
  { key: 'createdAt', label: '记录时间', type: 'datetime', width: 'w-40', readonly: true },
]
</script>

<template>
  <CrudTable api-path="attendances" title="考勤" :fields="fields" />
</template>
