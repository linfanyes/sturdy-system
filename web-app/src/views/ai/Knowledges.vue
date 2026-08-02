<script setup lang="ts">
import { ref, onMounted } from 'vue'
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { crudList } from '@/api/teacher'
import request from '@/api/request'

const fields: FieldDef[] = [
  { key: 'title', label: '标题', required: true },
  { key: 'subject', label: '学科', width: 'w-20' },
  { key: 'grade', label: '年级', width: 'w-20' },
  { key: 'content', label: '内容', type: 'textarea', hideInList: false },
  { key: 'createdAt', label: '生成时间', type: 'datetime', width: 'w-40', readonly: true },
]

const tableRef = ref<InstanceType<typeof CrudTable> | null>(null)

/** 知识点库懒初始化：首次进入且为空时，自动生成示例知识点（幂等） */
async function ensureSeeded() {
  try {
    const res = await crudList<any>('generated/knowledges', { take: 1 })
    const items = Array.isArray(res) ? res : []
    if (!items.length) {
      await request.post('/generated/knowledges/seed-defaults')
      tableRef.value?.reload()
    }
  } catch { /* 初始化失败不阻塞页面渲染 */ }
}
onMounted(ensureSeeded)
</script>
<template>
  <CrudTable ref="tableRef" api-path="generated/knowledges" title="知识点" :fields="fields" :class-filterable="false" />
</template>
