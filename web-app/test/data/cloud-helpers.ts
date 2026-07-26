/**
 * cloud-helpers.ts
 * 直连云托管后端的传输层与种子工具。
 * 仅依赖 Node 内置 https，不引用任何 web 端 window/localStorage 相关模块。
 */
import https from 'https'

export const API_HOST = 'tec-work-283329-8-1440166408.sh.run.tcloudbase.com'
export const API_BASE = '/api'

export interface ApiResponse {
  status: number
  body: any
}

/** 通用请求封装：使用 Node 原生 https 直连云地址，显式带 Bearer token。 */
export function apiRequest(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' = 'GET',
  body?: any,
  token?: string,
): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const postData = body !== undefined ? JSON.stringify(body) : undefined
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    if (postData) headers['Content-Length'] = String(Buffer.byteLength(postData))

    const req = https.request(
      {
        hostname: API_HOST,
        path: API_BASE + path,
        method,
        headers,
        timeout: 20000,
      },
      (res) => {
        let data = ''
        res.on('data', (chunk) => (data += chunk))
        res.on('end', () => {
          let parsed: any = data
          try {
            parsed = JSON.parse(data)
          } catch {
            /* 保留原始字符串 */
          }
          resolve({ status: res.statusCode || 0, body: parsed })
        })
      },
    )

    req.on('error', (e) => reject(e))
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
    if (postData) req.write(postData)
    req.end()
  })
}

/** 生成全局唯一后缀，避免与云上真实/遗留数据冲突。 */
export function uniqueSuffix(): string {
  return (
    Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 6)
  ).toUpperCase()
}

/** 生成 2 位大写字母/数字组成的学校 prefix。 */
export function schoolPrefix(): string {
  return Math.random().toString(36).slice(2, 4).toUpperCase()
}

/** 从创建类响应中提取 id（兼容 {id} 与 {data:{id}} 结构）。 */
export function extractId(body: any): string | undefined {
  if (!body) return undefined
  if (typeof body.id === 'string') return body.id
  if (body.data && typeof body.data.id === 'string') return body.data.id
  return undefined
}

/**
 * 断言接口返回成功（200 或 201）。
 * 注意：该后端对 GET 返回 200、对 POST/登录/创建类返回 201（Created），
 * 二者均为成功态，故一并接受；真正的缺陷表现为 4xx/5xx。
 */
export function expectOk(res: ApiResponse, label = ''): void {
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(
      `${label || res.status} 期望 200/201，实际 ${res.status}，响应: ${JSON.stringify(res.body).slice(0, 200)}`,
    )
  }
}

/** 断言创建/登录类接口返回 200 或 201（该后端对 POST/登录统一返回 201）。 */
export function expectCreated(res: ApiResponse, label = ''): void {
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(
      `${label || 'create'} 期望 200/201，实际 ${res.status}，响应: ${JSON.stringify(res.body).slice(0, 200)}`,
    )
  }
}

/** 断言返回体为对象且包含给定字段。 */
export function expectFields(obj: any, fields: string[], label = ''): void {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error(`${label || 'body'} 期望对象，实际 ${typeof obj}`)
  }
  for (const f of fields) {
    if (!(f in obj)) {
      throw new Error(`${label || 'body'} 缺少字段 "${f}"，实际: ${JSON.stringify(obj).slice(0, 200)}`)
    }
  }
}

/** 列表类接口约定返回 { items: [], total: N }。 */
export function expectListShape(res: ApiResponse, label = ''): void {
  expectOk(res, label)
  const b = res.body
  if (typeof b !== 'object' || b === null || !Array.isArray(b.items) || typeof b.total !== 'number') {
    throw new Error(
      `${label || 'list'} 期望 {items:[],total:number}，实际: ${JSON.stringify(b).slice(0, 200)}`,
    )
  }
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
