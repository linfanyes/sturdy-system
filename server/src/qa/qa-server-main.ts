/**
 * QA 测试服务器入口（仅本地自动化测试使用）
 * 用法: node dist/qa-server-main.js   → 监听 0.0.0.0:3100
 */
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Catch, ArgumentsHost, Logger } from '@nestjs/common'
import { json, urlencoded } from 'express'
import { BaseExceptionFilter } from '@nestjs/core'
import { QaServerModule } from './qa-server.module'

/** QA 专用：把未被业务过滤器处理的异常完整打到控制台，便于定位 */
@Catch()
class QaErrorLogger extends BaseExceptionFilter {
  private readonly logger = new Logger('QaError')
  catch(exception: unknown, host: ArgumentsHost) {
    this.logger.error('QA 请求异常: ' + ((exception as any)?.stack || String(exception)))
    super.catch(exception, host)
  }
}

async function bootstrap() {
  const app = await NestFactory.create(QaServerModule)
  app.use(json({ limit: '5mb' }))
  app.use(urlencoded({ limit: '5mb', extended: true }))
  app.enableCors({ origin: true, credentials: true })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  )
  app.useGlobalFilters(new QaErrorLogger(app.getHttpAdapter()))
  const port = +(process.env.QA_PORT || 3100)
  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`🚀 QA 测试服务器已启动: http://localhost:${port}/api`)
}
bootstrap()
