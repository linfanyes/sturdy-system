import { parentApi } from '../common/request'

/** 家长/学生端：匿名举报（校园安全 / 防欺凌） */
export function parentReport(data) {
  return parentApi.post('/parent/safety/report', data)
}

/** 家长端：安全打卡（离校 / 到家） */
export function parentCheckin(data) {
  return parentApi.post('/parent/safety/checkin', data)
}
