import { parentApi } from '../common/request'

/** 家长端：当前学生班级最新报告 */
export function getParentReport(type = 'weekly') {
  return parentApi.get('/parent/report?type=' + type)
}
