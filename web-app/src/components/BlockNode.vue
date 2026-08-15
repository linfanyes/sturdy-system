<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  block: any
  defs: Record<string, any>
  depth?: number
  activeUid?: string | null
}>()
const emit = defineEmits<{
  (e: 'delete', uid: string): void
  (e: 'dragstart-block', ev: DragEvent, uid: string): void
  (e: 'drop-root', ev: DragEvent): void
  (e: 'drop-body', ev: DragEvent, uid: string): void
  (e: 'drop-else', ev: DragEvent, uid: string): void
}>()

const def = computed(() => props.defs[props.block.type])
const depth = computed(() => props.depth ?? 0)
const isActive = computed(() => !!props.activeUid && props.activeUid === props.block.uid)

function onInput(key: string, e: any) {
  if (def.value?.params) props.block.params[key] = e.target.value
}
</script>

<template>
  <div class="select-none">
    <!-- 积木本体（可拖拽移动） -->
    <div
      class="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-white text-xs font-medium shadow-sm cursor-grab active:cursor-grabbing transition-transform"
      :class="isActive ? 'ring-4 ring-yellow-300 scale-[1.02] z-10' : ''"
      :style="{ background: def?.color || '#999', marginLeft: depth * 16 + 'px' }"
      draggable="true"
      @dragstart="emit('dragstart-block', $event, block.uid)"
    >
      <span>{{ def?.label || block.type }}</span>
      <template v-for="prm in def?.params || []" :key="prm.key">
        <input
          type="text"
          :value="block.params[prm.key]"
          :placeholder="prm.placeholder"
          class="w-14 px-1 rounded text-cocoa-900 text-center"
          @input="onInput(prm.key, $event)"
        />
        <span v-if="prm.suffix">{{ prm.suffix }}</span>
      </template>
      <button class="ml-auto text-white/80 hover:text-white px-1" title="删除" @click="emit('delete', block.uid)">✕</button>
    </div>

    <!-- 容器类积木（重复 / 如果）的子栈 -->
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
        :active-uid="activeUid"
        @delete="(uid) => emit('delete', uid)"
        @dragstart-block="(e, uid) => emit('dragstart-block', e, uid)"
        @drop-root="(e) => emit('drop-root', e)"
        @drop-body="(e, uid) => emit('drop-body', e, uid)"
        @drop-else="(e, uid) => emit('drop-else', e, uid)"
      />
    </div>

    <!-- if 的「否则」分支 -->
    <template v-if="def?.hasElse">
      <div class="text-xs text-cocoa-400 my-0.5 font-medium" :style="{ marginLeft: depth * 16 + 16 + 'px' }">否则</div>
      <div
        class="my-1 min-h-[28px] rounded-lg border border-dashed border-cream-300 p-1 space-y-1"
        :style="{ marginLeft: depth * 16 + 16 + 'px' }"
        @dragover.prevent
        @drop="emit('drop-else', $event, block.uid)"
      >
        <BlockNode
          v-for="child in block.elseBody || []"
          :key="child.uid"
          :block="child"
          :defs="defs"
          :depth="depth + 1"
          :active-uid="activeUid"
          @delete="(uid) => emit('delete', uid)"
          @dragstart-block="(e, uid) => emit('dragstart-block', e, uid)"
          @drop-root="(e) => emit('drop-root', e)"
          @drop-body="(e, uid) => emit('drop-body', e, uid)"
          @drop-else="(e, uid) => emit('drop-else', e, uid)"
        />
      </div>
    </template>
  </div>
</template>
