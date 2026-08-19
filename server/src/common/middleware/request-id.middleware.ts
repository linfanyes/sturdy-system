import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

/**
 * 请求追踪中间件：为每个请求注入唯一 requestId，便于日志关联与问题排查。
 *
 * - 优先读取客户端传入的 X-Request-Id（分布式链路追踪场景）
 * - 否则自动生成 UUID v4
 * - 同时写入响应头 X-Request-Id，便于前端调试
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID()
    ;(req as any).requestId = requestId
    res.setHeader('X-Request-Id', requestId)
    next()
  }
}
