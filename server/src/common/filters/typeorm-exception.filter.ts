import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'

/**
 * TypeORM 异常过滤器：将数据库层错误转换为 400 而不是 500。
 * 覆盖常见场景：数据太长、非空约束违反、唯一约束冲突等。
 * 避免直接暴露 SQL 细节给客户端，但仍给出可读的错误描述。
 */
@Catch()
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    // 非 HTTP 异常（如 TypeORM QueryFailedError）→ 400
    if (exception?.code || exception?.errno) {
      let message: string
      switch (exception.code) {
        case 'ER_DATA_TOO_LONG':
          message = `字段值过长: ${exception.sqlMessage?.match(/for column '(.+?)'/)?.[1] || ''}`
          break
        case 'ER_BAD_NULL_ERROR':
          message = `字段不能为空: ${exception.sqlMessage?.match(/for column '(.+?)'/)?.[1] || ''}`
          break
        case 'ER_DUP_ENTRY':
          message = '数据重复，该记录已存在'
          break
        case 'ER_NO_REFERENCED_ROW_2':
          message = '关联数据不存在，请检查引用的ID是否正确'
          break
        default:
          message = `请求数据校验失败: ${exception.message?.slice(0, 120) || '输入参数不正确'}`
      }
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        message,
        error: 'Bad Request',
      })
    }

    // 其他未预期的异常仍返回 500（保留完整堆栈仅在开发环境）
    const status =
      exception?.getStatus?.() || HttpStatus.INTERNAL_SERVER_ERROR
    response.status(status).json({
      statusCode: status,
      message:
        process.env.NODE_ENV === 'production'
          ? '服务器内部错误'
          : exception?.message || '服务器内部错误',
      error: exception?.name || 'Internal Server Error',
    })
  }
}
