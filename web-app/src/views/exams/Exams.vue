<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'

const { classes } = useClasses()
onMounted(() => loadClasses())

const SUBJECTS = ['语文', '数学', '英语', '科学', '物理', '化学', '生物', '政治', '历史', '地理', '音乐', '体育', '美术', '信息技术', '道德与法治']

const fields: FieldDef[] = [
  { key: 'name', label: '考试名称', required: true, placeholder: '如：2024春季期中考试' },
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'term', label: '学期', width: 'w-24' },
  { key: 'subjects', label: '考试科目', type: 'tags', options: SUBJECTS, width: 'w-48' },
  { key: 'date', label: '考试日期', type: 'date', width: 'w-32' },
  { key: 'note', label: '备注', type: 'textarea', hideInList: true },
  { key: 'analysisNote', label: '分析', type: 'textarea', hideInList: true },
]
</script>

<template>
  <CrudTable api-path="exams" title="考试" :fields="fields" />
</template>
