import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/** 从请求中取出 JWT 解析出的家长身份（含 sub=家长IM账号、phone、parentName 等）。 */
export const CurrentParent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const req = ctx.switchToHttp().getRequest()
    return req.user
  },
)
