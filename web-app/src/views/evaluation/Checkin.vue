<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'
const { classes } = useClasses()
onMounted(() => loadClasses())
const fields: FieldDef[] = [
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'studentName', label: '学生', required: true, width: 'w-24' },
  { key: 'date', label: '日期', type: 'date', required: true, width: 'w-32' },
  { key: 'item', label: '打卡项', required: true, placeholder: '如：早读、运动、家务' },
  { key: 'status', label: '状态', type: 'select', options: ['已完成', '未完成', '部分完成'], width: 'w-24' },
  { key: 'note', label: '备注', type: 'textarea', hideInList: true },
]
</script>
<template>
  <CrudTable api-path="checkins" title="学生打卡" :fields="fields" :defaults="{ status: '已完成' }" />
</template>
