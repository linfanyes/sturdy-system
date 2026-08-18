import { CacheService } from './cache.service'

/**
 * 方法级缓存装饰器
 * 自动缓存方法返回值，支持 TTL 和条件缓存
 *
 * 用法:
 * @Cacheable({ key: (args) => `user:${args[0]}`, ttl: 60000 })
 * async getUser(id: string) { ... }
 */
export function Cacheable<T extends (...args: any[]) => Promise<any>>(options: {
  /** 缓存键生成函数，接收方法参数 */
  key: (args: Parameters<T>) => string
  /** TTL（毫秒），默认 5 分钟 */
  ttl?: number
  /** 缓存条件，返回 false 时不缓存 */
  condition?: (result: Awaited<ReturnType<T>>) => boolean
}): MethodDecorator {
  return function (_target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    descriptor.value = async function (...args: any[]) {
      // 获取 CacheService 实例（从 this 上查找）
      const cacheSvc: CacheService | undefined = (this as any).cache ?? (this as any).cacheService
      if (!cacheSvc) {
        return originalMethod.apply(this, args)
      }
      const cacheKey = options.key(args as any)
      const cached = cacheSvc.get<Awaited<ReturnType<T>>>(cacheKey)
      if (cached !== undefined) return cached
      const result = await originalMethod.apply(this, args)
      if (options.condition && !options.condition(result)) {
        return result
      }
      cacheSvc.set(cacheKey, result, options.ttl)
      return result
    }
    return descriptor
  }
}

/**
 * 缓存失效装饰器
 * 方法执行后自动清除指定缓存
 *
 * 用法:
 * @CacheEvict({ key: (args) => `user:${args[0]}` })
 * async updateUser(id: string, data: any) { ... }
 */
export function CacheEvict<T extends (...args: any[]) => Promise<any>>(options: {
  /** 要清除的缓存键生成函数 */
  key?: (args: Parameters<T>) => string | string[]
  /** 要清除的缓存作用域 */
  scope?: string
  /** 是否清除所有缓存（危险操作） */
  all?: boolean
}): MethodDecorator {
  return function (_target: any, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    descriptor.value = async function (...args: any[]) {
      const cacheSvc: CacheService | undefined = (this as any).cache ?? (this as any).cacheService
      const result = await originalMethod.apply(this, args)
      if (!cacheSvc) return result
      if (options.all) {
        cacheSvc.clear()
      } else if (options.scope) {
        cacheSvc.delByScope(options.scope)
      } else if (options.key) {
        const keys = options.key(args as any)
        if (Array.isArray(keys)) {
          keys.forEach((k) => cacheSvc.del(k))
        } else {
          cacheSvc.del(keys)
        }
      }
      return result
    }
    return descriptor
  }
}
