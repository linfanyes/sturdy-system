import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'

/**
 * 统一 JWT 守卫（不依赖 passport，减少依赖）。
 * 校验 Authorization: Bearer <token>，把完整 payload 挂到 req.user，
 * 并统一 role 字段（家长令牌 type='parent' → role='parent'），
 * 使 @CurrentTeacher / @CurrentSchoolAdmin / @CurrentParent 装饰器均可直接读取所需字段。
 *
 * 使用方法级别 @Roles() 标注所需角色（非标注则不校验角色）：
 *   @Roles('teacher') / @Roles('super') / @Roles('school_admin') / @Roles('parent')
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
      // 统一 role：家长令牌用 type='parent'，映射为 role='parent' 供 @Roles 校验
      const role = payload.role || (payload.type === 'parent' ? 'parent' : undefined)
      req.user = { ...payload, role }

      // 检查 RequiredRole 注解（使用 Reflector 读取类/方法上的 @Roles 元数据）
      const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
        context.getHandler(),
        context.getClass(),
      ])
      if (requiredRoles && requiredRoles.length > 0) {
        if (!role || !requiredRoles.includes(role)) {
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
