import { Controller, Get } from '@nestjs/common'
import { CacheService } from './common/cache/cache.service'

@Controller('health')
export class HealthController {
  constructor(private readonly cache: CacheService) {}

  @Get()
  check() {
    return { status: 'ok', time: new Date().toISOString() }
  }

  /**
   * 缓存健康检查与统计（可用于云托管健康检查或内部监控）。
   * 注意：此端点仅在进程内有效，云托管多副本时每个实例缓存独立。
   */
  @Get('cache')
  cacheStats() {
    return {
      status: 'ok',
      cache: this.cache.stats(),
      note: '进程内 LRU 缓存（非 Redis），多副本场景下各实例缓存独立',
    }
  }
}
