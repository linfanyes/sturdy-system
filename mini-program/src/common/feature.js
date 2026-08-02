import { api } from './request'
import { FEATURE_FLAGS, FEATURE_FLAG_LIST, FEATURE_FLAG_LABELS } from '@gardener/shared/constants'
import {
  normalizeLevel,
  computeEffective,
  isBlockedBySchool,
} from '@gardener/shared/validators'

export { FEATURE_FLAGS, FEATURE_FLAG_LIST, FEATURE_FLAG_LABELS }
// 功能包解析统一收敛进 @gardener/shared（eliminate 三处实现漂移），此处仅再导出保持调用方兼容
export { normalizeLevel, computeEffective, isBlockedBySchool }

/**
 * 功能包接口封装（与 web-app/src/api/feature.ts 对齐）。
 * - 超管：GET/PATCH /admin/schools/:id/features（学校级开关，超管独占）
 * - 校管：GET /school-admin/school-features（用于教师有效权限预览）
 * - 全角色：GET /auth/me（返回 effectiveFeatures / schoolFeatureFlags）
 */

/** 当前登录态功能档案：GET /auth/me */
export function getMe() {
  return api.get('/auth/me')
}

/** 超管：获取某学校的功能包开关：GET /admin/schools/:id/features */
export function getSchoolFeatures(id) {
  return api.get('/admin/schools/' + id + '/features')
}

/** 超管：更新某学校的功能包开关：PATCH /admin/schools/:id/features */
export function updateSchoolFeatures(id, featureFlags) {
  return api.patch('/admin/schools/' + id + '/features', { featureFlags })
}

/** 校管：获取本校功能包开关（用于教师有效权限预览）：GET /school-admin/school-features */
export function getSchoolAdminFeatures() {
  return api.get('/school-admin/school-features')
}

/* ==================== effective 预览计算 ====================
 * effective = 学校级 ∩ 教师级，公式已收敛进 @gardener/shared/validators
 * （normalizeLevel / computeEffective / isBlockedBySchool），此处不再维护本地副本。
 */

/**
 * 本地 features 判定：优先使用 effectiveFeatures，缺失时回退旧 features（向后兼容）。
 * 空集合视为「不限制」，安全边界始终以后端 @Feature 守卫为准。
 * @param {string} key 功能包 key
 * @param {string[]|null|undefined} effectiveFeatures 后端下发的实际可用集合
 * @param {string[]|null|undefined} fallbackFeatures 旧版 features（回退）
 * @returns {boolean} 是否展示该功能入口
 */
export function hasFeature(key, effectiveFeatures, fallbackFeatures) {
  const list = Array.isArray(effectiveFeatures) && effectiveFeatures.length
    ? effectiveFeatures
    : fallbackFeatures
  if (!Array.isArray(list) || list.length === 0) return true
  return list.indexOf(key) >= 0
}
