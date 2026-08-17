/**
 * 可复用的 keep-alive 页面刷新逻辑 composable。
 *
 * 解决 keep-alive 页面切换时「首次挂载加载一次、后续激活不再刷新」的问题。
 * 用法：替换手工 onMounted + onActivated + activated 三件套。
 *
 * @example
 *   setup() {
 *     const { onMountedRefresh, onActivatedRefresh } = useKeepAliveRefresh()
 *     onMountedRefresh(async () => { await loadData() })
 *     onActivatedRefresh(async () => { await loadData() })
 *     return {}
 *   }
 *
 * 旧模式（不再需要）：
 *   let activated = false
 *   onMounted(async () => { await load(); activated = true })
 *   onActivated(async () => { if (activated) await load() })
 */
import { onMounted, onActivated } from 'vue'

export function useKeepAliveRefresh() {
  let isFirstMount = true

  /**
   * 替代 onMounted：首次挂载时执行加载，并标记为非首次。
   * 搭配 onActivatedRefresh 使用。
   */
  function onMountedRefresh(fn: () => void | Promise<void>) {
    onMounted(async () => {
      await fn()
      isFirstMount = false
    })
  }

  /**
   * 替代 onActivated：仅在非首次挂载时执行（即 keep-alive 切换回来时）。
   * 必须与 onMountedRefresh 配对使用。
   */
  function onActivatedRefresh(fn: () => void | Promise<void>) {
    onActivated(() => {
      if (!isFirstMount) {
        return fn()
      }
    })
  }

  return { onMountedRefresh, onActivatedRefresh }
}
