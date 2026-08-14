<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  block: any
  defs: Record<string, any>
  depth?: number
}>()
const emit = defineEmits<{
  (e: 'delete', uid: string): void
  (e: 'dragstart-block', ev: DragEvent, uid: string): void
  (e: 'drop-root', ev: DragEvent): void
  (e: 'drop-body', ev: DragEvent, uid: string): void
}>()

const def = computed(() => props.defs[props.block.type])
const depth = computed(() => props.depth ?? 0)

function onInputNum(e: any) {
  if (def.value?.param) props.block.params[def.value.param.key] = Number(e.target.value)
}
function onInputText(e: any) {
  if (def.value?.param) props.block.params[def.value.param.key] = e.target.value
}
</script>

<template>
  <div class="select-none">
    <!-- 积木本体（可拖拽移动） -->
    <div
      class="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-white text-xs font-medium shadow-sm cursor-grab active:cursor-grabbing"
      :style="{ background: def?.color || '#999', marginLeft: depth * 16 + 'px' }"
      draggable="true"
      @dragstart="emit('dragstart-block', $event, block.uid)"
    >
      <span>{{ def?.label || block.type }}</span>
      <input
        v-if="def?.param && def.param.type === 'number'"
        type="number"
        :value="block.params[def.param.key]"
        class="w-12 px-1 rounded text-cocoa-900 text-center"
        @input="onInputNum"
      />
      <input
        v-else-if="def?.param && def.param.type === 'text'"
        type="text"
        :value="block.params[def.param.key]"
        class="w-24 px-1 rounded text-cocoa-900"
        @input="onInputText"
      />
      <span v-if="def?.param?.suffix">{{ def.param.suffix }}</span>
      <button class="ml-auto text-white/80 hover:text-white px-1" title="删除" @click="emit('delete', block.uid)">✕</button>
    </div>

    <!-- 容器类积木（重复）的子栈：可继续拖入 -->
    <div
      v-if="def?.container"
      class="my-1 min-h-[28px] rounded-lg border border-dashed border-cream-300 p-1 space-y-1"
      :style="{ marginLeft: depth * 16 + 16 + 'px' }"
      @dragover.prevent
      @drop="emit('drop-body', $event, block.uid)"
    >
      <BlockNode
        v-for="child in block.body || []"
        :key="child.uid"
        :block="child"
        :defs="defs"
        :depth="depth + 1"
        @delete="(uid) => emit('delete', uid)"
        @dragstart-block="(e, uid) => emit('dragstart-block', e, uid)"
        @drop-root="(e) => emit('drop-root', e)"
        @drop-body="(e, uid) => emit('drop-body', e, uid)"
      />
    </div>
  </div>
</template>
