<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/layouts/AppLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import ToastContainer from '@/components/ToastContainer.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()
const layout = computed(() => (route.meta.layout === 'blank' ? BlankLayout : AppLayout))
</script>

<template>
  <component :is="layout">
    <ErrorBoundary>
      <router-view />
    </ErrorBoundary>
  </component>
  <ToastContainer />
  <ConfirmDialog />
</template>
