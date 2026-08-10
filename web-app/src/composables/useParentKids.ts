import { ref, type Ref } from 'vue'
import { getParentMe } from '@/api/parent'

/**
 * 家长关联孩子数量（单例共享）。
 *
 * 「跨娃比对」功能仅在家长手机号关联 ≥2 名学生时出现，否则默认隐藏。
 * Sidebar（侧边栏一级菜单）与 Dashboard 需共享同一判断，故用模块级单例
 * 缓存一次 getParentMe 结果，避免重复请求与两侧状态不一致。
 */
const kidCount = ref<number | null>(null)
let pending: Promise<number> | null = null

export function useParentKids() {
  /** 拉取（已缓存），返回关联孩子数；加载中返回 null 语义由调用方决定 */
  async function ensure(): Promise<number> {
    if (kidCount.value !== null) return kidCount.value
    if (pending) return pending
    pending = getParentMe()
      .then((me) => {
        const c = (me && me.kids && me.kids.length) || 0
        kidCount.value = c
        return c
      })
      .catch(() => {
        kidCount.value = 0
        return 0
      })
    return pending
  }

  /** 由 Dashboard 在拿到 me 后直接写入，确保 Sidebar 即时一致 */
  function setKidCount(c: number) {
    kidCount.value = c
    pending = Promise.resolve(c)
  }

  return { kidCount: kidCount as Ref<number | null>, ensure, setKidCount }
}
