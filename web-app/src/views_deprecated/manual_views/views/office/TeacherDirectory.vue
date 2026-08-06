<script setup lang="ts">
/**
 * 教师通讯录：同步校管维护的老师信息，支持设置任课班级（多个）、任课科目（多个）、职务。
 * 使用 CrudTable，subjects/classIds 用 tags 类型实现多选。
 */
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'
import { loadClasses, useClasses } from '@/composables/useClasses'
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const { classes } = useClasses()
onMounted(() => loadClasses())

const DEFAULT_SUBJECTS = ['语文', '数学', '英语', '科学', '体育', '音乐', '美术', '道法', '劳动', '信息']

const classOptions = computed(() =>
  classes.value.map(c => ({ value: c.id, label: c.name })),
)

const subjectOptions = computed(() =>
  DEFAULT_SUBJECTS.map(s => ({ value: s, label: s })),
)

/** 跳转到教师详情页：优先用 teacherId 作为 userId，回退用 id */
function goDetail(t: any) {
  router.push({ path: '/teacher/teacher-detail', query: { userId: t.teacherId, id: t.id } })
}

/** 行内操作：详情入口 */
const extraActions = (row: any) => [
  { label: '详情', onClick: (r: any) => goDetail(r) },
]

const fields: FieldDef[] = [
  { key: 'name', label: '姓名', required: true, width: 'w-24' },
  { key: 'position', label: '职务', width: 'w-28', placeholder: '如：班主任、教研组长' },
  {
    key: 'classIds',
    label: '任课班级',
    type: 'tags',
    width: 'w-48',
    options: () => classOptions.value,
  },
  {
    key: 'subjects',
    label: '任课科目',
    type: 'tags',
    width: 'w-40',
    options: () => subjectOptions.value,
  },
  { key: 'phone', label: '电话', width: 'w-32' },
  { key: 'email', label: '邮箱', width: 'w-40', hideInList: true },
  { key: 'joinAt', label: '入职时间', width: 'w-28' },
  { key: 'remark', label: '备注', type: 'textarea', hideInList: true },
]
</script>

<template>
  <CrudTable api-path="teachers" title="教师通讯录" :fields="fields" :class-filterable="false" :extra-actions="extraActions" />
</template>
