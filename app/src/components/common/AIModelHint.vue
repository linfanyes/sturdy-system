<script setup lang="ts">
/**
 * AI 模型信息提示条
 *
 * 在所有调用 AI 大模型的功能页面统一展示:
 *  - 当前文本模型 (textModel)
 *  - 当前多模态模型 (visionModel)
 *  - 是否已注入本地数据
 *
 * 让教师清楚知道当前 AI 用的是什么模型、数据来源, 增强透明度与信任感。
 */
import { computed } from 'vue'
import { useAIStore } from '../../stores/ai'
import { Info } from 'lucide-vue-next'

const props = withDefaults(
  defineProps<{
    /** 是否已注入本地数据 (默认 true, 表示该功能会读取本地班级/学生等数据作为上下文) */
    injected?: boolean
    /** 是否紧凑模式 (单行) */
    compact?: boolean
  }>(),
  { injected: true, compact: false },
)

const ai = useAIStore()
const textModel = computed(() => ai.settings.textModel || '未配置')
const visionModel = computed(() => ai.settings.visionModel || '未配置')
</script>

<template>
  <div
    class="flex items-start gap-2 px-3 py-2 rounded-xl bg-sky2-50 border border-sky2-100 text-xs text-cocoa-600"
    :class="compact ? 'flex-row items-center' : 'flex-row items-start'"
  >
    <Info :size="14" class="shrink-0 mt-0.5 text-sky2-500" />
    <div class="flex-1 min-w-0 leading-relaxed">
      <span class="text-cocoa-500">🤖 文本模型：</span>
      <span class="font-medium text-cocoa-700">{{ textModel }}</span>
      <span class="text-cocoa-300 mx-1">|</span>
      <span class="text-cocoa-500">👁️ 多模态模型：</span>
      <span class="font-medium text-cocoa-700">{{ visionModel }}</span>
      <template v-if="injected">
        <span class="text-cocoa-300 mx-1">|</span>
        <span class="text-mint-600 font-medium">✅ 已注入本地数据</span>
      </template>
    </div>
  </div>
</template>
