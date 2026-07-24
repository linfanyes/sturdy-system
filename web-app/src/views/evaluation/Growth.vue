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
  { key: 'category', label: '类别', type: 'select', options: ['学习', '品德', '体育', '艺术', '劳动', '其他'], width: 'w-20' },
  { key: 'title', label: '标题', required: true },
  { key: 'content', label: '内容', type: 'textarea', hideInList: false },
  { key: 'level', label: '等级', type: 'select', options: ['优秀', '良好', '一般', '待提升'], width: 'w-20' },
]
</script>
<template>
  <CrudTable api-path="growth-entries" title="成长记录" :fields="fields" :defaults="{ level: '良好' }" />
</template>
