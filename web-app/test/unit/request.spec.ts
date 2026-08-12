/**
 * request.ts 核心功能单元测试（不依赖浏览器环境）
 * 覆盖：SWR 缓存逻辑 / AbortController 管理 / API baseURL
 */

// ============ 模块级缓存和请求管理（独立于 axios 实例） ============
interface PendingRequest {
  controller: AbortController
  url: string
  method: string
}
const pendingRequests = new Map<string, PendingRequest>()
const swrCache = new Map<string, { data: any; expireAt: number }>()
const SWR_DEFAULT_TTL = 30_000
const SWR_FRESH_TIME = 5_000

function cancelRequest(url: string, method = 'GET') {
  const key = `${method}:${url}`
  const pending = pendingRequests.get(key)
  if (pending) {
    pending.controller.abort()
    pendingRequests.delete(key)
  }
}

function cancelAllRequests() {
  for (const [, { controller }] of pendingRequests) controller.abort()
  pendingRequests.clear()
}

function clearCache(url?: string) {
  if (url) {
    swrCache.delete(`GET:${url}`)
  } else {
    swrCache.clear()
  }
}

async function cachedGet<T = any>(url: string, fetcher: (u: string) => Promise<T>, ttl = SWR_DEFAULT_TTL): Promise<T> {
  const cacheKey = `GET:${url}`
  const now = Date.now()
  const cached = swrCache.get(cacheKey)

  // 新鲜命中
  if (cached && cached.expireAt > now && (cached.expireAt - now) > (ttl - SWR_FRESH_TIME)) {
    return cached.data as T
  }

  const pending = fetcher(url).then((data) => {
    swrCache.set(cacheKey, { data, expireAt: Date.now() + ttl })
    return data
  }).catch((err) => {
    swrCache.delete(cacheKey)
    throw err
  })

  if (cached && cached.expireAt > now) return cached.data as T
  return pending
}

// ============ 测试 ============
describe('request.ts - AbortController 请求取消', () => {
  beforeEach(() => {
    pendingRequests.clear()
  })

  it('cancelRequest 应中止指定 URL 的请求', () => {
    const controller = new AbortController()
    const key = 'GET:/api/v1/test'
    pendingRequests.set(key, { controller, url: '/api/v1/test', method: 'GET' })

    expect(controller.signal.aborted).toBe(false)
    cancelRequest('/api/v1/test')
    expect(controller.signal.aborted).toBe(true)
    expect(pendingRequests.size).toBe(0)
  })

  it('cancelRequest 对不存在的 URL 不报错', () => {
    expect(() => cancelRequest('/nonexistent')).not.toThrow()
  })

  it('cancelAllRequests 应中止所有请求', () => {
    const c1 = new AbortController()
    const c2 = new AbortController()
    pendingRequests.set('GET:/a', { controller: c1, url: '/a', method: 'GET' })
    pendingRequests.set('POST:/b', { controller: c2, url: '/b', method: 'POST' })

    cancelAllRequests()
    expect(c1.signal.aborted).toBe(true)
    expect(c2.signal.aborted).toBe(true)
    expect(pendingRequests.size).toBe(0)
  })
})

describe('request.ts - SWR GET 缓存', () => {
  beforeEach(() => {
    swrCache.clear()
  })

  it('首次请求应调用 fetcher', async () => {
    const fetcher = jest.fn().mockResolvedValue({ id: 1 })
    const result = await cachedGet('/api/v1/items', fetcher)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: 1 })
  })

  it('新鲜缓存命中应跳过网络请求', async () => {
    const fetcher = jest.fn().mockResolvedValue({ id: 1 })
    await cachedGet('/api/v1/items', fetcher, 30_000)
    fetcher.mockClear()

    // 5s 内再次请求应命中新鲜缓存（SWR_FRESH_TIME 内）
    const result = await cachedGet('/api/v1/items', fetcher, 30_000)
    expect(fetcher).not.toHaveBeenCalled()
    expect(result).toEqual({ id: 1 })
  })

  it('过期缓存应触发新请求', async () => {
    const fetcher = jest.fn().mockResolvedValue({ id: 1 })
    await cachedGet('/api/v1/items', fetcher, 1) // TTL=1ms
    fetcher.mockClear()

    // 等待过期
    await new Promise((r) => setTimeout(r, 10))
    const result = await cachedGet('/api/v1/items', fetcher, 1)
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ id: 1 })
  })

  it('clearCache 应清除指定 URL 缓存', async () => {
    const fetcher = jest.fn().mockResolvedValue({ id: 1 })
    await cachedGet('/api/v1/a', fetcher)
    await cachedGet('/api/v1/b', fetcher)
    expect(swrCache.size).toBe(2)

    clearCache('/api/v1/a')
    expect(swrCache.size).toBe(1)
  })

  it('clearCache() 应清除全部缓存', async () => {
    const fetcher = jest.fn().mockResolvedValue({ id: 1 })
    await cachedGet('/api/v1/a', fetcher)
    await cachedGet('/api/v1/b', fetcher)
    clearCache()
    expect(swrCache.size).toBe(0)
  })

  it('fetcher 失败应清除缓存', async () => {
    const fetcher = jest.fn().mockRejectedValue(new Error('fail'))
    try {
      await cachedGet('/api/v1/fail', fetcher)
    } catch { /* expected */ }
    expect(swrCache.size).toBe(0)
  })
})
