import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { LRUCache } from 'lru-cache'

/**
 * 进程内 LRU 缓存服务（替代 Redis）。
 *
 * 使用场景：
 * - AI 上下文数据（学生/班级/成绩等）缓存 5 分钟
 * - AI 设置缓存 10 分钟
 * - 应用配置缓存 10 分钟
 * - 教师功能权限缓存 10 分钟
 *
 * 多租户安全：要求所有缓存键包含 teacherId，防止跨租户数据泄露。
 * 内存上限 200MB，最大条目 10000，LRU 自动淘汰。
 */
@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name)
  private readonly cache: LRUCache<string, unknown>

  constructor() {
    this.cache = new LRUCache<string, unknown>({
      max: 10000, // 最大条目数
      ttl: 1000 * 60 * 5, // 默认 TTL 5 分钟
      maxSize: 200 * 1024 * 1024, // 200MB 内存上限
      sizeCalculation: (value: unknown) => {
        // 估算缓存项大小（字节）
        try {
          return JSON.stringify(value).length * 2 // UTF-16 ≈ 2 字节/字符
        } catch {
          return 1024 // 无法序列化时估算 1KB
        }
      },
      updateAgeOnGet: true, // 访问后重置 TTL（热点数据更持久）
      allowStale: false, // 不返回过期数据
    })
    this.logger.log('✅ 进程内 LRU 缓存已初始化（max=10000, maxSize=200MB, TTL=5min）')
  }

  /**
   * 获取缓存值
   * @param key 缓存键（建议格式：`scope:tenantId:identifier`）
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  /**
   * 设置缓存值
   * @param key 缓存键（建议格式：`scope:tenantId:identifier`）
   * @param value 缓存值（需可 JSON 序列化）
   * @param ttlMs 自定义 TTL（毫秒），不传则使用默认值
   */
  set<T>(key: string, value: T, ttlMs?: number): void {
    if (ttlMs) {
      this.cache.set(key, value, { ttl: ttlMs })
    } else {
      this.cache.set(key, value)
    }
  }

  /**
   * 获取或设置缓存（缓存未命中时调用 producer 生成）
   * @param key 缓存键
   * @param producer 缓存未命中时的数据生成函数
   * @param ttlMs 自定义 TTL（毫秒）
   */
  async getOrSet<T>(key: string, producer: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }
    const value = await producer()
    // 仅在值有效时缓存（避免缓存 null/undefined/空值导致后续请求误判）
    if (value !== null && value !== undefined) {
      this.set(key, value, ttlMs)
    }
    return value
  }

  /**
   * 删除指定缓存键
   * @param key 缓存键（支持精确匹配）
   */
  del(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 按租户清除缓存（数据变更时调用，确保该租户下次请求获取最新数据）
   * @param tenantId 租户 ID（如 teacherId、schoolId）
   */
  delByTenant(tenantId: string): void {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.includes(`:${tenantId}:`) || key.includes(`:${tenantId}`)) {
        this.cache.delete(key)
        count++
      }
    }
    if (count > 0) {
      this.logger.debug(`已清除租户 ${tenantId} 的 ${count} 条缓存`)
    }
  }

  /**
   * 按作用域清除缓存
   * @param scope 缓存作用域（如 'ai-context', 'ai-settings', 'app-config'）
   */
  delByScope(scope: string): void {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${scope}:`)) {
        this.cache.delete(key)
        count++
      }
    }
    if (count > 0) {
      this.logger.debug(`已清除作用域 ${scope} 的 ${count} 条缓存`)
    }
  }

  /**
   * 清空所有缓存（慎用）
   */
  clear(): void {
    this.cache.clear()
    this.logger.warn('⚠️ 已清空所有进程内缓存')
  }

  /**
   * 获取缓存统计信息（健康检查/监控用）
   */
  stats() {
    return {
      size: this.cache.size,
      calculatedSize: this.cache.calculatedSize,
      max: this.cache.max,
      ttl: this.cache.ttl,
    }
  }

  onModuleDestroy() {
    this.cache.clear()
    this.logger.log('进程内缓存已清理')
  }
}
