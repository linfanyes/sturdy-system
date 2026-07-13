<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    desc?: string
    icon?: string
  }>(),
  { icon: '🌱' },
)
</script>

<template>
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div class="text-6xl mb-3 animate-floaty">
      {{ icon }}
    </div>
    <div class="title-display text-xl text-cocoa-700">
      {{ title }}
    </div>
    <div
      v-if="desc"
      class="text-sm text-cocoa-500 mt-1.5 max-w-xs"
    >
      {{ desc }}
    </div>
    <div class="mt-4">
      <slot />
    </div>
  </div>
</template>
