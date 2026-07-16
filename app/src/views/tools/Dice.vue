<script setup lang="ts">
// 随机决定器：转盘 / 抽签 / 掷骰子 / 抛硬币四种随机模式，适合课堂互动与小决定
import { ref, computed, watch } from 'vue'
import ToolBackButton from '../../components/common/ToolBackButton.vue'
import { useToastStore } from '../../stores/toast'
import { Play, Dices, Coins, ListChecks, RotateCw } from 'lucide-vue-next'

const toast = useToastStore()
const mode = ref<'wheel' | 'lottery' | 'dice' | 'coin'>('wheel')

// ============ 转盘 ============
const defaultWheelOptions = ['被点名回答', '做作业', '玩游戏', '看书']
const wheelInput = ref(defaultWheelOptions.join('\n'))
const wheelRotation = ref(0)
const wheelSpinning = ref(false)
const wheelResult = ref('')

const wheelOptions = computed(() =>
  wheelInput.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean),
)
const wheelSegments = computed(() => {
  const opts = wheelOptions.value
  if (opts.length < 2) return []
  const step = 360 / opts.length
  const colors = [
    '#f4d39a', '#f4b6a4', '#b6d8a8', '#a4c8f4', '#d8b6e8', '#f4e89a',
    '#a8e8d8', '#e8b6c8', '#c8d8b6', '#b6a8e8', '#e8d8a8', '#a8d8e8',
  ]
  return opts.map((opt, i) => ({
    label: opt,
    color: colors[i % colors.length],
    start: i * step,
    end: (i + 1) * step,
  }))
})

const wheelGradient = computed(() => {
  const segs = wheelSegments.value
  if (!segs.length) return 'conic-gradient(#e5d5b8 0deg 360deg)'
  return (
    'conic-gradient(' +
    segs.map((s) => `${s.color} ${s.start}deg ${s.end}deg`).join(', ') +
    ')'
  )
})

function spinWheel() {
  if (wheelSpinning.value) return
  const opts = wheelOptions.value
  if (opts.length < 2) {
    toast.warning('请至少输入 2 个选项')
    return
  }
  if (opts.length > 12) {
    toast.warning('最多 12 个选项')
    return
  }
  wheelSpinning.value = true
  wheelResult.value = ''
  const targetIdx = Math.floor(Math.random() * opts.length)
  const step = 360 / opts.length
  // 指针在顶部（0deg），转盘需旋转使第 targetIdx 段中间到达顶部
  const targetAngle = targetIdx * step + step / 2
  const turns = 5
  const desiredMod = ((360 - targetAngle) % 360 + 360) % 360
  const currentMod = ((wheelRotation.value % 360) + 360) % 360
  const delta = (desiredMod - currentMod + 360) % 360
  wheelRotation.value = wheelRotation.value + turns * 360 + delta
  setTimeout(() => {
    wheelSpinning.value = false
    wheelResult.value = opts[targetIdx]
    toast.success(`结果：${opts[targetIdx]}`)
  }, 4200)
}

// ============ 抽签 ============
const lotteryInput = ref('张三\n李四\n王五\n赵六\n钱七\n孙八')
const lotteryCount = ref(2)
const lotteryResult = ref<string[]>([])

const lotteryOptions = computed(() =>
  lotteryInput.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean),
)

function drawLottery() {
  const opts = lotteryOptions.value
  if (opts.length < 1) {
    toast.warning('请输入选项')
    return
  }
  const count = Math.min(Math.max(1, lotteryCount.value), opts.length)
  if (count < 1) {
    toast.warning('抽签数量无效')
    return
  }
  const pool = [...opts]
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    result.push(pool.splice(idx, 1)[0])
  }
  lotteryResult.value = result
  toast.success(`已抽 ${count} 个`)
}

// ============ 掷骰子 ============
const diceCount = ref(2)
const diceValues = ref<number[]>([1, 1])
const diceRolling = ref(false)

const diceTotal = computed(() => diceValues.value.reduce((a, b) => a + b, 0))

