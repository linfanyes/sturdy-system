<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted } from 'vue'

const { classes } = useClasses()
onMounted(() => loadClasses())

const fields: FieldDef[] = [
  { key: 'title', label: '标题', required: true },
  { key: 'classId', label: '班级', type: 'select', options: () => classes.value.map(c => c.name), width: 'w-32', placeholder: '留空为全校公告' },
  { key: 'scope', label: '范围', type: 'select', options: ['class', 'school'], width: 'w-24' },
  { key: 'pinned', label: '置顶', type: 'select', options: ['是', '否'], width: 'w-20' },
  { key: 'content', label: '内容', type: 'textarea', hideInList: false },
  { key: 'createdAt', label: '发布时间', type: 'datetime', width: 'w-40', readonly: true },
]
</script>

<template>
  <CrudTable api-path="notices" title="公告" :fields="fields" :defaults="{ scope: 'class', pinned: '否' }" />
</template>
