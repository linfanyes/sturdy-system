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
  { key: 'type', label: '类型', type: 'select', options: ['加分', '减分'], required: true, width: 'w-20' },
  { key: 'reason', label: '原因', required: true },
  { key: 'score', label: '分值', type: 'number', required: true, width: 'w-20' },
  { key: 'note', label: '备注', type: 'textarea', hideInList: true },
]
</script>
<template>
  <CrudTable api-path="reward-records" title="加减分" :fields="fields" :defaults="{ type: '加分', score: 1 }" />
</template>
