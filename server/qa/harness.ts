/**
 * QA 测试 Harness：在进程内启动内存库（better-sqlite3）NestJS 应用，
 * 导入与 AppModule 一致的业务模块，监听 HTTP 端口供功能/性能测试调用。
 */
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { json, urlencoded } from 'express'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DataSource } from 'typeorm'
import { QaServerModule } from '../src/qa/qa-server.module'

export interface QaApp {
  app: NestExpressApplication
  baseUrl: string
  port: number
  dataSource: DataSource
  close: () => Promise<void>
}

export async function startQaApp(port = 3199): Promise<QaApp> {
  // QA 环境标记：关闭生产自检、使用内存库
  process.env.NODE_ENV = 'qa'
  process.env.JWT_SECRET = 'qa-test-secret-key-for-local-automation'
  // QA 放宽登录限流（防暴力破解守卫），避免压测被 429 拦截；生产默认 10/30 不变
  process.env.LOGIN_RATE_LIMIT_MAX = process.env.LOGIN_RATE_LIMIT_MAX || '100000'
  process.env.WECHAT_RATE_LIMIT_MAX = process.env.WECHAT_RATE_LIMIT_MAX || '100000'
  const app = await NestFactory.create<NestExpressApplication>(QaServerModule, {
    logger: ['error', 'warn'],
  })
  app.use(json({ limit: '5mb' }))
  app.use(urlencoded({ limit: '5mb', extended: true }))
  app.enableCors({ origin: true, credentials: true })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }))
  await app.listen(port, '127.0.0.1')
  const dataSource = app.get(DataSource)
  // eslint-disable-next-line no-console
  console.log(`[qa] 内存库服务已启动: http://127.0.0.1:${port}/api`)
  return {
    app,
    baseUrl: `http://127.0.0.1:${port}/api`,
    port,
    dataSource,
    close: () => app.close(),
  }
}

/** 简易 HTTP 客户端（fetch 封装，自动 JSON + 记录状态码） */
export interface HttpResp {
  status: number
  body: any
  headers: Headers
}
export async function http(method: string, url: string, opts: { token?: string; body?: any; timeoutMs?: number } = {}): Promise<HttpResp> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 15000)
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    })
    const text = await res.text()
    let body: any = null
    try { body = text ? JSON.parse(text) : null } catch { body = text }
    return { status: res.status, body, headers: res.headers }
  } finally {
    clearTimeout(timer)
  }
}
