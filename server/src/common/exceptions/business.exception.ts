import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * 统一业务异常：携带错误码（code），便于前端按码做差异化提示 / 国际化。
 *
 * - 继承 HttpException，因此全局异常过滤器、ValidationPipe 等 Nest 机制照常生效；
 * - 响应体形如 { statusCode, code, message }，与现有前端错误解包（读取 message）兼容；
 * - 默认 400；业务可按需传入 401/403/409 等状态码。
 *
 * 用法：
 *   throw new BusinessException('ADMIN_USERNAME_EXISTS', '用户名已存在')
 *   throw new BusinessException('INVALID_TOKEN', '登录已过期', HttpStatus.UNAUTHORIZED)
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
