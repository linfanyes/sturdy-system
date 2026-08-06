<script setup lang="ts">
/**
 * Schema-driven CRUD 渲染器
 *
 * 根据 shared/schemas/crud-schema.ts 中的配置自动生成列表 + 表单，
 * 复用 CrudTable.vue 通用组件完成 CRUD。
 *
 * 路由参数 :entity 为 CRUD_SCHEMA 的 key，如 'parent-contacts'、'todos'、'attendances'
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CRUD_SCHEMA, type CrudEntityDef, type CrudFieldDef } from '@gardener/shared/schemas/crud-schema'
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const route = useRoute()
const entity = computed(() => route.params.entity as string)

const entityDef = computed<CrudEntityDef | undefined>(() => CRUD_SCHEMA[entity.value])

/** 字段类型映射：shared CrudFieldType → CrudTable FieldDef.type */
function mapType(t: CrudFieldDef['type']): FieldDef['type'] {
  if (t === 'input') return 'text'
  if (t === 'picker') return 'select'
  return t
}

/**
 * 把 CrudFieldDef 转为 FieldDef。
 * 不在 display 中的字段自动 hideInList（仅详情/编辑可见）。
 */
const fields = computed<FieldDef[]>(() => {
  const def = entityDef.value
  if (!def) return []
  const displaySet = new Set(def.display)
  return def.fields.map((f): FieldDef => ({
    key: f.key,
    label: f.label,
    type: mapType(f.type),
    options: f.options,
    required: f.required,
    placeholder: f.placeholder,
    hideInList: !displaySet.has(f.key),
  }))
})

// 自动推导一个合理的搜索字段
const defaultSearchField = computed(() => entityDef.value?.search)
</script>

<template>
  <div v-if="!entityDef" class="p-6 text-red-500">
    未知实体：<code>{{ entity }}</code>。请检查 shared/schemas/crud-schema.ts 中是否存在该 key。
  </div>
  <CrudTable
    v-else
    :key="entity"
    :api-path="entityDef.prefix.replace(/^\//, '')"
    :title="entityDef.title"
    :fields="fields"
    :defaults="{}"
  />
</template>
