/**
 * TypeOrmExceptionFilter 单元测试
 * 覆盖：BusinessException / HttpException / DB 错误 / 未知异常 的响应格式
 */
import { TypeOrmExceptionFilter } from './typeorm-exception.filter'
import { BusinessError } from '../exceptions/business.exception'
import {
  BadRequestException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'

// Mock 简化版 ArgumentsHost
function createMockHost(method = 'GET', url = '/api/v1/test', ip = '127.0.0.1') {
  let lastStatusCode = 0
  let lastResponseBody: any = null

  const mockResponse = {
    status: jest.fn().mockImplementation((code: number) => {
      lastStatusCode = code
      return mockResponse
    }),
    json: jest.fn().mockImplementation((body: any) => {
      lastResponseBody = body
      return mockResponse
    }),
    setHeader: jest.fn(),
    getHeader: jest.fn(),
  }
  const mockRequest = {
    method,
    originalUrl: url,
    url,
    ip,
    socket: { remoteAddress: ip },
    headers: {},
  }

  const getResult = () => ({ statusCode: lastStatusCode, body: lastResponseBody })

  return {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
      getNext: () => jest.fn(),
    }),
    getResult,
  } as any
}

describe('TypeOrmExceptionFilter', () => {
  let filter: TypeOrmExceptionFilter

  beforeEach(() => {
    filter = new TypeOrmExceptionFilter()
  })

  describe('BusinessException', () => {
    it('应返回自定义 code + message + statusCode', () => {
      const ex = BusinessError.invalidToken('登录过期')
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED)
      expect(result.body.code).toBe('INVALID_TOKEN')
      expect(result.body.message).toBe('登录过期')
      expect(result.body.statusCode).toBe(HttpStatus.UNAUTHORIZED)
    })

    it('forbidden 应返回 403', () => {
      const ex = BusinessError.forbidden('无权访问')
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.statusCode).toBe(HttpStatus.FORBIDDEN)
      expect(result.body.code).toBe('PERMISSION_FORBIDDEN')
    })
  })

  describe('HttpException', () => {
    it('BadRequestException 应返回 code: VALIDATION_ERROR', () => {
      const ex = new BadRequestException('参数校验失败')
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST)
      expect(result.body.code).toBe('VALIDATION_ERROR')
      expect(result.body.message).toBe('参数校验失败')
    })

    it('BadRequestException 数组消息应用 "；" 连接', () => {
      const ex = new BadRequestException(['字段A错误', '字段B错误'])
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.body.message).toBe('字段A错误；字段B错误')
      expect(result.body.details).toEqual(['字段A错误', '字段B错误'])
    })

    it('UnauthorizedException 应返回 code: HTTP_401', () => {
      const ex = new UnauthorizedException('未授权')
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.statusCode).toBe(HttpStatus.UNAUTHORIZED)
      expect(result.body.code).toBe('HTTP_401')
    })

    it('NotFoundException 应返回 code: HTTP_404', () => {
      const ex = new NotFoundException()
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.statusCode).toBe(HttpStatus.NOT_FOUND)
      expect(result.body.code).toBe('HTTP_404')
    })
  })

  describe('数据库错误', () => {
    it('ER_DUP_ENTRY 应返回友好消息', () => {
      const ex: any = { code: 'ER_DUP_ENTRY', errno: 1062, message: 'Duplicate entry' }
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.statusCode).toBe(HttpStatus.BAD_REQUEST)
      expect(result.body.code).toBe('DB_ERROR')
      expect(result.body.message).toBe('数据重复，该记录已存在')
    })

    it('ER_LOCK_DEADLOCK 应返回"系统繁忙"消息', () => {
      const ex: any = { code: 'ER_LOCK_DEADLOCK', errno: 1213, message: 'Deadlock' }
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.body.message).toBe('系统繁忙，请稍后重试')
    })

    it('未知 DB 错误应返回通用消息', () => {
      const ex: any = { code: 'ER_UNKNOWN', errno: 9999, message: 'Unknown' }
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.body.code).toBe('DB_ERROR')
      expect(result.body.message).toBe('请求数据校验失败，请检查输入参数')
    })
  })

  describe('未知异常', () => {
    it('开发环境应返回原始错误消息', () => {
      process.env.NODE_ENV = 'development'
      const ex: any = new Error('Something broke')
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(result.body.code).toBe('INTERNAL_ERROR')
      expect(result.body.message).toBe('Something broke')
    })

    it('生产环境应隐藏错误详情', () => {
      process.env.NODE_ENV = 'production'
      const ex: any = new Error('Secret internal error')
      const host = createMockHost()
      filter.catch(ex, host)
      const result = host.getResult()
      expect(result.body.message).toBe('服务器内部错误')
      delete process.env.NODE_ENV
    })
  })
})
