<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'

const { classes } = useClasses()
onMounted(() => loadClasses())

const SUBJECTS = ['语文', '数学', '英语', '科学', '物理', '化学', '生物', '政治', '历史', '地理', '音乐', '体育', '美术', '信息技术', '道德与法治']

const fields: FieldDef[] = [
  { key: 'title', label: '作业标题', required: true },
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'subject', label: '科目', type: 'select', options: SUBJECTS, width: 'w-20' },
  { key: 'startDate', label: '开始日期', type: 'date', width: 'w-32' },
  { key: 'deadline', label: '截止日期', type: 'date', width: 'w-32' },
  { key: 'status', label: '状态', type: 'select', options: ['待批改', '批改中', '已批改', '已发布'], width: 'w-24' },
  { key: 'content', label: '内容', type: 'textarea', hideInList: false },
  { key: 'createdAt', label: '布置时间', type: 'datetime', width: 'w-40', readonly: true },
]
</script>

<template>
  <CrudTable api-path="homework" title="作业" :fields="fields" :defaults="{ status: '待批改' }" />
</template>
