import { api } from './request'
import { FEATURE_FLAGS, FEATURE_FLAG_LIST, FEATURE_FLAG_LABELS } from '@gardener/shared/constants'

export { FEATURE_FLAGS, FEATURE_FLAG_LIST, FEATURE_FLAG_LABELS }

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

/* ==================== effective 预览计算（与 Web 端/后端同公式） ====================
 * effective = 学校级 ∩ 教师级
 * 某一级为 null / [] 时视为「该级全集」，不对结果做收窄。
 */

/**
 * 归一化某一级的功能清单：null / 非数组 / 空数组 → 全集（FEATURE_FLAGS）。
 * @param {string[]|null|undefined} flags 某一级配置
 * @returns {string[]} 归一化后的 key 列表
 */
export function normalizeLevel(flags) {
  if (!Array.isArray(flags) || flags.length === 0) return [...FEATURE_FLAGS]
  return flags.filter((k) => FEATURE_FLAGS.indexOf(k) >= 0)
}

/**
 * 计算实际可用功能包：effective = 学校级 ∩ 教师级。
 * @param {string[]|null|undefined} schoolFlags 学校级 featureFlags
 * @param {string[]|null|undefined} teacherFeatures 教师级 features
 * @returns {string[]} 实际可用的 key 列表（保持 FEATURE_FLAGS 原始顺序）
 */
export function computeEffective(schoolFlags, teacherFeatures) {
  const school = normalizeLevel(schoolFlags)
  const teacher = normalizeLevel(teacherFeatures)
  const schoolSet = new Set(school)
  const teacherSet = new Set(teacher)
  return FEATURE_FLAGS.filter((k) => schoolSet.has(k) && teacherSet.has(k))
}

/**
 * 判断某 key 是否被「学校级」关闭（教师即使勾选也不可用）。
 * @param {string} key 功能包 key
 * @param {string[]|null|undefined} schoolFlags 学校级 featureFlags
 * @returns {boolean} true = 被学校级关闭
 */
export function isBlockedBySchool(key, schoolFlags) {
  if (!Array.isArray(schoolFlags) || schoolFlags.length === 0) return false
  return schoolFlags.indexOf(key) < 0
}

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
