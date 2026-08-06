<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'
const { classes } = useClasses()
onMounted(() => loadClasses())
const fields: FieldDef[] = [
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'studentName', label: '学生', required: true, width: 'w-24' },
  { key: 'date', label: '日期', type: 'date', width: 'w-32' },
  { key: 'type', label: '类型', type: 'select', options: ['表扬', '提醒', '违纪'], required: true, width: 'w-20' },
  { key: 'behavior', label: '行为描述', required: true },
  { key: 'note', label: '处理/备注', type: 'textarea', hideInList: false },
  { key: 'score', label: '加减分', type: 'number', width: 'w-20' },
]
</script>
<template>
  <CrudTable api-path="behavior-records" title="行为记录" :fields="fields" :defaults="{ type: '表扬', score: 0 }" />
</template>
