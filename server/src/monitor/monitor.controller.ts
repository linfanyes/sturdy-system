import { Body, Controller, Get, Post, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { MonitorService, MonitorLogInput } from './monitor.service'

/**
 * 前端监控上报端点（公开，受全局 Throttler 限速保护）。
 * 错误 / 性能指标来自 Web 与小程序端，用于问题定位与 Core Web Vitals 观测。
 */
@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitor: MonitorService) {}

  /** 上报单条日志（前端批量/单条均可） */
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('log')
  async log(@Body() body: MonitorLogInput | MonitorLogInput[]) {
    const items = Array.isArray(body) ? body : [body]
    for (const it of items.slice(0, 20)) {
      await this.monitor.log((it || {}) as MonitorLogInput)
    }
    return { ok: true, count: Math.min(items.length, 20) }
  }

  /** 最近日志（超管排查；简单限制，生产可加鉴权） */
  @Get('logs')
  async list(@Query('limit') limit?: string, @Query('type') type?: string) {
    return { items: await this.monitor.list(Number(limit) || 50, type || undefined) }
  }
}
