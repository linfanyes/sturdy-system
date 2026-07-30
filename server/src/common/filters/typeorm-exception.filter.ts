import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common'
import { Response } from 'express'
import { BusinessException } from '../exceptions/business.exception'

/**
 * 统一异常过滤器（全局注册）：
 *  - BusinessException → 透传其错误码 code，返回 { statusCode, code, message }
 *  - 校验 / HTTP 异常（含 ValidationPipe 抛出的 BadRequestException）→
 *    返回 { statusCode, code: 'VALIDATION_ERROR'|'HTTP_xxx', message }
 *  - 数据库层错误 → 400 + code: 'DB_ERROR'（不暴露 SQL 细节）
 *  - 其他未预期异常 → 500 + code: 'INTERNAL_ERROR'
 *
 * 响应体统一含 code / message，前端可据此做差异化提示，且 message 字段与
 * 现有错误解包逻辑兼容。
 */
@Catch()
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // 1) 业务异常（带错误码，优先匹配，因其也是 HttpException 的子类）
    if (exception instanceof BusinessException) {
      const status = exception.getStatus()
      return response.status(status).json({
        statusCode: status,
        code: exception.code,
        message: exception.message,
      })
    }

    // 2) 校验 / HTTP 异常（含 ValidationPipe 的 BadRequestException）
    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()
      const rawMsg = typeof res === 'string' ? res : (res as any)?.message || exception.message
      const message = Array.isArray(rawMsg) ? rawMsg.join('；') : rawMsg
      const code = status === HttpStatus.BAD_REQUEST ? 'VALIDATION_ERROR' : `HTTP_${status}`
      return response.status(status).json({ statusCode: status, code, message })
    }

    // 3) 数据库层错误（TypeORM QueryFailedError 等）→ 400，不暴露 SQL
    if (exception?.code || exception?.errno) {
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
        default:
          message = '请求数据校验失败，请检查输入参数'
      }
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'DB_ERROR',
        message,
      })
    }

    // 4) 其他未预期异常
    const status = exception?.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR
    response.status(status).json({
      statusCode: status,
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? '服务器内部错误'
          : exception?.message || '服务器内部错误',
    })
  }
}
