/**
 * 工作台个性化配置 store
 *
 * 目前持久化「课堂神器」用户自选的 5 个工具（按路由标识）。
 * 使用项目统一的 usePersistStore 做按用户隔离的 localStorage 持久化，
 * 默认取 ALL_TOOLS 前 5 个常用工具。
 */
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { usePersistStore } from '../composables/usePersistStore'
import { DEFAULT_TOOLS } from '../data/tools'

export const useDashboardStore = defineStore('dashboard', () => {
  const selected = ref<string[]>([])

  const { reload } = usePersistStore('dashboardTools', { selected }, () => ({
    selected: [...DEFAULT_TOOLS],
  }))

  return { selected, reload }
})
