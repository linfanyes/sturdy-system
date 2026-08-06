<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const fields: FieldDef[] = [
  { key: 'date', label: '日期', type: 'date', required: true, width: 'w-32' },
  { key: 'teacherName', label: '授课教师', required: true, width: 'w-24' },
  { key: 'classId', label: '班级', type: 'select', width: 'w-28' },
  { key: 'subject', label: '学科', width: 'w-20' },
  { key: 'topic', label: '课题', width: 'w-32' },
  { key: 'overallRating', label: '评级', type: 'select', options: ['优秀', '良好', '一般', '待改进'], width: 'w-20' },
  { key: 'strengths', label: '优点', type: 'textarea' },
  { key: 'suggestions', label: '建议', type: 'textarea', hideInList: true },
]
</script>

<template>
  <CrudTable api-path="lesson-observations" title="听课记录" :fields="fields" :defaults="{ overallRating: '良好' }" />
</template>
