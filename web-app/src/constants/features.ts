/**
 * 功能权限 key 列表（与小程序 school-admin.vue 对齐）。
 *
 * 单一事实来源：统一引用 shared/constants 的 FEATURE_FLAGS / FEATURE_FLAG_LIST，
 * 后端 @Feature 校验、学校级开关、双端菜单显隐均以此为准，避免双端 key 漂移。
 */
import { FEATURE_FLAG_LIST, FEATURE_FLAGS, FEATURE_FLAG_LABELS } from '@gardener/shared/constants'

export { FEATURE_FLAGS, FEATURE_FLAG_LABELS }

/** 标准功能包清单（含中文 label），UI 直接复用 */
export const ALL_FEATURES: { key: string; label: string }[] = FEATURE_FLAG_LIST
