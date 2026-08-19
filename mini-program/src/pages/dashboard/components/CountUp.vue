<template>
  <text class="count-up">{{ displayValue }}</text>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  duration: { type: Number, default: 800 },
  prefix: { type: String, default: '' },
  suffix: { type: String, default: '' },
})

const displayValue = ref(0)

function animateTo(target) {
  const start = displayValue.value
  const diff = target - start
  const startTime = Date.now()
  const dur = props.duration

  function step() {
    const elapsed = Date.now() - startTime
    const progress = Math.min(elapsed / dur, 1)
    // easeOutCubic
    const eased = 1 - Math.pow(1 - progress, 3)
    displayValue.value = Math.round(start + diff * eased)
    if (progress < 1) {
      requestAnimationFrame(step)
    } else {
      displayValue.value = target
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
</script>

<style scoped>
.count-up {
  display: inline;
}
</style>
