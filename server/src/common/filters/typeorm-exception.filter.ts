import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { BusinessException } from '../exceptions/business.exception'
import { QueryFailedError, EntityNotFoundError } from 'typeorm'

/**
 * 统一异常过滤器（全局注册）：
 *  - BusinessException → 透传其错误码 code，返回 { statusCode, code, message }
 *  - 校验 / HTTP 异常 → 返回 { statusCode, code, message, details? }
 *  - 数据库层错误 → 400 + code: 'DB_ERROR'（不暴露 SQL 细节）
 *  - 其他未预期异常 → 500 + code: 'INTERNAL_ERROR'
 *
 * 增强：
 *  - 自动记录请求上下文（method, url, ip）到日志
 *  - 业务异常 WARN 级别，系统异常 ERROR 级别
 *  - 生产环境隐藏错误详情，仅返回通用提示
 */
@Catch()
export class TypeOrmExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter')

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const method = request.method
    const url = request.originalUrl || request.url
    const ip = request.ip || request.socket?.remoteAddress || 'unknown'
    const reqContext = `[${method} ${url}] IP=${ip}`
    const isProd = process.env.NODE_ENV === 'production'

    // 1) 业务异常
    if (exception instanceof BusinessException) {
      const status = exception.getStatus()
      this.logger.warn(`${reqContext} BusinessException: code=${exception.code} msg=${exception.message}`)
      return response.status(status).json({
        statusCode: status,
        code: exception.code,
        message: exception.message,
      })
    }

    // 2) 校验 / HTTP 异常
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()
      const rawMsg = typeof res === 'string' ? res : (res as any)?.message || exception.message
      const isArr = Array.isArray(rawMsg)
      const message = isArr ? rawMsg.join('；') : rawMsg
      const code = status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : `HTTP_${status}`
      const body: any = { statusCode: status, code, message }
      if (isArr && (rawMsg as string[]).length > 0) {
        body.details = rawMsg
      }
      const logLevel = status >= 500 ? 'error' : 'warn'
      this.logger[logLevel](`${reqContext} HttpException(${status}): ${message}`)
      return response.status(status).json(body)
    }

    // 3) 数据库层错误（P1-5 修复：精确检测 TypeORM 错误，避免误判非数据库异常）
    const isDbError = exception instanceof QueryFailedError ||
      exception instanceof EntityNotFoundError ||
      exception?.name === 'QueryFailedError' ||
      exception?.name === 'EntityNotFoundError'
    if (isDbError && (exception?.code || exception?.errno)) {
      let message: string
      switch (exception.code) {
        case 'ER_DATA_TOO_LONG':
          message = '字段值超出允许的长度限制'
          break
        case 'ER_BAD_NULL_ERROR':
          message = '必填字段缺失或为空，请检查表单后重试'
          break
        case 'ER_DUP_ENTRY':
          message = '数据重复，该记录已存在'
          break
        case 'ER_NO_REFERENCED_ROW_2':
          message = '关联数据不存在，请检查引用的ID是否正确'
          break
        case 'ER_LOCK_DEADLOCK':
          message = '系统繁忙，请稍后重试'
          break
        default:
          message = '请求数据校验失败，请检查输入参数'
      }
      this.logger.warn(`${reqContext} DBError(${exception.code || exception.errno}): ${message}`)
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'DB_ERROR',
        message,
      })
    }

    // 4) 其他未预期异常
    this.logger.error(
      `${reqContext} UnexpectedError: ${exception?.message || exception}\n${exception?.stack || ''}`,
    )
    const status = exception?.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR
    response.status(status).json({
      statusCode: status,
      code: 'INTERNAL_ERROR',
      message: isProd ? '服务器内部错误' : (exception?.message || '服务器内部错误'),
    })
  }
}
