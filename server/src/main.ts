import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { json, urlencoded } from 'express'
import * as express from 'express'
import { join } from 'path'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { DataSource } from 'typeorm'
import { AppModule } from './app.module'
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter'

/**
 * 启动时自动执行 migrations 目录下未应用的 .sql 文件。
 * - 用 _migrations_applied 表跟踪已执行文件名，幂等可重复运行。
 * - 失败不阻塞启动（synchronize=true 仍会同步 entity 表结构），
 *   仅打印错误供运维排查。
 * - 依赖连接配置 multipleStatements: true 以执行含预处理语句的多语句 SQL。
 */
async function runMigrations(app: any) {
  try {
    const ds = app.get(DataSource)
    const migrationsDir = path.join(__dirname, '..', 'migrations')
    if (!fs.existsSync(migrationsDir)) {
      console.log('ℹ️  migrations 目录不存在，跳过自动迁移')
      return
    }
    await ds.query(`CREATE TABLE IF NOT EXISTS _migrations_applied (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
    const applied: { filename: string }[] = await ds.query('SELECT filename FROM _migrations_applied')
    const appliedSet = new Set(applied.map(r => r.filename))
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
    for (const file of files) {
      if (appliedSet.has(file)) continue
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      console.log(`📦 执行迁移: ${file}`)
      await ds.query(sql)
      await ds.query('INSERT INTO _migrations_applied (filename) VALUES (?)', [file])
      console.log(`✅ 迁移完成: ${file}`)
    }
  } catch (e: any) {
    console.error('⚠️  自动迁移执行失败（不阻塞启动，synchronize 仍会同步表结构）:', e?.message || e)
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

  // 启动时自动执行未应用的 migration SQL（幂等，失败不阻塞）
  await runMigrations(app)

  // 云托管/容器环境必须监听 0.0.0.0，否则实例外部无法访问
  await app.listen(port, '0.0.0.0')
  // eslint-disable-next-line no-console
  console.log(`🚀 园丁工作台后端已启动: http://localhost:${port}/api`)
}
bootstrap()
