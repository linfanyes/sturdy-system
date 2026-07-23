import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { json, urlencoded } from 'express'
import * as express from 'express'
import { join } from 'path'
import { AppModule } from './app.module'
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter'

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
  app.useGlobalFilters(new TypeOrmExceptionFilter())
  const port = config.get<number>('PORT') || 3000

  // 托管 web-admin 静态页面（浏览器管理端）
  const webAdminPath = join(__dirname, '..', '..', 'web-admin')
  app.use(express.static(webAdminPath))

  // —— 安全启动自检 ——
  const jwtSecret = config.get<string>('JWT_SECRET')
  if (!jwtSecret || jwtSecret === 'change_me_to_a_long_random_secret') {
    // eslint-disable-next-line no-console
    console.warn('⚠️  安全警告: JWT_SECRET 未配置或使用默认占位值，存在令牌被伪造的风险，请立即在 .env 设置强随机值。')
    if (config.get('NODE_ENV') === 'production') {
      throw new Error('JWT_SECRET 未配置为强随机值，拒绝在生产环境启动。')
    }
  }
  const su = config.get('SUPER_ADMIN_USER') || 'admin'
  const sp = config.get('SUPER_ADMIN_PASSWORD') || 'admin'
  if (su === 'admin' && sp === 'admin') {
    // eslint-disable-next-line no-console
    console.warn('⚠️  安全警告: 超级管理员仍为默认账号 admin/admin，请通过 SUPER_ADMIN_USER / SUPER_ADMIN_PASSWORD 修改为强口令。')
  }

  // 云托管/容器环境必须监听 0.0.0.0，否则实例外部无法访问
  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`🚀 园丁工作台后端已启动: http://localhost:${port}/api`)
}
bootstrap()
