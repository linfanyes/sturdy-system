<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'

interface Props {
  items: unknown[]
  itemHeight: number
  overscan?: number
}

const props = withDefaults(defineProps<Props>(), {
  overscan: 5,
})

const scrollerRef = ref<HTMLDivElement | null>(null)
const containerHeight = ref(0)
const scrollTop = ref(0)

const totalHeight = computed(() => props.items.length * props.itemHeight)

const startIndex = computed(() => {
  const start = Math.floor(scrollTop.value / props.itemHeight) - props.overscan
  return Math.max(0, start)
})

const endIndex = computed(() => {
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight) + props.overscan * 2
  const end = startIndex.value + visibleCount
  return Math.min(props.items.length, end)
})

const visibleItems = computed(() => {
  return props.items.slice(startIndex.value, endIndex.value).map((item, i) => ({
    item,
    index: startIndex.value + i,
    offset: (startIndex.value + i) * props.itemHeight,
  }))
})

function onScroll(e: Event) {
  const el = e.target as HTMLDivElement
  scrollTop.value = el.scrollTop
}

let ro: ResizeObserver | null = null

onMounted(() => {
  nextTick(() => {
    if (scrollerRef.value) {
      containerHeight.value = scrollerRef.value.clientHeight
    }
  })
  if (typeof ResizeObserver !== 'undefined' && scrollerRef.value) {
    ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerHeight.value = entry.contentRect.height
      }
    })
    ro.observe(scrollerRef.value)
  }
})

onBeforeUnmount(() => {
  if (ro) ro.disconnect()
})

watch(() => props.items.length, () => {
  nextTick(() => {
    if (scrollerRef.value) {
      containerHeight.value = scrollerRef.value.clientHeight
    }
  })
})

defineExpose({
  scrollTo(index: number) {
    if (scrollerRef.value) {
      scrollerRef.value.scrollTop = index * props.itemHeight
    }
  },
})
</script>

<template>
  <div
    ref="scrollerRef"
    class="virtual-scroller"
    @scroll.passive="onScroll"
  >
    <div
      class="virtual-spacer"
      :style="{ height: totalHeight + 'px' }"
    >
      <div
        v-for="{ item, index, offset } in visibleItems"
        :key="index"
        class="virtual-item"
        :style="{
          top: offset + 'px',
          height: itemHeight + 'px',
        }"
      >
        <slot :item="item" :index="index" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-scroller {
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  height: 100%;
  width: 100%;
}
.virtual-spacer {
  position: relative;
  width: 100%;
}
.virtual-item {
  position: absolute;
  left: 0;
  right: 0;
  width: 100%;
}
</style>
