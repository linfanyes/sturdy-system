<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'

const { classes } = useClasses()
onMounted(() => loadClasses())

const WEEK_DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const PERIODS = ['第1节', '第2节', '第3节', '第4节', '第5节', '第6节', '第7节', '第8节']

const fields: FieldDef[] = [
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'weekday', label: '星期', type: 'select', options: WEEK_DAYS, required: true, width: 'w-20' },
  { key: 'period', label: '节次', type: 'select', options: PERIODS, required: true, width: 'w-20' },
  { key: 'subject', label: '学科', required: true, width: 'w-24' },
  { key: 'startTime', label: '开始时间', width: 'w-24' },
  { key: 'endTime', label: '结束时间', width: 'w-24' },
  { key: 'note', label: '备注', type: 'textarea', hideInList: true },
]
</script>

<template>
  <CrudTable api-path="schedules" title="课表" :fields="fields" />
</template>
