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
  { key: 'subject', label: '科目', width: 'w-20' },
  { key: 'score', label: '积分', type: 'number', required: true, width: 'w-20' },
  { key: 'source', label: '来源', type: 'select', options: ['课堂', '作业', '考试', '行为', '其他'], width: 'w-20' },
  { key: 'note', label: '备注', type: 'textarea', hideInList: true },
]
</script>
<template>
  <CrudTable api-path="score-records" title="积分记录" :fields="fields" :defaults="{ score: 1, source: '课堂' }" />
</template>
