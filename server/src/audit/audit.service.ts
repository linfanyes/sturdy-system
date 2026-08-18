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
      targetType: params.targetType || null,
      targetId: params.targetId || null,
    })
    return this.auditRepo.save(entry)
  }

  /**
   * 记录数据变更历史（含变更前后快照）
   * 用于追踪重要数据（成绩、学生信息等）的修改历史
   */
  async logDataChange(params: {
    actorId: string
    actorRole: string
    action: string  // 'update_grade' | 'update_student' | 'update_exam' 等
    targetType: string
    targetId: string
    target: string  // 操作对象描述（如学生姓名）
    beforeData?: Record<string, any> | null
    afterData?: Record<string, any> | null
    schoolId?: string
  }) {
    const entry = this.auditRepo.create({
      teacherId: params.actorId,
      schoolId: params.schoolId || '',
      action: params.action,
      operator: `${params.actorRole}:${params.actorId}`,
      target: params.target,
      targetType: params.targetType,
      targetId: params.targetId,
      beforeData: params.beforeData || null,
      afterData: params.afterData || null,
      detail: JSON.stringify({
        changedFields: this.getChangedFields(params.beforeData, params.afterData),
      }),
    })
    return this.auditRepo.save(entry)
  }

  /**
   * 查询单条记录的变更历史
   */
  async getChangeHistory(targetType: string, targetId: string, skip = 0, take = 50) {
    const [items, total] = await this.auditRepo.findAndCount({
      where: { targetType, targetId },
      order: { createdAt: 'DESC' },
      skip,
      take: Math.min(take, 100),
    })
    return { items, total }
  }

  async list(schoolId?: string, skip = 0, take = 100) {
    const where = schoolId ? { schoolId } : {}
    const [items, total] = await this.auditRepo.findAndCount({
      where, order: { createdAt: 'DESC' }, skip, take,
    })
    return { items, total }
  }

  /**
   * 计算变更字段列表
   */
  private getChangedFields(before: Record<string, any> | null | undefined, after: Record<string, any> | null | undefined): string[] {
    if (!before || !after) return []
    const changed: string[] = []
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const key of allKeys) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changed.push(key)
      }
    }
    return changed
  }
}
