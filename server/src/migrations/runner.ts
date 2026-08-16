import * as fs from 'node:fs'
import * as path from 'node:path'
import * as mysql from 'mysql2/promise'
import { Logger } from '@nestjs/common'

const logger = new Logger('Migrations')

/** Nest ConfigService 的极简形态，便于同时兼容 main.ts（注入）与独立 CLI（process.env）。 */
type CfgLike = { get(key: string): any }

interface DbConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  ssl: boolean
}

/**
 * 读取数据库连接配置：
 * - 传入 cfg（Nest ConfigService）时优先用其 get()；
 * - 否则回退到 process.env（独立迁移 CLI / 容器 entrypoint 场景）。
 */
function resolveConfig(cfg?: CfgLike): DbConfig {
  const get = (key: string, def?: string): string => {
    if (cfg) {
      const v = cfg.get(key)
      if (v !== undefined && v !== null) return String(v)
    }
    return process.env[key] ?? def ?? ''
  }
  return {
    host: get('DB_HOST', '127.0.0.1'),
    port: parseInt(get('DB_PORT', '3306'), 10) || 3306,
    user: get('DB_USERNAME', 'root'),
    password: get('DB_PASSWORD', ''),
    database: get('DB_DATABASE', 'gardener'),
    ssl: get('DB_SSL', 'false') === 'true',
  }
}

/**
 * 定位 migrations/*.sql 所在目录，兼容两种运行上下文：
 * - 容器内：WORKDIR=/app，Dockerfile 将源码 migrations/ 拷贝到 /app/migrations；
 * - 本地 nest start：cwd=server，源码 migrations/ 在 server/migrations。
 */
function resolveMigrationsDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'migrations'),
    path.resolve(__dirname, '..', '..', 'migrations'), // dist/migrations/runner.js -> /app/migrations
    path.resolve(__dirname, '..', 'migrations'), // src/migrations/runner.ts -> server/migrations
  ]
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.readdirSync(c).some((f) => f.endsWith('.sql'))) {
      return c
    }
  }
  return candidates[0]
}

/** 带重试的迁移连接：云端数据库可能在容器启动瞬间尚未就绪，重试可避免一次性失败。 */
async function connectWithRetry(db: DbConfig): Promise<mysql.Connection> {
  const maxAttempts = 5
  let lastErr: any
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await mysql.createConnection({
        host: db.host,
        port: db.port,
        user: db.user,
        password: db.password,
        database: db.database,
        charset: 'utf8mb4',
        multipleStatements: true,
        connectTimeout: 5000,
        ...(db.ssl ? { ssl: { rejectUnauthorized: false } } : {}),
      })
    } catch (e: any) {
      lastErr = e
      logger.warn(`⚠️  迁移连接数据库失败（第 ${attempt}/${maxAttempts} 次），3s 后重试: ${e?.message || e}`)
      if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 3000))
    }
  }
  throw lastErr
}

/**
 * 启动时自动执行 migrations 目录下未应用的 .sql 文件。
 * - 用 _migrations_applied 表跟踪已执行文件名，幂等可重复运行；
 * - 单个迁移失败不阻断后续迁移（生产库可能存在个别历史表缺失/数据冲突），仅打印错误；
 * - 独立的迁移连接（仅该连接开启 multipleStatements），业务连接不开启多语句，缩小注入面；
 * - MySQL 命名锁（GET_LOCK）防止多实例并发执行迁移，避免云托管多副本竞态。
 *
 * @returns ok=false 表示连接/锁等致命错误（供 CLI 以非 0 退出码失败）；
 *          个别迁移失败不计入 ok（保持 fail-soft，下次启动自动重试）。
 */
export async function runMigrations(cfg?: CfgLike): Promise<{ ok: boolean; appliedNow: number; failed: number }> {
  const db = resolveConfig(cfg)
  const migrationsDir = resolveMigrationsDir()
  const LOCK_NAME = 'gardener_run_migrations'
  const LOCK_TIMEOUT = 60
  let conn: mysql.Connection | null = null
  let lockAcquired = false
  try {
    if (!fs.existsSync(migrationsDir)) {
      logger.log(`ℹ️  migrations 目录不存在 (${migrationsDir})，跳过自动迁移`)
      return { ok: true, appliedNow: 0, failed: 0 }
    }
    conn = await connectWithRetry(db)

    const [lockResult] = await conn.query<mysql.RowDataPacket[]>(
      'SELECT GET_LOCK(?, ?) as acquired',
      [LOCK_NAME, LOCK_TIMEOUT],
    )
    lockAcquired = lockResult[0]?.acquired === 1
    if (!lockAcquired) {
      logger.warn(`⚠️  未能获取迁移锁 ${LOCK_NAME}（其他实例正在执行迁移），跳过本轮迁移`)
      return { ok: true, appliedNow: 0, failed: 0 }
    }

    await conn.query(`CREATE TABLE IF NOT EXISTS _migrations_applied (
      id INT AUTO_INCREMENT PRIMARY KEY,
      filename VARCHAR(255) NOT NULL UNIQUE,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
    const [appliedRows] = await conn.query<mysql.RowDataPacket[]>('SELECT filename FROM _migrations_applied')
    const appliedSet = new Set(appliedRows.map((r) => String(r.filename)))
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
    logger.log(`ℹ️  待检查迁移 ${files.length} 个，已应用 ${appliedSet.size} 个，目录: ${migrationsDir}`)
    let appliedNow = 0
    let failed = 0
    for (const file of files) {
      if (appliedSet.has(file)) continue
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')
      logger.log(`📦 执行迁移: ${file}`)
      try {
        await conn.query(sql)
        await conn.query('INSERT INTO _migrations_applied (filename) VALUES (?)', [file])
        appliedSet.add(file)
        appliedNow++
        logger.log(`✅ 迁移完成: ${file}`)
      } catch (e: any) {
        // 单个迁移失败不阻断后续迁移；失败文件不记入 _migrations_applied，下次启动会重试。
        failed++
        logger.error(`❌ 迁移失败（已跳过，不影响其他迁移）: ${file} => ${e?.message || e}`)
      }
    }
    logger.log(`ℹ️  迁移执行汇总: 新应用 ${appliedNow} 个，失败 ${failed} 个`)
    return { ok: true, appliedNow, failed }
  } catch (e: any) {
    logger.error('❌ 自动迁移执行失败（连接/锁等致命错误）:', e?.message || e)
    return { ok: false, appliedNow: 0, failed: 0 }
  } finally {
    if (conn) {
      if (lockAcquired) {
        await conn.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => {})
      }
      await conn.end().catch(() => {})
    }
  }
}
