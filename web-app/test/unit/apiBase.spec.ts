import { resolveApiBase, getRuntimeApiBase } from '@/config/apiBase'
import { cloudApiBase, localApiBase, fallbackApiBase } from '../data/mockAccounts'

/**
 * 后端地址解析是当前「云托管域名配置」的核心逻辑，必须保证优先级正确：
 *   运行时 config.js > 构建期 .env.production > 兜底 /api
 */
describe('resolveApiBase 后端地址解析优先级', () => {
  it('运行时配置优先于构建期与兜底', () => {
    expect(resolveApiBase(cloudApiBase, localApiBase, fallbackApiBase)).toBe(cloudApiBase)
  })

  it('无运行时时回退到构建期环境变量', () => {
    expect(resolveApiBase('', localApiBase, fallbackApiBase)).toBe(localApiBase)
    expect(resolveApiBase(undefined, localApiBase, fallbackApiBase)).toBe(localApiBase)
  })

  it('运行时/构建期均为空时回退到兜底 /api', () => {
    expect(resolveApiBase('', '', fallbackApiBase)).toBe(fallbackApiBase)
    expect(resolveApiBase(undefined, undefined, fallbackApiBase)).toBe(fallbackApiBase)
  })

  it('空白字符串视为未配置（不误判为有效地址）', () => {
    expect(resolveApiBase('   ', localApiBase, fallbackApiBase)).toBe(localApiBase)
    expect(resolveApiBase('   ', '   ', fallbackApiBase)).toBe(fallbackApiBase)
  })
})

describe('getRuntimeApiBase 运行时配置读取', () => {
  it('读取 window.__APP_CONFIG__.API_BASE_URL', () => {
    ;(window as unknown as { __APP_CONFIG__?: { API_BASE_URL?: string } }).__APP_CONFIG__ = {
      API_BASE_URL: cloudApiBase,
    }
    expect(getRuntimeApiBase()).toBe(cloudApiBase)
  })

  it('未配置时返回 undefined', () => {
    expect(getRuntimeApiBase()).toBeUndefined()
  })

  it('空字符串视为未配置', () => {
    ;(window as unknown as { __APP_CONFIG__?: { API_BASE_URL?: string } }).__APP_CONFIG__ = {
      API_BASE_URL: '   ',
    }
    expect(getRuntimeApiBase()).toBeUndefined()
  })
})
