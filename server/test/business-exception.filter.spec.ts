import { BadRequestException, HttpStatus } from '@nestjs/common'
import { BusinessException } from 'src/common/exceptions/business.exception'
import { TypeOrmExceptionFilter } from 'src/common/filters/typeorm-exception.filter'

/**
 * 统一异常过滤器回归测试（对应测试报告「优化建议-2：统一出错格式」）。
 * 验证各类异常最终都收敛为 { statusCode, code, message } 统一结构。
 */
function runFilter(exception: any) {
  const captured: { status?: number; payload?: any } = {}
  const response: any = {
    status(code: number) {
      captured.status = code
      return response
    },
    json(payload: any) {
      captured.payload = payload
      return response
    },
  }
  const host: any = {
    switchToHttp() {
      return { getResponse: () => response }
    },
  }
  new TypeOrmExceptionFilter().catch(exception, host)
  return captured
}

describe('统一异常过滤器 - 收敛为 { statusCode, code, message }', () => {
  it('BusinessException：透传 code 与 message', () => {
    const { status, payload } = runFilter(new BusinessException('ADMIN_USERNAME_EXISTS', '用户名已存在'))
    expect(status).toBe(HttpStatus.BAD_REQUEST)
    expect(payload.code).toBe('ADMIN_USERNAME_EXISTS')
    expect(payload.message).toBe('用户名已存在')
    expect(payload.statusCode).toBe(400)
  })

  it('ValidationPipe 的 BadRequestException：code=VALIDATION_ERROR，message 合并数组', () => {
    const { status, payload } = runFilter(
      new BadRequestException(['用户名不能为空', '密码至少6位']),
    )
    expect(status).toBe(400)
    expect(payload.code).toBe('VALIDATION_ERROR')
    expect(payload.message).toBe('用户名不能为空；密码至少6位')
  })

  it('数据库唯一冲突：code=DB_ERROR，中文可读', () => {
    const { status, payload } = runFilter({ code: 'ER_DUP_ENTRY', sqlMessage: 'Duplicate entry' })
    expect(status).toBe(400)
    expect(payload.code).toBe('DB_ERROR')
    expect(payload.message).toContain('已存在')
  })

  it('未预期异常（非生产）：code=INTERNAL_ERROR，保留 message', () => {
    const { status, payload } = runFilter(new Error('boom'))
    expect(status).toBe(500)
    expect(payload.code).toBe('INTERNAL_ERROR')
    expect(payload.message).toBe('boom')
  })
})
