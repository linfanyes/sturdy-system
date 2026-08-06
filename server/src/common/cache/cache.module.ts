import { Global, Module } from '@nestjs/common'
import { CacheService } from './cache.service'

/**
 * 全局进程内 LRU 缓存模块（替代 Redis，适用于微信云托管无 Redis 场景）。
 *
 * 设计原则：
 * - 多租户隔离：所有缓存键必须包含 teacherId 等租户标识，防止跨租户数据泄露
 * - TTL 适中：5-10 分钟，避免数据长时间不一致
 * - 内存安全：LRU 淘汰策略 + 200MB 上限
 *
 * 使用方式：
 * constructor(private readonly cache: CacheService) {}
 *
 * // 获取/设置缓存
 * const value = await this.cache.getOrSet(
 *   `ai-context:${teacherId}`,
 *   () => this.buildLocalContextFromDb(teacherId),
 *   5 * 60 * 1000, // 5 分钟 TTL
 * )
 *
 * // 数据变更时清除缓存
 * this.cache.delByTenant(teacherId)
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
