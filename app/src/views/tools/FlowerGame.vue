<script setup lang="ts">
/**
 * 笑口常开 - 养花小游戏
 *
 * 点击花朵 8 次, 花朵从花骨朵到盛开, 盛开时 3D 般呈现。
 */
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Sprout, Sparkles, RotateCcw, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()

const taps = ref(0)
const MAX_TAPS = 8
const completed = ref(false)

const flowerProgress = computed(() => Math.min(taps.value / MAX_TAPS, 1))

const flowerStage = computed(() => {
  const p = flowerProgress.value
  if (p <= 0) return '种子'
  if (p < 0.25) return '发芽'
  if (p < 0.5) return '幼苗'
  if (p < 0.75) return '花苞'
  if (p < 1) return '含苞待放'
  return '盛开'
})

const stageHint = computed(() => {
  switch (flowerStage.value) {
    case '种子':
      return '小种子还在泥土里休息, 轻轻点一下唤醒它吧 ✨'
    case '发芽':
      return '嫩芽破土, 继续点击培育它 🌱'
    case '幼苗':
      return '绿叶舒展, 再点几下看看 🌿'
    case '花苞':
      return '花苞鼓鼓的, 快要绽放啦 🌷'
    case '含苞待放':
      return '即将盛开, 还差一点点 🌸'
    case '盛开':
      return '笑口常开! 你种出了一朵最美的花 🌺'
  }
  return ''
})

function tapFlower() {
  if (completed.value) return
  taps.value++
  if (taps.value >= MAX_TAPS) {
    taps.value = MAX_TAPS
    completed.value = true
  }
}

function reset() {
  taps.value = 0
  completed.value = false
}

function goBack() {
  router.push({ name: 'toolbox' })
}

/** 花瓣 (8瓣) - 起始角度 -90° (顶部)  */
const petals = Array.from({ length: 8 }, (_, i) => i)
</script>

