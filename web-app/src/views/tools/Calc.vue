<script setup lang="ts">
/**
 * 课堂计算器
 * - 大字号显示屏
 * - 数字 0-9、运算符 + − × ÷、等号、清除、退格
 * - 支持小数点、括号
 * - 历史记录区（最近 5 条，可点击复用），持久化到 localStorage
 */
import { ref, onMounted, watch } from 'vue'
import { Calculator, Delete, History, X } from 'lucide-vue-next'

const STORAGE_KEY = 'web_tool_calc_history'
const expr = ref('')
const display = ref('0')
const history = ref<{ expr: string; result: string }[]>([])

interface Btn {
  label: string
  value: string
  type: 'num' | 'op' | 'fn' | 'eq'
  cls?: string
}

const buttons: Btn[] = [
  { label: 'C', value: 'C', type: 'fn', cls: 'bg-sakura-100 text-sakura-500 hover:bg-sakura-100/70' },
  { label: '⌫', value: 'back', type: 'fn', cls: 'bg-cream-100 text-cocoa-500 hover:bg-cream-200' },
  { label: '(', value: '(', type: 'op', cls: 'bg-cream-100 text-cocoa-500 hover:bg-cream-200' },
  { label: ')', value: ')', type: 'op', cls: 'bg-cream-100 text-cocoa-500 hover:bg-cream-200' },
  { label: '7', value: '7', type: 'num' },
  { label: '8', value: '8', type: 'num' },
  { label: '9', value: '9', type: 'num' },
  { label: '÷', value: '÷', type: 'op', cls: 'bg-butter-100 text-butter-600 hover:bg-butter-100/70' },
  { label: '4', value: '4', type: 'num' },
  { label: '5', value: '5', type: 'num' },
  { label: '6', value: '6', type: 'num' },
  { label: '×', value: '×', type: 'op', cls: 'bg-butter-100 text-butter-600 hover:bg-butter-100/70' },
  { label: '1', value: '1', type: 'num' },
  { label: '2', value: '2', type: 'num' },
  { label: '3', value: '3', type: 'num' },
  { label: '−', value: '−', type: 'op', cls: 'bg-butter-100 text-butter-600 hover:bg-butter-100/70' },
  { label: '0', value: '0', type: 'num' },
  { label: '.', value: '.', type: 'num' },
  { label: '=', value: '=', type: 'eq', cls: 'bg-butter-500 text-white hover:bg-butter-600' },
  { label: '+', value: '+', type: 'op', cls: 'bg-butter-100 text-butter-600 hover:bg-butter-100/70' },
]

function input(btn: Btn) {
  if (btn.value === 'C') {
    expr.value = ''
    display.value = '0'
    return
  }
  if (btn.value === 'back') {
    expr.value = expr.value.slice(0, -1)
    display.value = expr.value || '0'
    return
  }
  if (btn.value === '=') {
    calculate()
    return
  }
  expr.value += btn.value
  display.value = expr.value
}

/** 简单安全的表达式求值（递归下降，支持 + - * / 和括号、小数） */
function evaluate(inputStr: string): number {
  const s = inputStr.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '')
  let pos = 0
  const peek = () => s[pos]
  const next = () => s[pos++]
  const eof = () => pos >= s.length

  function parseExpr(): number {
    let v = parseTerm()
    while (!eof() && (peek() === '+' || peek() === '-')) {
      const op = next()
      const r = parseTerm()
      v = op === '+' ? v + r : v - r
    }
    return v
  }
  function parseTerm(): number {
    let v = parseFactor()
    while (!eof() && (peek() === '*' || peek() === '/')) {
      const op = next()
      const r = parseFactor()
      v = op === '*' ? v * r : v / r
    }
    return v
  }
  function parseFactor(): number {
    if (peek() === '(') {
      next() // consume '('
      const v = parseExpr()
      if (peek() === ')') next()
      return v
    }
    if (peek() === '-') {
      next()
      return -parseFactor()
    }
    if (peek() === '+') {
      next()
      return parseFactor()
    }
    let num = ''
    while (!eof() && /[0-9.]/.test(peek())) num += next()
    if (num === '') throw new Error('表达式无效')
    return parseFloat(num)
  }

  const result = parseExpr()
  if (!eof()) throw new Error('表达式无效')
  return result
}

function calculate() {
  if (!expr.value.trim()) return
  try {
    const r = evaluate(expr.value)
    const resultStr = Number.isFinite(r)
      ? (Number.isInteger(r) ? String(r) : String(parseFloat(r.toFixed(8))))
      : 'Error'
    if (resultStr === 'Error' || !Number.isFinite(r)) {
      display.value = 'Error'
      return
    }
    history.value.unshift({ expr: expr.value, result: resultStr })
    if (history.value.length > 5) history.value.length = 5
    display.value = resultStr
    expr.value = resultStr
  } catch (e: any) {
    display.value = 'Error'
  }
}

function reuse(h: { expr: string; result: string }) {
  expr.value = h.result
  display.value = h.result
}

function clearHistory() {
  history.value = []
}

watch(history, (v) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(v)) } catch { /* ignore */ }
}, { deep: true })

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) history.value = JSON.parse(raw) || []
  } catch {
    history.value = []
  }
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Calculator class="w-6 h-6 text-butter-500" /> 课堂计算器
    </h1>

    <div class="bg-surface rounded-2xl p-6 shadow-softer max-w-md mx-auto">
      <!-- 显示屏 -->
      <div class="bg-cream-50 rounded-xl p-4 mb-4 text-right">
        <div class="text-sm text-cocoa-400 min-h-[1.2em] break-all">{{ expr || ' ' }}</div>
        <div class="text-4xl font-bold text-cocoa-900 break-all tabular-nums">{{ display }}</div>
      </div>

      <!-- 按键区 -->
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="b in buttons"
          :key="b.label"
          :class="[
            'h-14 rounded-xl text-xl font-semibold transition active:scale-95',
            b.cls || 'bg-cream-50 text-cocoa-900 hover:bg-cream-100',
            b.type === 'eq' ? 'row-span-1' : '',
          ]"
          @click="input(b)"
        >{{ b.label }}</button>
      </div>
    </div>

    <!-- 历史记录 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer max-w-md mx-auto">
      <div class="flex items-center gap-2 mb-3">
        <History class="w-5 h-5 text-cocoa-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">历史记录</h2>
        <span class="text-sm text-cocoa-400 ml-auto">最近 5 条</span>
        <button v-if="history.length" class="ml-2 p-1 rounded hover:bg-red-50 text-red-500" @click="clearHistory">
          <X class="w-4 h-4" />
        </button>
      </div>
      <div v-if="!history.length" class="text-cocoa-400 text-sm text-center py-4">暂无记录</div>
      <ul v-else class="divide-y divide-cream-100">
        <li
          v-for="(h, i) in history"
          :key="i"
          class="flex items-center justify-between py-2 text-sm cursor-pointer hover:bg-cream-50 rounded-lg px-2"
          @click="reuse(h)"
        >
          <span class="text-cocoa-500">{{ h.expr }} =</span>
          <span class="text-cocoa-900 font-semibold tabular-nums">{{ h.result }}</span>
        </li>
      </ul>
      <p class="text-xs text-cocoa-400 mt-2 flex items-center gap-1">
        <Delete class="w-3 h-3" /> 点击记录可复用结果
      </p>
    </div>
  </div>
</template>
