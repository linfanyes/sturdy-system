<script setup lang="ts">
/**
 * Schema-driven CRUD 渲染器（通用入口）
 *
 * 支持两种使用方式：
 *   1. 路由模式：访问 /teacher/schema-crud/:entity，自动读 route.params.entity
 *   2. 直接绑定：在路由或其它父组件中通过 <SchemaCrudPage entity="xxx" /> 传参
 *
 * 内部读 shared/schemas/crud-schema.ts 中的 CrudEntityDef，映射为 CrudTable 的 FieldDef[]，
 * 自动把不在 display 中的字段设为 hideInList。
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { CRUD_SCHEMA, type CrudEntityDef, type CrudFieldDef } from '@gardener/shared/schemas/crud-schema'
import CrudTable, { type FieldDef } from '@/components/CrudTable.vue'

const props = defineProps<{
  /** 直接指定实体 key（可选）；不传则由路由参数 :entity 决定 */
  entity?: string
}>()

const route = useRoute()
const entity = computed(() => props.entity || (route.params.entity as string))

const entityDef = computed<CrudEntityDef | undefined>(() => CRUD_SCHEMA[entity.value])

/** 字段类型映射：shared CrudFieldType → CrudTable FieldDef.type */
function mapType(t: CrudFieldDef['type']): FieldDef['type'] {
  if (t === 'input') return 'text'
  if (t === 'picker') return 'select'
  return t
}

/**
 * 把 CrudFieldDef 转为 FieldDef：
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
