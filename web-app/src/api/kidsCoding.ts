import request from './request'

/** 少儿编程作品 */
export interface CodingProject {
  id: string
  title: string
  description?: string | null
  /** 积木脚本：JSON 数组（控件 id + 参数 + 顺序） */
  blocks?: any[]
  /** 发布到的班级；null = 仅教师私有 */
  classId?: string | null
  /** 是否开放给该班级家长查看 */
  publishedToParent?: boolean
  /** 作者教师展示名 */
  teacherName?: string | null
  /** 关联任务卡 */
  challengeId?: string | null
  /** 是否作为作业提交 */
  submitted?: boolean
  /** 作业提交时间 */
  submittedAt?: string | null
  /** 是否入选班级作品墙 */
  showInGallery?: boolean
  updatedAt?: string
  createdAt?: string
}

/** 少儿编程任务卡 */
export interface CodingChallenge {
  id: string
  title: string
  goal?: string | null
  classId?: string | null
  /** 起始积木模板（脚手架） */
  starterBlocks?: any[]
  teacherName?: string | null
  updatedAt?: string
}

/** 少儿编程教师点评 */
export interface CodingReview {
  id?: string
  comment?: string | null
  rating?: number | null
  createdAt?: string
}

/* ============ 教师端 ============ */

/** 教师：我的少儿编程作品列表 */
export function listCodingProjects() {
  return request.get<any, CodingProject[]>('/kids-coding')
}

/** 教师：作品详情 */
export function getCodingProject(id: string) {
  return request.get<any, CodingProject>('/kids-coding/' + id)
}

/** 教师：新建作品 */
export function createCodingProject(dto: Partial<CodingProject>) {
  return request.post<any, CodingProject>('/kids-coding', dto)
}

/** 教师：更新作品 */
export function updateCodingProject(id: string, dto: Partial<CodingProject>) {
  return request.patch<any, CodingProject>('/kids-coding/' + id, dto)
}

/** 教师：删除作品 */
export function removeCodingProject(id: string) {
  return request.delete<any, { ok?: boolean }>('/kids-coding/' + id)
}

/* ============ 家长端（只读，仅本班已开放） ============ */

/** 家长：本班已开放的少儿编程作品列表 */
export function listParentCodingProjects() {
  return request.get<any, CodingProject[]>('/parent/kids-coding')
}

/** 家长：作品详情 */
export function getParentCodingProject(id: string) {
  return request.get<any, CodingProject>('/parent/kids-coding/' + id)
}

/* ============ 家长端（学生自主练习，可读写） ============ */

/** 家长：我的练习作品列表（按 studentId 隔离，仅本人可见） */
export function listMyPracticeProjects() {
  return request.get<any, CodingProject[]>('/parent/kids-coding/mine')
}

/** 家长：新建练习作品（归属当前学生，默认不发布） */
export function createPracticeProject(dto: Partial<CodingProject>) {
  return request.post<any, { id: string }>('/parent/kids-coding', dto)
}

/** 家长：更新练习作品 */
export function updatePracticeProject(id: string, dto: Partial<CodingProject>) {
  return request.patch<any, { id: string }>('/parent/kids-coding/' + id, dto)
}

/** 家长：删除练习作品 */
export function removePracticeProject(id: string) {
  return request.delete<any, { id: string }>('/parent/kids-coding/' + id)
}

/** 家长：提交草稿作为作业 */
export function submitPracticeProject(id: string) {
  return request.post<any, { id: string; submitted: boolean }>('/parent/kids-coding/mine/' + id + '/submit')
}

/** 家长：回看某练习作品的教师点评 */
export function getPracticeReview(id: string) {
  return request.get<any, CodingReview | null>('/parent/kids-coding/mine/' + id + '/review')
}

/* ============ 家长端：任务卡 ============ */

/** 家长：本班教师发布的任务卡列表 */
export function listChallenges() {
  return request.get<any, CodingChallenge[]>('/parent/kids-coding/challenges')
}

/** 家长：任务卡详情（含起始模板） */
export function getChallenge(id: string) {
  return request.get<any, CodingChallenge>('/parent/kids-coding/challenges/' + id)
}

/* ============ 教师端：任务卡管理 ============ */

/** 教师：我的任务卡列表 */
export function listTeacherChallenges(classId?: string | null) {
  return request.post<any, CodingChallenge[]>('/kids-coding/challenges', classId ? { classId } : {})
}

/** 教师：新建任务卡 */
export function createChallenge(dto: Partial<CodingChallenge>) {
  return request.post<any, CodingChallenge>('/kids-coding/challenges', dto)
}

/** 教师：更新任务卡 */
export function updateChallenge(id: string, dto: Partial<CodingChallenge>) {
  return request.patch<any, CodingChallenge>('/kids-coding/challenges/' + id, dto)
}

/** 教师：删除任务卡 */
export function removeChallenge(id: string) {
  return request.delete<any, { id: string }>('/kids-coding/challenges/' + id)
}

/** 教师：某任务卡下的学生提交作品 */
export function listChallengeSubmissions(id: string) {
  return request.get<any, any[]>('/kids-coding/challenges/' + id + '/submissions')
}

/* ============ 教师端：点评 ============ */

/** 教师：对某练习作品写点评（幂等 upsert） */
export function createReview(dto: { projectId: string; challengeId?: string | null; studentId?: string | null; comment?: string | null; rating?: number | null }) {
  return request.post<any, { id: string; comment: string | null; rating: number | null }>('/kids-coding/reviews', dto)
}

/** 教师：某任务卡的全部点评 */
export function listReviewsByChallenge(challengeId: string) {
  return request.get<any, CodingReview[]>('/kids-coding/reviews/challenge/' + challengeId)
}

/** 教师：把学生作品选入班级作品墙 */
export function featureSubmission(projectId: string) {
  return request.post<any, { id: string; showInGallery: boolean }>('/kids-coding/gallery/' + projectId)
}

/** 教师：移出班级作品墙 */
export function unfeatureSubmission(projectId: string) {
  return request.delete<any, { id: string; showInGallery: boolean }>('/kids-coding/gallery/' + projectId)
}

/** 家长：班级作品墙（教师精选的同伴作品，只读） */
export function listGallery() {
  return request.get<any, CodingProject[]>('/parent/kids-coding/gallery')
}

/** 家长：学习周报（近 7 天汇总） */
export function getWeeklyReport() {
  return request.get<any, any>('/parent/kids-coding/weekly-report')
}

/** 家长：成就徽章 */
export function getBadges() {
  return request.get<any, { type: string; label: string; icon: string; earned: boolean }[]>('/parent/kids-coding/badges')
}
