<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

interface Props {
  icon: string
  title: string
  description?: string
  gradient?: string
  statusText?: string
  statusColor?: string
  backTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  gradient: 'from-butter-100 via-cream-50 to-mint-100',
  statusColor: 'bg-mint-100 text-mint-600',
  backTo: 'toolbox',
})

const router = useRouter()

function goBack() {
  router.push({ name: props.backTo })
}
</script>

<template>
  <div class="space-y-3">
    <!-- 返回按钮 -->
    <button
      class="btn-ghost text-sm self-start inline-flex items-center gap-1.5"
      @click="goBack"
    >
      <ArrowLeft :size="14" /> 返回工具箱
    </button>

    <!-- 标题卡片 -->
    <section
      class="card-soft p-4 sm:p-5 bg-gradient-to-br"
      :class="gradient"
    >
      <div class="flex items-start gap-3 sm:gap-4 flex-wrap">
        <div
          class="w-11 h-11 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/70 backdrop-blur flex items-center justify-center text-2xl sm:text-2xl shadow-sm flex-shrink-0"
        >
          {{ icon }}
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="title-display text-lg sm:text-xl text-cocoa-900">
            {{ title }}
          </h2>
          <p
            v-if="description"
            class="text-xs sm:text-sm text-cocoa-600 mt-1 leading-relaxed"
          >
            {{ description }}
          </p>
        </div>
        <!-- 状态标签 -->
        <div
          v-if="statusText"
          class="chip text-[10px] sm:text-xs px-2 py-1"
          :class="statusColor"
        >
          {{ statusText }}
        </div>
      </div>
    </section>
  </div>
</template>
