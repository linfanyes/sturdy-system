<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const fields: FieldDef[] = [
  { key: 'name', label: '姓名', required: true, width: 'w-24' },
  { key: 'position', label: '职务', width: 'w-24' },
  { key: 'phone', label: '电话', width: 'w-32' },
  { key: 'email', label: '邮箱', width: 'w-40', hideInList: true },
  { key: 'joinAt', label: '入职时间', width: 'w-28' },
  { key: 'remark', label: '备注', type: 'textarea', hideInList: true },
]
</script>

<template>
  <CrudTable api-path="teachers" title="教师通讯录" :fields="fields" :class-filterable="false" />
</template>
