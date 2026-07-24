<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'
const { classes } = useClasses()
onMounted(() => loadClasses())
const fields: FieldDef[] = [
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'studentName', label: '学生', required: true, width: 'w-24' },
  { key: 'bookTitle', label: '书名', required: true },
  { key: 'date', label: '日期', type: 'date', width: 'w-32' },
  { key: 'duration', label: '阅读时长(分)', type: 'number', width: 'w-24' },
  { key: 'pages', label: '页数', type: 'number', width: 'w-20' },
  { key: 'note', label: '读后感/笔记', type: 'textarea', hideInList: false },
  { key: 'rating', label: '评分', type: 'select', options: ['1', '2', '3', '4', '5'], width: 'w-20' },
]
</script>
<template>
  <CrudTable api-path="reading-logs" title="课外阅读" :fields="fields" :defaults="{ rating: '3' }" />
</template>
