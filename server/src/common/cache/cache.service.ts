import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'

/**
 * 类型安全的缓存键构建器
 * 用法: CacheKeys.aiContext(teacherId) => 'ai:context:t:{teacherId}'
 */
export const CacheKeys = {
  aiContext: (teacherId: string) => `ai:context:t:${teacherId}`,
  aiSettings: (teacherId: string) => `ai:settings:t:${teacherId}`,
  teacherFeatures: (teacherId: string) => `feat:t:${teacherId}`,
  classMembers: (classId: string) => `class:members:c:${classId}`,
  studentGrades: (studentId: string) => `grades:s:${studentId}`,
  teacherClasses: (teacherId: string) => `teacher:classes:t:${teacherId}`,
  examStats: (examId: string) => `exam:stats:e:${examId}`,
  schoolConfig: (schoolId: string) => `school:config:s:${schoolId}`,
} as const

export type CacheScope = 'ai' | 'feat' | 'class' | 'grades' | 'teacher' | 'exam' | 'school' | 'app'

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
  /** 缓存命中统计 */
  private hits = 0
  private misses = 0

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
    const val = this.cache.get(key) as T | undefined
    if (val !== undefined) {
      this.hits++
    } else {
      this.misses++
    }
    return val
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    if (ttlMs && 'ttl' in this.cache) {
      // lru-cache 专属 API（LRUCacheWithTTL 独立接口，签名与 lru-cache v11 兼容）
      const ttlCache = this.cache as unknown as { set: (k: string, v: unknown, o?: { ttl?: number }) => void }
      ttlCache.set(key, value, { ttl: ttlMs })
    } else if (ttlMs && this.cache instanceof SimpleLRU) {
      // 内置简易 LRU 也支持 TTL
      this.cache.set(key, value, ttlMs)
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
    const total = this.hits + this.misses
    return {
      size: this.cache.size,
      calculatedSize: 'calculatedSize' in this.cache ? (this.cache as { calculatedSize: number }).calculatedSize : this.cache.size * 1024,
      max: this.cache.max,
      ttl: 'ttl' in this.cache ? (this.cache as { ttl: number }).ttl : 300000,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? Math.round((this.hits / total) * 10000) / 100 : 0,
    }
  }

  /** 重置统计 */
  resetStats(): void {
    this.hits = 0
    this.misses = 0
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

/** 支持 TTL 的 LRU 缓存接口（独立接口，不继承 LRUCacheStandard，避免 set 签名逆变） */
interface LRUCacheWithTTL<K = string, V = unknown> {
  get(key: K): V | undefined
  set(key: K, value: V, options?: { ttl?: number }): void
  delete(key: K): boolean
  clear(): void
  readonly size: number
  readonly max: number
  readonly calculatedSize: number
  readonly ttl: number
  keys(): IterableIterator<K>
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
    return new LRUCache(options) as unknown as LRUCacheStandard<K, V>
  } catch {
    // lru-cache 不可用，使用内置简易实现
    return new SimpleLRU<K, V>(options)
  }
}

/**
 * 内置简易 LRU 缓存实现（降级方案）。
 * 当 lru-cache 包不可用时使用，功能足够满足基本缓存需求。
 * 支持 TTL 过期 + LRU 淘汰 + 大小限制。
 */
class SimpleLRU<K, V> implements LRUCacheStandard<K, V> {
  private map = new Map<K, V>()
  private expireMap = new Map<K, number>() // key → 过期时间戳
  private accessOrder: K[] = []
  private currentSize = 0
  private readonly defaultTTL: number

  constructor(private readonly options: LRUCacheOptions<K, V>) {
    this.defaultTTL = options.ttl
  }

  /** 清理已过期条目（懒清理 + 定期清理） */
  private evictExpired(): void {
    const now = Date.now()
    for (const [key, expireAt] of this.expireMap) {
      if (expireAt <= now) {
        this.map.delete(key)
        this.expireMap.delete(key)
        const idx = this.accessOrder.indexOf(key)
        if (idx > -1) this.accessOrder.splice(idx, 1)
      }
    }
  }

  get(key: K): V | undefined {
    // 检查是否过期
    const expireAt = this.expireMap.get(key)
    if (expireAt && expireAt <= Date.now()) {
      this.delete(key)
      return undefined
    }
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

  set(key: K, value: V, ttlMs?: number): void {
    // 已存在则更新
    if (this.map.has(key)) {
      const oldValue = this.map.get(key)!
      this.currentSize -= this.options.sizeCalculation(oldValue)
      this.map.set(key, value)
      this.currentSize += this.options.sizeCalculation(value)
      // 更新 TTL 和访问顺序
      this.expireMap.set(key, Date.now() + (ttlMs ?? this.defaultTTL))
      const idx = this.accessOrder.indexOf(key)
      if (idx > -1) {
        this.accessOrder.splice(idx, 1)
        this.accessOrder.unshift(key)
      }
      return
    }

    // 先清理过期条目（节省空间）
    this.evictExpired()

    // 淘汰策略
    while ((this.map.size >= this.options.max || this.currentSize >= this.options.maxSize) && this.accessOrder.length > 0) {
      const lruKey = this.accessOrder.pop()!
      const lruValue = this.map.get(lruKey)
      if (lruValue !== undefined) {
        this.currentSize -= this.options.sizeCalculation(lruValue)
      }
      this.map.delete(lruKey)
      this.expireMap.delete(lruKey)
    }

    this.map.set(key, value)
    this.currentSize += this.options.sizeCalculation(value)
    this.expireMap.set(key, Date.now() + (ttlMs ?? this.defaultTTL))
    this.accessOrder.unshift(key)
  }

  delete(key: K): boolean {
    const value = this.map.get(key)
    if (value !== undefined) {
      this.currentSize -= this.options.sizeCalculation(value)
    }
    this.expireMap.delete(key)
    const idx = this.accessOrder.indexOf(key)
    if (idx > -1) {
      this.accessOrder.splice(idx, 1)
    }
    return this.map.delete(key)
  }

  clear(): void {
    this.map.clear()
    this.expireMap.clear()
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
