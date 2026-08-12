import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from './audit.entity'

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(schoolId: string, action: string, operator: string, target: string, detail?: string) {
    const entry = this.auditRepo.create({ teacherId: '', schoolId, action, operator, target, detail })
    return this.auditRepo.save(entry)
  }

  /** 便捷方法：记录操作级审计（带 actor 角色 + 目标类型） */
  async logOperation(params: {
    actorId: string
    actorRole: string
    action: string
    targetType?: string
    targetId?: string
    detail?: Record<string, any>
    schoolId?: string
  }) {
    const entry = this.auditRepo.create({
      teacherId: params.actorId,
      schoolId: params.schoolId || '',
      action: params.action,
      operator: `${params.actorRole}:${params.actorId}`,
      target: params.targetType ? `${params.targetType}:${params.targetId || ''}` : '',
      detail: params.detail ? JSON.stringify(params.detail) : undefined,
    })
    return this.auditRepo.save(entry)
  }

  async list(schoolId?: string, skip = 0, take = 100) {
    const where = schoolId ? { schoolId } : {}
    const [items, total] = await this.auditRepo.findAndCount({
      where, order: { createdAt: 'DESC' }, skip, take,
    })
    return { items, total }
  }
}
