import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Request } from 'express'

/**
 * 轻量内存限速守卫：基于 IP 和（可选）用户名的滑动窗口计数器。
 * 用于登录/注册等需要防暴力破解的接口。
 *
 * 配置：WINDOW_MS（窗口毫秒数，默认 60 秒）× MAX_REQUESTS（窗口内最大请求数，默认 10）
 */
interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

/**
 * 工厂函数：创建限速守卫实例
 * @param windowMs  窗口时长（毫秒），默认 60_000（1 分钟）
 * @param maxReqs   窗口内最大请求数，默认 10
 * @param keyFn     自定义缓存键（可选，默认 IP）
 */
export function createRateLimitGuard(
  windowMs = 60_000,
  maxReqs = 10,
  keyFn?: (req: Request) => string,
) {
  @Injectable()
  class RateLimitGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
      const req = ctx.switchToHttp().getRequest<Request>()
      const ip = req.ip || req.socket?.remoteAddress || 'unknown'
      const bodyUsername = (req.body as any)?.username || ''
      const key = keyFn
        ? keyFn(req)
        : `${ip}:${bodyUsername ? bodyUsername.slice(0, 20) : ''}`

      const now = Date.now()
      let entry = store.get(key)

      if (!entry || now >= entry.resetAt) {
        entry = { count: 1, resetAt: now + windowMs }
        store.set(key, entry)
        return true
      }

      entry.count++
      if (entry.count > maxReqs) {
        // 提醒客户端还剩多少秒可重试
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `请求过于频繁，请 ${retryAfter} 秒后再试`,
            error: 'Too Many Requests',
            retryAfter,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        )
      }
      return true
    }
  }

  return RateLimitGuard
}
