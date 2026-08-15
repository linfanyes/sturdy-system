import request from './request'

/** 教师/校管：班级挑战 */
export function classChallenges(classId: string) {
  return request.get('/habit/challenges', { params: { classId } })
}

/** 教师/校管：班级打卡排行榜 */
export function habitRanking(classId: string) {
  return request.get('/habit/ranking', { params: { classId } })
}