// 骰子点数对应的点位置（百分比）
const DICE_FACES: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[28, 28], [28, 72], [72, 28], [72, 72]],
  5: [[28, 28], [28, 72], [50, 50], [72, 28], [72, 72]],
  6: [[28, 25], [28, 50], [28, 75], [72, 25], [72, 50], [72, 75]],
}

watch(diceCount, (n) => {
  const count = Math.max(1, Math.min(6, n))
  if (diceValues.value.length !== count) {
    diceValues.value = Array.from({ length: count }, () => 1)
  }
})

function rollDice() {
  if (diceRolling.value) return
  diceRolling.value = true
  const count = Math.max(1, Math.min(6, diceCount.value))
  const animTimer = window.setInterval(() => {
    diceValues.value = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
  }, 80)
  setTimeout(() => {
    clearInterval(animTimer)
    diceValues.value = Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
    diceRolling.value = false
    toast.success(`总点数：${diceValues.value.reduce((a, b) => a + b, 0)}`)
  }, 800)
}

// ============ 抛硬币 ============
const coinSide = ref<'front' | 'back' | null>(null)
const coinFlipping = ref(false)
const coinRotation = ref(0)
const coinStats = ref({ front: 0, back: 0 })

function flipCoin() {
  if (coinFlipping.value) return
  coinFlipping.value = true
  const result: 'front' | 'back' = Math.random() < 0.5 ? 'front' : 'back'
  const turns = 6
  const targetMod = result === 'front' ? 0 : 180
  const currentMod = ((coinRotation.value % 360) + 360) % 360
  const delta = (targetMod - currentMod + 360) % 360
  coinRotation.value = coinRotation.value + turns * 360 + delta
  setTimeout(() => {
    coinFlipping.value = false
    coinSide.value = result
    if (result === 'front') coinStats.value.front++
    else coinStats.value.back++
    toast.success(result === 'front' ? '正面' : '反面')
  }, 1500)
}

function resetCoinStats() {
  coinStats.value = { front: 0, back: 0 }
  coinSide.value = null
  coinRotation.value = 0
}
</script>

