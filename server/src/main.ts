import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
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

/**
 * 启动时自动执行 migrations 目录下未应用的 .sql 文件。
 * - 用 _migrations_applied 表跟踪已执行文件名，幂等可重复运行。
 * - 失败不阻塞启动（synchronize=true 仍会同步 entity 表结构），
 *   仅打印错误供运维排查。
 * - 使用独立的迁移连接（仅该连接开启 multipleStatements），
 *   业务连接不再开启多语句，缩小 SQL 注入单点风险面。
 */
async function runMigrations(app: any) {
  const config = app.get(ConfigService)
  let conn: mysql.Connection | null = null
  try {
    const migrationsDir = path.join(__dirname, '..', 'migrations')
    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️  migrations 目录不存在，跳过自动迁移')
      return
    }
    conn = await mysql.createConnection({
      host: config.get('DB_HOST'),
      port: +(config.get('DB_PORT') || 3306),
      user: config.get('DB_USERNAME'),
      password: config.get('DB_PASSWORD'),
      database: config.get('DB_DATABASE'),
      charset: 'utf8mb4',
      // 迁移文件含多语句 SQL（PREPARE/EXECUTE 等），仅迁移连接开启
      multipleStatements: true,
      connectTimeout: 5000,
      ...(config.get('DB_SSL') === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
    })
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
      console.log(`📦 执行迁移: ${file}`)
      await conn.query(sql)
      await conn.query('INSERT INTO _migrations_applied (filename) VALUES (?)', [file])
      console.log(`✅ 迁移完成: ${file}`)
    }
  } catch (e: any) {
    console.error('⚠️  自动迁移执行失败（不阻塞启动，synchronize 仍会同步表结构）:', e?.message || e)
  } finally {
    if (conn) await conn.end().catch(() => {})
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // AI 对话可能携带较大上下文，放宽请求体上限
  app.use(json({ limit: '5mb' }))
  app.use(urlencoded({ limit: '5mb', extended: true }))
  const config = app.get(ConfigService)
  // CORS：fail-closed。未配置或 '*' 时：
  //  - 开发环境允许 '*'（仅警告）
  //  - 生产环境禁止 '*'，必须显式配置可信来源逗号列表，否则拒绝启动
  const corsRaw = (config.get<string>('CORS_ORIGIN') || '').trim()
  let corsOrigin: string | string[] | boolean
  if (!corsRaw) {
    corsOrigin = false // 未配置：默认禁止跨域
  } else if (corsRaw === '*') {
    if (config.get('NODE_ENV') === 'production') {
      throw new Error('生产环境禁止使用通配 CORS_ORIGIN=*，请在 .env 配置可信来源逗号列表（如小程序域名/管理端域名）。')
    }
    console.warn('⚠️  CORS 使用通配 *（仅限开发环境），生产环境请配置可信来源以避免跨站调用。')
    corsOrigin = true
  } else {
    corsOrigin = corsRaw.split(',').map((s) => s.trim()).filter(Boolean)
  }
  app.enableCors({
    origin: corsOrigin,
    credentials: corsOrigin !== true && corsOrigin !== false,
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

  // API 文档（历史债 #7）：@nestjs/swagger + CLI plugin 自动推断 DTO/实体。
  // 默认生产关闭、本地/测试开启；SWAGGER_ENABLED=true / false 可显式强制。
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
    // eslint-disable-next-line no-console
    console.log('📚 Swagger 文档已开启: /api-docs（生产环境默认关闭，可用 SWAGGER_ENABLED=true 强制开启）')
  }

  // 托管 web-app 构建产物（新版 Vue3+Vite Web 管理端）
  const webAdminPath = join(__dirname, '..', '..', 'web-app', 'dist')
  // 静态托管目录缺失时仅告警，不阻塞启动（避免 dist 未构建导致静默异常）
  if (!fs.existsSync(webAdminPath)) {
    console.warn('⚠️ web-app/dist 不存在，静态托管将跳过（请先执行 web-app 构建）')
  }
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
    if (config.get('NODE_ENV') === 'production') {
      throw new Error('超级管理员仍为默认账号 admin/admin，生产环境拒绝启动，请修改 SUPER_ADMIN_USER / SUPER_ADMIN_PASSWORD 为强口令。')
    }
  }
  // 生产环境开启 DB_SYNCHRONIZE 会让实体变更隐式改表结构，存在数据损坏风险，仅警告不阻断
  if (config.get('NODE_ENV') === 'production' && config.get('DB_SYNCHRONIZE') === 'true') {
    // eslint-disable-next-line no-console
    console.warn('⚠️  安全警告: 生产环境开启了 DB_SYNCHRONIZE=true，实体变更会隐式修改表结构，建议设置为 false 并仅通过迁移脚本管理表结构。')
  }

  // 启动时自动执行未应用的 migration SQL（幂等，失败不阻塞）
  await runMigrations(app)

  // 云托管/容器健康检查端点：微信云托管控制台将健康检查路径配置为 /health
  // （生产镜像不托管 web-app 静态文件，默认路径 / 会 404 导致实例被判不健康）
  app.getHttpAdapter().get('/health', (_req, res) =>
    res.status(200).json({ status: 'ok', time: new Date().toISOString() }),
  )

  // 云托管/容器环境必须监听 0.0.0.0，否则实例外部无法访问
  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`🚀 园丁工作台后端已启动: http://localhost:${port}/api`)
}
bootstrap()
