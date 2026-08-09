<script setup lang="ts">
/**
 * 口算生成：随机生成加减乘除口算题。
 * 配置存 localStorage（web_tool_math_config），支持打印与复制。
 */
import { ref, onMounted } from 'vue'
import { Calculator, RefreshCw, Printer, Copy } from 'lucide-vue-next'
import { toast } from '@/utils/feedback'
import { randInt } from '@gardener/shared/games/helpers'

type OpType = 'add' | 'sub' | 'mul' | 'div' | 'mix'

interface Config {
  op: OpType
  min: number
  max: number
  count: number
  showAnswer: boolean
}

interface Question {
  expr: string
  answer: number
}

const STORAGE_KEY = 'web_tool_math_config'

const config = ref<Config>({
  op: 'add',
  min: 1,
  max: 20,
  count: 20,
  showAnswer: false,
})
const questions = ref<Question[]>([])

function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) config.value = { ...config.value, ...JSON.parse(raw) }
  } catch { /* ignore */ }
}
function saveConfig() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config.value)) } catch { /* ignore */ }
}


function genOne(op: OpType): Question {
  const lo = Math.min(config.value.min, config.value.max)
  const hi = Math.max(config.value.min, config.value.max)
  const realOp = op === 'mix'
    ? (['add', 'sub', 'mul', 'div'] as OpType[])[randInt(0, 3)]
    : op
  let a = randInt(lo, hi)
  let b = randInt(lo, hi)
  let expr = ''
  let answer = 0
  if (realOp === 'add') {
    expr = `${a} + ${b}`
    answer = a + b
  } else if (realOp === 'sub') {
    if (a < b) [a, b] = [b, a]
    expr = `${a} - ${b}`
    answer = a - b
  } else if (realOp === 'mul') {
    expr = `${a} × ${b}`
    answer = a * b
  } else {
    // 除法：保证整除且除数不为 0
    if (b === 0) b = 1
    const divisor = b
    const quotient = Math.max(1, Math.floor(a / divisor))
    const dividend = divisor * quotient
    expr = `${dividend} ÷ ${divisor}`
    answer = quotient
  }
  return { expr, answer }
}

function generate() {
  const n = Math.max(1, Math.min(200, config.value.count || 20))
  questions.value = Array.from({ length: n }, () => genOne(config.value.op))
  saveConfig()
}

function copyAll() {
  const text = questions.value
    .map((q, i) => `${i + 1}. ${q.expr}${config.value.showAnswer ? ` = ${q.answer}` : ''}`)
    .join('\n')
  navigator.clipboard.writeText(text)
    .then(() => toast.success('已复制'))
    .catch(() => toast.error('复制失败，请手动选择'))
}

function printList() {
  window.print()
}

onMounted(() => {
  loadConfig()
  generate()
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Calculator class="w-6 h-6 text-butter-500" /> 口算生成
    </h1>

    <!-- 配置 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer print:hidden">
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label class="text-sm text-cocoa-500">运算类型</label>
          <select v-model="config.op" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400">
            <option value="add">加法</option>
            <option value="sub">减法</option>
            <option value="mul">乘法</option>
            <option value="div">除法</option>
            <option value="mix">混合</option>
          </select>
        </div>
        <div>
          <label class="text-sm text-cocoa-500">最小值</label>
          <input v-model.number="config.min" type="number" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">最大值</label>
          <input v-model.number="config.max" type="number" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div>
          <label class="text-sm text-cocoa-500">题目数量</label>
          <input v-model.number="config.count" type="number" min="1" max="200" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
        <div class="flex items-end">
          <label class="inline-flex items-center gap-2 text-sm text-cocoa-700 cursor-pointer">
            <input type="checkbox" v-model="config.showAnswer" class="rounded" />
            显示答案
          </label>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="copyAll">
          <Copy class="w-4 h-4" /> 复制
        </button>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="printList">
          <Printer class="w-4 h-4" /> 打印
        </button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 text-sm" @click="generate">
          <RefreshCw class="w-4 h-4" /> 生成
        </button>
      </div>
    </div>

    <!-- 题目列表 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 text-cocoa-900">
        <div v-for="(q, i) in questions" :key="i" class="flex items-baseline gap-2">
          <span class="text-cocoa-400 text-sm w-7 shrink-0">{{ i + 1 }}.</span>
          <span class="font-mono">
            {{ q.expr }} =
            <span v-if="config.showAnswer" class="text-mint-500 font-semibold">{{ q.answer }}</span>
            <span v-else class="inline-block w-10 border-b border-cocoa-300">&nbsp;</span>
          </span>
        </div>
      </div>
      <div v-if="!questions.length" class="text-center text-cocoa-400 py-8">点击「生成」按钮创建口算题</div>
    </div>
  </div>
</template>
