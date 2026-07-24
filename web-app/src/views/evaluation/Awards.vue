<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'
const { classes } = useClasses()
onMounted(() => loadClasses())
const fields: FieldDef[] = [
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'studentName', label: '学生', required: true, width: 'w-24' },
  { key: 'awardName', label: '奖项名称', required: true },
  { key: 'category', label: '类别', type: 'select', options: ['学习', '品德', '体育', '艺术', '劳动', '其他'], width: 'w-20' },
  { key: 'level', label: '级别', type: 'select', options: ['校级', '区级', '市级', '省级', '国家级'], width: 'w-20' },
  { key: 'date', label: '获奖日期', type: 'date', width: 'w-32' },
  { key: 'note', label: '备注', type: 'textarea', hideInList: true },
]
</script>
<template>
  <CrudTable api-path="award-records" title="获奖记录" :fields="fields" :defaults="{ level: '校级' }" />
</template>
