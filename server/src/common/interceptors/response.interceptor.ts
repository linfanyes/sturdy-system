import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'
import { Request, Response } from 'express'

/**
 * 统一响应拦截器：将所有成功响应包装为标准信封格式。
 *
 * 响应形如：
 * {
 *   code: 0,          // 业务状态码，0 = 成功
 *   data: <原响应体>,   // 业务数据
 *   message: 'success',
 *   timestamp: 1718000000000,
 *   requestId: 'xxx',  // 请求追踪 ID（如有）
 * }
 *
 * 排除路径：
 * - /health、/api-version 等基础设施端点保持原样
 * - 文件下载 / 流式响应（Content-Type 为 application/octet-stream 或 text/event-stream）不包装
 *
 * 前端适配：request.ts 响应拦截器已更新为自动解包 .data 字段。
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly EXCLUDED_PATHS = ['/health', '/api-version', '/api-docs']
  private readonly EXCLUDED_CONTENT_TYPES = [
    'application/octet-stream',
    'text/event-stream',
    'application/pdf',
    'application/vnd.openxmlformats',
  ]

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()
    const url = request.originalUrl || request.url

    // 排除基础设施端点
    if (this.EXCLUDED_PATHS.some((p) => url.startsWith(p))) {
      return next.handle()
    }

    return next.handle().pipe(
      map((data) => {
        // 排除流式/文件响应（已通过 body 直接写入，data 为 undefined 或特殊标记）
        const contentType = response.getHeader('content-type') as string || ''
        if (this.EXCLUDED_CONTENT_TYPES.some((ct) => contentType.includes(ct))) {
          return data
        }

        // 已是标准信封格式（避免二次包装）
        if (data && typeof data === 'object' && 'code' in data && 'data' in data) {
          return data
        }

        return {
          code: 0,
          data,
          message: 'success',
          timestamp: Date.now(),
          requestId: (request as any).requestId,
        }
      }),
    )
  }
}
