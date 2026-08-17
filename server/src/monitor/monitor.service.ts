import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MonitorLog } from './monitor.entity'

export interface MonitorLogInput {
  type: string
  page?: string
  message?: string
  stack?: string
  meta?: Record<string, any> | string
  url?: string
  userId?: string
  role?: string
}

@Injectable()
export class MonitorService {
  private readonly logger = new Logger(MonitorService.name)

  constructor(
    @InjectRepository(MonitorLog)
    private readonly repo: Repository<MonitorLog>,
  ) {}

  /** 写入一条前端上报日志；字段截断防超大 payload，写库失败静默（监控不能影响主流程） */
  async log(input: MonitorLogInput): Promise<{ ok: boolean }> {
    const type = String(input.type || 'error').slice(0, 32)
    const message = String(input.message || '').slice(0, 2000)
    const page = String(input.page || '').slice(0, 255)
    const url = String(input.url || '').slice(0, 500)
    const stack = String(input.stack || '').slice(0, 10000)
    const userId = String(input.userId || '').slice(0, 64)
    const role = String(input.role || '').slice(0, 32)

    let meta: string | null = null
    if (input.meta != null) {
      try {
        meta = typeof input.meta === 'string'
          ? input.meta.slice(0, 20000)
          : JSON.stringify(input.meta).slice(0, 20000)
      } catch {
        meta = null
      }
    }

    try {
      await this.repo.save(this.repo.create({ type, message, page, url, stack, meta: meta ?? '', userId, role }))
      return { ok: true }
    } catch (e) {
      // 监控表缺失或 DB 异常时静默降级，避免雪崩
      this.logger.warn(`[monitor] 写库失败: ${e?.message?.slice(0, 120) || e}`)
      return { ok: false }
    }
  }

  /** 查询最近日志（超管排查用） */
  async list(limit = 50, type?: string): Promise<MonitorLog[]> {
    try {
      const qb = this.repo.createQueryBuilder('m').orderBy('m.createdAt', 'DESC').take(Math.min(limit, 200))
      if (type) qb.andWhere('m.type = :type', { type })
      return await qb.getMany()
    } catch {
      return []
    }
  }
}
