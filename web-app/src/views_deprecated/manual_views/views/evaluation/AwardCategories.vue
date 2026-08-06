<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
const fields: FieldDef[] = [
  { key: 'name', label: '类别名称', required: true },
  { key: 'category', label: '分类', type: 'select', options: ['学习', '品德', '体育', '艺术', '劳动', '其他'], width: 'w-24' },
  { key: 'icon', label: '图标', width: 'w-24', placeholder: '如 🏆' },
  { key: 'desc', label: '描述', type: 'textarea', hideInList: false },
]
</script>
<template>
  <CrudTable api-path="award-categories" title="奖项类别" :fields="fields" :class-filterable="false" />
</template>
