import { createParamDecorator, ExecutionContext } from '@nestjs/common'
export const CurrentSchoolAdmin = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user
})
