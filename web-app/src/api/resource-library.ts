/**
 * 教学资源库 API
 * - 校管：/school-admin/resource-library/* （CRUD + 初始化）
 * - 教师/家长：/resource-library/* （只读查询 + 学科组长编辑）
 */
import request from './request'

/** 古诗词 */
export interface Poem {
  id: string
  schoolId: string
  title: string
  dynasty: string
  author: string
  content: string
  translation?: string
  appreciation?: string
  grade: string
  keywords: string
  audioUrl?: string
  sortOrder: number
  status: string
  createdAt: string
  updatedAt: string
}

/** 数学公式定理 */
export interface MathFormula {
  id: string
  schoolId: string
  title: string
  category: string
  formula: string
  explanation?: string
  example?: string
  grade: string
  keywords: string
  sortOrder: number
  status: string
  createdAt: string
  updatedAt: string
}

/** 英语分类单词 */
export interface EnglishWord {
  id: string
  schoolId: string
  word: string
  phonetic: string
  meaning: string
  category: string
  example?: string
  grade: string
  audioUrl?: string
  sortOrder: number
  status: string
  createdAt: string
  updatedAt: string
}

/** 科学资源 */
export interface ScienceResource {
  id: string
  schoolId: string
  title: string
  category: string
  content: string
  grade: string
  keywords: string
  sortOrder: number
  status: string
  createdAt: string
  updatedAt: string
}

/** 道德与法治资源 */
export interface MoralResource {
  id: string
  schoolId: string
  title: string
  category: string
  content: string
  grade: string
  keywords: string
  sortOrder: number
  status: string
  createdAt: string
  updatedAt: string
}

// ============ 教师/家长只读 ============

export const listPoems = (params?: { grade?: string; dynasty?: string; keyword?: string }) =>
  request.get<any, Poem[]>('/resource-library/poems', { params })

export const searchPoems = (keyword: string) =>
  request.get<any, Poem[]>('/resource-library/poems/search', { params: { keyword } })

export const listFormulas = (params?: { grade?: string; category?: string; keyword?: string }) =>
  request.get<any, MathFormula[]>('/resource-library/formulas', { params })

export const searchFormulas = (keyword: string) =>
  request.get<any, MathFormula[]>('/resource-library/formulas/search', { params: { keyword } })

export const listWords = (params?: { grade?: string; category?: string; keyword?: string }) =>
  request.get<any, EnglishWord[]>('/resource-library/words', { params })

export const listWordCategories = () =>
  request.get<any, string[]>('/resource-library/words/categories')

export const searchWords = (keyword: string) =>
  request.get<any, EnglishWord[]>('/resource-library/words/search', { params: { keyword } })

// ============ 科学资源 ============

export const listScience = (params?: { grade?: string; category?: string; keyword?: string }) =>
  request.get<any, ScienceResource[]>('/resource-library/science', { params })

export const searchScience = (keyword: string) =>
  request.get<any, ScienceResource[]>('/resource-library/science/search', { params: { keyword } })

// ============ 道德与法治资源 ============

export const listMoral = (params?: { grade?: string; category?: string; keyword?: string }) =>
  request.get<any, MoralResource[]>('/resource-library/moral', { params })

export const searchMoral = (keyword: string) =>
  request.get<any, MoralResource[]>('/resource-library/moral/search', { params: { keyword } })

// ============ 校管 CRUD ============

export const adminListPoems = (params?: { grade?: string; dynasty?: string; keyword?: string }) =>
  request.get<any, Poem[]>('/school-admin/resource-library/poems', { params })

export const adminCreatePoem = (data: Partial<Poem>) =>
  request.post<any, Poem>('/school-admin/resource-library/poems', data)

export const adminUpdatePoem = (id: string, data: Partial<Poem>) =>
  request.patch<any, Poem>(`/school-admin/resource-library/poems/${id}`, data)

export const adminDeletePoem = (id: string) =>
  request.delete<any, { ok: boolean }>(`/school-admin/resource-library/poems/${id}`)

