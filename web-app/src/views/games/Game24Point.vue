<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, RefreshCw, Lightbulb } from 'lucide-vue-next'

const router = useRouter()
const cards = ref<number[]>([])
const expr = ref('')
const message = ref('')
const solved = ref(false)
const wins = ref(parseInt(localStorage.getItem('web_game_24point_highscore') || '0'))

function deal() {
  cards.value = Array.from({ length: 4 }, () => Math.floor(Math.random() * 13) + 1)
  expr.value = ''
  message.value = ''
  solved.value = false
}

function cardStr(n: number): string {
  return n === 1 ? 'A' : n === 11 ? 'J' : n === 12 ? 'Q' : n === 13 ? 'K' : String(n)
}

function validate() {
  if (!expr.value) {
    message.value = '请输入算式'
    return
  }
  // 替换 ×÷ 为标准符号
  const e = expr.value.replace(/×/g, '*').replace(/÷/g, '/')
  // 校验只含数字、运算符、括号
  if (!/^[\d+\-*/()\s]+$/.test(e)) {
    message.value = '只能包含数字和 +−×÷()'
    return
  }
  // 校验使用的数字（允许组合）
  const used = e.match(/\d+/g)?.map(Number) || []
  const need = [...cards.value].sort((a, b) => a - b)
  const got = [...used].sort((a, b) => a - b)
  // 简化校验：必须每个牌的数字都用上（取所有数字组合中匹配）
  const cardSorted = [...cards.value]
  const usedSorted = [...used]
  if (cardSorted.length !== usedSorted.length) {
    message.value = `需用到全部 4 张牌`
    return
  }
  for (let i = 0; i < 4; i++) {
    if (cardSorted[i] !== usedSorted[i]) {
      message.value = '必须使用发到的4张牌'
      return
    }
  }
  try {
    // eslint-disable-next-line no-new-func
    const r = Function(`"use strict";return (${e})`)()
    if (Math.abs(r - 24) < 1e-6) {
      message.value = '✓ 正确！等于24'
      solved.value = true
      wins.value++
      localStorage.setItem('web_game_24point_highscore', String(wins.value))
    } else {
      message.value = `结果是 ${r}，不等于24`
    }
  } catch {
    message.value = '算式无效'
  }
}

const cardColors = ['bg-sakura-100', 'bg-mint-100', 'bg-sky2-100', 'bg-butter-100']
deal()
</script>

<template>
  <div class="space-y-4">
    <button class="inline-flex items-center gap-1 text-cocoa-500 hover:text-cocoa-900 text-sm" @click="router.push('/teacher/games')">
      <ArrowLeft class="w-4 h-4" /> 返回游戏合集
    </button>

    <h1 class="text-2xl font-bold text-cocoa-900 flex items-center gap-2">
      <Lightbulb class="w-6 h-6 text-butter-500" /> 24点
    </h1>

    <div class="bg-white rounded-2xl p-6 shadow-softer flex flex-col items-center gap-4">
      <div class="flex items-center justify-between w-full">
        <span class="text-cocoa-700 font-semibold">用四张牌算出 24</span>
        <span class="text-cocoa-500 text-sm">通关：{{ wins }}</span>
      </div>

      <div class="flex gap-3">
        <div
          v-for="(c, i) in cards"
          :key="i"
          class="w-16 h-24 rounded-xl flex flex-col items-center justify-center text-2xl font-bold shadow-softer"
          :class="cardColors[i]"
        >
          <span class="text-cocoa-900">{{ cardStr(c) }}</span>
          <span class="text-xs text-cocoa-500 mt-1">{{ c }}</span>
        </div>
      </div>

      <input
        v-model="expr"
        type="text"
        placeholder="如：(3+5)×(7-4)"
        class="w-64 px-4 py-2 rounded-xl border border-cream-200 focus:outline-none focus:border-butter-400 text-center"
        @keyup.enter="validate"
      />

      <div v-if="message" class="text-sm" :class="solved ? 'text-mint-500' : 'text-sakura-500'">{{ message }}</div>

      <div class="flex gap-2">
        <button class="px-4 py-2 rounded-xl bg-butter-500 text-white hover:bg-butter-600" @click="validate">验证</button>
        <button class="px-4 py-2 rounded-xl bg-cream-200 text-cocoa-700 hover:bg-cream-300 inline-flex items-center gap-1" @click="deal">
          <RefreshCw class="w-4 h-4" /> 重新发牌
        </button>
      </div>
      <p class="text-xs text-cocoa-400">支持 + − × ÷ 和括号</p>
    </div>
  </div>
</template>
