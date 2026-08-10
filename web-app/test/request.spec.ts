/**
 * API 层行为单测（request.ts）
 * 通过 mock axios 捕获真实注入的 request/response 拦截器并直接调用，
 * 覆盖报告要求的：① 请求拦截注入 JWT ② 响应成功解包 data ③ 401 清除登录态并跳转
 *    ④ 错误解包（message 优先，回退 err.message，再回退默认）
 */
import axios from 'axios'
import type { InternalAxiosRequestConfig } from 'axios'

// 构造可控的 axios 实例桩，捕获拦截器
const instanceStub: any = {
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() },
  },
  defaults: { headers: {} },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn(),
}

jest.mock('axios', () => ({
  __esModule: true,
  default: { create: jest.fn(() => instanceStub) },
  create: jest.fn(() => instanceStub),
}))

// 隔离 Vite 环境读取（避免 import.meta 在 CJS 下解析失败）
jest.mock('@/config/viteEnv', () => ({
  getViteEnvApiBase: () => undefined,
}))

// 导入被测模块（模块加载时即注册拦截器）
import request from '@/api/request'

const mockedAxios = axios as jest.Mocked<typeof axios>

function getRequestInterceptor() {
  const calls = instanceStub.interceptors.request.use.mock.calls
  return calls[0][0] as (config: InternalAxiosRequestConfig) => InternalAxiosRequestConfig
}
function getResponseInterceptors() {
  const calls = instanceStub.interceptors.response.use.mock.calls
  return {
    onFulfilled: calls[0][0] as (res: any) => any,
    onRejected: calls[0][1] as (err: any) => any,
  }
}

describe('HTTP 请求封装 - 行为单测', () => {
  beforeEach(() => {
    localStorage.clear()
    // 重置 hash 到非登录页
    if (location.hash !== '#/dashboard') location.hash = '#/dashboard'
  })

  it('模块加载时注册了 request / response 拦截器', () => {
    expect(instanceStub.interceptors.request.use).toHaveBeenCalledTimes(1)
    expect(instanceStub.interceptors.response.use).toHaveBeenCalledTimes(1)
    expect(mockedAxios.create).toHaveBeenCalled()
  })

  describe('请求拦截：注入 JWT', () => {
    it('存在 token 时，注入 Authorization: Bearer <token>', () => {
      localStorage.setItem('trace_web_token', 'abc123')
      const onReq = getRequestInterceptor()
      const config = { headers: {} } as unknown as InternalAxiosRequestConfig
      const out = onReq(config)
      expect((out.headers as any).Authorization).toBe('Bearer abc123')
    })

    it('无 token 时，不设置 Authorization 头', () => {
      const onReq = getRequestInterceptor()
      const config = { headers: {} } as unknown as InternalAxiosRequestConfig
      const out = onReq(config)
      expect((out.headers as any).Authorization).toBeUndefined()
    })

    it('token 为空字符串时，不注入 Authorization', () => {
      localStorage.setItem('trace_web_token', '')
      const onReq = getRequestInterceptor()
      const config = { headers: {} } as unknown as InternalAxiosRequestConfig
      const out = onReq(config)
      expect((out.headers as any).Authorization).toBeUndefined()
    })
  })

  describe('响应拦截：成功解包', () => {
    it('返回 res.data（已解包）', () => {
      const { onFulfilled } = getResponseInterceptors()
      const payload = { code: 0, data: { id: 1 } }
      expect(onFulfilled({ data: payload })).toEqual(payload)
    })
  })

  describe('响应拦截：401 处理', () => {
    it('401 时清除 trace_web_token / trace_web_user 并跳转登录页', async () => {
      localStorage.setItem('trace_web_token', 'expired')
      localStorage.setItem('trace_web_user', '{"role":"teacher"}')
      const { onRejected } = getResponseInterceptors()
      const err: any = {
        response: { status: 401, data: { message: '登录已过期' } },
        config: { url: '/grades' },
      }
      expect(localStorage.getItem('trace_web_token')).toBe('expired')
      const promise = onRejected(err)
      // handleUnauthorized 为异步（动态 import store），须先等 reject 落定再断言副作用
      await expect(promise).rejects.toThrow('登录已过期')
      // 跳转
      expect(location.hash).toBe('#/login')
      // 清除登录态
      expect(localStorage.getItem('trace_web_token')).toBeNull()
      expect(localStorage.getItem('trace_web_user')).toBeNull()
    })

    it('401 且已在登录页时，不重复设置 hash 触发守卫循环', async () => {
      location.hash = '#/login'
      const { onRejected } = getResponseInterceptors()
      const err: any = { response: { status: 401, data: { message: 'no' } } }
      await expect(onRejected(err)).rejects.toThrow('no')
      expect(location.hash).toBe('#/login')
    })
  })

  describe('响应拦截：错误解包', () => {
    it('优先使用 response.data.message', async () => {
      const { onRejected } = getResponseInterceptors()
      const err: any = { response: { status: 500, data: { message: '服务端炸了' } } }
      await expect(onRejected(err)).rejects.toThrow('服务端炸了')
    })

    it('无 message 时回退 err.message', async () => {
      const { onRejected } = getResponseInterceptors()
      const err: any = { response: { status: 502 }, message: 'Bad Gateway' }
      await expect(onRejected(err)).rejects.toThrow('Bad Gateway')
    })

    it('无 response 与 message 时回退默认文案', async () => {
      const { onRejected } = getResponseInterceptors()
      const err: any = {}
      await expect(onRejected(err)).rejects.toThrow('请求失败')
    })

    it('抛出的一定是 Error 实例且带解包 message', async () => {
      const { onRejected } = getResponseInterceptors()
      const err: any = { response: { status: 403, data: { message: '无权限' } } }
      try {
        await onRejected(err)
        fail('should reject')
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect((e as Error).message).toBe('无权限')
      }
    })
  })

  describe('导出实例具备标准方法', () => {
    it('request 暴露 get/post/put/patch/delete', () => {
      expect(typeof (request as any).get).toBe('function')
      expect(typeof (request as any).post).toBe('function')
      expect(typeof (request as any).put).toBe('function')
      expect(typeof (request as any).patch).toBe('function')
      expect(typeof (request as any).delete).toBe('function')
    })
  })
})
