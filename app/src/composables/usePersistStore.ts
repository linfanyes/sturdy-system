/**
 * Pinia Store 持久化通用 composable
 *
 * 统一封装 localStorage 持久化逻辑, 避免每个 store 重复写:
 * - 初始加载 (带 try/catch 容错)
 * - 深度监听自动保存
 * - 用户切换时自动重载对应数据
 *
 * 用法:
 *   import { usePersistStore } from '../composables/usePersistStore'
 *
 *   export const useXxxStore = defineStore('xxx', () => {
 *     const items = ref<Item[]>([])
 *
 *     const { reload, replaceAll } = usePersistStore('xxx',
 *       { items },
 *       () => ({ items: seedItems }),
 *     )
 *
 *     // ...业务方法
 *
 *     return { items, reload, replaceAll, ... }
 *   })
 */
import { watch, type Ref } from 'vue'
import { getStorageKey, onUserChange } from '../utils/storage'

/** 简单防抖，支持 flush 立即执行 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): T & { flush: () => void; pending: () => boolean } {
  let timer: number | null = null
  const debounced = ((...args: unknown[]) => {
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(() => {
      timer = null
      fn(...args)
    }, delay)
  }) as T & { flush: () => void; pending: () => boolean }
  debounced.flush = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
      fn()
    }
  }
  debounced.pending = () => timer !== null
  return debounced
}

export function usePersistStore<T extends object>(
  base: string,
  refs: { [K in keyof T]: Ref<T[K]> },
  getDefault: () => T,
): {
  reload: () => void
  replaceAll: (next: Partial<T>) => void
} {
  const KEY = () => getStorageKey(base)

  function load(): T {
    try {
      const raw = localStorage.getItem(KEY())
      if (raw) return JSON.parse(raw) as T
    } catch (e) {
      /* 损坏或解析失败时回退到默认值 */
    }
    // 返回默认值 (调用方确保种子数据是新副本, 避免跨用户共享引用)
    return getDefault()
  }

  function applyState(data: T) {
    for (const key of Object.keys(refs) as (keyof T)[]) {
      if (key in data) {
        refs[key].value = data[key]
      }
    }
  }

  function reload() {
    applyState(load())
  }

  function replaceAll(next: Partial<T>) {
    for (const key of Object.keys(next) as (keyof T)[]) {
      if (key in refs && next[key] !== undefined) {
        refs[key].value = next[key] as T[typeof key]
      }
    }
  }

  // 初始加载
  applyState(load())

  // 防抖写入, 避免频繁操作导致卡顿
  const save = debounce(() => {
    const data: Record<string, unknown> = {}
    for (const key of Object.keys(refs)) {
      data[key] = refs[key as keyof T].value
    }
    localStorage.setItem(KEY(), JSON.stringify(data))
  }, 300)

  // 深度监听所有 ref, 变化时自动持久化 (防抖 300ms)
  watch(
    () => (Object.values(refs) as Ref<unknown>[]).map((r) => r.value),
    save,
    { deep: true },
  )

  // 页面关闭前刷出未写入的数据，防止丢失
  const onBeforeUnload = () => save.flush()
  window.addEventListener('beforeunload', onBeforeUnload)

  // 用户切换时重载
  onUserChange(reload)

  return { reload, replaceAll }
}
