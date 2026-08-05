<script setup lang="ts">
/**
 * 乘法口诀：展示九九乘法表，点击格子高亮所在行列，可切换完整表/阶段表。
 */
import { ref, computed } from 'vue'
import { Grid3x3 } from 'lucide-vue-next'

const max = ref(9)
const selected = ref<{ row: number; col: number } | null>(null)

const sizeOptions = [5, 6, 7, 8, 9]

const rows = computed(() => Array.from({ length: max.value }, (_, i) => i + 1))
const cols = computed(() => Array.from({ length: max.value }, (_, i) => i + 1))

function selectCell(row: number, col: number) {
  if (selected.value?.row === row && selected.value?.col === col) {
    selected.value = null
  } else {
    selected.value = { row, col }
  }
}

function isHighlighted(row: number, col: number) {
  if (!selected.value) return false
  return selected.value.row === row || selected.value.col === col
}

function isCell(row: number, col: number) {
  // 下三角显示（col <= row），符合传统九九表
  return col <= row
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Grid3x3 class="w-6 h-6 text-butter-500" /> 乘法口诀
    </h1>

    <!-- 模式切换 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 flex-wrap">
        <span class="text-sm text-cocoa-500">阶段：</span>
        <button
          v-for="n in sizeOptions"
          :key="n"
          :class="[
            'px-3 py-1.5 rounded-xl text-sm transition-colors',
            max === n ? 'bg-butter-500 text-white' : 'bg-cream-100 text-cocoa-600 hover:bg-cream-200',
          ]"
          @click="max = n; selected = null"
        >{{ n }}×{{ n }}</button>
        <span v-if="selected" class="ml-auto text-sm text-cocoa-500">
          当前选中：{{ selected.row }} × {{ selected.col }} = {{ selected.row * selected.col }}
          <button class="ml-2 text-xs px-2 py-1 rounded-lg bg-cream-100 hover:bg-cream-200" @click="selected = null">清除</button>
        </span>
      </div>
    </div>

    <!-- 乘法表 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="overflow-x-auto">
        <table class="border-collapse mx-auto">
          <thead>
            <tr>
              <th class="w-14 h-12"></th>
              <th
                v-for="c in cols"
                :key="c"
                :class="[
                  'w-14 h-12 text-center font-mono font-semibold border border-cream-200 transition-colors',
                  selected?.col === c ? 'bg-butter-500 text-white' : 'bg-cream-50 text-cocoa-500',
                ]"
              >{{ c }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r">
              <th
                :class="[
                  'w-14 h-12 text-center font-mono font-semibold border border-cream-200 transition-colors',
                  selected?.row === r ? 'bg-butter-500 text-white' : 'bg-cream-50 text-cocoa-500',
                ]"
              >{{ r }}</th>
              <td
                v-for="c in cols"
                :key="c"
                :class="[
                  'w-14 h-12 text-center font-mono text-sm border border-cream-200 transition-colors',
                  isCell(r, c) ? 'cursor-pointer' : 'bg-cream-50/40',
                  isCell(r, c) && isHighlighted(r, c) ? 'bg-butter-100 text-butter-600 font-semibold' : '',
                  isCell(r, c) && !isHighlighted(r, c) ? 'text-cocoa-700 hover:bg-cream-50' : '',
                  isCell(r, c) && selected?.row === r && selected?.col === c ? '!bg-butter-500 !text-white' : '',
                ]"
                @click="isCell(r, c) && selectCell(r, c)"
              >
                <span v-if="isCell(r, c)">{{ r }}×{{ c }}={{ r * c }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
