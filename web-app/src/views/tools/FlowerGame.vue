<script setup lang="ts">
/**
 * 笑口常开 · 花朵绽放互动
 * - 一朵花 SVG，点击 8 次从花骨朵逐渐绽放到盛开
 * - 每次点击花瓣展开一些，第 8 次完全盛开并显示祝福语
 * - 重置按钮重新开始
 * - 纯前端，用 SVG scale/rotate transform 实现
 */
import { ref, computed } from 'vue'
import { Flower2, RotateCcw, Heart } from 'lucide-vue-next'

const MAX = 8
const clickCount = ref(0)
const blessing = ref('')

const blessings = [
  '愿你笑口常开，好运自然来！',
  '今天也是闪闪发光的一天 ✨',
  '保持热爱，奔赴山海！',
  '愿你的努力，终有回响。',
  '生活明朗，万物可爱 🌸',
  '心若向暖，无惧悲伤。',
  '愿你所求皆所愿，所行化坦途。',
  '向阳而生，逐光而行 ☀️',
]

const progress = computed(() => clickCount.value / MAX) // 0 ~ 1
const isFull = computed(() => clickCount.value >= MAX)

// 每片花瓣的展开程度
const petalScale = computed(() => 0.15 + progress.value * 0.85)
const petalDistance = computed(() => 30 + progress.value * 50) // 花瓣距中心距离
const petalRotate = computed(() => (1 - progress.value) * 30) // 花瓣向内收拢角度

const stageText = computed(() => {
  if (clickCount.value === 0) return '一朵花骨朵，等待你轻轻点击…'
  if (clickCount.value < MAX) return `继续点击，花儿正在绽放…（${clickCount.value}/${MAX}）`
  return '盛开啦！🌷'
})

function click() {
  if (isFull.value) return
  clickCount.value += 1
  if (clickCount.value >= MAX) {
    blessing.value = blessings[Math.floor(Math.random() * blessings.length)]
  }
}

function reset() {
  clickCount.value = 0
  blessing.value = ''
}

// 8 片花瓣的角度
const petalAngles = Array.from({ length: 8 }, (_, i) => i * 45)
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Flower2 class="w-6 h-6 text-butter-500" /> 笑口常开
    </h1>

    <div class="bg-white rounded-2xl p-8 shadow-softer text-center">
      <!-- 花朵 SVG -->
      <div class="relative inline-block cursor-pointer select-none" @click="click">
        <svg width="320" height="320" viewBox="-160 -160 320 320">
          <!-- 茎与叶 -->
          <g v-if="progress > 0.3" style="transition: opacity 0.4s">
            <path d="M 0 20 Q -5 80 -3 150" stroke="rgb(var(--mint-500))" stroke-width="6" fill="none" stroke-linecap="round" />
            <path
              d="M -3 90 Q -40 80 -55 100 Q -35 110 -3 95 Z"
              :fill="`rgb(var(--mint-500))`"
              :opacity="0.7 + progress * 0.3"
              style="transition: opacity 0.4s"
            />
          </g>

          <!-- 花瓣（8 片） -->
          <g
            v-for="(angle, i) in petalAngles"
            :key="i"
            :transform="`rotate(${angle})`"
            style="transition: transform 0.5s ease-out"
          >
            <ellipse
              cx="0"
              :cy="-petalDistance"
              rx="22"
              ry="44"
              :fill="i % 2 === 0 ? 'rgb(var(--sakura-300))' : 'rgb(var(--sakura-400))'"
              :transform="`scale(${petalScale}) rotate(${petalRotate})`"
              :opacity="0.6 + progress * 0.4"
              style="transition: transform 0.5s ease-out, opacity 0.4s"
            />
          </g>

          <!-- 花蕊 -->
          <circle
            r="20"
            fill="rgb(var(--butter-400))"
            :class="isFull ? 'animate-pulse' : ''"
          />
          <circle r="10" fill="rgb(var(--butter-500))" />

          <!-- 笑脸（盛开时显示） -->
          <g v-if="isFull" style="transition: opacity 0.5s">
            <circle cx="-6" cy="-3" r="2" fill="rgb(var(--cocoa-900))" />
            <circle cx="6" cy="-3" r="2" fill="rgb(var(--cocoa-900))" />
            <path d="M -7 4 Q 0 10 7 4" stroke="rgb(var(--cocoa-900))" stroke-width="2" fill="none" stroke-linecap="round" />
          </g>
        </svg>
        <!-- 点击提示 -->
        <div
          v-if="!isFull"
          class="absolute inset-0 flex items-end justify-center pb-2 pointer-events-none"
        >
          <span class="text-xs px-2 py-1 rounded-full bg-cocoa-900/10 text-cocoa-500">👆 点击花朵</span>
        </div>
      </div>

      <!-- 阶段文案 -->
      <div class="mt-2 text-cocoa-500 text-sm min-h-[1.5em]">{{ stageText }}</div>

      <!-- 祝福语 -->
      <Transition
        enter-active-class="transition-all duration-500"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
      >
        <div
          v-if="isFull && blessing"
          class="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sakura-100 to-butter-100 text-cocoa-900 font-semibold text-lg"
        >
          <Heart class="w-5 h-5 text-sakura-500" /> {{ blessing }}
        </div>
      </Transition>

      <!-- 重置 -->
      <div class="mt-6">
        <button
          class="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-cream-100 text-cocoa-500 font-medium hover:bg-cream-200"
          @click="reset"
        >
          <RotateCcw class="w-4 h-4" /> 重新开始
        </button>
      </div>

      <!-- 进度点 -->
      <div class="flex items-center justify-center gap-1.5 mt-4">
        <span
          v-for="i in MAX"
          :key="i"
          :class="['w-2 h-2 rounded-full transition', i <= clickCount ? 'bg-sakura-400' : 'bg-cream-200']"
        />
      </div>
    </div>

    <!-- 说明 -->
    <div class="bg-white rounded-2xl p-6 shadow-softer">
      <h2 class="text-lg font-semibold text-cocoa-900 mb-2">玩法</h2>
      <ul class="text-sm text-cocoa-500 space-y-1 list-disc list-inside">
        <li>点击花朵，每次花瓣都会展开一些</li>
        <li>点击满 8 次，花朵完全盛开</li>
        <li>盛开后会随机出现一句祝福语</li>
        <li>点击「重新开始」可让花朵变回花骨朵</li>
      </ul>
    </div>
  </div>
</template>
