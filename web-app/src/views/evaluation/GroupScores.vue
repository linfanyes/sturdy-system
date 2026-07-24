<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'
const { classes } = useClasses()
onMounted(() => loadClasses())
const fields: FieldDef[] = [
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), required: true, width: 'w-32' },
  { key: 'groupName', label: '小组名', required: true, width: 'w-24' },
  { key: 'date', label: '日期', type: 'date', width: 'w-32' },
  { key: 'score', label: '得分', type: 'number', required: true, width: 'w-20' },
  { key: 'reason', label: '原因' },
  { key: 'note', label: '备注', type: 'textarea', hideInList: true },
]
</script>
<template>
  <CrudTable api-path="group-scores" title="小组评分" :fields="fields" :defaults="{ score: 1 }" />
</template>
