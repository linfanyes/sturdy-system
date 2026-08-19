<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'

const props = withDefaults(defineProps<{
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
}>(), {
  duration: 1000,
  decimals: 0,
  prefix: '',
  suffix: '',
})

const displayValue = ref(0)
const animating = ref(false)

function animateTo(target: number) {
  if (animating.value) return
  animating.value = true
  const start = displayValue.value
  const diff = target - start
  const startTime = performance.now()
  const dur = props.duration

  function step(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / dur, 1)
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3)
    displayValue.value = start + diff * eased
    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      displayValue.value = target
      animating.value = false
    }
  }
  requestAnimationFrame(step)
}

onMounted(() => {
  if (props.value > 0) animateTo(props.value)
})

watch(() => props.value, (newVal) => {
  animateTo(newVal)
})

const formatted = () => {
  const v = displayValue.value
  const fixed = v.toFixed(props.decimals)
  // 添加千分位
  const parts = fixed.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}
</script>

<template>
  <span class="font-num tabular-nums">
    {{ prefix }}{{ formatted() }}{{ suffix }}
  </span>
</template>