export const adminListFormulas = (params?: { grade?: string; category?: string; keyword?: string }) =>
  request.get<any, MathFormula[]>('/school-admin/resource-library/formulas', { params })

export const adminCreateFormula = (data: Partial<MathFormula>) =>
  request.post<any, MathFormula>('/school-admin/resource-library/formulas', data)

export const adminUpdateFormula = (id: string, data: Partial<MathFormula>) =>
  request.patch<any, MathFormula>(`/school-admin/resource-library/formulas/${id}`, data)

export const adminDeleteFormula = (id: string) =>
  request.delete<any, { ok: boolean }>(`/school-admin/resource-library/formulas/${id}`)

export const adminListWords = (params?: { grade?: string; category?: string; keyword?: string }) =>
  request.get<any, EnglishWord[]>('/school-admin/resource-library/words', { params })

export const adminCreateWord = (data: Partial<EnglishWord>) =>
  request.post<any, EnglishWord>('/school-admin/resource-library/words', data)

export const adminUpdateWord = (id: string, data: Partial<EnglishWord>) =>
  request.patch<any, EnglishWord>(`/school-admin/resource-library/words/${id}`, data)

export const adminDeleteWord = (id: string) =>
  request.delete<any, { ok: boolean }>(`/school-admin/resource-library/words/${id}`)

// ============ 科学资源（校管 CRUD） ============

export const adminListScience = (params?: { grade?: string; category?: string; keyword?: string }) =>
  request.get<any, ScienceResource[]>('/school-admin/resource-library/science', { params })

export const adminCreateScience = (data: Partial<ScienceResource>) =>
  request.post<any, ScienceResource>('/school-admin/resource-library/science', data)

export const adminUpdateScience = (id: string, data: Partial<ScienceResource>) =>
  request.patch<any, ScienceResource>(`/school-admin/resource-library/science/${id}`, data)

export const adminDeleteScience = (id: string) =>
  request.delete<any, { ok: boolean }>(`/school-admin/resource-library/science/${id}`)

// ============ 道德与法治资源（校管 CRUD） ============

export const adminListMoral = (params?: { grade?: string; category?: string; keyword?: string }) =>
  request.get<any, MoralResource[]>('/school-admin/resource-library/moral', { params })

export const adminCreateMoral = (data: Partial<MoralResource>) =>
  request.post<any, MoralResource>('/school-admin/resource-library/moral', data)

export const adminUpdateMoral = (id: string, data: Partial<MoralResource>) =>
  request.patch<any, MoralResource>(`/school-admin/resource-library/moral/${id}`, data)

export const adminDeleteMoral = (id: string) =>
  request.delete<any, { ok: boolean }>(`/school-admin/resource-library/moral/${id}`)

/** 一键初始化资源库种子数据 */
export const seedDefaultResources = () =>
  request.post<any, { poems: { created: number; skipped: number }; formulas: { created: number; skipped: number }; words: { created: number; skipped: number }; science: { created: number; skipped: number }; moral: { created: number; skipped: number } }>('/school-admin/resource-library/seed-defaults')

// ============ 学科组长编辑 ============

export const teacherUpdatePoem = (id: string, data: Partial<Poem>) =>
  request.patch<any, Poem>(`/resource-library/poems/${id}`, data)

export const teacherUpdateFormula = (id: string, data: Partial<MathFormula>) =>
  request.patch<any, MathFormula>(`/resource-library/formulas/${id}`, data)

export const teacherUpdateWord = (id: string, data: Partial<EnglishWord>) =>
  request.patch<any, EnglishWord>(`/resource-library/words/${id}`, data)

// ============ 学科组长编辑：科学 / 道德与法治 ============

export const teacherUpdateScience = (id: string, data: Partial<ScienceResource>) =>
  request.patch<any, ScienceResource>(`/resource-library/science/${id}`, data)

export const teacherUpdateMoral = (id: string, data: Partial<MoralResource>) =>
  request.patch<any, MoralResource>(`/resource-library/moral/${id}`, data)