<template>
  <div class="space-y-4">
    <ToolBackButton />

    <section class="card-soft p-5 bg-gradient-to-br from-cocoa-100 via-cream-50 to-cocoa-100">
      <div class="flex items-start gap-4 flex-wrap">
        <div
          class="w-12 h-12 rounded-2xl bg-gradient-to-br from-cocoa-300 to-cocoa-500 flex items-center justify-center text-2xl shadow-softer"
        >
          🎲
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-xl text-cocoa-900">
            随机决定器
          </h2>
          <p class="text-sm text-cocoa-600 mt-1">
            转盘、抽签、掷骰子、抛硬币四种模式，适合课堂互动与小决定。
          </p>
        </div>
      </div>
    </section>

    <!-- 模式切换 -->
    <section class="card-flat p-2 flex gap-1">
      <button
        v-for="m in [
          { v: 'wheel', label: '转盘' },
          { v: 'lottery', label: '抽签' },
          { v: 'dice', label: '掷骰子' },
          { v: 'coin', label: '抛硬币' },
        ]"
        :key="m.v"
        class="flex-1 py-2 rounded-xl text-sm transition"
        :class="mode === m.v ? 'bg-cocoa-300 text-cocoa-900 font-medium' : 'text-cocoa-600 hover:bg-cocoa-100'"
        @click="mode = m.v as any"
      >
        {{ m.label }}
      </button>
    </section>

    <!-- 转盘 -->
    <section
      v-if="mode === 'wheel'"
      class="grid lg:grid-cols-2 gap-4"
    >
      <div class="card-soft p-6 text-center bg-gradient-to-br from-cocoa-100 via-cream-50 to-cocoa-100">
        <div class="relative inline-block">
          <!-- 指针 -->
          <div
            class="absolute left-1/2 -top-1 -translate-x-1/2 z-10 w-0 h-0 border-l-8 border-r-8 border-t-[16px] border-l-transparent border-r-transparent border-t-sakura-500"
          />
          <!-- 转盘 -->
          <div
            class="w-64 h-64 rounded-full shadow-soft border-4 border-white relative"
            :style="{
              background: wheelGradient,
              transform: `rotate(${wheelRotation}deg)`,
              transition: wheelSpinning
                ? 'transform 4s cubic-bezier(0.17, 0.67, 0.21, 1)'
                : 'none',
            }"
          >
            <!-- 选项文字（按段中点角度放置，水平方向） -->
            <div
              v-for="(seg, i) in wheelSegments"
              :key="i"
              class="absolute text-[11px] font-medium text-cocoa-900 whitespace-nowrap px-1"
              :style="{
                left: (50 + 36 * Math.sin((((seg.start + seg.end) / 2) * Math.PI) / 180)) + '%',
                top: (50 - 36 * Math.cos((((seg.start + seg.end) / 2) * Math.PI) / 180)) + '%',
                transform: 'translate(-50%, -50%)',
              }"
            >
              {{ seg.label }}
            </div>
          </div>
        </div>
        <div class="mt-6">
          <button
            class="btn-primary !px-6 !py-3 flex items-center gap-1 mx-auto"
            :disabled="wheelSpinning"
            @click="spinWheel"
          >
            <Play :size="16" /> {{ wheelSpinning ? '转动中...' : '开始' }}
          </button>
          <div
            v-if="wheelResult"
            class="mt-4 text-lg"
          >
            <span class="text-cocoa-500">结果：</span>
            <span class="title-display text-2xl text-sakura-500">{{ wheelResult }}</span>
          </div>
        </div>
      </div>
      <div class="card-soft p-5">
        <h3 class="title-display text-lg mb-3">
          选项（每行一个，2~12 个）
        </h3>
        <textarea
          v-model="wheelInput"
          class="input-soft min-h-[200px] text-sm"
          placeholder="每行一个选项"
        />
        <p class="text-xs text-cocoa-500 mt-2">
          当前 {{ wheelOptions.length }} 个选项
        </p>
      </div>
    </section>

    <!-- 抽签 -->
    <section
      v-if="mode === 'lottery'"
      class="grid lg:grid-cols-2 gap-4"
    >
      <div class="card-soft p-5">
        <h3 class="title-display text-lg mb-3">
          选项列表（每行一个）
        </h3>
        <textarea
          v-model="lotteryInput"
          class="input-soft min-h-[200px] text-sm"
          placeholder="每行一个选项"
        />
        <div class="mt-3 flex items-center gap-3">
          <label class="text-sm text-cocoa-600">抽签数量</label>
          <input
            v-model.number="lotteryCount"
            type="number"
            min="1"
            class="input-soft !w-24"
          >
          <span class="text-xs text-cocoa-400">/ {{ lotteryOptions.length }}</span>
        </div>
        <button
          class="btn-primary w-full mt-4 flex items-center justify-center gap-1"
          @click="drawLottery"
        >
          <ListChecks :size="16" /> 抽签
        </button>
      </div>
      <div class="card-soft p-6 text-center bg-gradient-to-br from-cocoa-100 via-cream-50 to-cocoa-100">
        <h3 class="title-display text-lg mb-4">
          抽签结果
        </h3>
        <div
          v-if="lotteryResult.length"
          class="flex flex-wrap gap-2 justify-center"
        >
          <span
            v-for="(r, i) in lotteryResult"
            :key="i"
            class="px-4 py-2 rounded-full bg-white shadow-softer text-cocoa-900 font-medium animate-pop"
          >{{ r }}</span>
        </div>
        <div
          v-else
          class="text-cocoa-400 py-12 text-sm"
        >
          点击「抽签」按钮抽取
        </div>
      </div>
    </section>

    <!-- 掷骰子 -->
    <section
      v-if="mode === 'dice'"
      class="card-soft p-6"
    >
      <div class="flex items-center justify-center gap-3 mb-6 flex-wrap">
        <label class="text-sm text-cocoa-600">骰子数量</label>
        <div class="flex items-center gap-2">
          <button
            class="btn-ghost !py-1.5 !px-3 text-lg"
            :disabled="diceCount <= 1"
            @click="diceCount--"
          >
            −
          </button>
          <span class="number text-2xl text-cocoa-900 w-8 text-center">{{ diceCount }}</span>
          <button
            class="btn-ghost !py-1.5 !px-3 text-lg"
            :disabled="diceCount >= 6"
            @click="diceCount++"
          >
            +
          </button>
        </div>
        <button
          class="btn-primary flex items-center gap-1 !py-2.5"
          :disabled="diceRolling"
          @click="rollDice"
        >
          <Dices :size="16" /> {{ diceRolling ? '掷骰中...' : '掷骰子' }}
        </button>
      </div>
      <div class="flex flex-wrap gap-4 justify-center mb-6">
        <div
          v-for="(v, i) in diceValues"
          :key="i"
          class="w-20 h-20 bg-white rounded-2xl shadow-soft p-2.5"
          :class="diceRolling ? 'animate-wiggle' : ''"
        >
          <div class="w-full h-full relative">
            <span
              v-for="(pos, pi) in DICE_FACES[v]"
              :key="pi"
              class="absolute w-3 h-3 rounded-full bg-cocoa-700"
              :style="{
                left: pos[0] + '%',
                top: pos[1] + '%',
                transform: 'translate(-50%, -50%)',
              }"
            />
          </div>
        </div>
      </div>
      <div class="text-center">
        <span class="text-cocoa-500 text-sm">总点数：</span>
        <span class="title-display text-3xl text-sakura-500">{{ diceTotal }}</span>
      </div>
    </section>

    <!-- 抛硬币 -->
    <section
      v-if="mode === 'coin'"
      class="card-soft p-6 text-center"
    >
      <div
        class="flex justify-center mb-6"
        style="perspective: 800px"
      >
        <div
          class="w-32 h-32 rounded-full shadow-soft relative"
          :style="{
            transform: `rotateY(${coinRotation}deg)`,
            transition: coinFlipping
              ? 'transform 1.5s cubic-bezier(0.2, 0.7, 0.3, 1)'
              : 'none',
            transformStyle: 'preserve-3d',
          }"
        >
          <!-- 正面 -->
          <div
            class="absolute inset-0 rounded-full flex items-center justify-center text-3xl font-bold"
            style="backface-visibility: hidden; background: linear-gradient(135deg, #f4d39a, #e8b878); color: #6b4a1f"
          >
            正
          </div>
          <!-- 反面 -->
          <div
            class="absolute inset-0 rounded-full flex items-center justify-center text-3xl font-bold"
            style="backface-visibility: hidden; background: linear-gradient(135deg, #b6d8a8, #8fc080); color: #2f5a1f; transform: rotateY(180deg)"
          >
            反
          </div>
        </div>
      </div>
      <button
        class="btn-primary !px-6 !py-3 flex items-center gap-1 mx-auto"
        :disabled="coinFlipping"
        @click="flipCoin"
      >
        <Coins :size="16" /> {{ coinFlipping ? '翻转中...' : '抛硬币' }}
      </button>
      <div
        v-if="coinSide && !coinFlipping"
        class="mt-4"
      >
        <span class="text-cocoa-500">结果：</span>
        <span
          class="title-display text-2xl"
          :class="coinSide === 'front' ? 'text-butter-600' : 'text-mint-500'"
        >
          {{ coinSide === 'front' ? '正面' : '反面' }}
        </span>
      </div>
      <div class="mt-6 flex items-center justify-center gap-6 text-sm">
        <div>
          <span class="text-cocoa-500">正面：</span>
          <span class="number text-lg text-butter-600">{{ coinStats.front }}</span>
        </div>
        <div>
          <span class="text-cocoa-500">反面：</span>
          <span class="number text-lg text-mint-500">{{ coinStats.back }}</span>
        </div>
        <button
          class="btn-ghost !py-1.5 !px-3 text-xs flex items-center gap-1"
          @click="resetCoinStats"
        >
          <RotateCw :size="12" /> 清零
        </button>
      </div>
    </section>
  </div>
</template>
