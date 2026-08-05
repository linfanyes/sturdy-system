/**
 * 演示模式入口（聚合层）。
 * 对外只暴露 getMockData / hasKnownMock / MOCK，API 与旧 mock-data.js 完全一致，
 * 因此 request.js 仅需将 import 由 './mock-data' 改为 './mock' 即可，无需改动调用方。
 */
import { academicEndpoints } from './endpoints/academic.js'
import { authEndpoints } from './endpoints/auth.js'
import { aiEndpoints } from './endpoints/ai.js'
import { securityEndpoints } from './endpoints/security.js'
import { imEndpoints } from './endpoints/im.js'
import { parentEndpoints } from './endpoints/parent.js'
import { adminEndpoints } from './endpoints/admin.js'

/** 合并所有域的 mock 端点（无键冲突） */
const MOCK = {
  ...academicEndpoints,
  ...authEndpoints,
  ...aiEndpoints,
  ...securityEndpoints,
  ...imEndpoints,
  ...parentEndpoints,
  ...adminEndpoints,
}

/** 根据路径返回模拟数据，支持 ?classId= / ?skip=&take= 过滤 */
export function getMockData(path, method = 'GET', body = {}) {
  const clean = path.split('?')[0]
  const params = {}
  if (path.includes('?')) {
    path.split('?')[1].split('&').forEach((p) => {
      const [k, v] = p.split('=')
      if (k) params[k] = decodeURIComponent(v || '')
    })
  }

  // POST / PATCH / DELETE → 有预设 mock 则用预设，否则模拟成功返回
  if (method !== 'GET') {
    // 优先查找 method+path 限定键（如 'POST /parent-auth/switch-student'），支持函数 handler
    const methodKey = method + ' ' + clean
    if (MOCK[methodKey] !== undefined) {
      const mock = MOCK[methodKey]
      if (typeof mock === 'function') {
        return mock(body || {})
      }
      if (Array.isArray(mock)) {
        return { ...body, id: body?.id || Date.now().toString(), createdAt: new Date().toISOString() }
      }
      return { ...mock, id: Date.now().toString() }
    }
    // 次优：按 path 查找（兼容旧注册方式）
    if (MOCK[clean] !== undefined) {
      const mock = MOCK[clean]
      if (typeof mock === 'function') {
        return mock(body || {})
      }
      if (Array.isArray(mock)) {
        return { ...body, id: body?.id || Date.now().toString(), createdAt: new Date().toISOString() }
      }
      return { ...mock, id: Date.now().toString() }
    }
    return { id: Date.now().toString(), ...body, createdAt: new Date().toISOString() }
  }

  // 精确匹配
  if (MOCK[clean] !== undefined) {
    let data = MOCK[clean]
    // 支持动态函数（如 teaching-calendar 根据参数返回不同月份数据）
    if (typeof data === 'function') {
      return data(params)
    }
    data = JSON.parse(JSON.stringify(data))
    // 按 classId 过滤（仅数组数据）
    if (params.classId && Array.isArray(data)) {
      data = data.filter((item) => item.classId === params.classId)
    }
    // 按 studentId 过滤
    if (params.studentId && Array.isArray(data)) {
      data = data.filter((item) => item.studentId === params.studentId)
    }
    // 自动换装：部分页面期望 {items, total} 格式（与 real API 一致）
    // 当传了 skip/take 参数时，或路由是以 CRUD 风格访问时
    const expectsWrapped = params.skip !== undefined || params.take !== undefined
    if (expectsWrapped && Array.isArray(data)) {
      return { items: data, total: data.length }
    }
    return data
  }

  // 通配：/todos/xxx → 返回单个 todo（从集合中查找）
  const parts = clean.split('/') // ['', 'todos', 'xxx']
  if (parts.length === 3 && parts[1]) {
    const collection = '/' + parts[1]
    if (MOCK[collection] && Array.isArray(MOCK[collection])) {
      const match = MOCK[collection].find((item) => item.id === parts[2])
      return match || { id: parts[2], name: parts[2], message: '模拟数据（按ID查找）' }
    }
  }

  // 兜底
  return Array.isArray(body) ? body : (body?.items || [])
}

/** 支持 mock 的路由列表（用于判断是否完全 mock） */
export function hasKnownMock(path) {
  const clean = path.split('?')[0]
  return MOCK[clean] !== undefined
}

export { MOCK }
export default MOCK
