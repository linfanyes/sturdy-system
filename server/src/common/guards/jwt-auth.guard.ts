import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

/**
 * 自定义 JWT 守卫（不依赖 passport，减少依赖）。
 * 校验 Authorization: Bearer <token>，把 { sub: teacherId, openid } 挂到 req.user。
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest()
    const auth = req.headers?.authorization
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录或缺少令牌')
    }
    const token = auth.slice(7)
    try {
      const payload = this.jwt.verify(token)
      req.user = { sub: payload.sub, openid: payload.openid }
      return true
    } catch {
      throw new UnauthorizedException('登录已过期，请重新登录')
    }
  }
}
