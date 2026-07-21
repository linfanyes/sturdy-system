import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

@Injectable()
export class SchoolAdminGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    const auth = req.headers?.authorization
    if (!auth || !auth.startsWith('Bearer ')) throw new UnauthorizedException('未登录')
    try {
      const p = this.jwt.verify(auth.slice(7))
      if (p.role !== 'school_admin') throw new UnauthorizedException('学校管理员权限不足')
      req.user = p
      return true
    } catch (e) { if (e instanceof UnauthorizedException) throw e; throw new UnauthorizedException('登录过期') }
  }
}
