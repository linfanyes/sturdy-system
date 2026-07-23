<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useUserStore } from './stores/user'
import { applyThemeVars } from './theme'
import GlobalToast from './components/common/GlobalToast.vue'

const userStore = useUserStore()

// 立即应用主题变量（运行时设置到 <html>，避免 CSS 编译期内联 var 导致的切换失效）
applyThemeVars(userStore.theme)
watch(() => userStore.theme, (t) => applyThemeVars(t))

onMounted(() => {
  if (userStore.theme === 'dark') {
    document.documentElement.classList.add('dark')
  }
  // 初始化主题色和字号
  document.documentElement.setAttribute('data-color', userStore.colorScheme)
  document.documentElement.setAttribute('data-font', userStore.fontSize)
})

watch(() => userStore.colorScheme, (c) => {
  document.documentElement.setAttribute('data-color', c)
})

watch(() => userStore.fontSize, (s) => {
  document.documentElement.setAttribute('data-font', s)
})
</script>

<template>
  <router-view />
  <GlobalToast />
</template>
