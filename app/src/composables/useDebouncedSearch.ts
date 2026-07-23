import { ref, watch, onUnmounted } from 'vue'

/**
 * 防抖搜索 composable
 * 用法:
 *   const { search, searchDebounced } = useDebouncedSearch(300)
 *   // 模板中 v-model="search"
 *   // 计算属性中使用 searchDebounced.value 进行过滤
 */
export function useDebouncedSearch(delay = 200) {
  const search = ref('')
  const searchDebounced = ref('')

  let timer: number | null = null

  watch(search, (val) => {
    if (timer) clearTimeout(timer)
    timer = window.setTimeout(() => {
      searchDebounced.value = val
    }, delay)
  })

  onUnmounted(() => {
    if (timer) clearTimeout(timer)
  })

  return {
    search,
    searchDebounced,
  }
}
