<script setup lang="ts">
/**
 * 随机决定器（小决定骰子）
 * - 选项输入：textarea 每行一个，或 input 动态添加标签
 * - 滚动文字动画展示结果
 * - 历史记录存 localStorage（web_tool_dice_history）
 * - 支持权重设置（简单实现）
 */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Dice5, Plus, X, Play, History, Trash2, Settings2 } from 'lucide-vue-next'

interface Option {
  text: string
  weight: number
}

const STORAGE_KEY = 'web_tool_dice_history'

const bulkText = ref('')
const options = ref<Option[]>([])
const newOption = ref('')
const showWeight = ref(false)
const rolling = ref(false)
const displayText = ref('点击下方按钮开始')
const finalResult = ref('')
const history = ref<string[]>([])
const wheelAngle = ref(0)

const totalWeight = computed(() => options.value.reduce((s, o) => s + Math.max(0, o.weight), 0))

function addFromBulk() {
  const lines = bulkText.value.split('\n').map(s => s.trim()).filter(Boolean)
  if (!lines.length) return
  const existing = new Set(options.value.map(o => o.text))
  for (const line of lines) {
    if (!existing.has(line)) options.value.push({ text: line, weight: 1 })
  }
  bulkText.value = ''
}

function addOne() {
  const t = newOption.value.trim()
  if (!t) return
  if (options.value.some(o => o.text === t)) return
  options.value.push({ text: t, weight: 1 })
  newOption.value = ''
}

function removeOption(i: number) {
  options.value.splice(i, 1)
}

function pickWeighted(): string {
  const pool = options.value.filter(o => o.weight > 0)
  if (!pool.length) return ''
  const total = pool.reduce((s, o) => s + o.weight, 0)
  let r = Math.random() * total
  for (const o of pool) {
    r -= o.weight
    if (r < 0) return o.text
  }
  return pool[pool.length - 1].text
}

let timer: number | undefined
function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = undefined
  }
}

function startRoll() {
  if (options.value.length === 0) {
    alert('请先添加选项')
    return
  }
  rolling.value = true
  finalResult.value = ''
  stopTimer()
  // 旋转角度累加，模拟转盘
  wheelAngle.value += 360 * 4 + Math.floor(Math.random() * 360)
  timer = window.setInterval(() => {
    const idx = Math.floor(Math.random() * options.value.length)
    displayText.value = options.value[idx].text
  }, 60)
  window.setTimeout(() => {
    stopTimer()
    rolling.value = false
    const result = pickWeighted()
    finalResult.value = result
    displayText.value = result
    recordHistory(result)
  }, 3000)
}

function recordHistory(result: string) {
  history.value.unshift(result)
  if (history.value.length > 20) history.value.length = 20
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
  } catch {
    /* ignore */
  }
}

function clearHistory() {
  if (!confirm('确定清空历史？')) return
  history.value = []
  localStorage.removeItem(STORAGE_KEY)
}

onMounted(() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) history.value = JSON.parse(raw) || []
  } catch {
    history.value = []
  }
})
onBeforeUnmount(stopTimer)

// 当无选项时给出提示文案
watch(options, (v) => {
  if (!v.length && !rolling.value) displayText.value = '点击下方按钮开始'
})
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Dice5 class="w-6 h-6 text-butter-500" /> 随机决定器
    </h1>

    <!-- 选项输入 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold text-cocoa-900">选项</h2>
        <button
          class="flex items-center gap-1 text-sm text-cocoa-500 hover:text-cocoa-700"
          @click="showWeight = !showWeight"
        >
          <Settings2 class="w-4 h-4" /> {{ showWeight ? '收起权重' : '设置权重' }}
        </button>
      </div>

      <!-- 批量输入 -->
      <div class="flex gap-2">
        <textarea
          v-model="bulkText"
          rows="3"
          placeholder="批量输入：每行一个选项"
          class="flex-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
        />
        <button
          class="self-start px-3 py-2 rounded-xl bg-cream-100 text-cocoa-500 text-sm hover:bg-cream-200"
          @click="addFromBulk"
        >批量添加</button>
      </div>

      <!-- 单个添加 -->
      <div class="flex gap-2">
        <input
          v-model="newOption"
          placeholder="输入选项后回车添加"
          class="flex-1 px-3 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400"
          @keydown.enter.prevent="addOne"
        />
        <button
          class="flex items-center gap-1 px-4 py-2 rounded-xl bg-butter-500 text-white text-sm hover:bg-butter-600"
          @click="addOne"
        >
          <Plus class="w-4 h-4" /> 添加
        </button>
      </div>

      <!-- 已添加选项标签 -->
      <div v-if="options.length" class="flex flex-wrap gap-2">
        <div
          v-for="(o, i) in options"
          :key="i"
          class="flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-full bg-cream-100 text-cocoa-700 text-sm"
        >
          <span>{{ o.text }}</span>
          <input
            v-if="showWeight"
            v-model.number="o.weight"
            type="number"
            min="1"
            class="w-12 px-1 py-0.5 rounded-lg border border-cream-200 text-xs text-center bg-white"
          />
          <span v-else-if="o.weight !== 1" class="text-xs text-butter-600">×{{ o.weight }}</span>
          <button class="p-0.5 rounded-full hover:bg-red-100 text-red-500" @click="removeOption(i)">
            <X class="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div v-else class="text-sm text-cocoa-400">还没有选项，先添加几个吧</div>
    </div>

    <!-- 结果展示 -->
    <div class="bg-white rounded-2xl p-8 shadow-softer text-center">
      <!-- 装饰转盘 -->
      <div class="flex justify-center mb-4">
        <div
          :style="{ transform: `rotate(${wheelAngle}deg)`, transition: rolling ? 'transform 3s cubic-bezier(0.2,0.8,0.2,1)' : 'none' }"
          class="w-16 h-16 rounded-full border-4 border-butter-400 border-t-butter-500 flex items-center justify-center"
        >
          <Dice5 class="w-6 h-6 text-butter-500" />
        </div>
      </div>
      <div
        :class="['text-4xl font-bold tracking-wide min-h-[1.5em] flex items-center justify-center transition-colors', rolling ? 'text-butter-500' : finalResult ? 'text-cocoa-900' : 'text-cocoa-300']"
      >
        {{ displayText }}
      </div>
      <div v-if="showWeight && options.length" class="text-xs text-cocoa-400 mt-2">总权重：{{ totalWeight }}</div>
      <button
        class="mt-6 inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-butter-500 text-white text-lg font-semibold hover:bg-butter-600 disabled:opacity-60"
        :disabled="rolling"
        @click="startRoll"
      >
        <Play class="w-5 h-5" /> {{ rolling ? '决定中…' : '开始决定' }}
      </button>
    </div>

    <!-- 历史 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <div class="flex items-center gap-2 mb-3">
        <History class="w-5 h-5 text-cocoa-500" />
        <h2 class="text-lg font-semibold text-cocoa-900">历史记录</h2>
        <span class="text-sm text-cocoa-400 ml-auto">最近 {{ history.length }} 条</span>
        <button v-if="history.length" class="ml-2 p-1 rounded hover:bg-red-50 text-red-500" @click="clearHistory">
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
      <div v-if="!history.length" class="text-cocoa-400 text-sm text-center py-4">暂无记录</div>
      <div v-else class="flex flex-wrap gap-2">
        <span
          v-for="(h, i) in history"
          :key="i"
          class="px-3 py-1 rounded-full bg-cream-100 text-cocoa-700 text-sm"
        >{{ h }}</span>
      </div>
    </div>
  </div>
</template>