<template>
  <div class="min-h-[calc(100vh-80px)] flex flex-col items-center justify-start px-4 py-6 sm:py-10 relative overflow-hidden">
    <!-- 背景层 -->
    <div
      class="absolute inset-0 pointer-events-none transition-colors duration-1000"
      :class="completed ? 'bg-gradient-to-b from-sakura-100 via-cream-50 to-mint-100' : 'bg-gradient-to-b from-cream-100 via-cream-50 to-mint-50'"
    />
    <div
      class="absolute inset-0 pointer-events-none opacity-30"
      style="background-image: radial-gradient(circle at 20% 30%, rgba(244,194,194,0.4), transparent 50%), radial-gradient(circle at 80% 70%, rgba(186,225,212,0.4), transparent 50%);"
    />

    <!-- 左上角返回按钮 -->
    <button
      class="absolute top-4 left-4 z-20 w-10 h-10 rounded-2xl bg-white/80 backdrop-blur shadow-softer border border-cocoa-100 hover:bg-white hover:-translate-y-0.5 transition flex items-center justify-center text-cocoa-700"
      title="返回工具箱"
      @click="goBack"
    >
      <ArrowLeft :size="18" />
    </button>

    <div class="relative z-10 max-w-2xl w-full text-center space-y-6">
      <div>
        <h1 class="title-display text-3xl sm:text-4xl mb-2">
          🌸 笑口常开
        </h1>
        <p class="text-cocoa-500 text-sm sm:text-base">
          每天给自己一点小惊喜, 点 8 下让花儿盛开
        </p>
      </div>

      <!-- 进度条 -->
      <div class="card-soft p-4 max-w-md mx-auto">
        <div class="flex items-center justify-between text-xs text-cocoa-500 mb-2">
          <span>阶段: <b class="text-cocoa-700">{{ flowerStage }}</b></span>
          <span>{{ taps }} / {{ MAX_TAPS }}</span>
        </div>
        <div class="h-3 rounded-full bg-cocoa-100 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-mint-400 via-sakura-300 to-sakura-500 transition-all duration-500 ease-out"
            :style="{ width: flowerProgress * 100 + '%' }"
          />
        </div>
        <p class="text-xs text-cocoa-500 mt-2">
          {{ stageHint }}
        </p>
      </div>

      <!-- 花朵舞台 -->
      <div
        class="card-soft p-6 sm:p-10 relative"
        style="perspective: 1200px;"
      >
        <div
          class="relative mx-auto transition-all duration-700 ease-out"
          :class="completed ? 'w-72 h-72' : 'w-60 h-60'"
          :style="{
            transform: completed
              ? 'rotateX(8deg) rotateY(0deg) scale(1)'
              : `rotateX(${45 - flowerProgress * 40}deg) scale(${0.9 + flowerProgress * 0.1})`,
            transformStyle: 'preserve-3d',
            transition: 'transform 700ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }"
        >
          <!-- 茎 -->
          <div
            class="absolute left-1/2 -translate-x-1/2 origin-bottom"
            :class="completed ? 'bottom-0 w-3 h-44' : 'bottom-0 w-2 h-32'"
            :style="{
              background: 'linear-gradient(180deg, #84C7A9, #5BA683)',
              borderRadius: '8px',
              transform: `rotate(${flowerProgress * 2 - 1}deg)`,
              transition: 'all 500ms ease-out',
              boxShadow: '0 4px 12px rgba(91, 166, 131, 0.3)',
            }"
          />
          <!-- 叶子 -->
          <div
            v-for="leaf in 2"
            :key="'leaf-' + leaf"
            class="absolute w-10 h-5 rounded-full"
            :style="{
              left: leaf === 1 ? '42%' : '54%',
              bottom: leaf === 1 ? '30%' : '50%',
              background: 'linear-gradient(90deg, #84C7A9, #5BA683)',
              transform: `rotate(${leaf === 1 ? -30 : 30}deg) scaleX(${flowerProgress})`,
              transformOrigin: leaf === 1 ? 'right' : 'left',
              transition: 'all 700ms ease-out',
              opacity: flowerProgress > 0.25 ? 1 : 0,
            }"
          />

          <!-- 花骨朵/花朵容器 (可点击) -->
          <button
            class="absolute left-1/2 top-4 -translate-x-1/2 cursor-pointer select-none focus:outline-none group"
            :class="completed ? 'w-56 h-56' : 'w-44 h-44'"
            :disabled="completed"
            :aria-label="`点击花朵 (${taps}/${MAX_TAPS})`"
            style="transform-style: preserve-3d;"
            @click="tapFlower"
          >
            <!-- 花瓣 (8瓣) -->
            <svg
              v-if="flowerProgress > 0.1"
              viewBox="-100 -100 200 200"
              class="absolute inset-0 w-full h-full transition-all duration-700"
              :style="{
                filter: completed ? 'drop-shadow(0 8px 16px rgba(244, 168, 184, 0.5))' : 'drop-shadow(0 4px 8px rgba(244, 168, 184, 0.3))',
                transform: completed ? 'rotate(0deg)' : `rotate(${(1 - flowerProgress) * 30}deg)`,
              }"
            >
              <g
                v-for="i in petals"
                :key="i"
                :transform="`rotate(${(i * 360) / 8})`"
              >
                <ellipse
                  cx="0"
                  cy="-50"
                  :rx="completed ? 32 : 22"
                  :ry="completed ? 55 : 38"
                  :fill="completed
                    ? `hsl(${340 + (i * 5)}, ${75 + i * 2}%, ${72 + i}%)`
                    : `hsl(${340 + (i * 3)}, 60%, 80%)`"
                  :opacity="flowerProgress > 0.1 + (i / 80) ? 1 : 0"
                  style="transition: all 500ms ease-out;"
                />
              </g>
            </svg>

            <!-- 花心 -->
            <div
              class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500"
              :class="completed ? 'w-20 h-20' : 'w-12 h-12'"
              :style="{
                background: completed
                  ? 'radial-gradient(circle at 30% 30%, #FFE066 0%, #FFB347 60%, #FF8C42 100%)'
                  : 'radial-gradient(circle at 30% 30%, #D4E8B7, #84C7A9)',
                boxShadow: completed
                  ? '0 0 40px rgba(255, 200, 87, 0.7), inset 0 -4px 8px rgba(255, 140, 66, 0.3)'
                  : '0 0 20px rgba(132, 199, 169, 0.4)',
              }"
            >
              <div
                v-if="completed"
                class="absolute inset-2 rounded-full"
                style="background: radial-gradient(circle at 30% 30%, #FFF59D, #FFB347);"
              />
            </div>

            <!-- 点击提示圈 -->
            <div
              v-if="!completed"
              class="absolute inset-0 rounded-full border-2 border-sakura-300 opacity-0 group-hover:opacity-50 transition-opacity animate-ping"
              style="animation-duration: 2s;"
            />

            <!-- 点击波纹 (每次点击) -->
            <span
              v-for="r in 3"
              :key="'ripple-' + r"
              class="absolute inset-0 rounded-full border-2 border-sakura-400 pointer-events-none"
              :style="{
                animation: completed ? 'none' : `ripple 1.2s ease-out ${r * 0.2}s infinite`,
                opacity: completed ? 0 : 0.6,
              }"
            />
          </button>

          <!-- 盛开后的祝福 -->
          <transition name="fade-up">
            <div
              v-if="completed"
              class="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-sakura-500 font-semibold text-sm"
            >
              ✨ 心花怒放 ✨
            </div>
          </transition>
        </div>
      </div>

      <!-- 操作区 -->
      <div class="flex justify-center gap-3">
        <button
          v-if="completed"
          class="btn-primary flex items-center gap-2"
          @click="reset"
        >
          <RotateCcw :size="16" /> 再种一朵
        </button>
        <button
          v-else
          class="btn-secondary flex items-center gap-2"
          @click="reset"
        >
          <Sprout :size="16" /> 重新开始
        </button>
      </div>

      <!-- 提示语 -->
      <transition name="fade">
        <div
          v-if="completed"
          class="card-soft p-4 max-w-md mx-auto bg-gradient-to-br from-sakura-50 to-cream-50 border-2 border-sakura-200"
        >
          <div class="flex items-center justify-center gap-2 text-sakura-500 mb-2">
            <Sparkles :size="18" />
            <span class="font-semibold">真棒! 心情是不是好多了?</span>
            <Sparkles :size="18" />
          </div>
          <p class="text-sm text-cocoa-600 leading-relaxed">
            老师说: 课间休息或心情低落时, 来这里点 8 下, 让一朵花为你盛开 ☀️<br>
            愿你每天 <b class="text-sakura-500">笑口常开</b>!
          </p>
        </div>
      </transition>

      <p class="text-xs text-cocoa-400">
        提示: 每次点击花朵, 它就会长大一点; 8 次之后迎来盛开时刻
      </p>
    </div>
  </div>
</template>

<style scoped>
@keyframes ripple {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(1.3);
    opacity: 0;
  }
}
.fade-up-enter-active {
  transition: all 0.6s ease-out;
}
.fade-up-enter-from {
  opacity: 0;
  transform: translate(-50%, 10px);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
