<script setup lang="ts">
/**
 * 单位换算：内置长度/面积/体积/重量/时间换算因子表，实时换算。
 */
import { ref, computed, watch } from 'vue'
import { Ruler } from 'lucide-vue-next'

interface Unit { label: string; factor: number }
type Category = '长度' | '面积' | '体积' | '重量' | '时间'

const units: Record<Category, Unit[]> = {
  长度: [
    { label: '毫米(mm)', factor: 0.001 },
    { label: '厘米(cm)', factor: 0.01 },
    { label: '分米(dm)', factor: 0.1 },
    { label: '米(m)', factor: 1 },
    { label: '千米(km)', factor: 1000 },
    { label: '英寸(in)', factor: 0.0254 },
    { label: '英尺(ft)', factor: 0.3048 },
    { label: '码(yd)', factor: 0.9144 },
    { label: '英里(mi)', factor: 1609.344 },
  ],
  面积: [
    { label: '平方毫米(mm²)', factor: 0.000001 },
    { label: '平方厘米(cm²)', factor: 0.0001 },
    { label: '平方分米(dm²)', factor: 0.01 },
    { label: '平方米(m²)', factor: 1 },
    { label: '平方千米(km²)', factor: 1000000 },
    { label: '公顷(ha)', factor: 10000 },
    { label: '亩', factor: 666.6667 },
    { label: '英亩(acre)', factor: 4046.8564 },
  ],
  体积: [
    { label: '毫升(mL)', factor: 0.001 },
    { label: '升(L)', factor: 1 },
    { label: '立方米(m³)', factor: 1000 },
    { label: '立方厘米(cm³)', factor: 0.001 },
    { label: '加仑(gal)', factor: 3.7854 },
    { label: '品脱(pt)', factor: 0.4732 },
  ],
  重量: [
    { label: '毫克(mg)', factor: 0.000001 },
    { label: '克(g)', factor: 0.001 },
    { label: '千克(kg)', factor: 1 },
    { label: '吨(t)', factor: 1000 },
    { label: '两', factor: 0.05 },
    { label: '斤', factor: 0.5 },
    { label: '磅(lb)', factor: 0.4536 },
  ],
  时间: [
    { label: '毫秒(ms)', factor: 0.001 },
    { label: '秒(s)', factor: 1 },
    { label: '分(min)', factor: 60 },
    { label: '时(h)', factor: 3600 },
    { label: '天(d)', factor: 86400 },
    { label: '周(w)', factor: 604800 },
  ],
}

const category = ref<Category>('长度')
const value = ref<number | null>(1)
const fromUnit = ref('米(m)')
const toUnit = ref('厘米(cm)')

// 切换类别时重置单位为该类别的第 0/1 项
watch(category, (c) => {
  const list = units[c]
  fromUnit.value = list[0].label
  toUnit.value = list[1]?.label || list[0].label
})

const result = computed(() => {
  if (value.value == null || isNaN(value.value)) return null
  const list = units[category.value]
  const from = list.find(u => u.label === fromUnit.value)
  const to = list.find(u => u.label === toUnit.value)
  if (!from || !to || to.factor === 0) return null
  const base = value.value * from.factor
  return base / to.factor
})

const formatted = computed(() => {
  if (result.value == null) return '—'
  const r = result.value
  if (r === 0) return '0'
  const abs = Math.abs(r)
  if (abs >= 1e9 || abs < 1e-4) return r.toExponential(6)
  // 去除多余小数位
  return parseFloat(r.toFixed(8)).toString()
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Ruler class="w-6 h-6 text-butter-500" /> 单位换算
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div>
          <label class="text-sm text-cocoa-500">类别</label>
          <select v-model="category" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option v-for="c in (Object.keys(units) as Category[])" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">数值</label>
          <input v-model.number="value" type="number" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">源单位</label>
          <select v-model="fromUnit" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option v-for="u in units[category]" :key="u.label" :value="u.label">{{ u.label }}</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">目标单位</label>
          <select v-model="toUnit" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option v-for="u in units[category]" :key="u.label" :value="u.label">{{ u.label }}</option>
          </select>
        </div>
        <div class="md:col-span-1">
          <div class="text-sm text-cocoa-500">结果</div>
          <div class="mt-1 px-3 py-2 rounded-xl bg-mint-100 text-mint-500 font-mono font-semibold text-lg break-all">
            {{ formatted }}
          </div>
        </div>
      </div>

      <div class="mt-4 pt-4 border-t border-cream-200 text-sm text-cocoa-500">
        <span class="text-cocoa-700 font-medium">{{ value ?? '—' }}</span>
        {{ fromUnit }} =
        <span class="text-mint-500 font-semibold">{{ formatted }}</span>
        {{ toUnit }}
      </div>
    </div>

    <!-- 换算因子表 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="text-sm font-medium text-cocoa-700 mb-3">{{ category }}换算因子表（以基础单位为基准）</div>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
        <div v-for="u in units[category]" :key="u.label" class="flex items-center justify-between px-3 py-2 rounded-xl bg-cream-50 text-sm">
          <span class="text-cocoa-700">{{ u.label }}</span>
          <span class="font-mono text-cocoa-400">{{ u.factor }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
