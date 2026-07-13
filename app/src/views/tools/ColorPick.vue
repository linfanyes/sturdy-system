<script setup lang="ts">
import { ref } from 'vue'
import { Copy, Pipette } from 'lucide-vue-next'
import { useToastStore } from '../../stores/toast'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const toast = useToastStore()
const color = ref('#FFD479')
const palette = [
  '#FFD479', '#FFE7B8', '#FFF1D9', '#7FD8A4', '#A8E8C2', '#D6F5E2',
  '#FF9EB5', '#FFB8CC', '#FFE0E9', '#7BC6FF', '#A4D6FF', '#D4ECFF',
  '#3D2E1F', '#7A6A55', '#C8B59A', '#FFFFFF', '#000000',
]

function pickFromPalette(c: string) {
  color.value = c
}

function copy(hex: string) {
  navigator.clipboard.writeText(hex).then(
    () => toast.success(`已复制 ${hex}`),
    () => toast.error('复制失败'),
  )
}

function hexToRgb(hex: string) {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m) return { r: 0, g: 0, b: 0 }
  return {
    r: parseInt(m[0], 16),
    g: parseInt(m[1], 16),
    b: parseInt(m[2], 16),
  }
}

const rgb = ref(hexToRgb(color.value))
function update() {
  rgb.value = hexToRgb(color.value)
}
</script>

<template>
  <div class="grid lg:grid-cols-3 gap-5">
    <ToolBackButton />
    <div class="lg:col-span-2 card-soft p-6">
      <div
        class="aspect-video rounded-3xl flex items-center justify-center text-3xl transition-colors"
        :style="{ background: color }"
      >
        <span class="number text-4xl mix-blend-difference text-white">
          {{ color.toUpperCase() }}
        </span>
      </div>
      <div class="mt-4 flex items-center gap-3">
        <label
          class="w-12 h-12 rounded-2xl border-2 border-white shadow-softer cursor-pointer"
          :style="{ background: color }"
        >
          <input
            v-model="color"
            type="color"
            class="opacity-0 w-full h-full"
            @change="update"
          >
        </label>
        <div class="flex-1">
          <input
            v-model="color"
            class="input-soft"
            @change="update"
            placeholder="#FFD479"
          >
        </div>
        <button
          class="btn-primary"
          @click="copy(color)"
        >
          <Copy :size="14" /> 复制
        </button>
      </div>

      <div class="mt-4 grid grid-cols-3 gap-2 text-sm">
        <div class="card-flat p-3">
          <div class="text-xs text-cocoa-500">
            HEX
          </div>
          <div class="font-mono">
            {{ color.toUpperCase() }}
          </div>
        </div>
        <div class="card-flat p-3">
          <div class="text-xs text-cocoa-500">
            RGB
          </div>
          <div class="font-mono">
            rgb({{ rgb.r }}, {{ rgb.g }}, {{ rgb.b }})
          </div>
        </div>
        <div class="card-flat p-3">
          <div class="text-xs text-cocoa-500">
            CMYK
          </div>
          <div class="font-mono">
            {{
              Math.round((1 - rgb.r / 255) * 100)
            }},{{
              Math.round((1 - rgb.g / 255) * 100)
            }},{{
              Math.round((1 - rgb.b / 255) * 100)
            }},{{
              Math.round((1 - Math.max(rgb.r, rgb.g, rgb.b) / 255) * 100)
            }}
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-5">
      <div class="card-soft p-5">
        <h3 class="title-display text-lg mb-3 flex items-center gap-2">
          <Pipette :size="16" /> 园丁调色板
        </h3>
        <div class="grid grid-cols-6 gap-2">
          <button
            v-for="c in palette"
            :key="c"
            class="aspect-square rounded-2xl border-2 transition hover:scale-110"
            :class="color === c ? 'border-cocoa-900' : 'border-white'"
            :style="{ background: c }"
            @click="pickFromPalette(c)"
            :title="c"
          />
        </div>
      </div>
      <div class="card-soft p-5">
        <h3 class="title-display text-lg mb-2">
          配色小贴士
        </h3>
        <p class="text-sm text-cocoa-500">
          选一个主色，再搭配 2~3 个相近色或对比色，就能做出温柔又有童趣的课件。
        </p>
      </div>
    </div>
  </div>
</template>
