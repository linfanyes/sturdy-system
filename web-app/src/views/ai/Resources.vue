<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
const fields: FieldDef[] = [
  { key: 'title', label: '资源名称', required: true },
  { key: 'type', label: '类型', type: 'select', options: ['文档', '视频', '音频', '图片', '链接', '其他'], width: 'w-24' },
  { key: 'subject', label: '学科', width: 'w-20' },
  { key: 'url', label: '链接/路径', hideInList: false },
  { key: 'desc', label: '描述', type: 'textarea', hideInList: true },
  { key: 'createdAt', label: '添加时间', type: 'datetime', width: 'w-40', readonly: true },
]
</script>
<template>
  <CrudTable api-path="resources" title="资源" :fields="fields" :class-filterable="false" :defaults="{ type: '文档' }" />
</template>
