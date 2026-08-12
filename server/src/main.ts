import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { json, urlencoded } from 'express'
import * as express from 'express'
import { join } from 'path'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as mysql from 'mysql2/promise'
import { AppModule } from './app.module'
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter'
import { isBcryptHash } from './common/utils/password.util'

const logger = new Logger('Bootstrap')

/**
 * 启动时自动执行 migrations 目录下未应用的 .sql 文件。
 * - 用 _migrations_applied 表跟踪已执行文件名，幂等可重复运行。
 * - 失败不阻塞启动（synchronize=true 仍会同步 entity 表结构），
 *   仅打印错误供运维排查。
 * - 使用独立的迁移连接（仅该连接开启 multipleStatements），
 *   业务连接不再开启多语句，缩小 SQL 注入单点风险面。
 * - 使用 MySQL 命名锁（GET_LOCK）防止多实例并发执行迁移，
 *   避免云托管多副本场景下的竞态条件。
 */
async function runMigrations(app: any) {
  const config = app.get(ConfigService)
  let conn: mysql.Connection | null = null
  let lockAcquired = false
  const LOCK_NAME = 'gardener_run_migrations'
  const LOCK_TIMEOUT = 60
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations')
    if (!fs.existsSync(migrationsDir)) {
      logger.log('ℹ️  migrations 目录不存在，跳过自动迁移')
      return
    }
    conn = await mysql.createConnection({
      host: config.get('DB_HOST'),
      port: +(config.get('DB_PORT') || 3306),
      user: config.get('DB_USERNAME'),
      password: config.get('DB_PASSWORD'),
      database: config.get('DB_DATABASE'),
      charset: 'utf8mb4',
      multipleStatements: true,
      connectTimeout: 5000,
      ...(config.get('DB_SSL') === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    })

    const [lockResult] = await conn.query<mysql.RowDataPacket[]>(
      'SELECT GET_LOCK(?, ?) as acquired',
      [LOCK_NAME, LOCK_TIMEOUT],
    )
    lockAcquired = lockResult[0]?.acquired === 1
    if (!lockAcquired) {
      logger.warn(`⚠️ 未能获取迁移锁 ${LOCK_NAME}（其他实例正在执行迁移），跳过本轮迁移`)
      return
    }

    await conn.query(`CREATE TABLE IF NOT EXISTS _migrations_applied (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
    const [appliedRows] = await conn.query<mysql.RowDataPacket[]>('SELECT filename FROM _migrations_applied')
    const appliedSet = new Set(appliedRows.map(r => String(r.filename)))
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      if (appliedSet.has(file)) continue
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      logger.log(`📦 执行迁移: ${file}`)
      await conn.query(sql)
      await conn.query('INSERT INTO _migrations_applied (filename) VALUES (?)', [file])
      logger.log(`✅ 迁移完成: ${file}`)
    }
  } catch (e: any) {
    const isProd = app.get(ConfigService).get('NODE_ENV') === 'production'
    if (isProd) {
      logger.error('❌ 自动迁移执行失败（生产环境不阻塞启动）:', e?.message || e)
    } else {
      logger.warn('⚠️  自动迁移执行失败（开发环境不阻塞启动）:', e?.message || e)
    }
  } finally {
    if (conn) {
      if (lockAcquired) {
        await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => {})
      }
      await conn.end().catch(() => {})
    }
  }
}

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

  // —— 安全启动自检 ——
  const jwtSecret = config.get<string>('JWT_SECRET')
  if (!jwtSecret || jwtSecret === 'change_me_to_a_long_random_secret') {
    logger.warn('⚠️  安全警告: JWT_SECRET 未配置或使用默认占位值')
    if (config.get('NODE_ENV') === 'production') {
      logger.warn('⚠️  JWT_SECRET 未配置为强随机值，生产环境中令牌可能不安全')
    }
  }
  const su = config.get('SUPER_ADMIN_USER') || 'admin'
  const sp = config.get('SUPER_ADMIN_PASSWORD') || 'admin'
  if (su === 'admin' && sp === 'admin') {
    logger.warn('⚠️  安全警告: 超级管理员仍为默认账号 admin/admin')
  }
  if (config.get('NODE_ENV') === 'production' && !isBcryptHash(sp)) {
    logger.warn('⚠️  安全警告: 生产环境超级管理员密码未使用 bcrypt 哈希格式')
  }
  if (config.get('NODE_ENV') === 'production' && config.get('DB_SYNCHRONIZE') === 'true') {
    logger.warn('⚠️  安全警告: 生产环境开启了 DB_SYNCHRONIZE=true')
  }
  if (config.get('NODE_ENV') === 'production' && !config.get('ENCRYPTION_KEY')) {
    logger.warn('⚠️  ENCRYPTION_KEY 未配置，建议设置该环境变量')
  }

  await runMigrations(app)

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
bootstrap()
