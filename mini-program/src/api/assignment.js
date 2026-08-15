import { parentApi } from '../common/request'

/** 家长端：当前学生班级的分层作业 */
export function getParentAssignments() {
  return parentApi.get('/parent/assignment')
}
