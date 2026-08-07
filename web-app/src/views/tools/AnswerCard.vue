<script setup lang="ts">
/**
 * 口算答题卡：生成左列题目 + 右列空格作答的答题卡。
 * 支持显示/隐藏答案与打印。配置存 localStorage（web_tool_answer_card）。
 */
import { ref, onMounted } from 'vue'
import { FileText, RefreshCw, Printer, Eye, EyeOff } from 'lucide-vue-next'
import { randInt } from '@gardener/shared/utils/game-helpers'

type OpType = 'add' | 'sub' | 'mul' | 'div' | 'mix'

interface Config {
  op: OpType
  min: number
  max: number
  count: number
}

interface Question {
  expr: string
  answer: number
}

const STORAGE_KEY = 'web_tool_answer_card'

const config = ref<Config>({ op: 'add', min: 1, max: 20, count: 20 })
const questions = ref<Question[]>([])
const showAnswer = ref(false)

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
  const n = Math.max(1, Math.min(100, config.value.count || 20))
  questions.value = Array.from({ length: n }, () => genOne(config.value.op))
  saveConfig()
}

function printCard() {
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
      <FileText class="w-6 h-6 text-butter-500" /> 口算答题卡
    </h1>

    <!-- 配置 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer print:hidden">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <label class="text-sm text-cocoa-500">题目数</label>
          <input v-model.number="config.count" type="number" min="1" max="100" class="w-full mt-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400" />
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="showAnswer = !showAnswer">
          <component :is="showAnswer ? EyeOff : Eye" class="w-4 h-4" />
          {{ showAnswer ? '隐藏答案' : '显示答案' }}
        </button>
        <button class="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cream-100 text-cocoa-600 hover:bg-cream-200 text-sm" @click="printCard">
          <Printer class="w-4 h-4" /> 打印
        </button>
        <button class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600 text-sm" @click="generate">
          <RefreshCw class="w-4 h-4" /> 生成
        </button>
      </div>
    </div>

    <!-- 答题卡 -->
    <div class="bg-surface rounded-2xl p-6 shadow-softer">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
        <div v-for="(q, i) in questions" :key="i" class="flex items-baseline gap-2 border-b border-dashed border-cream-200 pb-1">
          <span class="text-cocoa-400 text-sm w-8 shrink-0">{{ i + 1 }}.</span>
          <span class="font-mono text-cocoa-900">{{ q.expr }} =</span>
          <span v-if="showAnswer" class="ml-auto font-mono text-mint-500 font-semibold">{{ q.answer }}</span>
          <span v-else class="ml-auto inline-block w-16 border-b border-cocoa-300">&nbsp;</span>
        </div>
      </div>
      <div v-if="!questions.length" class="text-center text-cocoa-400 py-8">点击「生成」按钮创建答题卡</div>
    </div>
  </div>
</template>
