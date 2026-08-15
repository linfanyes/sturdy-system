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
  if (!d?.params?.length) return ''
  return d.params
    .map((prm: any) => `${props.block.params[prm.key] ?? ''}${prm.suffix || ''}`)
    .join(' ')
}
</script>

<template>
  <div class="select-none">
    <div
      class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium"
      :style="{ background: def?.color || '#999', marginLeft: depth * 16 + 'px' }"
    >
      <span>{{ def?.label || block.type }}</span>
      <span v-if="def?.params?.length">{{ paramText() }}</span>
    </div>
    <div v-if="def?.container" class="my-1 space-y-1" :style="{ marginLeft: depth * 16 + 16 + 'px' }">
      <BlockView v-for="child in block.body || []" :key="child.uid" :block="child" :defs="defs" :depth="depth + 1" />
    </div>
    <template v-if="def?.hasElse">
      <div class="text-xs text-cocoa-400 my-0.5 font-medium" :style="{ marginLeft: depth * 16 + 16 + 'px' }">否则</div>
      <div class="my-1 space-y-1" :style="{ marginLeft: depth * 16 + 16 + 'px' }">
        <BlockView v-for="child in block.elseBody || []" :key="child.uid" :block="child" :defs="defs" :depth="depth + 1" />
      </div>
    </template>
  </div>
</template>
