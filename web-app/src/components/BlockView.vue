<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  block: any
  defs: Record<string, any>
  depth?: number
}>()

const def = computed(() => props.defs[props.block.type])
const depth = computed(() => props.depth ?? 0)

function paramText(): string {
  const d = def.value
  if (!d?.param) return ''
  return ` ${props.block.params[d.param.key] ?? ''}${d.param.suffix || ''}`
}
</script>

<template>
  <div class="select-none">
    <div
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium"
      :style="{ background: def?.color || '#999', marginLeft: depth * 16 + 'px' }"
    >
      <span>{{ def?.label || block.type }}</span>
      <span v-if="def?.param">{{ paramText() }}</span>
    </div>
    <div v-if="def?.container" class="my-1 space-y-1" :style="{ marginLeft: depth * 16 + 16 + 'px' }">
      <BlockView
        v-for="child in block.body || []"
        :key="child.uid"
        :block="child"
        :defs="defs"
        :depth="depth + 1"
      />
    </div>
  </div>
</template>
