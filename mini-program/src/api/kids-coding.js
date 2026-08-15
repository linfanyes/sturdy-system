import api, { parentApi } from '../common/request'

/* ==================== 教师端（常规令牌） ==================== */

/** 教师：我的少儿编程作品列表 */
export function listCodingProjects() {
  return api.get('/kids-coding')
}
/** 教师：作品详情 */
export function getCodingProject(id) {
  return api.get('/kids-coding/' + id)
}
/** 教师：新建作品 */
export function createCodingProject(dto) {
  return api.post('/kids-coding', dto)
}
/** 教师：更新作品 */
export function updateCodingProject(id, dto) {
  return api.patch('/kids-coding/' + id, dto)
}
/** 教师：删除作品 */
export function removeCodingProject(id) {
  return api.delete('/kids-coding/' + id)
}

/* ==================== 教师端：任务卡管理 ==================== */

/** 教师：我的任务卡列表（可选按班级筛选） */
export function listTeacherChallenges(classId) {
  return api.post('/kids-coding/challenges', classId ? { classId } : {})
}
/** 教师：新建任务卡 */
export function createChallenge(dto) {
  return api.post('/kids-coding/challenges', dto)
}
/** 教师：更新任务卡 */
export function updateChallenge(id, dto) {
  return api.patch('/kids-coding/challenges/' + id, dto)
}
/** 教师：删除任务卡 */
export function removeChallenge(id) {
  return api.delete('/kids-coding/challenges/' + id)
}
/** 教师：某任务卡下的学生提交作品 */
export function listChallengeSubmissions(id) {
  return api.get('/kids-coding/challenges/' + id + '/submissions')
}

/* ==================== 教师端：点评 / 作品墙 ==================== */

/** 教师：对某练习作品写点评（幂等 upsert） */
export function createReview(dto) {
  return api.post('/kids-coding/reviews', dto)
}
/** 教师：把学生作品选入班级作品墙 */
export function featureSubmission(projectId) {
  return api.post('/kids-coding/gallery/' + projectId, {})
}
/** 教师：移出班级作品墙 */
export function unfeatureSubmission(projectId) {
  return api.delete('/kids-coding/gallery/' + projectId)
}

/* ==================== 家长端（家长令牌） ==================== */

/** 家长：本班已开放的少儿编程作品列表 */
export function listParentCodingProjects() {
  return parentApi.get('/parent/kids-coding')
}
/** 家长：我的练习作品列表（按 studentId 隔离，仅本人可见） */
export function listMyPracticeProjects() {
  return parentApi.get('/parent/kids-coding/mine')
}
/** 家长：新建练习作品（归属当前学生，默认不发布） */
export function createPracticeProject(dto) {
  return parentApi.post('/parent/kids-coding', dto)
}
/** 家长：更新练习作品 */
export function updatePracticeProject(id, dto) {
  return parentApi.patch('/parent/kids-coding/' + id, dto)
}
/** 家长：删除练习作品 */
export function removePracticeProject(id) {
  return parentApi.delete('/parent/kids-coding/' + id)
}
/** 家长：提交草稿作为作业 */
export function submitPracticeProject(id) {
  return parentApi.post('/parent/kids-coding/mine/' + id + '/submit', {})
}
/** 家长：回看某练习作品的教师点评 */
export function getPracticeReview(id) {
  return parentApi.get('/parent/kids-coding/mine/' + id + '/review')
}
/** 家长：本班教师发布的任务卡列表 */
export function listChallenges() {
  return parentApi.get('/parent/kids-coding/challenges')
}
/** 家长：任务卡详情（含起始模板） */
export function getChallenge(id) {
  return parentApi.get('/parent/kids-coding/challenges/' + id)
}
/** 家长：班级作品墙（教师精选的同伴作品，只读） */
export function listGallery() {
  return parentApi.get('/parent/kids-coding/gallery')
}
/** 家长：学习周报（近 7 天汇总） */
export function getWeeklyReport() {
  return parentApi.get('/parent/kids-coding/weekly-report')
}
/** 家长：成就徽章 */
export function getBadges() {
  return parentApi.get('/parent/kids-coding/badges')
}
/** 家长：把本周学习周报推送到消息中心 */
export function pushWeeklyReport() {
  return parentApi.post('/parent/kids-coding/weekly-report/push', {})
}

/* ==================== 超管端 ==================== */

/** 超管：批量推送本周学习周报给所有有练习活动的学生家长 */
export function pushAllWeeklyReports() {
  return api.post('/admin/kids-coding/weekly-report/push-all', {})
}
