<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { initMonitor } from '@/utils/monitor'
import { usePrefsStore } from '@/stores/prefs'

// 初始化前端监控（错误捕获 + Core Web Vitals RUM）
initMonitor()

const route = useRoute()
// P3-7修复：根据 route.meta.layout 动态切换布局组件
// - 'blank' → BlankLayout（登录页、404页等无侧边栏页面）
// - 'default' 或未设置 → AppLayout（含侧边栏+顶栏+面包屑）
const layout = computed(() => (route.meta.layout === 'blank' ? BlankLayout : AppLayout))
const prefs = usePrefsStore()

// 字号适配：由 prefs store 统一管理（onMounted 回调中已设置 documentElement fontSize）
// 此处无需重复逻辑
onMounted(() => {
  // 确保 prefs store 已初始化（仅触发 import 侧效应）
  void prefs.fontSize
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
