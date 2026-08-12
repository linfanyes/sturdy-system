import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * 统一业务异常：携带错误码（code），便于前端按码做差异化提示 / 国际化。
 *
 * - 继承 HttpException，因此全局异常过滤器、ValidationPipe 等 Nest 机制照常生效；
 * - 响应体形如 { statusCode, code, message }，与现有前端错误解包（读取 message）兼容；
 * - 默认 400；业务可按需传入 401/403/404/409/422 等状态码。
 *
 * 用法：
 *   throw new BusinessException('ADMIN_USERNAME_EXISTS', '用户名已存在')
 *   throw new BusinessException('INVALID_TOKEN', '登录已过期', HttpStatus.UNAUTHORIZED)
 *   throw new BusinessException('GRADE_NOT_FOUND', '成绩记录不存在', HttpStatus.NOT_FOUND)
 */
export class BusinessException extends HttpException {
  public readonly code: string

  constructor(code: string, message: string, status: number = HttpStatus.BAD_REQUEST) {
    super({ code, message, statusCode: status }, status)
    this.code = code
    this.name = 'BusinessException'
  }

  getCode(): string {
    return this.code
  }
}

/**
 * 常用业务错误码枚举（统一管理，便于前端/小程序对照）。
 * 新增错误码请在此处补充。
 */
export const BusinessErrorCode = {
  AUTH: {
    INVALID_TOKEN: 'INVALID_TOKEN',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ROLE_FORBIDDEN: 'ROLE_FORBIDDEN',
  },
  RESOURCE: {
    NOT_FOUND: 'RESOURCE_NOT_FOUND',
    ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    CONFLICT: 'RESOURCE_CONFLICT',
  },
  VALIDATION: {
    INVALID_INPUT: 'INVALID_INPUT',
    MISSING_FIELD: 'MISSING_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',
  },
  GRADES: {
    IMPORT_DUPLICATE: 'GRADE_IMPORT_DUPLICATE',
    EXAM_NOT_FOUND: 'EXAM_NOT_FOUND',
    STUDENT_NOT_FOUND: 'STUDENT_NOT_FOUND',
    CLASS_NOT_FOUND: 'CLASS_NOT_FOUND',
    SUBJECT_ANALYSIS_UNAVAILABLE: 'SUBJECT_ANALYSIS_UNAVAILABLE',
  },
  PERMISSION: {
    FORBIDDEN: 'PERMISSION_FORBIDDEN',
    PARENT_FORBIDDEN: 'PARENT_FORBIDDEN',
    TEACHER_FORBIDDEN: 'TEACHER_FORBIDDEN',
  },
  SYSTEM: {
    AI_SERVICE_UNAVAILABLE: 'AI_SERVICE_UNAVAILABLE',
    FILE_UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
    RATE_LIMITED: 'RATE_LIMITED',
  },
} as const

/** 便利构造器：快速创建常见业务异常 */
export const BusinessError = {
  invalidToken: (msg = '登录已过期，请重新登录') =>
    new BusinessException(BusinessErrorCode.AUTH.INVALID_TOKEN, msg, HttpStatus.UNAUTHORIZED),
  forbidden: (msg = '无权访问该资源') =>
    new BusinessException(BusinessErrorCode.PERMISSION.FORBIDDEN, msg, HttpStatus.FORBIDDEN),
  notFound: (msg = '资源不存在') =>
    new BusinessException(BusinessErrorCode.RESOURCE.NOT_FOUND, msg, HttpStatus.NOT_FOUND),
  conflict: (msg = '资源冲突，操作无法完成') =>
    new BusinessException(BusinessErrorCode.RESOURCE.CONFLICT, msg, HttpStatus.CONFLICT),
  badRequest: (code: string, msg: string) =>
    new BusinessException(code, msg, HttpStatus.BAD_REQUEST),
}
