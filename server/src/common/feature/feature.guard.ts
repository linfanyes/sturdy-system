import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { FeatureService } from './feature.service'

/**
 * 功能包守卫。须与 JwtAuthGuard 组合使用（@UseGuards(JwtAuthGuard, FeatureGuard)），
 * 由 JwtAuthGuard 先把 JWT payload 挂到 req.user 并完成角色校验。
 *
 * 行为：
 * - 未标注 @Feature（或为空数组）→ 直接放行（不校验功能包）。
 * - 否则计算当前用户 effectiveFeatures，未全部命中所需 key 抛 403，
 *   文案「当前功能未开放：<key1>/<key2>」（沿用全局异常格式 { statusCode, code, message }）。
 * - DEMO_MODE 不禁用本校验（安全红线）。
 * - super / school_admin 在 FeatureService 中 effective=ALL，永不被本 guard 拦截。
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureService: FeatureService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest()
    const required = this.reflector.getAllAndOverride<string[]>('features', [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const user = req.user
    if (!user) throw new UnauthorizedException('未登录或缺少令牌')

    const ctx = await this.featureService.resolveContextFromReq(user)
    const effective = await this.featureService.getEffectiveFeatures(ctx)
    const missing = required.filter((k) => !effective.includes(k))
    if (missing.length > 0) {
      throw new ForbiddenException('当前功能未开放：' + missing.join('/'))
    }
    return true
  }
}
