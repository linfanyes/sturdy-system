/**
 * 通用安全 API mock：用于「全路由冒烟测试」等需要一键 mock 所有后端接口的测试。
 * - 任意属性访问返回一个可调用的安全代理（支持 request.get/post/... 与任意命名导出）
 * - 任意调用都 resolve 一个安全的空响应对象（含 items/total/data/content 等常见字段）
 * - 用 Proxy 递归，避免为每个接口逐个手写 mock。
 */
const SAFE = { items: [], total: 0, data: [], content: '', token: 't', user: {} }

export function buildSafeApiMock(): any {
  const fn: any = () => Promise.resolve(SAFE)
  return new Proxy(fn, {
    get(_t, p: string | symbol) {
      if (p === '__esModule' || p === 'then') return undefined
      if (p === 'default') return buildSafeApiMock()
      if (['get', 'post', 'put', 'patch', 'delete'].includes(p as string)) {
        return () => Promise.resolve(SAFE)
      }
      return buildSafeApiMock()
    },
    apply() {
      return Promise.resolve(SAFE)
    },
  })
}

/** 生成一个可被 jest.mock('@/api/xxx', () => buildSafeApiModule()) 使用的模块桩 */
export function buildSafeApiModule(): any {
  const proxy = buildSafeApiMock()
  return new Proxy({ __esModule: true, default: proxy }, {
    get(t, p: string | symbol) {
      if (p in t) return (t as any)[p]
      if (p === 'then') return undefined
      return buildSafeApiMock()
    },
  })
}
