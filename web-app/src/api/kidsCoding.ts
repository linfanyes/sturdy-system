import request from './request'

/** 少儿编程作品 */
export interface CodingProject {
  id: string
  title: string
  description?: string
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
