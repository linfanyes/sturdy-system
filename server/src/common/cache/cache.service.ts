import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'

/**
 * 进程内 LRU 缓存服务（替代 Redis，适用于微信云托管无 Redis 场景）。
 *
 * 设计原则：
 * - 多租户隔离：所有缓存键必须包含 teacherId 等租户标识，防止跨租户数据泄露
 * - TTL 适中：5-10 分钟，避免数据长时间不一致
 * - 内存安全：LRU 淘汰策略，避免内存溢出
 * - 降级方案：如 lru-cache 包不可用，自动使用内置简易 LRU 实现
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
  private cache: LRUCacheStandard<string, unknown>

  constructor() {
    this.cache = createLRUCache<string, unknown>({
      max: 10000, // 最大条目数
      ttl: 1000 * 60 * 5, // 默认 TTL 5 分钟
      maxSize: 200 * 1024 * 1024, // 200MB 内存上限
      sizeCalculation: (value: unknown) => {
        try {
          return JSON.stringify(value).length * 2
        } catch {
          return 1024
        }
      },
      updateAgeOnGet: true,
      allowStale: false,
    })
    this.logger.log(`✅ 进程内 LRU 缓存已初始化 (${this.cache.constructor.name}, max=10000, maxSize=200MB, TTL=5min)`)
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (ttlMs && 'ttl' in this.cache) {
      // lru-cache 专属 API
      (this.cache as LRUCacheWithTTL).set(key, value, { ttl: ttlMs })
    } else {
      this.cache.set(key, value)
    }
  }

  async getOrSet<T>(key: string, producer: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key)
    if (cached !== undefined) {
      return cached
    }
    const value = await producer()
    if (value !== null && value !== undefined) {
      this.set(key, value, ttlMs)
    }
    return value
  }

  del(key: string): void {
    this.cache.delete(key)
  }

  delByTenant(tenantId: string): void {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.includes(`:${tenantId}:`) || key.endsWith(`:${tenantId}`)) {
        this.cache.delete(key)
        count++
      }
    }
    if (count > 0) {
      this.logger.debug(`已清除租户 ${tenantId} 的 ${count} 条缓存`)
    }
  }

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

  clear(): void {
    this.cache.clear()
    this.logger.warn('⚠️ 已清空所有进程内缓存')
  }

  stats() {
    return {
      size: this.cache.size,
      calculatedSize: 'calculatedSize' in this.cache ? (this.cache as { calculatedSize: number }).calculatedSize : this.cache.size * 1024,
      max: this.cache.max,
      ttl: 'ttl' in this.cache ? (this.cache as { ttl: number }).ttl : 300000,
    }
  }

  onModuleDestroy() {
    this.cache.clear()
    this.logger.log('进程内缓存已清理')
  }
}

// ---- 类型定义 ----

/** LRU 缓存标准接口 */
interface LRUCacheStandard<K, V> {
  get(key: K): V | undefined
  set(key: K, value: V): void
  delete(key: K): boolean
  clear(): void
  readonly size: number
  readonly max: number
  keys(): IterableIterator<K>
}

/** 支持 TTL 的 LRU 缓存接口 */
interface LRUCacheWithTTL<K, V> extends LRUCacheStandard<K, V> {
  set(key: K, value: V, options: { ttl: number }): void
  readonly calculatedSize: number
  readonly ttl: number
}

interface LRUCacheOptions<K, V> {
  max: number
  ttl: number
  maxSize: number
  sizeCalculation: (value: V) => number
  updateAgeOnGet?: boolean
  allowStale?: boolean
}

/**
 * 创建 LRU 缓存实例。
 * 优先使用 lru-cache 包（高效稳定），不可用时降级到内置简易实现。
 */
function createLRUCache<K, V>(options: LRUCacheOptions<K, V>): LRUCacheStandard<K, V> {
  try {
    // 动态导入 lru-cache，避免启动时依赖不存在导致失败
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { LRUCache } = require('lru-cache')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return new LRUCache(options) as LRUCacheWithTTL<K, V>
  } catch {
    // lru-cache 不可用，使用内置简易实现
    return new SimpleLRU<K, V>(options)
  }
}

/**
 * 内置简易 LRU 缓存实现（降级方案）。
 * 当 lru-cache 包不可用时使用，功能足够满足基本缓存需求。
 */
class SimpleLRU<K, V> implements LRUCacheStandard<K, V> {
  private map = new Map<K, V>()
  private accessOrder: K[] = []
  private currentSize = 0
  private readonly maxTTL: number

  constructor(private readonly options: LRUCacheOptions<K, V>) {
    this.maxTTL = options.ttl
  }

  get(key: K): V | undefined {
    const value = this.map.get(key)
    if (value !== undefined && this.options.updateAgeOnGet) {
      // 移动到最近使用
      const idx = this.accessOrder.indexOf(key)
      if (idx > -1) {
        this.accessOrder.splice(idx, 1)
        this.accessOrder.unshift(key)
      }
    }
    return value
  }

  set(key: K, value: V): void {
    // 已存在则更新
    if (this.map.has(key)) {
      const oldValue = this.map.get(key)!
      this.currentSize -= this.options.sizeCalculation(oldValue)
      this.map.set(key, value)
      this.currentSize += this.options.sizeCalculation(value)
      // 更新访问顺序
      const idx = this.accessOrder.indexOf(key)
      if (idx > -1) {
        this.accessOrder.splice(idx, 1)
        this.accessOrder.unshift(key)
      }
      return
    }

    // 淘汰策略
    while ((this.map.size >= this.options.max || this.currentSize >= this.options.maxSize) && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.pop()!
      const lruValue = this.map.get(lruKey)
      if (lruValue !== undefined) {
        this.currentSize -= this.options.sizeCalculation(lruValue)
      }
      this.map.delete(lruKey)
    }

    this.map.set(key, value)
    this.currentSize += this.options.sizeCalculation(value)
    this.accessOrder.unshift(key)
  }

  delete(key: K): boolean {
    const value = this.map.get(key)
    if (value !== undefined) {
      this.currentSize -= this.options.sizeCalculation(value)
    }
    const idx = this.accessOrder.indexOf(key)
    if (idx > -1) {
      this.accessOrder.splice(idx, 1)
    }
    return this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
    this.accessOrder = []
    this.currentSize = 0
  }

  get size(): number {
    return this.map.size
  }

  get max(): number {
    return this.options.max
  }

  keys(): IterableIterator<K> {
    return this.map.keys()
  }
}
