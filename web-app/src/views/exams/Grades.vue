<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'

const { classes } = useClasses()
onMounted(() => loadClasses())

const SUBJECTS = ['语文', '数学', '英语', '科学', '物理', '化学', '生物', '政治', '历史', '地理', '音乐', '体育', '美术', '信息技术', '道德与法治']

const fields: FieldDef[] = [
  { key: 'examName', label: '考试名称', required: true },
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'subject', label: '科目', type: 'select', options: SUBJECTS, required: true, width: 'w-20' },
  { key: 'date', label: '日期', type: 'date', width: 'w-32' },
  { key: 'scores', label: '成绩明细', type: 'textarea', hideInList: true, placeholder: 'JSON 格式：[{studentId, score}]' },
  { key: 'createdAt', label: '录入时间', type: 'datetime', width: 'w-40', readonly: true },
]
</script>

<template>
  <CrudTable api-path="grades" title="成绩" :fields="fields" />
</template>
