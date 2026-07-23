import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'error' | 'info' | 'warning'
  message: string
}

let counter = 0

export const useToastStore = defineStore('toast', () => {
  const list = ref<Toast[]>([])

  function push(type: Toast['type'], message: string, duration = 2400) {
    const id = ++counter
    list.value.push({ id, type, message })
    setTimeout(() => {
      list.value = list.value.filter((t) => t.id !== id)
    }, duration)
  }

  return {
    list,
    success: (msg: string) => push('success', msg),
    error: (msg: string) => push('error', msg),
    info: (msg: string) => push('info', msg),
    warning: (msg: string) => push('warning', msg),
  }
})
