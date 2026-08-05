<script setup lang="ts">
/**
 * 竖式计算：输入两个数与运算符，生成竖式展示。
 * 使用 monospace 字体 + 文本对齐模拟竖式，支持加减乘除。
 */
import { ref, computed } from 'vue'
import { Sigma, RefreshCw } from 'lucide-vue-next'

type Op = '+' | '-' | '×' | '÷'

const a = ref<number | null>(123)
const b = ref<number | null>(45)
const op = ref<Op>('×')

function pad(s: string, width: number) {
  return s.padStart(width, ' ')
}

/** 加法竖式 */
function verticalAdd(x: number, y: number): string[] {
  const sa = String(x)
  const sb = String(y)
  const width = Math.max(sa.length, sb.length) + 1
  const sum = x + y
  const ss = String(sum)
  const w = Math.max(width, ss.length + 1)
  const line = '-'.repeat(w)
  return [
    pad(' ' + sa, w),
    pad('+' + sb, w),
    line,
    pad(ss, w),
  ]
}

/** 减法竖式（确保 a >= b，否则交换并标注） */
function verticalSub(x: number, y: number): string[] {
  let a1 = x, b1 = y
  let swapped = false
  if (a1 < b1) { [a1, b1] = [b1, a1]; swapped = true }
  const sa = String(a1)
  const sb = String(b1)
  const diff = a1 - b1
  const ss = String(diff)
  const w = Math.max(sa.length, sb.length) + 1
  const w2 = Math.max(w, ss.length)
  const line = '-'.repeat(w2)
  const lines = [
    pad(' ' + sa, w2),
    pad('-' + sb, w2),
    line,
    pad(ss, w2),
  ]
  if (swapped) lines.unshift(`（被减数小于减数，已交换）`)
  return lines
}

/** 乘法竖式：显示部分积与最终结果 */
function verticalMul(x: number, y: number): string[] {
  const sa = String(x)
  const sb = String(y)
  const product = x * y
  const sp = String(product)
  const topW = Math.max(sa.length, sb.length) + 1
  const totalW = Math.max(topW, sp.length + 1, sb.length + sa.length)
  const line = '-'.repeat(totalW)
  const lines: string[] = [
    pad(' ' + sa, totalW),
    pad('×' + sb, totalW),
    line,
  ]
  // 部分积：从 y 的个位开始
  const yStr = String(y)
  for (let i = yStr.length - 1; i >= 0; i--) {
    const digit = parseInt(yStr[i], 10)
    const partial = x * digit
    const shift = yStr.length - 1 - i
    const ps = String(partial) + ' '.repeat(shift)
    lines.push(pad(ps, totalW))
  }
  if (yStr.length > 1) {
    lines.push(line)
    lines.push(pad(sp, totalW))
  }
  return lines
}

/** 除法竖式（长除法） */
function verticalDiv(x: number, y: number): string[] {
  if (y === 0) return ['除数不能为 0']
  if (x === 0) {
    return [
      '     0',
      '   ----',
      `${String(y).padStart(2)} ) 0`,
    ]
  }
  const quotient = Math.floor(x / y)
  const remainder = x - quotient * y
  const dividendStr = String(x)
  const divisorStr = String(y)
  const quotientStr = String(quotient)
  const headerW = Math.max(dividendStr.length + divisorStr.length + 4, quotientStr.length + 4)
  const lines: string[] = []
  // 商行
  lines.push(pad(' ' + quotientStr, headerW))
  lines.push(pad(' ' + '-'.repeat(dividendStr.length + 1), headerW))
  lines.push(pad(`${divisorStr}) ${dividendStr}`, headerW))

  // 长除法步骤
  let cur = ''
  let firstLine = true
  for (let i = 0; i < dividendStr.length; i++) {
    cur += dividendStr[i]
    const curNum = parseInt(cur, 10)
    if (curNum < y && i < dividendStr.length - 1 && firstLine) continue
    firstLine = false
    const part = Math.floor(curNum / y) * y
    const partStr = String(part)
    const subStr = String(curNum - part)
    // 减去
    const indent = i - partStr.length + 1
    lines.push(pad(' '.repeat(indent + divisorStr.length + 2) + partStr, headerW))
    lines.push(pad(' '.repeat(indent + divisorStr.length + 2) + '-'.repeat(Math.max(partStr.length, subStr.length)), headerW))
    lines.push(pad(' '.repeat(indent + divisorStr.length + 2 - (subStr.length - partStr.length > 0 ? 0 : 0)) + (curNum - part === 0 && i < dividendStr.length - 1 ? '0' : subStr), headerW))
    cur = String(curNum - part)
    if (cur === '0') cur = ''
  }
  if (remainder > 0) {
    const rStr = String(remainder)
    lines.push(pad(' '.repeat(divisorStr.length + 2 + dividendStr.length - rStr.length) + rStr, headerW))
  }
  return lines
}

const lines = computed<string[]>(() => {
  if (a.value == null || b.value == null) return []
  const x = Math.floor(Math.abs(a.value))
  const y = Math.floor(Math.abs(b.value))
  if (op.value === '+') return verticalAdd(x, y)
  if (op.value === '-') return verticalSub(x, y)
  if (op.value === '×') return verticalMul(x, y)
  return verticalDiv(x, y)
})

const result = computed(() => {
  if (a.value == null || b.value == null) return null
  const x = Math.floor(Math.abs(a.value))
  const y = Math.floor(Math.abs(b.value))
  if (op.value === '+') return x + y
  if (op.value === '-') return x - y
  if (op.value === '×') return x * y
  if (y === 0) return '∞'
  const q = Math.floor(x / y)
  const r = x - q * y
  return r === 0 ? q : `${q} …… ${r}`
})

function swap() {
  if (a.value == null || b.value == null) return
  ;[a.value, b.value] = [b.value, a.value]
}
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Sigma class="w-6 h-6 text-butter-500" /> 竖式计算
    </h1>

    <!-- 输入 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="flex flex-wrap items-end gap-3">
        <div>
          <label class="text-sm text-cocoa-500">数 A</label>
          <input v-model.number="a" type="number" class="w-32 mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">运算</label>
          <select v-model="op" class="mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="+">+ 加</option>
            <option value="-">- 减</option>
            <option value="×">× 乘</option>
            <option value="÷">÷ 除</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">数 B</label>
          <input v-model.number="b" type="number" class="w-32 mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="swap">
          <RefreshCw class="w-4 h-4" /> 交换
        </button>
      </div>
    </div>

    <!-- 竖式展示 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div v-if="lines.length" class="font-mono text-2xl text-cocoa-900 whitespace-pre leading-relaxed">
        <div v-for="(ln, i) in lines" :key="i">{{ ln }}</div>
      </div>
      <div v-else class="text-center text-cocoa-400 py-6">请输入两个数字</div>
      <div v-if="result !== null" class="mt-4 pt-4 border-t border-cream-200 text-cocoa-700">
        结果：<span class="font-mono font-semibold text-mint-500">{{ result }}</span>
      </div>
    </div>
  </div>
</template>
