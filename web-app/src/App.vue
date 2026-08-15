<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { initMonitor } from '@/utils/monitor'

// 初始化前端监控（错误捕获 + Core Web Vitals RUM）
initMonitor()

const route = useRoute()
const layout = computed(() => (route.meta.layout === 'blank' ? BlankLayout : AppLayout))

// 适老化：应用已保存的字号
onMounted(() => {
  const s = localStorage.getItem('fontScale')
  if (s) document.documentElement.style.fontSize = s + 'px'
})
</script>

<template>
  <component :is="layout">
    <ErrorBoundary>
      <router-view v-slot="{ Component, route }">
        <keep-alive>
          <component :is="Component" v-if="route.meta.keepAlive" :key="route.fullPath" />
        </keep-alive>
        <component :is="Component" v-if="!route.meta.keepAlive" :key="route.fullPath" />
      </router-view>
    </ErrorBoundary>
  </component>
  <ToastContainer />
  <ConfirmDialog />
</template>
