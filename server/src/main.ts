import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { json, urlencoded } from 'express'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // AI 对话可能携带较大上下文，放宽请求体上限
  app.use(json({ limit: '5mb' }))
  app.use(urlencoded({ limit: '5mb', extended: true }))
  const config = app.get(ConfigService)
  const cors = config.get<string>('CORS_ORIGIN') || '*'
  const corsStar = cors === '*'
  app.enableCors({
    origin: corsStar ? true : cors.split(','),
    credentials: !corsStar,
  })
  app.setGlobalPrefix('api')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )
  const port = config.get<number>('PORT') || 3000
  // 云托管/容器环境必须监听 0.0.0.0，否则实例外部无法访问
  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`🚀 园丁工作台后端已启动: http://localhost:${port}/api`)
}
bootstrap()
