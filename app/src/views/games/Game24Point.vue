<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Play, RotateCcw, Lightbulb, CheckCircle, Trophy, Clock } from 'lucide-vue-next'
import ToolPageHeader from '../../components/common/ToolPageHeader.vue'

type Operator = '+' | '-' | '×' | '÷'
type Card = {
  value: number
  used: boolean
}

const cards = ref<Card[]>([])
const expression = ref<string>('')
const result = ref<number | null>(null)
const isPlaying = ref(false)
const isSolved = ref(false)
const score = ref(0)
const time = ref(0)
const showHint = ref(false)
const hintText = ref('')
let timer: number | null = null
const selectedCards = ref<number[]>([])
const selectedOp = ref<Operator | null>(null)

function getRandomNumbers(): number[] {
  const nums: number[] = []
  for (let i = 0; i < 4; i++) {
    nums.push(Math.floor(Math.random() * 9) + 1)
  }
  return nums
}

function startGame() {
  cards.value = getRandomNumbers().map(v => ({ value: v, used: false }))
  expression.value = ''
  result.value = null
  isPlaying.value = true
  isSolved.value = false
  showHint.value = false
  hintText.value = ''
  selectedCards.value = []
  selectedOp.value = null
  if (timer) clearInterval(timer)
  time.value = 0
  timer = window.setInterval(() => {
    time.value++
  }, 1000)
}

function selectCard(index: number) {
  if (!isPlaying.value || cards.value[index].used) return
  if (selectedCards.value.length >= 2) return
  if (selectedCards.value.includes(index)) {
    selectedCards.value = selectedCards.value.filter(i => i !== index)
    return
  }
  selectedCards.value.push(index)
}

function selectOperator(op: Operator) {
  if (!isPlaying.value || selectedCards.value.length !== 2) return
  selectedOp.value = op
}

function calculate() {
  if (selectedCards.value.length !== 2 || !selectedOp.value) return
  
  const [idx1, idx2] = selectedCards.value
  const v1 = cards.value[idx1].value
  const v2 = cards.value[idx2].value
  
  let res: number
  switch (selectedOp.value) {
    case '+': res = v1 + v2; break
    case '-': res = v1 - v2; break
    case '×': res = v1 * v2; break
    case '÷': 
      if (v2 === 0) return
      res = v1 / v2
      if (!Number.isInteger(res)) return
      break
    default: return
  }
  
  cards.value[idx1] = { value: res, used: false }
  cards.value[idx2] = { value: 0, used: true }
  expression.value += `${v1} ${selectedOp.value} ${v2} = ${res}\n`
  
  const remaining = cards.value.filter(c => !c.used)
  if (remaining.length === 1) {
    result.value = remaining[0].value
    if (result.value === 24) {
      isSolved.value = true
      score.value++
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    } else {
      startGame()
    }
  }
  
  selectedCards.value = []
  selectedOp.value = null
}

function undo() {
  if (!expression.value) return
  const lines = expression.value.trim().split('\n')
  if (lines.length === 0) return
  lines.pop()
  expression.value = lines.join('\n') + '\n'
  startGame()
}

function getSolution(nums: number[]): string | null {
  if (nums.length === 1) {
    return nums[0] === 24 ? `${nums[0]}` : null
  }
  
  for (let i = 0; i < nums.length; i++) {
    for (let j = 0; j < nums.length; j++) {
      if (i === j) continue
      const v1 = nums[i]
      const v2 = nums[j]
      const rest = nums.filter((_, idx) => idx !== i && idx !== j)
      
      const ops: [Operator, (a: number, b: number) => number][] = [
        ['+', (a, b) => a + b],
        ['-', (a, b) => a - b],
        ['×', (a, b) => a * b],
        ['÷', (a, b) => a / b],
      ]
      
      for (const [op, fn] of ops) {
        if (op === '÷' && v2 === 0) continue
        const res = fn(v1, v2)
        if (!Number.isFinite(res)) continue
        const solution = getSolution([...rest, res])
        if (solution) {
          return `(${v1} ${op} ${v2}) ${solution.replace(/^\d+$/, '')}`
        }
      }
    }
  }
  
  return null
}

function showSolution() {
  const nums = cards.value.filter(c => !c.used).map(c => c.value)
  const solution = getSolution(nums)
  hintText.value = solution ? `解法：${solution}` : '无解'
  showHint.value = true
}

const timerDisplay = computed(() => {
  const m = Math.floor(time.value / 60)
  const s = time.value % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
})

