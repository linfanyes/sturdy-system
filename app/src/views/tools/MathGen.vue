<script setup lang="ts">
import { ref, computed } from 'vue'
import { RefreshCw, Printer, Download } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'
import { useUserStore } from '../../stores/user'
import { useClassStore } from '../../stores/class'

const userStore = useUserStore()
const classStore = useClassStore()

const ops = ['+', '-', '×', '÷']
const opSelected = ref<Record<string, boolean>>({
  '+': true,
  '-': true,
  '×': false,
  '÷': false,
})
const count = ref(20)
const max = ref(20)
const showAnswer = ref(false)
const classId = ref(
  userStore.teaching[0]?.classId || classStore.classes[0]?.id || '',
)
const selectedClassName = computed(() => {
  const c = classStore.getClass(classId.value)
  return c ? `${c.grade}${c.name}` : '班级'
})
const questions = ref<{ q: string; a: number }[]>([])

function gen() {
  const list: { q: string; a: number }[] = []
  const allowed = ops.filter((o) => opSelected.value[o])
  if (!allowed.length) return
  for (let i = 0; i < count.value; i++) {
    let a = 0,
      b = 0,
      ans = 0,
      op = ''
    let tries = 0
    do {
      op = allowed[Math.floor(Math.random() * allowed.length)]
      a = Math.floor(Math.random() * (max.value + 1))
      b = Math.floor(Math.random() * (max.value + 1))
      if (op === '+') ans = a + b
      else if (op === '-') {
        if (a < b) [a, b] = [b, a]
        ans = a - b
      } else if (op === '×') ans = a * b
      else if (op === '÷') {
        b = b === 0 ? 1 : b
        ans = a * b
        a = ans
        ans = a / b
      }
      tries++
    } while ((ans < 0 || ans > 999) && tries < 10)
    list.push({ q: `${a} ${op} ${b} =`, a: ans })
  }
  questions.value = list
  showAnswer.value = false
}

function toggleOp(o: string) {
  opSelected.value[o] = !opSelected.value[o]
  // 至少选一个
  if (!ops.some((x) => opSelected.value[x])) {
    opSelected.value[o] = true
  }
}

function printPaper() {
  window.print()
}

function downloadTXT() {
  const lines = [
    `${userStore.user?.school || '学校'}  ${selectedClassName.value}  口算练习`,
    `出题教师：${userStore.user?.name || '教师'}`,
    `运算类型：${enabledOps.value.join(' ')}  题目数量：${count.value}  最大数：${max.value}`,
    '------------------------',
  ]
  questions.value.forEach((q, i) => {
    lines.push(`${i + 1}. ${q.q} ${showAnswer.value ? q.a : '____'}`)
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '口算练习.txt'
  a.click()
  URL.revokeObjectURL(url)
}

const enabledOps = computed(() => ops.filter((o) => opSelected.value[o]))

// 初始生成
gen()
</script>

<template>
  <div class="space-y-5">
    <ToolPageHeader
      icon="➕"
      title="口算生成器"
      description="一键生成口算练习题，支持打印，低年级数学老师必备"
      gradient="from-butter-100 via-cream-50 to-sakura-100"
    />
    <div class="card-soft p-5">
      <div class="grid sm:grid-cols-5 gap-3">
        <div>
          <label class="text-xs text-cocoa-500 ml-1">运算类型</label>
          <div class="mt-1 flex flex-wrap gap-1">
            <button
              v-for="o in ops"
              :key="o"
              class="chip border"
              :class="
                opSelected[o]
                  ? 'bg-butter-300 border-butter-500 text-cocoa-900'
                  : 'bg-white/70 border-white/80 text-cocoa-500'
              "
              @click="toggleOp(o)"
            >
              {{ o }}
            </button>
          </div>
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">题目数量</label>
          <input
            v-model.number="count"
            type="number"
            min="5"
            max="100"
            class="input-soft mt-1"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">最大数</label>
          <input
            v-model.number="max"
            type="number"
            min="5"
            max="100"
            class="input-soft mt-1"
          >
        </div>
        <div>
          <label class="text-xs text-cocoa-500 ml-1">班级</label>
          <select
            v-model="classId"
            class="input-soft mt-1"
          >
            <option value="">
              请选择班级
            </option>
            <option
              v-for="c in classStore.classes"
              :key="c.id"
              :value="c.id"
            >
              {{ c.grade }}{{ c.name }}
            </option>
          </select>
        </div>
        <div class="flex flex-col gap-2">
          <button
            class="btn-primary"
            @click="gen"
          >
            <RefreshCw :size="14" /> 重新生成
          </button>
        </div>
      </div>
      <div class="flex items-center gap-3 mt-3">
        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="showAnswer"
            type="checkbox"
            class="accent-butter-500"
          >
          显示答案
        </label>
        <button
          class="btn-secondary !py-1.5 !px-3 text-xs"
          @click="printPaper"
        >
          <Printer :size="12" /> 打印
        </button>
        <button
          class="btn-secondary !py-1.5 !px-3 text-xs"
          @click="downloadTXT"
        >
          <Download :size="12" /> 下载 TXT
        </button>
      </div>
    </div>

    <div class="card-soft p-6 print:p-2">
      <h3 class="title-display text-lg mb-3 print:hidden">
        口算练习 · {{ enabledOps.join(' ') }} · 共 {{ count }} 题
      </h3>
      <div class="text-center border-b border-cocoa-200/60 pb-3 mb-4">
        <div class="text-lg font-bold text-cocoa-900">
          {{ userStore.user?.school || '学校' }}
        </div>
        <div class="text-base text-cocoa-700 mt-0.5">
          {{ selectedClassName }} 口算练习
        </div>
        <div class="text-sm text-cocoa-500 mt-0.5">
          出题教师：{{ userStore.user?.name || '教师' }}
        </div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <div
          v-for="(q, i) in questions"
          :key="i"
          class="card-flat p-3 flex items-center gap-2"
        >
          <span class="text-xs text-cocoa-300 w-6">{{ i + 1 }}.</span>
          <span class="font-medium text-cocoa-900">{{ q.q }}</span>
          <span
            v-if="showAnswer"
            class="ml-auto text-cocoa-500"
          >{{ q.a }}</span>
          <span
            v-else
            class="ml-auto border-b-2 border-dotted border-cocoa-300 w-12 inline-block"
            style="height: 24px"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  body {
    background: white !important;
  }
  body::before {
    display: none !important;
  }
  aside,
  header,
  footer,
  .print\:hidden,
  button {
    display: none !important;
  }
}
</style>
