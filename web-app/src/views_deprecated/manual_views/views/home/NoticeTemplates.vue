<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const fields: FieldDef[] = [
  { key: 'title', label: '标题', required: true },
  { key: 'category', label: '分类', type: 'select', options: ['家长通知', '活动通知', '作业提醒', '成绩通知', '安全提醒', '其他'], width: 'w-24' },
  { key: 'content', label: '模板内容', type: 'textarea' },
]
</script>

<template>
  <CrudTable api-path="notice-templates" title="通知模板" :fields="fields" :defaults="{ category: '家长通知' }" :class-filterable="false" />
</template>
