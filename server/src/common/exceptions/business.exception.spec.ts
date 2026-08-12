/**
 * BusinessException / BusinessErrorCode / BusinessError 单元测试
 * 覆盖：错误码枚举完整性、异常构造器行为、HTTP 状态码透传
 */
import { HttpException, HttpStatus } from '@nestjs/common'
import {
  BusinessException,
  BusinessErrorCode,
  BusinessError,
} from './business.exception'

describe('BusinessException', () => {
  describe('构造器', () => {
    it('应默认返回 400 状态码', () => {
      const ex = new BusinessException('TEST_CODE', '测试消息')
      expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST)
      expect(ex.code).toBe('TEST_CODE')
      expect(ex.message).toBe('测试消息')
      expect(ex.name).toBe('BusinessException')
    })

    it('应支持自定义 HTTP 状态码', () => {
      const ex = new BusinessException('E_NOT_FOUND', '资源不存在', HttpStatus.NOT_FOUND)
      expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND)
    })

    it('getCode() 应返回错误码', () => {
      const ex = new BusinessException('MY_CODE', 'msg')
      expect(ex.getCode()).toBe('MY_CODE')
    })

    it('应继承 HttpException', () => {
      const ex = new BusinessException('X', 'y')
      expect(ex).toBeInstanceOf(Error)
      expect(ex).toBeInstanceOf(HttpException)
    })
  })
})

describe('BusinessErrorCode', () => {
  it('应包含 AUTH 类别', () => {
    expect(BusinessErrorCode.AUTH.INVALID_TOKEN).toBe('INVALID_TOKEN')
    expect(BusinessErrorCode.AUTH.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED')
    expect(BusinessErrorCode.AUTH.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS')
    expect(BusinessErrorCode.AUTH.ACCOUNT_LOCKED).toBe('ACCOUNT_LOCKED')
    expect(BusinessErrorCode.AUTH.ROLE_FORBIDDEN).toBe('ROLE_FORBIDDEN')
  })

  it('应包含 RESOURCE 类别', () => {
    expect(BusinessErrorCode.RESOURCE.NOT_FOUND).toBe('RESOURCE_NOT_FOUND')
    expect(BusinessErrorCode.RESOURCE.ALREADY_EXISTS).toBe('RESOURCE_ALREADY_EXISTS')
    expect(BusinessErrorCode.RESOURCE.CONFLICT).toBe('RESOURCE_CONFLICT')
  })

  it('应包含 VALIDATION 类别', () => {
    expect(BusinessErrorCode.VALIDATION.INVALID_INPUT).toBe('INVALID_INPUT')
    expect(BusinessErrorCode.VALIDATION.MISSING_FIELD).toBe('MISSING_FIELD')
    expect(BusinessErrorCode.VALIDATION.INVALID_FORMAT).toBe('INVALID_FORMAT')
  })

  it('应包含 GRADES 类别', () => {
    expect(BusinessErrorCode.GRADES.IMPORT_DUPLICATE).toBe('GRADE_IMPORT_DUPLICATE')
    expect(BusinessErrorCode.GRADES.EXAM_NOT_FOUND).toBe('EXAM_NOT_FOUND')
    expect(BusinessErrorCode.GRADES.STUDENT_NOT_FOUND).toBe('STUDENT_NOT_FOUND')
    expect(BusinessErrorCode.GRADES.CLASS_NOT_FOUND).toBe('CLASS_NOT_FOUND')
    expect(BusinessErrorCode.GRADES.SUBJECT_ANALYSIS_UNAVAILABLE).toBe('SUBJECT_ANALYSIS_UNAVAILABLE')
  })

  it('应包含 PERMISSION 类别', () => {
    expect(BusinessErrorCode.PERMISSION.FORBIDDEN).toBe('PERMISSION_FORBIDDEN')
    expect(BusinessErrorCode.PERMISSION.PARENT_FORBIDDEN).toBe('PARENT_FORBIDDEN')
    expect(BusinessErrorCode.PERMISSION.TEACHER_FORBIDDEN).toBe('TEACHER_FORBIDDEN')
  })

  it('应包含 SYSTEM 类别', () => {
    expect(BusinessErrorCode.SYSTEM.AI_SERVICE_UNAVAILABLE).toBe('AI_SERVICE_UNAVAILABLE')
    expect(BusinessErrorCode.SYSTEM.FILE_UPLOAD_FAILED).toBe('FILE_UPLOAD_FAILED')
    expect(BusinessErrorCode.SYSTEM.RATE_LIMITED).toBe('RATE_LIMITED')
  })
})

describe('BusinessError', () => {
  describe('便利构造器', () => {
    it('invalidToken() 应返回 401', () => {
      const ex = BusinessError.invalidToken()
      expect(ex).toBeInstanceOf(BusinessException)
      expect(ex.getStatus()).toBe(HttpStatus.UNAUTHORIZED)
      expect(ex.code).toBe(BusinessErrorCode.AUTH.INVALID_TOKEN)
      expect(ex.message).toContain('过期')
    })

    it('invalidToken() 应支持自定义消息', () => {
      const ex = BusinessError.invalidToken('自定义过期消息')
      expect(ex.message).toBe('自定义过期消息')
    })

    it('forbidden() 应返回 403', () => {
      const ex = BusinessError.forbidden()
      expect(ex.getStatus()).toBe(HttpStatus.FORBIDDEN)
      expect(ex.code).toBe(BusinessErrorCode.PERMISSION.FORBIDDEN)
    })

    it('notFound() 应返回 404', () => {
      const ex = BusinessError.notFound()
      expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND)
      expect(ex.code).toBe(BusinessErrorCode.RESOURCE.NOT_FOUND)
    })

    it('conflict() 应返回 409', () => {
      const ex = BusinessError.conflict()
      expect(ex.getStatus()).toBe(HttpStatus.CONFLICT)
      expect(ex.code).toBe(BusinessErrorCode.RESOURCE.CONFLICT)
    })

    it('badRequest() 应返回 400 + 自定义码', () => {
      const ex = BusinessError.badRequest('MY_CODE', '我的消息')
      expect(ex.getStatus()).toBe(HttpStatus.BAD_REQUEST)
      expect(ex.code).toBe('MY_CODE')
      expect(ex.message).toBe('我的消息')
    })
  })
})
