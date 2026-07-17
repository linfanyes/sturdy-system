import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * 从请求中取出 JWT 解析出的教师身份。
 * JWT payload 形如 { sub: teacherId, openid: string }。
 */
export const CurrentTeacher = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest()
    return req.user
  },
)
