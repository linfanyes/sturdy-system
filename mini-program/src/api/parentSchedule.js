import { parentApi } from '../common/request'

/** 家长端：查看当前学生所在班级课表（含调课标注） */
export function getParentSchedule() {
  return parentApi.get('/parent/schedule')
}
