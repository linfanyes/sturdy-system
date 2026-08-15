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
  updatedAt?: string
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
