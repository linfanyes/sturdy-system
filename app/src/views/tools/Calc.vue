<script setup lang="ts">
import { ref, computed } from 'vue'
import ToolBackButton from '../../components/common/ToolBackButton.vue'

const display = ref('0')
const operator = ref<string | null>(null)
const previous = ref<number | null>(null)
const waiting = ref(false)

function inputNumber(n: string) {
  if (waiting.value) {
    display.value = n
    waiting.value = false
  } else {
    display.value = display.value === '0' ? n : display.value + n
  }
}

function inputDot() {
  if (waiting.value) {
    display.value = '0.'
    waiting.value = false
  } else if (!display.value.includes('.')) {
    display.value += '.'
  }
}

function clearAll() {
  display.value = '0'
  previous.value = null
  operator.value = null
  waiting.value = false
}

function backspace() {
  if (waiting.value) return
  display.value = display.value.length > 1 ? display.value.slice(0, -1) : '0'
}

function setOp(op: string) {
  const cur = parseFloat(display.value)
  if (previous.value == null) {
    previous.value = cur
  } else if (operator.value) {
    previous.value = compute(previous.value, cur, operator.value)
    display.value = formatNum(previous.value)
  }
  operator.value = op
  waiting.value = true
}

function compute(a: number, b: number, op: string) {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? NaN : a / b
    case '%':
      return a % b
    default:
      return b
  }
}

function formatNum(n: number) {
  if (isNaN(n) || !isFinite(n)) return '错误'
  const s = n.toString()
  if (s.length > 12) return n.toExponential(6)
  return s
}

function equal() {
  if (previous.value == null || !operator.value) return
  const cur = parseFloat(display.value)
  const result = compute(previous.value, cur, operator.value)
  display.value = formatNum(result)
  previous.value = null
  operator.value = null
  waiting.value = true
}

const keys = [
  ['C', 'backspace', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '-'],
  ['1', '2', '3', '+'],
  ['0', '.', '=', '='],
]

function click(k: string) {
  if (k === 'C') return clearAll()
  if (k === 'backspace') return backspace()
  if (['+', '-', '×', '÷', '%'].includes(k)) return setOp(k)
  if (k === '=') return equal()
  if (k === '.') return inputDot()
  inputNumber(k)
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <ToolBackButton />
    <div
      class="card-soft p-6 bg-gradient-to-br from-sky2-100 via-cream-50 to-butter-100"
    >
      <div
        class="card-flat p-4 mb-4 text-right min-h-[100px] flex flex-col justify-end"
      >
        <div class="text-cocoa-500 text-sm min-h-[20px]">
          <span v-if="previous !== null && operator">{{ formatNum(previous) }} {{ operator }}</span>
        </div>
        <div class="number text-4xl text-cocoa-900 break-all">
          {{ display }}
        </div>
      </div>
      <div class="grid grid-cols-4 gap-2">
        <button
          v-for="(k, i) in keys.flat()"
          :key="i + '-' + k"
          class="aspect-square rounded-2xl text-lg font-medium transition active:scale-95"
          :class="
            ['+', '-', '×', '÷', '%'].includes(k)
              ? 'bg-sky2-300 text-cocoa-900 hover:bg-sky2-400'
              : k === '='
                ? 'bg-butter-400 text-cocoa-900 hover:bg-butter-500'
                : k === 'C'
                  ? 'bg-sakura-300 text-cocoa-900 hover:bg-sakura-400'
                  : k === 'backspace'
                    ? 'bg-cocoa-100 text-cocoa-900 hover:bg-cocoa-100/80'
                    : 'bg-white/80 text-cocoa-900 hover:bg-white'
          "
          @click="click(k)"
        >
          {{ k === 'backspace' ? '⌫' : k }}
        </button>
      </div>
    </div>
  </div>
</template>
