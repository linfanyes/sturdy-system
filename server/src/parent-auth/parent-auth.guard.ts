import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

/**
 * 家长端 JWT 守卫。复用全局 JwtService（与教师同一密钥）。
 * 仅接受 type === 'parent' 的令牌，把 { sub: 家长IM账号, ... } 挂到 req.user。
 */
@Injectable()
export class ParentAuthGuard implements CanActivate {
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
      if (payload.type !== 'parent') throw new UnauthorizedException('家长令牌无效')
      req.user = payload
      return true
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e
      throw new UnauthorizedException('登录已过期，请重新登录')
    }
  }
}