const remainingCards = computed(() => cards.value.filter(c => !c.used))
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-sky2-50 via-mint-50 to-butter-50 p-4">
    <ToolPageHeader icon="🧮" title="24点游戏" description="用加减乘除让4个数字等于24" />
    
    <div class="max-w-lg mx-auto mt-6">
      <div class="bg-white rounded-2xl shadow-soft p-6">
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-2 text-cocoa-600">
            <Clock :size="18" />
            <span class="font-mono text-lg">{{ timerDisplay }}</span>
          </div>
          <div class="flex items-center gap-2 text-cocoa-600">
            <Trophy :size="18" class="text-amber-500" />
            <span class="font-mono text-lg">{{ score }}</span>
          </div>
        </div>

        <div v-if="!isPlaying" class="text-center py-12">
          <div class="text-6xl mb-4">🧮</div>
          <p class="text-cocoa-500 mb-6">用给出的4个数字，通过加减乘除运算得到24</p>
          <button
            @click="startGame"
            class="px-8 py-3 bg-gradient-to-r from-sky2-500 to-mint-500 text-white rounded-xl hover:shadow-md transition flex items-center gap-2 mx-auto"
          >
            <Play :size="20" />
            开始游戏
          </button>
        </div>

        <div v-else>
          <div class="grid grid-cols-4 gap-3 mb-6">
            <div
              v-for="(card, index) in cards"
              :key="index"
              @click="selectCard(index)"
              class="aspect-square rounded-xl flex items-center justify-center text-3xl font-bold transition cursor-pointer"
              :class="[
                card.used 
                  ? 'bg-gray-100 text-gray-300' 
                  : selectedCards.includes(index)
                    ? 'bg-sky2-500 text-white shadow-lg scale-110'
                    : 'bg-gradient-to-br from-sakura-100 to-butter-100 text-cocoa-700 hover:shadow-md'
              ]"
            >
              {{ card.used ? '' : card.value }}
            </div>
          </div>

          <div class="grid grid-cols-4 gap-2 mb-6">
            <button
              v-for="op in ['+', '-', '×', '÷'] as Operator[]"
              :key="op"
              @click="selectOperator(op)"
              class="py-3 rounded-xl font-bold text-xl transition"
              :class="[
                selectedOp === op
                  ? 'bg-sky2-500 text-white shadow-lg'
                  : 'bg-cocoa-100 text-cocoa-700 hover:bg-cocoa-200'
              ]"
            >
              {{ op }}
            </button>
          </div>

          <button
            @click="calculate"
            :disabled="selectedCards.length !== 2 || !selectedOp"
            class="w-full py-3 rounded-xl font-bold text-xl transition mb-3"
            :class="[
              selectedCards.length === 2 && selectedOp
                ? 'bg-gradient-to-r from-mint-500 to-sky2-500 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            ]"
          >
            计算
          </button>

          <div class="flex gap-3">
            <button
              @click="undo"
              :disabled="!expression"
              class="flex-1 py-2 rounded-lg font-medium transition"
              :class="[
                expression
                  ? 'bg-cocoa-100 text-cocoa-700 hover:bg-cocoa-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              ]"
            >
              撤销
            </button>
            <button
              @click="startGame"
              class="flex-1 py-2 rounded-lg font-medium bg-cocoa-100 text-cocoa-700 hover:bg-cocoa-200 transition flex items-center justify-center gap-1"
            >
              <RotateCcw :size="16" />
              新题
            </button>
            <button
              @click="showSolution"
              class="flex-1 py-2 rounded-lg font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 transition flex items-center justify-center gap-1"
            >
              <Lightbulb :size="16" />
              提示
            </button>
          </div>

          <div v-if="showHint" class="mt-4 p-3 bg-amber-50 rounded-lg text-amber-700 text-center">
            {{ hintText }}
          </div>

          <div v-if="expression" class="mt-4 p-4 bg-cocoa-50 rounded-lg font-mono text-sm whitespace-pre-wrap">
            {{ expression }}
          </div>

          <div v-if="isSolved" class="mt-6 text-center py-6 bg-gradient-to-r from-mint-100 to-sky2-100 rounded-xl">
            <CheckCircle :size="48" class="text-mint-500 mx-auto mb-2" />
            <p class="text-xl font-bold text-cocoa-700">🎉 恭喜答对！</p>
            <button
              @click="startGame"
              class="mt-4 px-6 py-2 bg-gradient-to-r from-sky2-500 to-mint-500 text-white rounded-lg hover:shadow-md transition"
            >
              下一题
            </button>
          </div>
        </div>
      </div>

      <div class="mt-6 bg-white rounded-xl shadow-softer p-4 text-sm text-cocoa-500">
        <h3 class="font-bold mb-2">游戏规则</h3>
        <ul class="list-disc list-inside space-y-1">
          <li>点击选择两个数字卡片</li>
          <li>选择运算符号（+、-、×、÷）</li>
          <li>点击计算按钮进行运算</li>
          <li>最终结果为24即为胜利</li>
          <li>除法结果必须为整数</li>
        </ul>
      </div>
    </div>
  </div>
</template>