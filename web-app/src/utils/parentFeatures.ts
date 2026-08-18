/**
 * 家长功能包判定工具函数
 * 班主任可在班级里配置家长可见功能。
 * - 未携带功能包（undefined/非数组，旧会话）→ 不限制，全部可见
 * - 空数组 → 班主任关闭该班家长全部功能
 * - 非空数组 → 仅开放数组内功能
 * 安全边界以后端为准。
 */

/**
 * 判断家长是否拥有某功能权限
 * @param effectiveFeatures 当前孩子的 effectiveFeatures（切换孩子后随 me 刷新）
 * @param key 功能标识
 * @returns 是否拥有该功能权限
 */
export function hasParentFeature(effectiveFeatures: string[] | undefined | null, key: string): boolean {
  if (!Array.isArray(effectiveFeatures)) return true
  if (effectiveFeatures.length === 0) return false
  return effectiveFeatures.indexOf(key) >= 0
}

/**
 * 作业完成状态常量
 * 用于判断作业是否已完成（不区分"已批改"和"已发还"等完成状态）
 */
export const DONE_HW_STATUSES = ['已批改', '已发还', '已完成']
