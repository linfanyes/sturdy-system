import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { json, urlencoded } from 'express'
import * as express from 'express'
import { join } from 'path'
import * as fs from 'node:fs'
import { AppModule } from './app.module'
import { runMigrations } from './migrations/runner'
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter'
import { isBcryptHash } from './common/utils/password.util'
import helmet from 'helmet'

const logger = new Logger('Bootstrap')

// 自动迁移逻辑已抽取到 ./migrations/runner.ts，由本文件与容器初始化入口
//（docker-entrypoint.sh）共用，保证云端流水线重建部署时先对齐表结构再起服务。

/**
 * API 版本化：将 /api/* 重定向到 /api/v1/*，同时保留 /api/v1/* 直连。
 * - /api/foo → /api/v1/foo（307 临时重定向，保留 method + body）
 * - /api/v1/foo → 直接放行
 * - 健康检查 /health 不参与版本化
 */
function setupApiVersioning(app: any) {
  const V1_PREFIX = '/api/v1'
  const LEGACY_PREFIX = '/api'

  app.use((req: any, _res: any, next: any) => {
    const url = req.originalUrl || req.url
    // 健康检查和 Swagger 文档不参与版本化
    if (url === '/health' || url.startsWith('/api-docs')) return next()
    // 已是 v1 前缀，直接放行
    if (url.startsWith(V1_PREFIX)) return next()
    // 旧 /api 前缀 → 307 重定向到 /api/v1
    if (url.startsWith(LEGACY_PREFIX)) {
      const v1Url = url.replace(LEGACY_PREFIX, V1_PREFIX)
      logger.warn(`[API版本化] ${url} → ${v1Url}（建议前端更新到 /api/v1 前缀）`)
      return _res.redirect(307, v1Url)
    }
    next()
  })
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // AI 对话可能携带较大上下文，放宽请求体上限
  app.use(json({ limit: '5mb' }))
  app.use(urlencoded({ limit: '5mb', extended: true }))
  app.use(helmet())
  const config = app.get(ConfigService)

  // API 版本化中间件（必须在全局前缀之前注册，因为 setGlobalPrefix 会改写路径）
  setupApiVersioning(app)

  // CORS：fail-closed
  const corsRaw = (config.get<string>('CORS_ORIGIN') || '').trim()
  let corsOrigin: string | string[] | boolean
  if (!corsRaw) {
    corsOrigin = false
  } else if (corsRaw === '*') {
    logger.warn('⚠️  CORS 使用通配 *，生产环境建议配置可信来源以避免跨站调用。')
    corsOrigin = true
  } else {
    corsOrigin = corsRaw.split(',').map((s) => s.trim()).filter(Boolean)
  }
  app.enableCors({
    origin: corsOrigin,
    credentials: corsOrigin !== true && corsOrigin !== false,
  })
  // CORS 说明：
  // - 未配置 CORS_ORIGIN：不启用 CORS，适合后端服务或同域部署
  // - 配置为 *：允许所有来源，但不允许携带凭证（浏览器会拒绝 credentials:true + 通配 origin）
  // - 配置为具体域名列表：仅允许这些来源，并允许携带凭证
  // 全局前缀改为 /api/v1；旧 /api 路径由版本化中间件重定向
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  )
  app.useGlobalFilters(new TypeOrmExceptionFilter())
  const port = config.get<number>('PORT') || 3000

  // API 文档
  const isProd = config.get('NODE_ENV') === 'production'
  const swaggerEnv = (config.get('SWAGGER_ENABLED') || '').toLowerCase()
  const swaggerEnabled = swaggerEnv === 'true' || (swaggerEnv !== 'false' && !isProd)
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('园丁工作台 API')
      .setDescription('K12 校园管理工作台后端接口文档（NestJS + TypeORM + MySQL）')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, swaggerConfig)
    SwaggerModule.setup('api-docs', app, document)
    logger.log('📚 Swagger 文档已开启: /api-docs（生产环境默认关闭，可用 SWAGGER_ENABLED=true 强制开启）')
  }

  // 托管 web-app 构建产物
  const webAdminPath = join(__dirname, '..', '..', 'web-app', 'dist')
  if (!fs.existsSync(webAdminPath)) {
    logger.warn('⚠️ web-app/dist 不存在，静态托管将跳过（请先执行 web-app 构建）')
  }
  app.use(express.static(webAdminPath))

  // 托管小程序 H5 构建产物
  const h5Path = join(__dirname, '..', 'public', 'h5')
  if (!fs.existsSync(h5Path)) {
    logger.warn('⚠️ server/public/h5 不存在，/h5 静态托管将跳过（请先 build:h5 并同步）')
  }
  app.use('/h5', express.static(h5Path))

  // —— 安全启动自检（fail-closed：生产环境高危弱配置直接拒绝启动，与 LOGIN_CODE 策略一致） ——
  const jwtSecret = config.get<string>('JWT_SECRET')
  if (!jwtSecret || jwtSecret === 'change_me_to_a_long_random_secret') {
    if (isProd) {
      throw new Error(
        '生产环境必须配置强随机的 JWT_SECRET（≥32 位），否则任意攻击者可伪造令牌。请在 .env 设置后重启，服务拒绝启动（fail-closed）。',
      )
    }
    logger.warn('⚠️  安全警告: JWT_SECRET 未配置或使用默认占位值（开发环境）')
  }
  const su = config.get('SUPER_ADMIN_USER') || 'admin'
  const sp = config.get('SUPER_ADMIN_PASSWORD') || 'admin'
  if (su === 'admin' && sp === 'admin') {
    if (isProd) {
      throw new Error(
        '生产环境超级管理员仍为默认账号 admin/admin，请通过 SUPER_ADMIN_USER / SUPER_ADMIN_PASSWORD（bcrypt 哈希）设置强凭据，服务拒绝启动（fail-closed）。',
      )
    }
    logger.warn('⚠️  安全警告: 超级管理员仍为默认账号 admin/admin（开发环境）')
  }
  if (isProd && !isBcryptHash(sp)) {
    // 与 CHANGELOG「生产环境启动检查」承诺一致：超管密码必须以 bcrypt 哈希（$2b$...）配置，
    // 避免 .env 泄露时明文口令直接暴露。
    throw new Error(
      '生产环境 SUPER_ADMIN_PASSWORD 必须使用 bcrypt 哈希格式（$2b$... 开头，可用 bcrypt.hashSync("你的密码", 10) 生成），服务拒绝启动（fail-closed）。',
    )
  }
  if (config.get('NODE_ENV') === 'production' && config.get('DB_SYNCHRONIZE') === 'true') {
    logger.warn('⚠️  安全警告: 生产环境开启了 DB_SYNCHRONIZE=true')
  }
  if (config.get('NODE_ENV') === 'production' && !config.get('ENCRYPTION_KEY')) {
    logger.warn('⚠️  ENCRYPTION_KEY 未配置，建议设置该环境变量')
  }

  // 应用数据库迁移（幂等）。容器场景下这一步已在 docker-entrypoint.sh 中先行执行，
  // 此处再次调用作为兜底（多实例下通过命名锁串行化），确保无论以何种方式启动都能对齐表结构。
  await runMigrations(app.get(ConfigService))

  // 健康检查端点
  app.getHttpAdapter().get('/health', (_req, res) =>
    res.status(200).json({ status: 'ok', time: new Date().toISOString(), version: 'v1' }),
  )

  // 版本信息端点
  app.getHttpAdapter().get('/api-version', (_req, res) =>
    res.json({ current: 'v1', supported: ['v1'], legacyRedirect: true }),
  )

  await app.listen(port, '0.0.0.0')
  logger.log(`🚀 园丁工作台后端已启动: http://localhost:${port}/api/v1`)
  logger.log(`📖 API 版本化已启用：/api/* 自动重定向到 /api/v1/*`)
}
bootstrap().catch((err) => {
  logger.error('❌ 应用启动失败（安全自检 fail-closed 或初始化错误）')
  logger.error(err?.message || err)
  process.exit(1)
})
