import api from '../common/request'
import { listClasses } from './teaching'

/** 学生信息修改申请列表 */
export function listStudentInfoUpdates(params = {}) {
  return api.get('/student-info-updates', params)
}
/** 审核学生信息修改申请 */
export function reviewStudentInfoUpdate(id, payload) {
  return api.post('/student-info-updates/' + id + '/review', payload)
}
