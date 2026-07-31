/**
 * 教材知识库 API
 * - 校管：/school-admin/textbooks/* （CRUD + AI 生成）
 * - 教师/家长：/textbooks/* （只读查询）
 */
import request from './request'

/** 教材 */
export interface Textbook {
  id: string
  schoolId: string
  publisher: string
  subject: string
  grade: string
  term: string
  name: string
  cover?: string
  status: string
  createdAt: string
  updatedAt: string
}

/** 单元 */
export interface TextbookUnit {
  id: string
  textbookId: string
  unitOrder: number
  title: string
  summary?: string
  createdAt: string
  updatedAt: string
  knowledgePoints?: TextbookKnowledgePoint[]
}

/** 知识点 */
export interface TextbookKnowledgePoint {
  id: string
  unitId: string
  pointOrder: number
  title: string
  type: string
  content: string
  difficulty: string
  keywords: string
  createdAt: string
  updatedAt: string
}

/** 教材树节点（含单元与知识点） */
export type TextbookTreeNode = Textbook & { units: (TextbookUnit & { knowledgePoints: TextbookKnowledgePoint[] })[] }

/** 检索结果（带教材/单元上下文） */
export interface KnowledgePointSearchResult extends TextbookKnowledgePoint {
  unitTitle: string
  textbookName: string
  subject: string
  grade: string
}

// ============ 校管 CRUD ============

export const listTextbooks = (params?: { subject?: string; grade?: string; term?: string }) =>
  request.get<any, Textbook[]>('/school-admin/textbooks', { params })

export const createTextbook = (data: Partial<Textbook>) =>
  request.post<any, Textbook>('/school-admin/textbooks', data)

export const updateTextbook = (id: string, data: Partial<Textbook>) =>
  request.patch<any, Textbook>(`/school-admin/textbooks/${id}`, data)

export const deleteTextbook = (id: string) =>
  request.delete<any, { ok: boolean }>(`/school-admin/textbooks/${id}`)

export const listUnits = (textbookId: string) =>
  request.get<any, TextbookUnit[]>(`/school-admin/textbooks/${textbookId}/units`)

export const createUnit = (data: Partial<TextbookUnit>) =>
  request.post<any, TextbookUnit>('/school-admin/textbooks/units', data)

export const updateUnit = (id: string, data: Partial<TextbookUnit>) =>
  request.patch<any, TextbookUnit>(`/school-admin/textbooks/units/${id}`, data)

export const deleteUnit = (id: string) =>
  request.delete<any, { ok: boolean }>(`/school-admin/textbooks/units/${id}`)

export const listPoints = (unitId: string) =>
  request.get<any, TextbookKnowledgePoint[]>(`/school-admin/textbooks/units/${unitId}/points`)

export const createPoint = (data: Partial<TextbookKnowledgePoint>) =>
  request.post<any, TextbookKnowledgePoint>('/school-admin/textbooks/points', data)

export const updatePoint = (id: string, data: Partial<TextbookKnowledgePoint>) =>
  request.patch<any, TextbookKnowledgePoint>(`/school-admin/textbooks/points/${id}`, data)

export const deletePoint = (id: string) =>
  request.delete<any, { ok: boolean }>(`/school-admin/textbooks/points/${id}`)

/** AI 批量生成一本教材的单元与知识点 */
export const aiGenerateTextbook = (data: { publisher: string; subject: string; grade: string; term: string; name?: string }) =>
  request.post<any, { textbookId: string; name: string; unitCount: number; pointCount: number }>('/school-admin/textbooks/ai-generate', data)

/** 一键初始化本校预置教材（32本：人教版语文/数学1-6年级 + 外研版英语3-6年级，含上下册）
 *  幂等：已存在的同版本同学科同年级同册次教材自动跳过 */
export const seedDefaultTextbooks = () =>
  request.post<any, { created: number; skipped: number; totalUnits: number; totalPoints: number }>('/school-admin/textbooks/seed-defaults')

// ============ 教师/家长 只读查询 ============

/** 教材树（支持按学科/年级/册次筛选） */
export const getTextbookTree = (params?: { subject?: string; grade?: string; term?: string; textbookId?: string }) =>
  request.get<any, TextbookTreeNode[]>('/textbooks/tree', { params })

/** 关键词检索知识点 */
export const searchKnowledgePoints = (keyword: string) =>
  request.get<any, KnowledgePointSearchResult[]>('/textbooks/search', { params: { keyword } })
