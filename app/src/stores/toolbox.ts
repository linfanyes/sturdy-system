import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ToolCategory } from '../types/toolbox'
import { usePersistStore } from '../composables/usePersistStore'

interface ToolboxState {
  overrides: Record<string, ToolCategory>
}

export const useToolboxStore = defineStore('toolbox', () => {
  const overrides = ref<Record<string, ToolCategory>>({})

  const { reload, replaceAll } = usePersistStore(
    'toolbox',
    { overrides },
    (): ToolboxState => ({ overrides: {} }),
  )

  function setCategory(route: string, category: ToolCategory) {
    overrides.value[route] = category
  }

  function resetCategory(route: string) {
    delete overrides.value[route]
  }

  function getCategory(route: string, auto: ToolCategory): ToolCategory {
    return overrides.value[route] || auto
  }

  return {
    overrides,
    setCategory,
    resetCategory,
    getCategory,
    replaceAll,
    reload,
  }
})
