import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'

/**
 * 自定义 JWT 守卫（不依赖 passport，减少依赖）。
 * 校验 Authorization: Bearer <token>，把 { sub, openid, role } 挂到 req.user。
 *
 * 使用方法级别 @Roles() 标注所需角色（非标注则不校验角色）：
 *   @Roles('teacher')
 *   @UseGuards(JwtAuthGuard)
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const auth = req.headers?.authorization
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录或缺少令牌')
    }
    const token = auth.slice(7)
    try {
      const payload = this.jwt.verify(token)
      req.user = { sub: payload.sub, openid: payload.openid, role: payload.role }

      // 检查 RequiredRole 注解（使用 Reflector 读取类/方法上的 @Roles 元数据）
      const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ])
      if (requiredRoles && requiredRoles.length > 0) {
        if (!requiredRoles.includes(payload.role)) {
          throw new UnauthorizedException('权限不足')
        }
      }

      return true
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e
      throw new UnauthorizedException('登录已过期，请重新登录')
    }
  }
}
