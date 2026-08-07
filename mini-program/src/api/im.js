import api from '../common/request'

/** 获取班级家长列表 */
export function listParents(classId) {
  return api.get('/im/parents?classId=' + classId)
}

/** 创建/绑定班级群 */
export function createClassGroup(payload) {
  return api.post('/im/class-group', payload)
}

/** 获取 IM userSig */
export function getUserSig(payload) {
  return api.post('/im/user-sig', payload)
}
