/**
 * 可复用的分页列表逻辑 composable
 *
 * ⚠️ Vue 3 限定 — 依赖 vue 的 ref/watch，不可用于非 Vue 场景。
 *
 * 默认每页 10 条，支持用户修改每页条数（5/10/20/50）。
 * 无搜索关键词时走后端 skip/take 分页；
 * 有搜索关键词时先拉取 500 条到前端缓存，再由前端过滤分页展示。
 *
 * 注意：filtered / totalFiltered / totalPages / displayedItems 由调用者自行定义，
 * 以便各页面可按需定制过滤逻辑。
 */
import { ref, watch, type Ref } from 'vue'

export interface PagedListOptions<T> {
  loadFn: (params: { page: number; pageSize: number; [key: string]: unknown }) => Promise<T[] | { items: T[]; total?: number }>
  pageSize?: number
  initialPage?: number
}

export interface PagedListResult<T> {
  page: Ref<number>
  pageSize: Ref<number>
  total: Ref<number>
  allItems: Ref<T[]>
  keyword: Ref<string>
  classId: Ref<string>
  loadList: () => Promise<void>
  resetAndReload: () => void
  goPage: (p: number) => void
  prevPage: () => void
  nextPage: () => void
}

export function usePagedList<T = unknown>(
  options: PagedListOptions<T>,
): PagedListResult<T> {
  const { loadFn, pageSize: defaultPageSize = 10, initialPage = 0 } = options

  const page = ref<number>(initialPage) as Ref<number>
  const pageSize = ref<number>(defaultPageSize) as Ref<number>
  const total = ref<number>(0) as Ref<number>
  const allItems = ref<T[]>([]) as Ref<T[]>
  const keyword = ref<string>('')
  const classId = ref<string>('')

  async function loadList() {
    const isSearching = !!keyword.value.trim()
    const params: { page: number; pageSize: number; [key: string]: unknown } = {
      page: page.value,
      pageSize: pageSize.value,
      skip: isSearching ? 0 : page.value * pageSize.value,
      take: isSearching ? 500 : pageSize.value,
    }
    if (classId.value) params.classId = classId.value
    const res = await loadFn(params)
    let arr: T[] = []
    let totalVal = 0
    if (Array.isArray(res)) {
      arr = res
      totalVal = res.length
    } else {
      arr = res?.items || []
      totalVal = res?.total ?? arr.length
    }
    allItems.value = arr
    total.value = totalVal
    page.value = 0
  }

  function resetAndReload() {
    page.value = 0
    loadList()
  }

  watch(classId, resetAndReload)
  watch(keyword, resetAndReload)

  function goPage(p: number) {
    const maxPage = Math.max(0, Math.ceil((total.value || 0) / pageSize.value) - 1)
    page.value = Math.min(Math.max(0, p), maxPage)
    if (!keyword.value.trim()) {
      loadList()
    }
  }
  function prevPage() { goPage(page.value - 1) }
  function nextPage() { goPage(page.value + 1) }

  return {
    page,
    pageSize,
    total,
    allItems,
    keyword,
    classId,
    loadList,
    resetAndReload,
    goPage,
    prevPage,
    nextPage,
  }
}
