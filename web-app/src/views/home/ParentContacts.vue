<script setup lang="ts">
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const fields: FieldDef[] = [
  { key: 'classId', label: '班级', type: 'select', required: true, width: 'w-32' },
  { key: 'studentName', label: '学生', required: true, width: 'w-24' },
  { key: 'parentName', label: '家长', required: true, width: 'w-24' },
  { key: 'relation', label: '关系', type: 'select', options: ['父亲', '母亲', '爷爷', '奶奶', '外公', '外婆', '其他'], width: 'w-20' },
  { key: 'phone', label: '电话', width: 'w-32', pattern: /^1[3-9]\d{9}$/, patternHint: '请输入有效的手机号（11 位，1 开头）' },
  { key: 'wechat', label: '微信号', width: 'w-28', hideInList: true },
  { key: 'method', label: '联系方式', type: 'select', options: ['电话', '微信', '面谈', '家访', '其他'], width: 'w-24' },
  { key: 'date', label: '日期', type: 'date', width: 'w-32' },
  { key: 'content', label: '沟通内容', type: 'textarea' },
  { key: 'followUp', label: '后续跟进', type: 'textarea', hideInList: true },
]
</script>

<template>
  <CrudTable api-path="parent-contacts" title="家长联系" :fields="fields" :defaults="{ method: '电话', relation: '母亲' }" />
</template>
