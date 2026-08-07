/**
 * 可复用的分页列表逻辑 composable
 *
 * 默认每页 10 条，支持用户修改每页条数（5/10/20/50）。
 * 无搜索关键词时走后端 skip/take 分页；
 * 有搜索关键词时先拉取 500 条到前端缓存，再由前端过滤分页展示。
 *
 * 注意：filtered / totalFiltered / totalPages / displayedItems 由调用者自行定义，
 * 以便各页面可按需定制过滤逻辑。
 */
import { ref, watch } from 'vue'

export function usePagedList(
  loadFn: (params: Record<string, any>) => Promise<any[] | { items: any[]; total?: number }>,
  defaultPageSize = 10,
  totalRef?: { value: number },
) {
  const page = ref(0)
  const pageSize = ref(defaultPageSize)
  const total = ref(0)
  const allItems = ref<any[]>([])
  const keyword = ref('')
  const classId = ref('')

  async function loadList() {
    const isSearching = !!keyword.value.trim()
    const params: Record<string, any> = {
      skip: isSearching ? 0 : page.value * pageSize.value,
      take: isSearching ? 500 : pageSize.value,
    }
    if (classId.value) params.classId = classId.value
    const res = await loadFn(params)
    let arr: any[] = []
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
    const totalItems = totalRef?.value ?? allItems.value.length
    const maxPage = Math.max(0, Math.ceil((totalItems || 0) / pageSize.value) - 1)
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
