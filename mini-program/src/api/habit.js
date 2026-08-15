import { parentApi } from '../common/request'

/** 家长端：发起习惯挑战 */
export function createChallenge(data) {
  return parentApi.post('/parent/habit/challenge', data)
}

/** 家长端：我的挑战 */
export function myChallenges() {
  return parentApi.get('/parent/habit/my')
}

/** 家长端：打卡 */
export function checkin(data) {
  return parentApi.post('/parent/habit/checkin', data)
}
