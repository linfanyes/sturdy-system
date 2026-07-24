<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const fields: FieldDef[] = [
  { key: 'title', label: '标题', required: true },
  { key: 'category', label: '分类', type: 'select', options: ['教学反思', '会议记录', '学习笔记', '其他'], width: 'w-32' },
  { key: 'content', label: '内容', type: 'textarea', hideInList: false },
  { key: 'tags', label: '标签', type: 'tags', options: ['重要', '待办', '灵感', '复习'], width: 'w-40' },
  { key: 'updatedAt', label: '更新时间', type: 'datetime', width: 'w-40', readonly: true },
]
</script>

<template>
  <CrudTable api-path="notes" title="笔记" :fields="fields" :class-filterable="false" />
</template>
