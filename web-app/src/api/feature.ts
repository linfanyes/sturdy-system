import request from './request'

/** 当前登录态功能档案：GET /api/auth/me */
export function getMe() {
  return request.get<any, any>('/auth/me')
}

/** 超管：获取某学校的功能包开关：GET /api/admin/schools/:id/features */
export function getSchoolFeatures(id: string) {
  return request.get<any, { schoolId: string; featureFlags: string[] | null }>(
    `/admin/schools/${id}/features`,
  )
}

/** 超管：更新某学校的功能包开关：PATCH /api/admin/schools/:id/features */
export function updateSchoolFeatures(id: string, featureFlags: string[]) {
  return request.patch(`/admin/schools/${id}/features`, { featureFlags })
}

/** 校管：获取本校功能包开关（用于教师有效权限预览）：GET /api/school-admin/school-features */
export function getSchoolAdminFeatures() {
  return request.get<any, { schoolId: string; featureFlags: string[] | null }>(
    '/school-admin/school-features',
  )
}

/** 校管：更新本校功能包开关：PATCH /api/school-admin/school-features */
export function updateSchoolAdminFeatures(featureFlags: string[] | null) {
  return request.patch<any, { schoolId: string; featureFlags: string[] | null }>(
    '/school-admin/school-features',
    { featureFlags },
  )
}
