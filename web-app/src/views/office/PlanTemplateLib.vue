<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const fields: FieldDef[] = [
  { key: 'title', label: '标题', required: true },
  { key: 'subject', label: '学科', type: 'select', options: ['语文', '数学', '英语', '科学', '道德与法治', '音乐', '体育', '美术', '其他'], width: 'w-24' },
  { key: 'grade', label: '年级', type: 'select', options: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'], width: 'w-20' },
  { key: 'lessonType', label: '课型', type: 'select', options: ['新授课', '复习课', '练习课', '讲评课', '活动课', '其他'], width: 'w-20' },
  { key: 'content', label: '教案内容', type: 'textarea' },
]
</script>

<template>
  <CrudTable api-path="lesson-plan-templates" title="教案模板库" :fields="fields" :defaults="{ lessonType: '新授课' }" :class-filterable="false" />
</template>
