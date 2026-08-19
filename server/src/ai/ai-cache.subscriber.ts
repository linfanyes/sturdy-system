import { Injectable, Logger } from '@nestjs/common'
import { InjectConnection } from '@nestjs/typeorm'
import { Connection, EntitySubscriberInterface, InsertEvent, UpdateEvent, RemoveEvent } from 'typeorm'
import { CacheService } from '../common/cache/cache.service'
import { Grade } from '../grades/grade.entity'
import { Student } from '../students/student.entity'
import { Exam } from '../exams/exam.entity'
import { ClassItem } from '../classes/class.entity'
import { AwardRecord } from '../award/award.entity'
import { NoteItem } from '../notes/notes.entity'

/**
 * P0-2修复：AI 上下文缓存事件驱动自动失效。
 *
 * 监听 Grade/Student/Exam/Class/Award/Note 等实体的增删改事件，
 * 自动清除对应教师的 AI 上下文缓存，避免 AI 使用脏数据。
 *
 * 不需要各业务模块手动调用 clearAiContextCache。
 *
 * 注意：TypeORM 的 EntitySubscriberInterface.listenTo() 契约要求返回
 * 「单个」实体类（string | Function），无法直接返回数组。为监听多个实体，
 * 这里由 AiCacheSubscriber 在构造期为每个目标实体创建一个内部订阅器实例并注册，
 * 各实例共享同一套失效逻辑。
 */
@Injectable()
export class AiCacheSubscriber {
  constructor(
    @InjectConnection() connection: Connection,
    cache: CacheService,
  ) {
    for (const entity of [Grade, Student, Exam, ClassItem, AwardRecord, NoteItem]) {
      new AiCacheSubscriberFor(connection, cache, entity)
    }
  }
}

/** 单实体缓存失效订阅器（每目标实体一个实例） */
class AiCacheSubscriberFor implements EntitySubscriberInterface {
  private readonly logger = new Logger(AiCacheSubscriberFor.name)

  constructor(
    private readonly connection: Connection,
    private readonly cache: CacheService,
    private readonly entity: Function,
  ) {
    // 手动注册到 TypeORM（避免自动扫描依赖注入问题）
    connection.subscribers.push(this)
  }

  listenTo(): Function {
    return this.entity
  }

  private extractTeacherId(entity: any): string | null {
    return entity?.teacherId || entity?.createdBy || null
  }

  private async invalidateForEntity(event: InsertEvent<any> | UpdateEvent<any> | RemoveEvent<any>): Promise<void> {
    const teacherId = this.extractTeacherId(event.entity)
    if (!teacherId) return
    const cacheKey = `ai:context:t:${teacherId}`
    this.cache.del(cacheKey)
    this.logger.debug(`AI 上下文缓存已失效（教师: ${teacherId}，事件: ${event.constructor.name}）`)
  }

  afterInsert(event: InsertEvent<any>): Promise<void> {
    return this.invalidateForEntity(event)
  }

  afterUpdate(event: UpdateEvent<any>): Promise<void> {
    return this.invalidateForEntity(event)
  }

  afterRemove(event: RemoveEvent<any>): Promise<void> {
    return this.invalidateForEntity(event)
  }
}
