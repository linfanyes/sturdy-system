/**
 * API 响应解包工具函数。
 *
 * 后端分页/列表接口统一返回 { items: T[], total?: number }，
 * 但部分旧接口直接返回 T[]。unwrap 兼容两种形态，提取列表数据。
 *
 * @example
 *   // 形态 1：{ items: [...], total: 100 }
 *   const list = unwrap(apiResp) // => [...]
 *   // 形态 2：[...]
 *   const list = unwrap(directArray) // => [...]
 *   // 形态 3：null / undefined
 *   const list = unwrap(null) // => []
 */

export function unwrap<T = any>(res: T[] | { items: T[]; total?: number } | null | undefined): T[] {
  if (Array.isArray(res)) return res
  if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) return res.items
  return []
}

/**
 * 解包分页响应，返回 { items, total }。
 * 无论后端返回 { items, total } 还是裸数组，都统一为分页形态。
 */
export function unwrapPaged<T = any>(
  res: T[] | { items: T[]; total?: number } | null | undefined,
): { items: T[]; total: number } {
  if (Array.isArray(res)) return { items: res, total: res.length }
  if (res && typeof res === 'object' && 'items' in res && Array.isArray(res.items)) {
    return { items: res.items, total: res.total ?? res.items.length }
  }
  return { items: [], total: 0 }
}
